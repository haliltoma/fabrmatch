import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { LEGAL_DOCS } from '#services/legal/legal_service'
import { isValidVkn } from '#services/identity/tax_ids'
import {
  assertPaymentConfigured,
  currentPaymentRuntime,
  type PaymentRuntime,
} from '#services/payments/provider_registry'
import { salesModel, type SalesModel } from '#services/payments/sales_model'

export interface LaunchInputs {
  salesModel: SalesModel
  company: {
    legalName: string | null
    taxNumber: string | null
    taxOffice: string | null
    address: string | null
  }
  payment: PaymentRuntime
  invoiceProvider: string
  legalVersions: string[]
  legalAcceptanceRequired: boolean
  appUrl: string
  adminTwoFactor: boolean
  previousAppKeySet: boolean
  smtpHost: string | null
  s3Endpoint: string | null
  clamavHost: string | null
  fxProvider: string | null
  /** active makers whose tax and bank details are approved */
  payableMakers: number
}

export interface LaunchCheck {
  id: string
  group: 'company' | 'money' | 'legal' | 'security' | 'operations' | 'supply'
  label: string
  ok: boolean
  /** what to do when it fails (or what was found) */
  detail: string
  /** R7-T8: must pass before real payments are switched on */
  blocking: boolean
}

const local = (value: string | null) =>
  !value || /localhost|127\.0\.0\.1|minio|mailpit|0\.0\.0\.0/.test(value)

/** Minimum makers who can actually be paid before we take real orders. */
export const MIN_PAYABLE_MAKERS = 3

/**
 * R7-T8 launch gate as a live checklist (docs/legal/satis-ve-fatura-modeli.md). Pure: the
 * inputs are gathered once, so every rule is testable on its own.
 */
export function evaluateLaunch(input: LaunchInputs): LaunchCheck[] {
  const production = { ...input.payment, nodeEnv: 'production' as const }
  let paymentError: string | null = null
  try {
    assertPaymentConfigured(production)
  } catch (error) {
    paymentError = (error as Error).message
  }
  const drafts = input.legalVersions.filter((v) => v.includes('draft'))
  const c = input.company

  return [
    {
      id: 'sales_model',
      group: 'company',
      label: 'Fabrmatch sells to the buyer (sales model B)',
      ok: input.salesModel === 'merchant_of_record',
      detail: `SALES_MODEL=${input.salesModel}`,
      blocking: true,
    },
    {
      id: 'company_details',
      group: 'company',
      label: 'Company details for invoices and expense vouchers',
      ok: !!c.legalName && !!c.taxOffice && !!c.address && !!c.taxNumber && isValidVkn(c.taxNumber),
      detail:
        'Set COMPANY_LEGAL_NAME, COMPANY_TAX_NUMBER (valid VKN), COMPANY_TAX_OFFICE, COMPANY_ADDRESS',
      blocking: true,
    },
    {
      id: 'payment_provider',
      group: 'money',
      label: 'Live payment provider',
      ok: input.payment.provider !== 'fake' && paymentError === null,
      detail: paymentError ?? `PAYMENT_PROVIDER=${input.payment.provider}`,
      blocking: true,
    },
    {
      id: 'invoicing',
      group: 'money',
      label: 'E-archive integrator issues the buyer invoice (R7-T5)',
      ok: input.invoiceProvider !== 'fake',
      detail: `Invoice provider: ${input.invoiceProvider} — choose an integrator (K-C)`,
      blocking: true,
    },
    {
      id: 'fx',
      group: 'money',
      label: 'Live exchange rates',
      ok: input.fxProvider !== 'static',
      detail: `FX_PROVIDER=${input.fxProvider ?? 'tcmb (production default)'}`,
      blocking: false,
    },
    {
      id: 'legal_texts',
      group: 'legal',
      label: 'Terms, privacy, distance sales and refund texts approved by a lawyer (R7-T6)',
      ok: drafts.length === 0,
      detail:
        drafts.length > 0
          ? `Still drafts: ${drafts.length} of ${input.legalVersions.length}`
          : 'Final',
      blocking: true,
    },
    {
      id: 'legal_acceptance',
      group: 'legal',
      label: 'Buyers accept the texts at checkout',
      ok: input.legalAcceptanceRequired,
      detail: 'LEGAL_ACCEPTANCE_REQUIRED=true',
      blocking: true,
    },
    {
      id: 'https',
      group: 'security',
      label: 'Site on https',
      ok: input.appUrl.startsWith('https://') && !local(input.appUrl),
      detail: `APP_URL=${input.appUrl}`,
      blocking: true,
    },
    {
      id: 'admin_2fa',
      group: 'security',
      label: 'Admins need two-factor sign-in',
      ok: input.adminTwoFactor,
      detail: 'ADMIN_2FA_REQUIRED must not be false',
      blocking: true,
    },
    {
      id: 'key_rotation',
      group: 'security',
      label: 'No key rotation half-finished',
      ok: !input.previousAppKeySet,
      detail: 'APP_KEY_PREVIOUS is set: finish `node ace security:rotate-key` and remove it',
      blocking: false,
    },
    {
      id: 'email',
      group: 'operations',
      label: 'Real e-mail delivery',
      ok: !local(input.smtpHost),
      detail: `SMTP_HOST=${input.smtpHost ?? '(not set)'}`,
      blocking: true,
    },
    {
      id: 'storage',
      group: 'operations',
      label: 'Model files on real object storage',
      ok: !local(input.s3Endpoint) || input.s3Endpoint === null,
      detail: `S3_ENDPOINT=${input.s3Endpoint ?? '(AWS default)'}`,
      blocking: true,
    },
    {
      id: 'virus_scan',
      group: 'operations',
      label: 'Uploaded files are scanned for viruses',
      ok: !!input.clamavHost,
      detail: `CLAMAV_HOST=${input.clamavHost ?? '(not set)'}`,
      blocking: false,
    },
    {
      id: 'makers',
      group: 'supply',
      label: `At least ${MIN_PAYABLE_MAKERS} makers who can be paid`,
      ok: input.payableMakers >= MIN_PAYABLE_MAKERS,
      detail: `${input.payableMakers} active makers with approved tax and bank details`,
      blocking: true,
    },
  ]
}

export default class LaunchReadinessService {
  async inputs(): Promise<LaunchInputs> {
    const makers = await db
      .from('manufacturer_profiles as m')
      .join('payee_tax_profiles as p', (join) => {
        join.on('p.beneficiary_id', 'm.id').andOnVal('p.beneficiary_type', 'manufacturer')
      })
      .where('m.status', 'active')
      .where('p.status', 'approved')
      .count('* as n')
      .first()
    return {
      salesModel: salesModel(),
      company: {
        legalName: env.get('COMPANY_LEGAL_NAME') ?? null,
        taxNumber: env.get('COMPANY_TAX_NUMBER') ?? null,
        taxOffice: env.get('COMPANY_TAX_OFFICE') ?? null,
        address: env.get('COMPANY_ADDRESS') ?? null,
      },
      payment: currentPaymentRuntime(),
      // the only invoice provider so far is the fake one (R1-T3 frame, R7-T5 pending)
      invoiceProvider: 'fake',
      legalVersions: LEGAL_DOCS.map((d) => d.version),
      legalAcceptanceRequired: env.get('LEGAL_ACCEPTANCE_REQUIRED', false),
      appUrl: env.get('APP_URL'),
      adminTwoFactor: env.get('ADMIN_2FA_REQUIRED', true),
      previousAppKeySet: !!env.get('APP_KEY_PREVIOUS'),
      smtpHost: env.get('SMTP_HOST') ?? null,
      s3Endpoint: env.get('S3_ENDPOINT') ?? null,
      clamavHost: env.get('CLAMAV_HOST') ?? null,
      fxProvider: env.get('FX_PROVIDER') ?? null,
      payableMakers: Number(makers?.n ?? 0),
    }
  }

  async evaluate() {
    return evaluateLaunch(await this.inputs())
  }
}
