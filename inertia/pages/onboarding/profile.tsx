import { Form } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useT } from '~/lib/i18n'

interface Props {
  selectedRole: 'seller' | 'manufacturer'
}

export default function Profile({ selectedRole }: Props) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-heat-700">
          {t('Step 2 of 2')}
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('Complete your profile')}
        </h1>
        <p className="mt-2 text-ink-600">
          {selectedRole === 'seller'
            ? t('Tell us about your business')
            : t('Set up your manufacturing profile')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedRole === 'seller' ? t('Seller Profile') : t('Manufacturer Profile')}
          </CardTitle>
          <CardDescription>
            {selectedRole === 'seller'
              ? t('This information helps us serve you better.')
              : t('Your identity stays anonymous to buyers. Only your alias is shown.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form route="onboarding.store_profile" className="space-y-4">
            {({ errors }) =>
              selectedRole === 'seller' ? (
                <SellerForm errors={errors} />
              ) : (
                <ManufacturerForm errors={errors} />
              )
            }
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function SellerForm({ errors }: { errors: Record<string, string> }) {
  const { t } = useT()

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="businessName">{t('Business name')}</Label>
        <Input
          name="businessName"
          id="businessName"
          placeholder={t('Acme 3D')}
          data-invalid={errors.businessName ? 'true' : undefined}
        />
        {errors.businessName && (
          <p className="text-sm font-medium text-danger">{errors.businessName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxId">{t('Tax ID (optional)')}</Label>
        <Input
          name="taxId"
          id="taxId"
          placeholder={t('10 or 11 digits')}
          data-invalid={errors.taxId ? 'true' : undefined}
        />
        {errors.taxId && <p className="text-sm font-medium text-danger">{errors.taxId}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isCorporate"
          id="isCorporate"
          value="true"
          className="h-4 w-4 rounded border-ink-900/25 text-ink-600 focus:ring-heat-500"
        />
        <Label htmlFor="isCorporate" className="cursor-pointer">
          {t('Corporate entity')}
        </Label>
      </div>

      <Button type="submit" className="w-full">
        {t('Complete setup')}
      </Button>
    </>
  )
}

function ManufacturerForm({ errors }: { errors: Record<string, string> }) {
  const { t } = useT()

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="city">{t('City (optional)')}</Label>
        <Input
          name="city"
          id="city"
          placeholder={t('Istanbul')}
          data-invalid={errors.city ? 'true' : undefined}
        />
        {errors.city && <p className="text-sm font-medium text-danger">{errors.city}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t('Country code')}</Label>
        <Input
          name="country"
          id="country"
          placeholder={t('TR')}
          defaultValue="TR"
          maxLength={2}
          data-invalid={errors.country ? 'true' : undefined}
        />
        {errors.country && <p className="text-sm font-medium text-danger">{errors.country}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="iban">{t('IBAN (optional)')}</Label>
        <Input
          name="iban"
          id="iban"
          placeholder={t('TR...')}
          data-invalid={errors.iban ? 'true' : undefined}
        />
        {errors.iban && <p className="text-sm font-medium text-danger">{errors.iban}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxId">{t('Tax ID (optional)')}</Label>
        <Input
          name="taxId"
          id="taxId"
          placeholder={t('10 or 11 digits')}
          data-invalid={errors.taxId ? 'true' : undefined}
        />
        {errors.taxId && <p className="text-sm font-medium text-danger">{errors.taxId}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isCorporate"
          id="isCorporate"
          value="true"
          className="h-4 w-4 rounded border-ink-900/25 text-ink-600 focus:ring-heat-500"
        />
        <Label htmlFor="isCorporate" className="cursor-pointer">
          {t('Corporate entity')}
        </Label>
      </div>

      <Button type="submit" className="w-full">
        {t('Complete setup')}
      </Button>
    </>
  )
}
