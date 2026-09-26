/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  language: {
    update: typeof routes['language.update']
  }
  status: {
    status: typeof routes['status.status']
    changelog: typeof routes['status.changelog']
  }
  support: {
    help: typeof routes['support.help']
    submit: typeof routes['support.submit']
  }
  legal: {
    show: typeof routes['legal.show']
  }
  content: {
    blogIndex: typeof routes['content.blog_index']
    blogShow: typeof routes['content.blog_show']
    glossaryIndex: typeof routes['content.glossary_index']
    glossaryShow: typeof routes['content.glossary_show']
  }
  materialPage: {
    index: typeof routes['material_page.index']
    show: typeof routes['material_page.show']
  }
  marketing: {
    forMakers: typeof routes['marketing.for_makers']
    forSellers: typeof routes['marketing.for_sellers']
    join: typeof routes['marketing.join']
  }
  tool: {
    makerIncome: typeof routes['tool.maker_income']
    quickQuotePage: typeof routes['tool.quick_quote_page']
    quickQuote: typeof routes['tool.quick_quote']
  }
  twoFactorChallenge: {
    create: typeof routes['two_factor_challenge.create']
    store: typeof routes['two_factor_challenge.store']
  }
  accountPrivacy: {
    show: typeof routes['account_privacy.show']
    export: typeof routes['account_privacy.export']
    destroy: typeof routes['account_privacy.destroy']
  }
  accountReferral: {
    show: typeof routes['account_referral.show']
  }
  accountSecurity: {
    show: typeof routes['account_security.show']
    startTwoFactor: typeof routes['account_security.start_two_factor']
    enableTwoFactor: typeof routes['account_security.enable_two_factor']
    disableTwoFactor: typeof routes['account_security.disable_two_factor']
    regenerateBackupCodes: typeof routes['account_security.regenerate_backup_codes']
    changePassword: typeof routes['account_security.change_password']
    revokeOthers: typeof routes['account_security.revoke_others']
    revokeSession: typeof routes['account_security.revoke_session']
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  authSecurity: {
    showForgotPassword: typeof routes['auth_security.show_forgot_password']
    sendReset: typeof routes['auth_security.send_reset']
    showResetPassword: typeof routes['auth_security.show_reset_password']
    resetPassword: typeof routes['auth_security.reset_password']
    verifyEmail: typeof routes['auth_security.verify_email']
    resendVerification: typeof routes['auth_security.resend_verification']
  }
  onboarding: {
    show: typeof routes['onboarding.show']
    storeRole: typeof routes['onboarding.store_role']
    showProfile: typeof routes['onboarding.show_profile']
    storeProfile: typeof routes['onboarding.store_profile']
  }
  modelFile: {
    index: typeof routes['model_file.index']
    getUploadUrl: typeof routes['model_file.get_upload_url']
    register: typeof routes['model_file.register']
    previewUrl: typeof routes['model_file.preview_url']
  }
  quote: {
    show: typeof routes['quote.show']
    calculate: typeof routes['quote.calculate']
  }
  storefront: {
    index: typeof routes['storefront.index']
    show: typeof routes['storefront.show']
    order: typeof routes['storefront.order']
    sitemap: typeof routes['storefront.sitemap']
    robots: typeof routes['storefront.robots']
  }
  productImage: {
    show: typeof routes['product_image.show']
    adminShow: typeof routes['product_image.admin_show']
  }
  notification: {
    index: typeof routes['notification.index']
    preferences: typeof routes['notification.preferences']
    updatePreference: typeof routes['notification.update_preference']
    readAll: typeof routes['notification.read_all']
    open: typeof routes['notification.open']
  }
  health: {
    show: typeof routes['health.show']
  }
  carrierWebhook: typeof routes['carrier_webhook']
  paymentWebhook: typeof routes['payment_webhook']
  contentReport: {
    store: typeof routes['content_report.store']
  }
  cart: {
    show: typeof routes['cart.show']
    add: typeof routes['cart.add']
    update: typeof routes['cart.update']
    remove: typeof routes['cart.remove']
    checkout: typeof routes['cart.checkout']
  }
  order: {
    index: typeof routes['order.index']
    store: typeof routes['order.store']
    show: typeof routes['order.show']
    cancel: typeof routes['order.cancel']
    pay: typeof routes['order.pay']
    simulatePayment: typeof routes['order.simulate_payment']
    delivered: typeof routes['order.delivered']
    complete: typeof routes['order.complete']
    review: typeof routes['order.review']
  }
  invoice: {
    show: typeof routes['invoice.show']
  }
  orderMessage: {
    show: typeof routes['order_message.show']
    store: typeof routes['order_message.store']
  }
  dispute: {
    open: typeof routes['dispute.open']
    uploadUrl: typeof routes['dispute.upload_url']
    addEvidence: typeof routes['dispute.add_evidence']
    respond: typeof routes['dispute.respond']
  }
  testCheckout: {
    show: typeof routes['test_checkout.show']
    pay: typeof routes['test_checkout.pay']
  }
  sellerDashboard: {
    index: typeof routes['seller_dashboard.index']
  }
  sellerOrder: {
    index: typeof routes['seller_order.index']
  }
  sellerProduct: {
    index: typeof routes['seller_product.index']
    store: typeof routes['seller_product.store']
    update: typeof routes['seller_product.update']
    setStatus: typeof routes['seller_product.set_status']
    sample: typeof routes['seller_product.sample']
  }
  sellerInsight: {
    marginPreview: typeof routes['seller_insight.margin_preview']
    analytics: typeof routes['seller_insight.analytics']
    statement: typeof routes['seller_insight.statement']
  }
  sellerBranding: {
    show: typeof routes['seller_branding.show']
    save: typeof routes['seller_branding.save']
  }
  sellerDeveloper: {
    index: typeof routes['seller_developer.index']
    createKey: typeof routes['seller_developer.create_key']
    revokeKey: typeof routes['seller_developer.revoke_key']
    createWebhook: typeof routes['seller_developer.create_webhook']
    toggleWebhook: typeof routes['seller_developer.toggle_webhook']
    deleteWebhook: typeof routes['seller_developer.delete_webhook']
    testWebhook: typeof routes['seller_developer.test_webhook']
  }
  rfq: {
    index: typeof routes['rfq.index']
    create: typeof routes['rfq.create']
    store: typeof routes['rfq.store']
    show: typeof routes['rfq.show']
    award: typeof routes['rfq.award']
    cancel: typeof routes['rfq.cancel']
  }
  api: {
    orders: typeof routes['api.orders']
    order: typeof routes['api.order']
    products: typeof routes['api.products']
  }
  makerDashboard: {
    index: typeof routes['maker_dashboard.index']
  }
  printer: {
    index: typeof routes['printer.index']
    store: typeof routes['printer.store']
    update: typeof routes['printer.update']
    toggleActive: typeof routes['printer.toggle_active']
    setProfiles: typeof routes['printer.set_profiles']
    storeMaterial: typeof routes['printer.store_material']
    updateMaterial: typeof routes['printer.update_material']
    destroyMaterial: typeof routes['printer.destroy_material']
  }
  makerWork: {
    index: typeof routes['maker_work.index']
    accept: typeof routes['maker_work.accept']
    decline: typeof routes['maker_work.decline']
    packingSlip: typeof routes['maker_work.packing_slip']
    printing: typeof routes['maker_work.printing']
    produced: typeof routes['maker_work.produced']
    qcUploadUrl: typeof routes['maker_work.qc_upload_url']
    qcRegister: typeof routes['maker_work.qc_register']
    ship: typeof routes['maker_work.ship']
    offerPhoto: typeof routes['maker_work.offer_photo']
    download: typeof routes['maker_work.download']
  }
  makerOrderMessage: {
    show: typeof routes['maker_order_message.show']
    store: typeof routes['maker_order_message.store']
  }
  makerRfq: {
    index: typeof routes['maker_rfq.index']
    show: typeof routes['maker_rfq.show']
    bid: typeof routes['maker_rfq.bid']
    withdraw: typeof routes['maker_rfq.withdraw']
  }
  makerFinishing: {
    show: typeof routes['maker_finishing.show']
    save: typeof routes['maker_finishing.save']
  }
  makerPayout: {
    show: typeof routes['maker_payout.show']
    save: typeof routes['maker_payout.save']
  }
  makerPerformance: {
    scorecard: typeof routes['maker_performance.scorecard']
    earnings: typeof routes['maker_performance.earnings']
    statement: typeof routes['maker_performance.statement']
  }
  capacity: {
    index: typeof routes['capacity.index']
    setSlot: typeof routes['capacity.set_slot']
    saveTemplate: typeof routes['capacity.save_template']
    applyTemplate: typeof routes['capacity.apply_template']
  }
  adminDashboard: {
    index: typeof routes['admin_dashboard.index']
  }
  adminCatalog: {
    index: typeof routes['admin_catalog.index']
    store: typeof routes['admin_catalog.store']
    update: typeof routes['admin_catalog.update']
    toggleActive: typeof routes['admin_catalog.toggle_active']
  }
  adminCategory: {
    store: typeof routes['admin_category.store']
    toggle: typeof routes['admin_category.toggle']
  }
  adminDispute: {
    index: typeof routes['admin_dispute.index']
    show: typeof routes['admin_dispute.show']
    resolve: typeof routes['admin_dispute.resolve']
  }
  adminQueue: {
    index: typeof routes['admin_queue.index']
    rematch: typeof routes['admin_queue.rematch']
    acknowledge: typeof routes['admin_queue.acknowledge']
    decideMaker: typeof routes['admin_queue.decide_maker']
    fraudDecision: typeof routes['admin_queue.fraud_decision']
    reportDecision: typeof routes['admin_queue.report_decision']
    chargebackDecision: typeof routes['admin_queue.chargeback_decision']
    supportAnswered: typeof routes['admin_queue.support_answered']
    shopPhotoDecision: typeof routes['admin_queue.shop_photo_decision']
  }
  adminReferenceCatalog: {
    index: typeof routes['admin_reference_catalog.index']
    storeMaterial: typeof routes['admin_reference_catalog.store_material']
    toggleMaterial: typeof routes['admin_reference_catalog.toggle_material']
    storeColor: typeof routes['admin_reference_catalog.store_color']
    toggleColor: typeof routes['admin_reference_catalog.toggle_color']
  }
  adminMetrics: {
    index: typeof routes['admin_metrics.index']
  }
  adminGrowth: {
    index: typeof routes['admin_growth.index']
  }
  adminQueueMonitor: {
    index: typeof routes['admin_queue_monitor.index']
    runAgain: typeof routes['admin_queue_monitor.run_again']
  }
  adminMatching: {
    index: typeof routes['admin_matching.index']
    mode: typeof routes['admin_matching.mode']
    show: typeof routes['admin_matching.show']
    offer: typeof routes['admin_matching.offer']
  }
  adminOrder: {
    index: typeof routes['admin_order.index']
    show: typeof routes['admin_order.show']
  }
  adminMessage: {
    show: typeof routes['admin_message.show']
  }
  adminUser: {
    index: typeof routes['admin_user.index']
    suspend: typeof routes['admin_user.suspend']
    unsuspend: typeof routes['admin_user.unsuspend']
  }
  adminAudit: {
    index: typeof routes['admin_audit.index']
  }
  adminFinishing: {
    index: typeof routes['admin_finishing.index']
    store: typeof routes['admin_finishing.store']
    update: typeof routes['admin_finishing.update']
  }
  adminPrintProfile: {
    index: typeof routes['admin_print_profile.index']
    store: typeof routes['admin_print_profile.store']
    toggle: typeof routes['admin_print_profile.toggle']
  }
  adminShipping: {
    index: typeof routes['admin_shipping.index']
    updateRate: typeof routes['admin_shipping.update_rate']
    updateExtra: typeof routes['admin_shipping.update_extra']
  }
  adminMaker: {
    index: typeof routes['admin_maker.index']
    setTier: typeof routes['admin_maker.set_tier']
    unlockTier: typeof routes['admin_maker.unlock_tier']
  }
  adminExperiment: {
    index: typeof routes['admin_experiment.index']
  }
  adminReport: {
    index: typeof routes['admin_report.index']
    download: typeof routes['admin_report.download']
  }
  adminCoupon: {
    index: typeof routes['admin_coupon.index']
    store: typeof routes['admin_coupon.store']
    toggle: typeof routes['admin_coupon.toggle']
  }
  adminSettings: {
    index: typeof routes['admin_settings.index']
    update: typeof routes['admin_settings.update']
    reset: typeof routes['admin_settings.reset']
  }
}
