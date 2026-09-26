import { adminNav } from '~/lib/nav'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Result = {
  key: string
  hypothesis: string
  enabled: boolean
  minPerVariant: number
  variants: Array<{ variant: string; visitors: number; conversions: number; rate: number }>
  pValue: number | null
  verdict: 'not_enough_data' | 'no_clear_difference' | 'winner'
  winner: string | null
}

const VERDICT: Record<Result['verdict'], string> = {
  not_enough_data: 'Not enough visitors yet',
  no_clear_difference: 'No clear difference',
  winner: 'Clear winner',
}

export default function AdminExperiments({ experiments }: { experiments: Result[] }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('Message tests')}
        description={t(
          'Two versions of a headline, shown at random. A result is only called once every version has enough visitors; until then treat the numbers as noise.'
        )}
      />
      {experiments.map((e) => (
        <Card key={e.key}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span className="tabular font-mono text-base">{e.key}</span>
              <Badge variant={e.enabled ? 'success' : 'secondary'}>
                {e.enabled ? t('Running') : 'Off'}
              </Badge>
              <Badge variant={e.verdict === 'winner' ? 'accent' : 'outline'}>
                {t(VERDICT[e.verdict])}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-700">{t(e.hypothesis)}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-600">
                  <th className="py-1 font-medium">{t('Version')}</th>
                  <th className="py-1 font-medium">{t('Visitors')}</th>
                  <th className="py-1 font-medium">{t('Joined')}</th>
                  <th className="py-1 font-medium">{t('Rate')}</th>
                </tr>
              </thead>
              <tbody>
                {e.variants.map((v) => (
                  <tr key={v.variant} className="border-t border-line">
                    <td className="py-1">
                      {v.variant}
                      {e.winner === v.variant ? ' (winner)' : ''}
                    </td>
                    <td className="tabular py-1">{v.visitors}</td>
                    <td className="tabular py-1">{v.conversions}</td>
                    <td className="tabular py-1">{(v.rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-ink-600">
              {e.pValue === null
                ? t('Needs at least {n} visitors per version.', { n: e.minPerVariant })
                : t('Chance of seeing this gap by luck alone: {pct}%.', {
                    pct: (e.pValue * 100).toFixed(1),
                  })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

AdminExperiments.layout = 'dashboard'
AdminExperiments.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
