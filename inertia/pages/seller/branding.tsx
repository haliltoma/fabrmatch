import { useState } from 'react'
import { router } from '@inertiajs/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

export default function SellerBranding({
  brandName,
  brandMessage,
}: {
  brandName: string | null
  brandMessage: string | null
}) {
  const { t } = useT()

  const [name, setName] = useState(brandName ?? '')
  const [message, setMessage] = useState(brandMessage ?? '')
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={t('Your brand on the parcel')}
        description={t(
          'Parcels from your shop carry your name and a short thank-you card instead of ours.'
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('Packing card')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              router.post('/seller/branding', {
                brandName: name || undefined,
                brandMessage: message || undefined,
              })
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="brand-name">{t('Brand name')}</Label>
              <Input
                id="brand-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand-message">{t('Thank-you message (optional)')}</Label>
              <Input
                id="brand-message"
                value={message}
                maxLength={240}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button type="submit">{t('Save')}</Button>
          </form>
          <div
            className="rounded-lg border border-line bg-paper-sunken p-4"
            aria-label={t('Preview')}
          >
            <p className="text-xs text-ink-600">{t('Preview')}</p>
            <p className="font-display text-xl font-semibold text-ink-900">
              {name || 'Thank you for your order'}
            </p>
            {message && <p className="text-sm text-ink-800">{message}</p>}
          </div>
          <p className="text-xs text-ink-600">
            {t(
              'The maker prints this card and puts it in the parcel. It never shows prices. Makers do not see who the buyer is beyond the delivery name and address.'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

SellerBranding.layout = 'dashboard'
SellerBranding.dashboardProps = { navItems: sellerNav, title: 'Seller Panel' }
