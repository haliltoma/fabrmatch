import { useState } from 'react'
import { router } from '@inertiajs/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

function LogoField({ hasLogo }: { hasLogo: boolean }) {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  // a new query string after each change, so the preview never shows the cached old logo
  const [version] = useState(() => Date.now())
  return (
    <div className="space-y-2">
      <Label htmlFor="brand-logo">{t('Logo (optional)')}</Label>
      {hasLogo && (
        <div className="flex items-center gap-3">
          <img
            src={`/seller/branding/logo?v=${version}`}
            alt={t('Your logo')}
            className="h-12 max-w-40 rounded border border-line bg-paper-raised object-contain p-1"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.post('/seller/branding/logo/remove')}
          >
            {t('Remove')}
          </Button>
        </div>
      )}
      <Input
        id="brand-logo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          router.post(
            '/seller/branding/logo',
            { logo: file },
            { forceFormData: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) }
          )
        }}
      />
      <p className="text-xs text-ink-600">
        {t('PNG, JPEG or WebP, up to 256 KB. It is printed in black and white on many printers.')}
      </p>
    </div>
  )
}

export default function SellerBranding({
  brandName,
  brandMessage,
  hasLogo,
}: {
  brandName: string | null
  brandMessage: string | null
  hasLogo: boolean
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
          <LogoField key={String(hasLogo)} hasLogo={hasLogo} />
          <div
            className="rounded-lg border border-line bg-paper-sunken p-4"
            aria-label={t('Preview')}
          >
            <p className="text-xs text-ink-600">{t('Preview')}</p>
            {hasLogo && (
              <img
                src="/seller/branding/logo"
                alt=""
                className="mb-2 max-h-12 max-w-40 object-contain"
              />
            )}
            <p className="font-display text-xl font-semibold text-ink-900">
              {name || t('Thank you for your order')}
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
SellerBranding.dashboardProps = { navItems: sellerNav, title: 'Seller' }
