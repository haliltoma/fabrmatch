import { usePage } from '@inertiajs/react'
import { useT } from '~/lib/i18n'

type Errors = Record<string, string | string[] | undefined>

/** Validation errors the server sent back with the page (shared `errors` prop). */
export function useFieldErrors(): Errors {
  const { props } = usePage<{ errors?: Errors }>()
  return props.errors ?? {}
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** The server's message for one field, right under it. */
export function FieldError({ name, id }: { name: string; id?: string }) {
  const { t } = useT()
  const message = first(useFieldErrors()[name])
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-sm font-medium text-danger">
      {t(message)}
    </p>
  )
}

/**
 * Every validation error of the last submit in one place, so a refused form never fails
 * silently even when a field has no message slot of its own.
 */
export function FormErrors({ className = '' }: { className?: string }) {
  const { t } = useT()
  const errors = Object.entries(useFieldErrors()).filter(([, v]) => first(v))
  if (errors.length === 0) return null
  return (
    <div role="alert" className={`rounded-md bg-danger-soft p-3 text-sm text-danger ${className}`}>
      <p className="font-medium">{t('Please check the form:')}</p>
      <ul className="mt-1 list-disc pl-5">
        {errors.map(([key, value]) => (
          <li key={key}>{t(first(value)!)}</li>
        ))}
      </ul>
    </div>
  )
}
