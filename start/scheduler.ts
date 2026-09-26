import AutoConfirmDelivery from '#jobs/auto_confirm_delivery'
import CheckProductionSla from '#jobs/check_production_sla'
import CancelStaleUnmatched from '#jobs/cancel_stale_unmatched'
import ExpireStaleOffers from '#jobs/expire_stale_offers'
import ReleasePayouts from '#jobs/release_payouts'
import SettleRefunds from '#jobs/settle_refunds'
import RecomputeTrustTiers from '#jobs/recompute_trust_tiers'
import RunHealthCheck from '#jobs/run_health_check'
import IssueInvoices from '#jobs/issue_invoices'
import RunLifecycle from '#jobs/run_lifecycle'
import DeliverWebhooks from '#jobs/deliver_webhooks'
import CloseRfqs from '#jobs/close_rfqs'
import RefreshFxRates from '#jobs/refresh_fx_rates'
import ReconcilePayments from '#jobs/reconcile_payments'
import SyncPendingPayments from '#jobs/sync_pending_payments'

await AutoConfirmDelivery.schedule({}).id('auto-confirm-delivery').every('1h').run()
await CheckProductionSla.schedule({}).id('check-production-sla').every('1h').run()
await ExpireStaleOffers.schedule({}).id('expire-stale-offers').every('5m').run()
await ReleasePayouts.schedule({}).id('release-payouts').every('10m').run()
await SettleRefunds.schedule({}).id('settle-refunds').every('10m').run()
await SyncPendingPayments.schedule({}).id('sync-pending-payments').every('5m').run()
await ReconcilePayments.schedule({}).id('reconcile-payments').every('1d').run()
await CancelStaleUnmatched.schedule({}).id('cancel-stale-unmatched').every('1h').run()
await RecomputeTrustTiers.schedule({}).id('recompute-trust-tiers').every('1d').run()
await RunHealthCheck.schedule({}).id('run-health-check').every('5m').run()
await IssueInvoices.schedule({}).id('issue-invoices').every('1h').run()
await RunLifecycle.schedule({}).id('run-lifecycle').every('1h').run()
await DeliverWebhooks.schedule({}).id('deliver-webhooks').every('1m').run()
await RefreshFxRates.schedule({}).id('refresh-fx-rates').every('6h').run()
await CloseRfqs.schedule({}).id('close-rfqs').every('10m').run()
