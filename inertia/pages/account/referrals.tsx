import { PageHeader } from '~/components/page_header'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatDate, formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Props = {
  code: string
  link: string
  invited: number
  rewarded: number
  rewardMinor: number
  minOrderMinor: number
  coupons: Array<{
    code: string
    valueMinor: number
    endsAt: string | null
    expired: boolean
    isActive: boolean
  }>
}

export default function Referrals({
  code,
  link,
  invited,
  rewarded,
  rewardMinor,
  minOrderMinor,
  coupons,
}: Props) {
  const { t } = useT()
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        title={t('Invite a friend')}
        description={t('You and your friend each get a coupon for a first order.')}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('Your invite link')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="tabular break-all rounded-md bg-paper-sunken px-3 py-2 font-mono text-sm text-ink-900 select-all">
            {link}
          </p>
          <p className="text-sm text-ink-700">
            {t('Code')}: <span className="tabular font-mono">{code}</span>
          </p>
          <p className="text-sm text-ink-700">
            {t(
              'Your friend gets a {amount} coupon when they sign up. You get one after their first order of at least {min} is completed.',
              { amount: formatMoney(rewardMinor, 'TRY'), min: formatMoney(minOrderMinor, 'TRY') }
            )}
          </p>
          <p className="text-xs text-ink-600">
            {t(
              'The discount is paid from our fee and never changes what makers or sellers earn. It cannot be larger than the fee on that order.'
            )}
          </p>
          <p className="text-sm text-ink-800">
            {t('Invited: {invited} · Rewarded: {rewarded}', { invited, rewarded })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('Your coupons')}</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-ink-700">{t('No coupons yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {coupons.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="tabular font-mono text-sm text-ink-900">{c.code}</p>
                    <p className="text-xs text-ink-600">
                      {formatMoney(c.valueMinor, 'TRY')}
                      {c.endsAt ? ` · ${t('until')} ${formatDate(c.endsAt)}` : ''}
                    </p>
                  </div>
                  {c.expired ? (
                    <Badge variant="secondary">{t('Expired')}</Badge>
                  ) : !c.isActive ? (
                    <Badge variant="secondary">{t('Off')}</Badge>
                  ) : (
                    <Badge variant="success">{t('Ready to use')}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-600">
            {t('Enter the code in your cart. Each coupon works once.')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
