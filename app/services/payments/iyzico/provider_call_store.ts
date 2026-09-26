import db from '@adonisjs/lucid/services/db'
import DomainError from '#exceptions/domain_error'
import { IyzicoError } from '#services/payments/iyzico/iyzico_client'

/** Runs a money-moving provider call at most once per idempotency key. */
export interface ProviderCallStore {
  once(key: string, call: () => Promise<string>): Promise<string>
}

export class CallOutcomeUnknownError extends DomainError {
  constructor(key: string) {
    super(
      `An earlier attempt of "${key}" did not report back; check the iyzico panel before retrying`,
      { status: 409 }
    )
  }
}

/**
 * `payment_provider_calls`, written outside any caller transaction: the claim row is committed
 * before iyzico is called, so even a crash between the call and our bookkeeping leaves a trace.
 * A claimed key without a result is never re-sent automatically (the money may have moved).
 */
export default class DbProviderCallStore implements ProviderCallStore {
  constructor(private provider = 'iyzico') {}

  async once(key: string, call: () => Promise<string>) {
    const claimed = await db
      .table('payment_provider_calls')
      .insert({ provider: this.provider, idempotency_key: key, created_at: new Date() })
      .onConflict(['provider', 'idempotency_key'])
      .ignore()
      .returning('id')
    if (claimed.length === 0) {
      const row = await db
        .from('payment_provider_calls')
        .where({ provider: this.provider, idempotency_key: key })
        .select('result_ref')
        .first()
      if (row?.result_ref) return row.result_ref as string
      throw new CallOutcomeUnknownError(key)
    }

    let ref: string
    try {
      ref = await call()
    } catch (error) {
      // iyzico answered with a failure: nothing moved, the key may be tried again
      if (isDefiniteFailure(error)) {
        await db
          .from('payment_provider_calls')
          .where({ provider: this.provider, idempotency_key: key })
          .whereNull('result_ref')
          .delete()
      }
      throw error
    }
    await db
      .from('payment_provider_calls')
      .where({ provider: this.provider, idempotency_key: key })
      .update({ result_ref: ref, completed_at: new Date() })
    return ref
  }
}

/** An explicit error answer from the provider (as opposed to a timeout or a dropped connection). */
function isDefiniteFailure(error: unknown) {
  return error instanceof IyzicoError && error.errorCode !== null
}

/** Same contract in memory, for tests. */
export class MemoryProviderCallStore implements ProviderCallStore {
  results = new Map<string, string>()

  async once(key: string, call: () => Promise<string>) {
    const previous = this.results.get(key)
    if (previous) return previous
    const ref = await call()
    this.results.set(key, ref)
    return ref
  }
}
