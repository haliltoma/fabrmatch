import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'language.update': { paramsTuple?: []; params?: {} }
    'currency.update': { paramsTuple?: []; params?: {} }
    'status.status': { paramsTuple?: []; params?: {} }
    'status.changelog': { paramsTuple?: []; params?: {} }
    'support.help': { paramsTuple?: []; params?: {} }
    'support.submit': { paramsTuple?: []; params?: {} }
    'legal.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.blog_index': { paramsTuple?: []; params?: {} }
    'content.blog_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.glossary_index': { paramsTuple?: []; params?: {} }
    'content.glossary_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'material_page.index': { paramsTuple?: []; params?: {} }
    'material_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'city_page.index': { paramsTuple?: []; params?: {} }
    'city_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'use_case_page.index': { paramsTuple?: []; params?: {} }
    'use_case_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'marketing.for_makers': { paramsTuple?: []; params?: {} }
    'marketing.for_sellers': { paramsTuple?: []; params?: {} }
    'tool.maker_income': { paramsTuple?: []; params?: {} }
    'tool.quick_quote_page': { paramsTuple?: []; params?: {} }
    'tool.quick_quote': { paramsTuple?: []; params?: {} }
    'marketing.join': { paramsTuple?: []; params?: {} }
    'two_factor_challenge.create': { paramsTuple?: []; params?: {} }
    'two_factor_challenge.store': { paramsTuple?: []; params?: {} }
    'account_privacy.show': { paramsTuple?: []; params?: {} }
    'account_privacy.export': { paramsTuple?: []; params?: {} }
    'account_privacy.destroy': { paramsTuple?: []; params?: {} }
    'account_referral.show': { paramsTuple?: []; params?: {} }
    'account_security.show': { paramsTuple?: []; params?: {} }
    'account_security.start_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.enable_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.disable_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.regenerate_backup_codes': { paramsTuple?: []; params?: {} }
    'account_security.change_password': { paramsTuple?: []; params?: {} }
    'account_security.revoke_others': { paramsTuple?: []; params?: {} }
    'account_security.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'auth_security.show_forgot_password': { paramsTuple?: []; params?: {} }
    'auth_security.send_reset': { paramsTuple?: []; params?: {} }
    'auth_security.show_reset_password': { paramsTuple?: []; params?: {} }
    'auth_security.reset_password': { paramsTuple?: []; params?: {} }
    'auth_security.verify_email': { paramsTuple?: []; params?: {} }
    'auth_security.resend_verification': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'onboarding.store_role': { paramsTuple?: []; params?: {} }
    'onboarding.show_profile': { paramsTuple?: []; params?: {} }
    'onboarding.store_profile': { paramsTuple?: []; params?: {} }
    'model_file.index': { paramsTuple?: []; params?: {} }
    'model_file.get_upload_url': { paramsTuple?: []; params?: {} }
    'model_file.register': { paramsTuple?: []; params?: {} }
    'model_file.preview_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'quote.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'quote.calculate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.index': { paramsTuple?: []; params?: {} }
    'storefront.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'slug'?: ParamValue} }
    'storefront.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'product_image.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.sitemap': { paramsTuple?: []; params?: {} }
    'storefront.robots': { paramsTuple?: []; params?: {} }
    'notification.index': { paramsTuple?: []; params?: {} }
    'notification.preferences': { paramsTuple?: []; params?: {} }
    'notification.update_preference': { paramsTuple?: []; params?: {} }
    'notification.read_all': { paramsTuple?: []; params?: {} }
    'notification.open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'health.show': { paramsTuple?: []; params?: {} }
    'carrier_webhook': { paramsTuple?: []; params?: {} }
    'payment_webhook': { paramsTuple?: []; params?: {} }
    'store_webhook.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'payment_return': { paramsTuple?: []; params?: {} }
    'content_report.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.show': { paramsTuple?: []; params?: {} }
    'cart.add': { paramsTuple?: []; params?: {} }
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.checkout': { paramsTuple?: []; params?: {} }
    'order.index': { paramsTuple?: []; params?: {} }
    'order.store': { paramsTuple?: []; params?: {} }
    'order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.pay_from_wallet': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.simulate_payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.delivered': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.review': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order_message.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dispute.open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.index': { paramsTuple?: []; params?: {} }
    'dispute.upload_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dispute.add_evidence': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'test_checkout.show': { paramsTuple: [ParamValue]; params: {'ref': ParamValue} }
    'test_checkout.pay': { paramsTuple: [ParamValue]; params: {'ref': ParamValue} }
    'seller_dashboard.index': { paramsTuple?: []; params?: {} }
    'seller_order.index': { paramsTuple?: []; params?: {} }
    'seller_product.index': { paramsTuple?: []; params?: {} }
    'seller_insight.margin_preview': { paramsTuple?: []; params?: {} }
    'seller_insight.analytics': { paramsTuple?: []; params?: {} }
    'seller_insight.statement': { paramsTuple?: []; params?: {} }
    'seller_branding.show': { paramsTuple?: []; params?: {} }
    'seller_branding.save': { paramsTuple?: []; params?: {} }
    'seller_branding.logo': { paramsTuple?: []; params?: {} }
    'seller_branding.upload_logo': { paramsTuple?: []; params?: {} }
    'seller_branding.remove_logo': { paramsTuple?: []; params?: {} }
    'seller_store.index': { paramsTuple?: []; params?: {} }
    'seller_store.connect': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_start': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_callback': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_categories': { paramsTuple?: []; params?: {} }
    'seller_store.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.connect_test': { paramsTuple?: []; params?: {} }
    'seller_store.sync': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.disconnect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.map': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_wallet.show': { paramsTuple?: []; params?: {} }
    'seller_wallet.top_up': { paramsTuple?: []; params?: {} }
    'seller_wallet.auto_pay': { paramsTuple?: []; params?: {} }
    'seller_wallet.refund': { paramsTuple?: []; params?: {} }
    'seller_payout.show': { paramsTuple?: []; params?: {} }
    'seller_payout.save': { paramsTuple?: []; params?: {} }
    'seller_payout.invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.index': { paramsTuple?: []; params?: {} }
    'seller_developer.create_key': { paramsTuple?: []; params?: {} }
    'seller_developer.revoke_key': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.create_webhook': { paramsTuple?: []; params?: {} }
    'seller_developer.toggle_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.delete_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.test_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_product.store': { paramsTuple?: []; params?: {} }
    'seller_product.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_product.set_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_product.sample': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rfq.index': { paramsTuple?: []; params?: {} }
    'rfq.create': { paramsTuple?: []; params?: {} }
    'rfq.store': { paramsTuple?: []; params?: {} }
    'rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rfq.award': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rfq.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.openapi': { paramsTuple?: []; params?: {} }
    'api.orders': { paramsTuple?: []; params?: {} }
    'api.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.products': { paramsTuple?: []; params?: {} }
    'maker_dashboard.index': { paramsTuple?: []; params?: {} }
    'printer.index': { paramsTuple?: []; params?: {} }
    'printer.store': { paramsTuple?: []; params?: {} }
    'printer.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.set_profiles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.store_material': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.update_material': { paramsTuple: [ParamValue,ParamValue]; params: {'printerId': ParamValue,'id': ParamValue} }
    'printer.destroy_material': { paramsTuple: [ParamValue,ParamValue]; params: {'printerId': ParamValue,'id': ParamValue} }
    'maker_work.index': { paramsTuple?: []; params?: {} }
    'maker_work.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.packing_slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.printing': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.produced': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.qc_upload_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.qc_register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.ship': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.offer_photo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.download': { paramsTuple: [ParamValue]; params: {'grantId': ParamValue} }
    'dispute.respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_order_message.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.index': { paramsTuple?: []; params?: {} }
    'maker_rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.bid': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_finishing.show': { paramsTuple?: []; params?: {} }
    'maker_finishing.save': { paramsTuple?: []; params?: {} }
    'maker_payout.show': { paramsTuple?: []; params?: {} }
    'maker_payout.save': { paramsTuple?: []; params?: {} }
    'maker_payout.invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_performance.scorecard': { paramsTuple?: []; params?: {} }
    'maker_performance.earnings': { paramsTuple?: []; params?: {} }
    'maker_performance.statement': { paramsTuple?: []; params?: {} }
    'capacity.index': { paramsTuple?: []; params?: {} }
    'capacity.set_slot': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capacity.save_template': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capacity.apply_template': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_dashboard.index': { paramsTuple?: []; params?: {} }
    'admin_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_catalog.store': { paramsTuple?: []; params?: {} }
    'admin_catalog.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_catalog.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_category.store': { paramsTuple?: []; params?: {} }
    'admin_category.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_dispute.index': { paramsTuple?: []; params?: {} }
    'admin_dispute.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_dispute.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.index': { paramsTuple?: []; params?: {} }
    'admin_queue.rematch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.acknowledge': { paramsTuple?: []; params?: {} }
    'admin_queue.decide_maker': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.fraud_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.report_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.chargeback_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.support_answered': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.shop_photo_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_reference_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.store_material': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.toggle_material': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_reference_catalog.store_color': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.toggle_color': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_metrics.index': { paramsTuple?: []; params?: {} }
    'admin_growth.index': { paramsTuple?: []; params?: {} }
    'admin_queue_monitor.index': { paramsTuple?: []; params?: {} }
    'admin_queue_monitor.run_again': { paramsTuple?: []; params?: {} }
    'admin_matching.index': { paramsTuple?: []; params?: {} }
    'admin_matching.mode': { paramsTuple?: []; params?: {} }
    'admin_matching.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_matching.offer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_order.index': { paramsTuple?: []; params?: {} }
    'admin_order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'product_image.admin_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.index': { paramsTuple?: []; params?: {} }
    'admin_user.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.unsuspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_audit.index': { paramsTuple?: []; params?: {} }
    'admin_finishing.index': { paramsTuple?: []; params?: {} }
    'admin_finishing.store': { paramsTuple?: []; params?: {} }
    'admin_finishing.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_print_profile.index': { paramsTuple?: []; params?: {} }
    'admin_print_profile.store': { paramsTuple?: []; params?: {} }
    'admin_print_profile.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_shipping.index': { paramsTuple?: []; params?: {} }
    'admin_shipping.update_rate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_shipping.update_extra': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_maker.index': { paramsTuple?: []; params?: {} }
    'admin_maker.set_tier': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_maker.unlock_tier': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_experiment.index': { paramsTuple?: []; params?: {} }
    'admin_report.index': { paramsTuple?: []; params?: {} }
    'admin_report.download': { paramsTuple: [ParamValue]; params: {'kind': ParamValue} }
    'admin_coupon.index': { paramsTuple?: []; params?: {} }
    'admin_coupon.store': { paramsTuple?: []; params?: {} }
    'admin_coupon.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.index': { paramsTuple?: []; params?: {} }
    'admin_payout.ready_csv': { paramsTuple?: []; params?: {} }
    'admin_payout.review_profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.profile_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.review_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.invoice_file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.mark_paid': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_launch.index': { paramsTuple?: []; params?: {} }
    'admin_settings.index': { paramsTuple?: []; params?: {} }
    'admin_settings.update': { paramsTuple?: []; params?: {} }
    'admin_settings.reset': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'status.status': { paramsTuple?: []; params?: {} }
    'status.changelog': { paramsTuple?: []; params?: {} }
    'support.help': { paramsTuple?: []; params?: {} }
    'legal.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.blog_index': { paramsTuple?: []; params?: {} }
    'content.blog_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.glossary_index': { paramsTuple?: []; params?: {} }
    'content.glossary_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'material_page.index': { paramsTuple?: []; params?: {} }
    'material_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'city_page.index': { paramsTuple?: []; params?: {} }
    'city_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'use_case_page.index': { paramsTuple?: []; params?: {} }
    'use_case_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'marketing.for_makers': { paramsTuple?: []; params?: {} }
    'marketing.for_sellers': { paramsTuple?: []; params?: {} }
    'tool.maker_income': { paramsTuple?: []; params?: {} }
    'tool.quick_quote_page': { paramsTuple?: []; params?: {} }
    'two_factor_challenge.create': { paramsTuple?: []; params?: {} }
    'account_privacy.show': { paramsTuple?: []; params?: {} }
    'account_privacy.export': { paramsTuple?: []; params?: {} }
    'account_referral.show': { paramsTuple?: []; params?: {} }
    'account_security.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'auth_security.show_forgot_password': { paramsTuple?: []; params?: {} }
    'auth_security.show_reset_password': { paramsTuple?: []; params?: {} }
    'auth_security.verify_email': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'onboarding.show_profile': { paramsTuple?: []; params?: {} }
    'model_file.index': { paramsTuple?: []; params?: {} }
    'model_file.preview_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'quote.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.index': { paramsTuple?: []; params?: {} }
    'storefront.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'slug'?: ParamValue} }
    'product_image.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.sitemap': { paramsTuple?: []; params?: {} }
    'storefront.robots': { paramsTuple?: []; params?: {} }
    'notification.index': { paramsTuple?: []; params?: {} }
    'notification.preferences': { paramsTuple?: []; params?: {} }
    'notification.open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'health.show': { paramsTuple?: []; params?: {} }
    'cart.show': { paramsTuple?: []; params?: {} }
    'order.index': { paramsTuple?: []; params?: {} }
    'order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.index': { paramsTuple?: []; params?: {} }
    'test_checkout.show': { paramsTuple: [ParamValue]; params: {'ref': ParamValue} }
    'seller_dashboard.index': { paramsTuple?: []; params?: {} }
    'seller_order.index': { paramsTuple?: []; params?: {} }
    'seller_product.index': { paramsTuple?: []; params?: {} }
    'seller_insight.margin_preview': { paramsTuple?: []; params?: {} }
    'seller_insight.analytics': { paramsTuple?: []; params?: {} }
    'seller_insight.statement': { paramsTuple?: []; params?: {} }
    'seller_branding.show': { paramsTuple?: []; params?: {} }
    'seller_branding.logo': { paramsTuple?: []; params?: {} }
    'seller_store.index': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_start': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_callback': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_categories': { paramsTuple?: []; params?: {} }
    'seller_wallet.show': { paramsTuple?: []; params?: {} }
    'seller_payout.show': { paramsTuple?: []; params?: {} }
    'seller_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.index': { paramsTuple?: []; params?: {} }
    'rfq.index': { paramsTuple?: []; params?: {} }
    'rfq.create': { paramsTuple?: []; params?: {} }
    'rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.openapi': { paramsTuple?: []; params?: {} }
    'api.orders': { paramsTuple?: []; params?: {} }
    'api.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.products': { paramsTuple?: []; params?: {} }
    'maker_dashboard.index': { paramsTuple?: []; params?: {} }
    'printer.index': { paramsTuple?: []; params?: {} }
    'maker_work.index': { paramsTuple?: []; params?: {} }
    'maker_work.packing_slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.index': { paramsTuple?: []; params?: {} }
    'maker_rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_finishing.show': { paramsTuple?: []; params?: {} }
    'maker_payout.show': { paramsTuple?: []; params?: {} }
    'maker_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_performance.scorecard': { paramsTuple?: []; params?: {} }
    'maker_performance.earnings': { paramsTuple?: []; params?: {} }
    'maker_performance.statement': { paramsTuple?: []; params?: {} }
    'capacity.index': { paramsTuple?: []; params?: {} }
    'admin_dashboard.index': { paramsTuple?: []; params?: {} }
    'admin_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_dispute.index': { paramsTuple?: []; params?: {} }
    'admin_dispute.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.index': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_metrics.index': { paramsTuple?: []; params?: {} }
    'admin_growth.index': { paramsTuple?: []; params?: {} }
    'admin_queue_monitor.index': { paramsTuple?: []; params?: {} }
    'admin_matching.index': { paramsTuple?: []; params?: {} }
    'admin_matching.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_order.index': { paramsTuple?: []; params?: {} }
    'admin_order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'product_image.admin_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.index': { paramsTuple?: []; params?: {} }
    'admin_audit.index': { paramsTuple?: []; params?: {} }
    'admin_finishing.index': { paramsTuple?: []; params?: {} }
    'admin_print_profile.index': { paramsTuple?: []; params?: {} }
    'admin_shipping.index': { paramsTuple?: []; params?: {} }
    'admin_maker.index': { paramsTuple?: []; params?: {} }
    'admin_experiment.index': { paramsTuple?: []; params?: {} }
    'admin_report.index': { paramsTuple?: []; params?: {} }
    'admin_report.download': { paramsTuple: [ParamValue]; params: {'kind': ParamValue} }
    'admin_coupon.index': { paramsTuple?: []; params?: {} }
    'admin_payout.index': { paramsTuple?: []; params?: {} }
    'admin_payout.ready_csv': { paramsTuple?: []; params?: {} }
    'admin_payout.profile_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.invoice_file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_launch.index': { paramsTuple?: []; params?: {} }
    'admin_settings.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'status.status': { paramsTuple?: []; params?: {} }
    'status.changelog': { paramsTuple?: []; params?: {} }
    'support.help': { paramsTuple?: []; params?: {} }
    'legal.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.blog_index': { paramsTuple?: []; params?: {} }
    'content.blog_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'content.glossary_index': { paramsTuple?: []; params?: {} }
    'content.glossary_show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'material_page.index': { paramsTuple?: []; params?: {} }
    'material_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'city_page.index': { paramsTuple?: []; params?: {} }
    'city_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'use_case_page.index': { paramsTuple?: []; params?: {} }
    'use_case_page.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'marketing.for_makers': { paramsTuple?: []; params?: {} }
    'marketing.for_sellers': { paramsTuple?: []; params?: {} }
    'tool.maker_income': { paramsTuple?: []; params?: {} }
    'tool.quick_quote_page': { paramsTuple?: []; params?: {} }
    'two_factor_challenge.create': { paramsTuple?: []; params?: {} }
    'account_privacy.show': { paramsTuple?: []; params?: {} }
    'account_privacy.export': { paramsTuple?: []; params?: {} }
    'account_referral.show': { paramsTuple?: []; params?: {} }
    'account_security.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'auth_security.show_forgot_password': { paramsTuple?: []; params?: {} }
    'auth_security.show_reset_password': { paramsTuple?: []; params?: {} }
    'auth_security.verify_email': { paramsTuple?: []; params?: {} }
    'onboarding.show': { paramsTuple?: []; params?: {} }
    'onboarding.show_profile': { paramsTuple?: []; params?: {} }
    'model_file.index': { paramsTuple?: []; params?: {} }
    'model_file.preview_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'quote.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.index': { paramsTuple?: []; params?: {} }
    'storefront.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'slug'?: ParamValue} }
    'product_image.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.sitemap': { paramsTuple?: []; params?: {} }
    'storefront.robots': { paramsTuple?: []; params?: {} }
    'notification.index': { paramsTuple?: []; params?: {} }
    'notification.preferences': { paramsTuple?: []; params?: {} }
    'notification.open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'health.show': { paramsTuple?: []; params?: {} }
    'cart.show': { paramsTuple?: []; params?: {} }
    'order.index': { paramsTuple?: []; params?: {} }
    'order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoice.index': { paramsTuple?: []; params?: {} }
    'test_checkout.show': { paramsTuple: [ParamValue]; params: {'ref': ParamValue} }
    'seller_dashboard.index': { paramsTuple?: []; params?: {} }
    'seller_order.index': { paramsTuple?: []; params?: {} }
    'seller_product.index': { paramsTuple?: []; params?: {} }
    'seller_insight.margin_preview': { paramsTuple?: []; params?: {} }
    'seller_insight.analytics': { paramsTuple?: []; params?: {} }
    'seller_insight.statement': { paramsTuple?: []; params?: {} }
    'seller_branding.show': { paramsTuple?: []; params?: {} }
    'seller_branding.logo': { paramsTuple?: []; params?: {} }
    'seller_store.index': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_start': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_callback': { paramsTuple?: []; params?: {} }
    'seller_store.etsy_categories': { paramsTuple?: []; params?: {} }
    'seller_wallet.show': { paramsTuple?: []; params?: {} }
    'seller_payout.show': { paramsTuple?: []; params?: {} }
    'seller_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.index': { paramsTuple?: []; params?: {} }
    'rfq.index': { paramsTuple?: []; params?: {} }
    'rfq.create': { paramsTuple?: []; params?: {} }
    'rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.openapi': { paramsTuple?: []; params?: {} }
    'api.orders': { paramsTuple?: []; params?: {} }
    'api.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.products': { paramsTuple?: []; params?: {} }
    'maker_dashboard.index': { paramsTuple?: []; params?: {} }
    'printer.index': { paramsTuple?: []; params?: {} }
    'maker_work.index': { paramsTuple?: []; params?: {} }
    'maker_work.packing_slip': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_order_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.index': { paramsTuple?: []; params?: {} }
    'maker_rfq.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_finishing.show': { paramsTuple?: []; params?: {} }
    'maker_payout.show': { paramsTuple?: []; params?: {} }
    'maker_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_performance.scorecard': { paramsTuple?: []; params?: {} }
    'maker_performance.earnings': { paramsTuple?: []; params?: {} }
    'maker_performance.statement': { paramsTuple?: []; params?: {} }
    'capacity.index': { paramsTuple?: []; params?: {} }
    'admin_dashboard.index': { paramsTuple?: []; params?: {} }
    'admin_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_dispute.index': { paramsTuple?: []; params?: {} }
    'admin_dispute.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.index': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.index': { paramsTuple?: []; params?: {} }
    'admin_metrics.index': { paramsTuple?: []; params?: {} }
    'admin_growth.index': { paramsTuple?: []; params?: {} }
    'admin_queue_monitor.index': { paramsTuple?: []; params?: {} }
    'admin_matching.index': { paramsTuple?: []; params?: {} }
    'admin_matching.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_order.index': { paramsTuple?: []; params?: {} }
    'admin_order.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_message.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'product_image.admin_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.index': { paramsTuple?: []; params?: {} }
    'admin_audit.index': { paramsTuple?: []; params?: {} }
    'admin_finishing.index': { paramsTuple?: []; params?: {} }
    'admin_print_profile.index': { paramsTuple?: []; params?: {} }
    'admin_shipping.index': { paramsTuple?: []; params?: {} }
    'admin_maker.index': { paramsTuple?: []; params?: {} }
    'admin_experiment.index': { paramsTuple?: []; params?: {} }
    'admin_report.index': { paramsTuple?: []; params?: {} }
    'admin_report.download': { paramsTuple: [ParamValue]; params: {'kind': ParamValue} }
    'admin_coupon.index': { paramsTuple?: []; params?: {} }
    'admin_payout.index': { paramsTuple?: []; params?: {} }
    'admin_payout.ready_csv': { paramsTuple?: []; params?: {} }
    'admin_payout.profile_document': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.invoice_file': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.voucher': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_launch.index': { paramsTuple?: []; params?: {} }
    'admin_settings.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'language.update': { paramsTuple?: []; params?: {} }
    'currency.update': { paramsTuple?: []; params?: {} }
    'support.submit': { paramsTuple?: []; params?: {} }
    'tool.quick_quote': { paramsTuple?: []; params?: {} }
    'marketing.join': { paramsTuple?: []; params?: {} }
    'two_factor_challenge.store': { paramsTuple?: []; params?: {} }
    'account_privacy.destroy': { paramsTuple?: []; params?: {} }
    'account_security.start_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.enable_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.disable_two_factor': { paramsTuple?: []; params?: {} }
    'account_security.regenerate_backup_codes': { paramsTuple?: []; params?: {} }
    'account_security.change_password': { paramsTuple?: []; params?: {} }
    'account_security.revoke_others': { paramsTuple?: []; params?: {} }
    'account_security.revoke_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'auth_security.send_reset': { paramsTuple?: []; params?: {} }
    'auth_security.reset_password': { paramsTuple?: []; params?: {} }
    'auth_security.resend_verification': { paramsTuple?: []; params?: {} }
    'onboarding.store_role': { paramsTuple?: []; params?: {} }
    'onboarding.store_profile': { paramsTuple?: []; params?: {} }
    'model_file.get_upload_url': { paramsTuple?: []; params?: {} }
    'model_file.register': { paramsTuple?: []; params?: {} }
    'quote.calculate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'storefront.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notification.update_preference': { paramsTuple?: []; params?: {} }
    'notification.read_all': { paramsTuple?: []; params?: {} }
    'carrier_webhook': { paramsTuple?: []; params?: {} }
    'payment_webhook': { paramsTuple?: []; params?: {} }
    'store_webhook.order': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'payment_return': { paramsTuple?: []; params?: {} }
    'content_report.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.add': { paramsTuple?: []; params?: {} }
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.checkout': { paramsTuple?: []; params?: {} }
    'order.store': { paramsTuple?: []; params?: {} }
    'order.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.pay_from_wallet': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.simulate_payment': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.delivered': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order.review': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'order_message.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dispute.open': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dispute.upload_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dispute.add_evidence': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'test_checkout.pay': { paramsTuple: [ParamValue]; params: {'ref': ParamValue} }
    'seller_branding.save': { paramsTuple?: []; params?: {} }
    'seller_branding.upload_logo': { paramsTuple?: []; params?: {} }
    'seller_branding.remove_logo': { paramsTuple?: []; params?: {} }
    'seller_store.connect': { paramsTuple?: []; params?: {} }
    'seller_store.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.unpublish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.connect_test': { paramsTuple?: []; params?: {} }
    'seller_store.sync': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.disconnect': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.map': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_store.retry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_wallet.top_up': { paramsTuple?: []; params?: {} }
    'seller_wallet.auto_pay': { paramsTuple?: []; params?: {} }
    'seller_wallet.refund': { paramsTuple?: []; params?: {} }
    'seller_payout.save': { paramsTuple?: []; params?: {} }
    'seller_payout.invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.create_key': { paramsTuple?: []; params?: {} }
    'seller_developer.revoke_key': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.create_webhook': { paramsTuple?: []; params?: {} }
    'seller_developer.toggle_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_developer.test_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_product.store': { paramsTuple?: []; params?: {} }
    'seller_product.set_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller_product.sample': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rfq.store': { paramsTuple?: []; params?: {} }
    'rfq.award': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'rfq.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.store': { paramsTuple?: []; params?: {} }
    'printer.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.set_profiles': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.store_material': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.printing': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.produced': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.qc_upload_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.qc_register': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.ship': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.offer_photo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_work.download': { paramsTuple: [ParamValue]; params: {'grantId': ParamValue} }
    'dispute.respond': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_order_message.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.bid': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_rfq.withdraw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maker_finishing.save': { paramsTuple?: []; params?: {} }
    'maker_payout.save': { paramsTuple?: []; params?: {} }
    'maker_payout.invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capacity.set_slot': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capacity.save_template': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'capacity.apply_template': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_catalog.store': { paramsTuple?: []; params?: {} }
    'admin_catalog.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_category.store': { paramsTuple?: []; params?: {} }
    'admin_category.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_dispute.resolve': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.rematch': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.acknowledge': { paramsTuple?: []; params?: {} }
    'admin_queue.decide_maker': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.fraud_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.report_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.chargeback_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.support_answered': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue.shop_photo_decision': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_reference_catalog.store_material': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.toggle_material': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_reference_catalog.store_color': { paramsTuple?: []; params?: {} }
    'admin_reference_catalog.toggle_color': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_queue_monitor.run_again': { paramsTuple?: []; params?: {} }
    'admin_matching.mode': { paramsTuple?: []; params?: {} }
    'admin_matching.offer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_user.unsuspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_finishing.store': { paramsTuple?: []; params?: {} }
    'admin_finishing.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_print_profile.store': { paramsTuple?: []; params?: {} }
    'admin_print_profile.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_shipping.update_rate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_shipping.update_extra': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_maker.set_tier': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_maker.unlock_tier': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_coupon.store': { paramsTuple?: []; params?: {} }
    'admin_coupon.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.review_profile': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.review_invoice': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_payout.mark_paid': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin_settings.update': { paramsTuple?: []; params?: {} }
    'admin_settings.reset': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'seller_developer.delete_webhook': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.destroy_material': { paramsTuple: [ParamValue,ParamValue]; params: {'printerId': ParamValue,'id': ParamValue} }
  }
  PUT: {
    'seller_product.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'printer.update_material': { paramsTuple: [ParamValue,ParamValue]; params: {'printerId': ParamValue,'id': ParamValue} }
    'admin_catalog.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}