import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { makerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type SlotData = {
  date: string
  maxMinutes: number
  reservedMinutes: number
}

type PrinterOption = {
  id: number
  name: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function TemplateForm({
  printerId,
  template,
}: {
  printerId: number
  template: Record<string, number>
}) {
  const { t } = useT()

  const [schedule, setSchedule] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (let i = 0; i < 7; i++) {
      init[i.toString()] = template[i.toString()]?.toString() ?? ''
    }
    return init
  })

  function submitTemplate(e: React.FormEvent) {
    e.preventDefault()
    const parsed: Record<string, number> = {}
    for (const [day, val] of Object.entries(schedule)) {
      const num = Number(val)
      if (num > 0) parsed[day] = num
    }
    router.post(`/maker/capacity/printers/${printerId}/template`, { schedule: parsed })
  }

  function applyTemplate() {
    const today = new Date()
    const from = today.toISOString().split('T')[0]
    const to = new Date(today.getTime() + 28 * 86400000).toISOString().split('T')[0]
    router.post(`/maker/capacity/printers/${printerId}/apply-template`, { from, to })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('Weekly Template')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitTemplate} className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((name, i) => (
              <div key={i}>
                <Label className="text-xs">{t(name)}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  placeholder="min"
                  value={schedule[i.toString()]}
                  onChange={(e) => setSchedule({ ...schedule, [i.toString()]: e.target.value })}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {t('Save Template')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
              {t('Apply to Next 4 Weeks')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function CapacityIndex({
  printers,
  selectedPrinterId,
  slots,
  template,
}: {
  printers: PrinterOption[]
  selectedPrinterId: number | null
  slots: SlotData[]
  template: Record<string, number>
}) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Capacity')}
        description={t('Minutes per day you can print. Offers only arrive for days with room.')}
      />

      {printers.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('Add a printer first')}
          description={t(
            'Capacity belongs to a machine. Once you add one, set your weekly hours here.'
          )}
          action={
            <Button asChild>
              <Link href="/maker/printers">{t('Go to printers')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex gap-2">
            {printers.map((p) => (
              <Button
                key={p.id}
                variant={p.id === selectedPrinterId ? 'default' : 'outline'}
                size="sm"
                onClick={() => router.get('/maker/capacity', { printerId: p.id })}
              >
                {p.name}
              </Button>
            ))}
          </div>

          {selectedPrinterId && (
            <>
              <TemplateForm printerId={selectedPrinterId} template={template} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('Slots (Next 4 Weeks)')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {slots.length === 0 ? (
                    <p className="text-sm text-ink-600">
                      {t('No slots configured. Use the weekly template to generate slots.')}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-7">
                      {slots.map((slot) => {
                        const used = Math.round((slot.reservedMinutes / slot.maxMinutes) * 100)
                        return (
                          <div
                            key={slot.date}
                            className="rounded-md border border-line p-2 text-center"
                          >
                            <div className="text-xs font-medium text-ink-700">
                              {new Date(slot.date + 'T00:00').toLocaleDateString('en', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="mt-1 text-sm">
                              {Math.round(slot.reservedMinutes / 60)}h /{' '}
                              {Math.round(slot.maxMinutes / 60)}h
                            </div>
                            <Badge
                              variant={
                                used >= 90 ? 'destructive' : used >= 50 ? 'warning' : 'success'
                              }
                              className="mt-1 text-xs"
                            >
                              {used}%
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

CapacityIndex.layout = 'dashboard'
CapacityIndex.dashboardProps = { navItems: makerNav, title: 'Manufacturer Panel' }
