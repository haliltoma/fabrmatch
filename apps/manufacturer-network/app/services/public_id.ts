import { randomBytes } from 'node:crypto'

/** Sözleşmede dışarı verilen opak kimlik: `pr_…`, `evt_…`, `pi_…` */
export function publicId(prefix: 'pr' | 'evt' | 'pi') {
  return `${prefix}_${randomBytes(12).toString('base64url')}`
}
