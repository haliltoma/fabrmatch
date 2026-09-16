import { Form } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'

type Props = InertiaProps<{ materials: string[] }>

type FieldProps = {
  name: string
  label: string
  errors: Record<string, string | undefined>
  hint?: string
  type?: string
  step?: string
  defaultValue?: string
}

function Field({ name, label, errors, hint, type = 'text', step, defaultValue }: FieldProps) {
  return (
    <div className="fm-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        data-invalid={errors[name] ? 'true' : undefined}
      />
      {hint && <p className="fm-field__hint">{hint}</p>}
      {errors[name] && <p className="fm-field__error">{errors[name]}</p>}
    </div>
  )
}

export default function Onboarding({ materials }: Props) {
  return (
    <div className="fm-page">
      <div>
        <h1>Üretici profilinizi oluşturun</h1>
        <p className="fm-small">
          Alıcılar ve satıcılar sizi kimliğinizle değil, size atanan kodla görür. Bilgileri daha sonra
          değiştirebilirsiniz.
        </p>
      </div>

      <section className="fm-card">
        <Form route="panel.onboarding.store" className="fm-form">
          {({ errors, processing }) => (
            <>
              <div className="fm-form__grid">
                <Field name="displayName" label="Atölye adı" errors={errors} />
                <Field name="city" label="Şehir" errors={errors} />
                <Field name="countryCode" label="Ülke kodu" errors={errors} defaultValue="TR" hint="İki harf, ör. TR" />
              </div>

              <div className="fm-field">
                <label>Basabildiğiniz malzemeler</label>
                <div className="fm-checkboxes">
                  {materials.map((material) => (
                    <label key={material}>
                      <input type="checkbox" name="materials[]" value={material} /> {material}
                    </label>
                  ))}
                </div>
                {errors.materials && <p className="fm-field__error">{errors.materials}</p>}
              </div>

              <h3>Yazıcı ve kapasite</h3>
              <div className="fm-form__grid">
                <Field name="maxBuildXMm" label="Baskı alanı X (mm)" type="number" errors={errors} />
                <Field name="maxBuildYMm" label="Baskı alanı Y (mm)" type="number" errors={errors} />
                <Field name="maxBuildZMm" label="Baskı alanı Z (mm)" type="number" errors={errors} />
                <Field
                  name="dailyCapacityGrams"
                  label="Günlük kapasite (gram)"
                  type="number"
                  errors={errors}
                  hint="Tüm yazıcılarınızla bir günde basabileceğiniz toplam malzeme"
                />
              </div>

              <h3>Ücretlendirme</h3>
              <div className="fm-form__grid">
                <Field name="pricePerGram" label="Gram başına ücret (TRY)" type="number" step="0.01" errors={errors} />
                <Field name="hourlyRate" label="Saatlik makine ücreti (TRY)" type="number" step="0.01" errors={errors} />
              </div>

              <div>
                <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
                  başvuruyu gönder
                </button>
              </div>
            </>
          )}
        </Form>
      </section>
    </div>
  )
}
