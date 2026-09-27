/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['show']>>>
    }
  }
  'language.update': {
    methods: ["POST"]
    pattern: '/language'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/language_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/language_controller').default['update']>>>
    }
  }
  'currency.update': {
    methods: ["POST"]
    pattern: '/currency'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/currency_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/currency_controller').default['update']>>>
    }
  }
  'status.status': {
    methods: ["GET","HEAD"]
    pattern: '/status'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/status_controller').default['status']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/status_controller').default['status']>>>
    }
  }
  'status.changelog': {
    methods: ["GET","HEAD"]
    pattern: '/changelog'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/status_controller').default['changelog']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/status_controller').default['changelog']>>>
    }
  }
  'support.help': {
    methods: ["GET","HEAD"]
    pattern: '/help'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_controller').default['help']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_controller').default['help']>>>
    }
  }
  'support.submit': {
    methods: ["POST"]
    pattern: '/help'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_controller').default['submit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_controller').default['submit']>>>
    }
  }
  'legal.show': {
    methods: ["GET","HEAD"]
    pattern: '/legal/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/legal_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/legal_controller').default['show']>>>
    }
  }
  'content.blog_index': {
    methods: ["GET","HEAD"]
    pattern: '/blog'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content_controller').default['blogIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content_controller').default['blogIndex']>>>
    }
  }
  'content.blog_show': {
    methods: ["GET","HEAD"]
    pattern: '/blog/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content_controller').default['blogShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content_controller').default['blogShow']>>>
    }
  }
  'content.glossary_index': {
    methods: ["GET","HEAD"]
    pattern: '/glossary'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content_controller').default['glossaryIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content_controller').default['glossaryIndex']>>>
    }
  }
  'content.glossary_show': {
    methods: ["GET","HEAD"]
    pattern: '/glossary/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content_controller').default['glossaryShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content_controller').default['glossaryShow']>>>
    }
  }
  'material_page.index': {
    methods: ["GET","HEAD"]
    pattern: '/materials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/material_page_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/material_page_controller').default['index']>>>
    }
  }
  'material_page.show': {
    methods: ["GET","HEAD"]
    pattern: '/materials/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/material_page_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/material_page_controller').default['show']>>>
    }
  }
  'city_page.index': {
    methods: ["GET","HEAD"]
    pattern: '/cities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/city_page_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/city_page_controller').default['index']>>>
    }
  }
  'city_page.show': {
    methods: ["GET","HEAD"]
    pattern: '/cities/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/city_page_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/city_page_controller').default['show']>>>
    }
  }
  'use_case_page.index': {
    methods: ["GET","HEAD"]
    pattern: '/use-cases'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/use_case_page_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/use_case_page_controller').default['index']>>>
    }
  }
  'use_case_page.show': {
    methods: ["GET","HEAD"]
    pattern: '/use-cases/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/use_case_page_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/use_case_page_controller').default['show']>>>
    }
  }
  'marketing.for_makers': {
    methods: ["GET","HEAD"]
    pattern: '/for-makers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['forMakers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['forMakers']>>>
    }
  }
  'marketing.for_sellers': {
    methods: ["GET","HEAD"]
    pattern: '/for-sellers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['forSellers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['forSellers']>>>
    }
  }
  'tool.maker_income': {
    methods: ["GET","HEAD"]
    pattern: '/tools/maker-income'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['makerIncome']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['makerIncome']>>>
    }
  }
  'tool.quick_quote_page': {
    methods: ["GET","HEAD"]
    pattern: '/tools/quick-quote'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['quickQuotePage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['quickQuotePage']>>>
    }
  }
  'tool.quick_quote': {
    methods: ["POST"]
    pattern: '/tools/quick-quote'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['quickQuote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tool_controller').default['quickQuote']>>>
    }
  }
  'marketing.join': {
    methods: ["POST"]
    pattern: '/waitlist'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['join']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['join']>>>
    }
  }
  'two_factor_challenge.create': {
    methods: ["GET","HEAD"]
    pattern: '/login/two-factor'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/two_factor_challenge_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/two_factor_challenge_controller').default['create']>>>
    }
  }
  'two_factor_challenge.store': {
    methods: ["POST"]
    pattern: '/login/two-factor'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/two_factor_challenge_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/two_factor_challenge_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account_privacy.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/privacy'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['show']>>>
    }
  }
  'account_privacy.export': {
    methods: ["GET","HEAD"]
    pattern: '/account/privacy/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['export']>>>
    }
  }
  'account_privacy.destroy': {
    methods: ["POST"]
    pattern: '/account/privacy/delete'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_privacy_controller').default['destroy']>>>
    }
  }
  'account_referral.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/referrals'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_referral_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_referral_controller').default['show']>>>
    }
  }
  'account_security.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/security'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['show']>>>
    }
  }
  'account_security.start_two_factor': {
    methods: ["POST"]
    pattern: '/account/security/two-factor/start'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['startTwoFactor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['startTwoFactor']>>>
    }
  }
  'account_security.enable_two_factor': {
    methods: ["POST"]
    pattern: '/account/security/two-factor/enable'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['enableTwoFactor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['enableTwoFactor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account_security.disable_two_factor': {
    methods: ["POST"]
    pattern: '/account/security/two-factor/disable'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account_security').disableTwoFactorValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account_security').disableTwoFactorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['disableTwoFactor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['disableTwoFactor']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account_security.regenerate_backup_codes': {
    methods: ["POST"]
    pattern: '/account/security/two-factor/backup-codes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account_security').codeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['regenerateBackupCodes']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['regenerateBackupCodes']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account_security.change_password': {
    methods: ["POST"]
    pattern: '/account/security/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account_security').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account_security').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['changePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account_security.revoke_others': {
    methods: ["POST"]
    pattern: '/account/security/sessions/revoke-others'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['revokeOthers']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['revokeOthers']>>>
    }
  }
  'account_security.revoke_session': {
    methods: ["POST"]
    pattern: '/account/security/sessions/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['revokeSession']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_security_controller').default['revokeSession']>>>
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'auth_security.show_forgot_password': {
    methods: ["GET","HEAD"]
    pattern: '/forgot-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['showForgotPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['showForgotPassword']>>>
    }
  }
  'auth_security.send_reset': {
    methods: ["POST"]
    pattern: '/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth_security').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth_security').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['sendResetLink']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['sendResetLink']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth_security.show_reset_password': {
    methods: ["GET","HEAD"]
    pattern: '/reset-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['showResetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['showResetPassword']>>>
    }
  }
  'auth_security.reset_password': {
    methods: ["POST"]
    pattern: '/reset-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth_security').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth_security').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth_security.verify_email': {
    methods: ["GET","HEAD"]
    pattern: '/verify-email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/auth_security').verifyEmailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['verifyEmail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth_security.resend_verification': {
    methods: ["POST"]
    pattern: '/resend-verification'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['resendVerification']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_security_controller').default['resendVerification']>>>
    }
  }
  'onboarding.show': {
    methods: ["GET","HEAD"]
    pattern: '/onboarding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['show']>>>
    }
  }
  'onboarding.store_role': {
    methods: ["POST"]
    pattern: '/onboarding/role'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').roleSelectionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').roleSelectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['storeRole']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['storeRole']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.show_profile': {
    methods: ["GET","HEAD"]
    pattern: '/onboarding/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['showProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['showProfile']>>>
    }
  }
  'onboarding.store_profile': {
    methods: ["POST"]
    pattern: '/onboarding/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').sellerProfileValidator)>|InferInput<(typeof import('#validators/onboarding').manufacturerProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').sellerProfileValidator)>|InferInput<(typeof import('#validators/onboarding').manufacturerProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['storeProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['storeProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'model_file.index': {
    methods: ["GET","HEAD"]
    pattern: '/files'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').pageQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'model_file.get_upload_url': {
    methods: ["POST"]
    pattern: '/files/upload-url'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/model_file').getUploadUrlValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/model_file').getUploadUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['getUploadUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['getUploadUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'model_file.register': {
    methods: ["POST"]
    pattern: '/files/register'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/model_file').registerFileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/model_file').registerFileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['register']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['register']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'model_file.preview_url': {
    methods: ["GET","HEAD"]
    pattern: '/files/:id/preview-url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['previewUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/model_file_controller').default['previewUrl']>>>
    }
  }
  'quote.show': {
    methods: ["GET","HEAD"]
    pattern: '/files/:id/quote'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/quote_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/quote_controller').default['show']>>>
    }
  }
  'quote.calculate': {
    methods: ["POST"]
    pattern: '/files/:id/quote'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/quote').quoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/quote').quoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/quote_controller').default['calculate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/quote_controller').default['calculate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.index': {
    methods: ["GET","HEAD"]
    pattern: '/shop'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/storefront').shopQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'storefront.show': {
    methods: ["GET","HEAD"]
    pattern: '/shop/:id/:slug?'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['show']>>>
    }
  }
  'storefront.order': {
    methods: ["POST"]
    pattern: '/shop/:id/order'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').shopOrderValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').shopOrderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['order']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['order']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'product_image.show': {
    methods: ["GET","HEAD"]
    pattern: '/images/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_image_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_image_controller').default['show']>>>
    }
  }
  'storefront.sitemap': {
    methods: ["GET","HEAD"]
    pattern: '/sitemap.xml'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['sitemap']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['sitemap']>>>
    }
  }
  'storefront.robots': {
    methods: ["GET","HEAD"]
    pattern: '/robots.txt'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['robots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['robots']>>>
    }
  }
  'notification.index': {
    methods: ["GET","HEAD"]
    pattern: '/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').pageQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notification.preferences': {
    methods: ["GET","HEAD"]
    pattern: '/notifications/preferences'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['preferences']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['preferences']>>>
    }
  }
  'notification.update_preference': {
    methods: ["POST"]
    pattern: '/notifications/preferences'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['updatePreference']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['updatePreference']>>>
    }
  }
  'notification.read_all': {
    methods: ["POST"]
    pattern: '/notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['readAll']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['readAll']>>>
    }
  }
  'notification.open': {
    methods: ["GET","HEAD"]
    pattern: '/notifications/:id/open'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['open']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notification_controller').default['open']>>>
    }
  }
  'health.show': {
    methods: ["GET","HEAD"]
    pattern: '/health'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/health_controller').default['show']>>>
    }
  }
  'carrier_webhook': {
    methods: ["POST"]
    pattern: '/webhooks/carrier'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/carrier_webhook_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/carrier_webhook_controller').default['handle']>>>
    }
  }
  'payment_webhook': {
    methods: ["POST"]
    pattern: '/webhooks/payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/payment_webhook_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/payment_webhook_controller').default['handle']>>>
    }
  }
  'store_webhook.order': {
    methods: ["POST"]
    pattern: '/webhooks/stores/:id/orders'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/store_webhook_controller').default['order']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/store_webhook_controller').default['order']>>>
    }
  }
  'payment_return': {
    methods: ["POST"]
    pattern: '/payments/return'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/payment_return_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/payment_return_controller').default['handle']>>>
    }
  }
  'content_report.store': {
    methods: ["POST"]
    pattern: '/shop/:id/report'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content_report_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content_report_controller').default['store']>>>
    }
  }
  'cart.show': {
    methods: ["GET","HEAD"]
    pattern: '/cart'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['show']>>>
    }
  }
  'cart.add': {
    methods: ["POST"]
    pattern: '/cart/items'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').cartAddValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/order').cartAddValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['add']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['add']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'cart.update': {
    methods: ["POST"]
    pattern: '/cart/items/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').cartQuantityValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').cartQuantityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'cart.remove': {
    methods: ["POST"]
    pattern: '/cart/items/:id/remove'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['remove']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['remove']>>>
    }
  }
  'cart.checkout': {
    methods: ["POST"]
    pattern: '/cart/checkout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').cartCheckoutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/order').cartCheckoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['checkout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['checkout']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'order.index': {
    methods: ["GET","HEAD"]
    pattern: '/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').pageQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'order.store': {
    methods: ["POST"]
    pattern: '/orders'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').createOrderValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/order').createOrderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'order.show': {
    methods: ["GET","HEAD"]
    pattern: '/orders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['show']>>>
    }
  }
  'order.cancel': {
    methods: ["POST"]
    pattern: '/orders/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['cancel']>>>
    }
  }
  'order.pay': {
    methods: ["POST"]
    pattern: '/orders/:id/pay'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').payValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').payValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['pay']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['pay']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'order.pay_from_wallet': {
    methods: ["POST"]
    pattern: '/orders/:id/pay-from-wallet'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['payFromWallet']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['payFromWallet']>>>
    }
  }
  'order.simulate_payment': {
    methods: ["POST"]
    pattern: '/orders/:id/simulate-payment'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['simulatePayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['simulatePayment']>>>
    }
  }
  'order.delivered': {
    methods: ["POST"]
    pattern: '/orders/:id/delivered'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['delivered']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['delivered']>>>
    }
  }
  'order.complete': {
    methods: ["POST"]
    pattern: '/orders/:id/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['complete']>>>
    }
  }
  'order.review': {
    methods: ["POST"]
    pattern: '/orders/:id/review'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').reviewValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').reviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_controller').default['review']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_controller').default['review']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoice.show': {
    methods: ["GET","HEAD"]
    pattern: '/orders/:id/invoice'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoice_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoice_controller').default['show']>>>
    }
  }
  'order_message.show': {
    methods: ["GET","HEAD"]
    pattern: '/orders/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_message_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_message_controller').default['show']>>>
    }
  }
  'order_message.store': {
    methods: ["POST"]
    pattern: '/orders/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/order_message_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/order_message_controller').default['store']>>>
    }
  }
  'dispute.open': {
    methods: ["POST"]
    pattern: '/orders/:id/dispute'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').openDisputeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').openDisputeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['open']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['open']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'invoice.index': {
    methods: ["GET","HEAD"]
    pattern: '/invoices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').pageQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/invoice_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/invoice_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'dispute.upload_url': {
    methods: ["POST"]
    pattern: '/disputes/:id/evidence/upload-url'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').evidenceUploadValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').evidenceUploadValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['uploadUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['uploadUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'dispute.add_evidence': {
    methods: ["POST"]
    pattern: '/disputes/:id/evidence'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').registerEvidenceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').registerEvidenceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['addEvidence']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['addEvidence']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'test_checkout.show': {
    methods: ["GET","HEAD"]
    pattern: '/dev/checkout/:ref'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { ref: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/test_checkout_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/test_checkout_controller').default['show']>>>
    }
  }
  'test_checkout.pay': {
    methods: ["POST"]
    pattern: '/dev/checkout/:ref'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/test_checkout').testCardValidator)>>
      paramsTuple: [ParamValue]
      params: { ref: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/test_checkout').testCardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/test_checkout_controller').default['pay']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/test_checkout_controller').default['pay']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_dashboard.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_dashboard_controller').default['index']>>>
    }
  }
  'seller_order.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').sellerOrdersQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_order_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_order_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_product.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/products'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['index']>>>
    }
  }
  'seller_insight.margin_preview': {
    methods: ["GET","HEAD"]
    pattern: '/seller/margin-preview'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['marginPreview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['marginPreview']>>>
    }
  }
  'seller_insight.analytics': {
    methods: ["GET","HEAD"]
    pattern: '/seller/analytics'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['analytics']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['analytics']>>>
    }
  }
  'seller_insight.statement': {
    methods: ["GET","HEAD"]
    pattern: '/seller/statement.csv'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#services/reports/statement_response').statementMonthValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['statement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_insight_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_branding.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/branding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['show']>>>
    }
  }
  'seller_branding.save': {
    methods: ["POST"]
    pattern: '/seller/branding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['save']>>>
    }
  }
  'seller_branding.logo': {
    methods: ["GET","HEAD"]
    pattern: '/seller/branding/logo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['logo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['logo']>>>
    }
  }
  'seller_branding.upload_logo': {
    methods: ["POST"]
    pattern: '/seller/branding/logo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['uploadLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['uploadLogo']>>>
    }
  }
  'seller_branding.remove_logo': {
    methods: ["POST"]
    pattern: '/seller/branding/logo/remove'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['removeLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_branding_controller').default['removeLogo']>>>
    }
  }
  'seller_store.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/stores'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['index']>>>
    }
  }
  'seller_store.connect': {
    methods: ["POST"]
    pattern: '/seller/stores/connect'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['connect']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['connect']>>>
    }
  }
  'seller_store.etsy_start': {
    methods: ["GET","HEAD"]
    pattern: '/seller/stores/etsy/start'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyStart']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyStart']>>>
    }
  }
  'seller_store.etsy_callback': {
    methods: ["GET","HEAD"]
    pattern: '/seller/stores/etsy/callback'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyCallback']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyCallback']>>>
    }
  }
  'seller_store.etsy_categories': {
    methods: ["GET","HEAD"]
    pattern: '/seller/stores/etsy/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyCategories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['etsyCategories']>>>
    }
  }
  'seller_store.publish': {
    methods: ["POST"]
    pattern: '/seller/stores/:id/publish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['publish']>>>
    }
  }
  'seller_store.unpublish': {
    methods: ["POST"]
    pattern: '/seller/stores/:id/unpublish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['unpublish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['unpublish']>>>
    }
  }
  'seller_store.connect_test': {
    methods: ["POST"]
    pattern: '/seller/stores/test'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['connectTest']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['connectTest']>>>
    }
  }
  'seller_store.sync': {
    methods: ["POST"]
    pattern: '/seller/stores/:id/sync'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['sync']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['sync']>>>
    }
  }
  'seller_store.disconnect': {
    methods: ["POST"]
    pattern: '/seller/stores/:id/disconnect'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['disconnect']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['disconnect']>>>
    }
  }
  'seller_store.map': {
    methods: ["POST"]
    pattern: '/seller/stores/listings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['map']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['map']>>>
    }
  }
  'seller_store.retry': {
    methods: ["POST"]
    pattern: '/seller/stores/orders/:id/retry'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['retry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_store_controller').default['retry']>>>
    }
  }
  'seller_wallet.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/wallet'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['show']>>>
    }
  }
  'seller_wallet.top_up': {
    methods: ["POST"]
    pattern: '/seller/wallet/top-up'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['topUp']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['topUp']>>>
    }
  }
  'seller_wallet.auto_pay': {
    methods: ["POST"]
    pattern: '/seller/wallet/auto-pay'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['autoPay']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['autoPay']>>>
    }
  }
  'seller_wallet.refund': {
    methods: ["POST"]
    pattern: '/seller/wallet/refund'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['refund']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_wallet_controller').default['refund']>>>
    }
  }
  'seller_payout.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/payout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['show']>>>
    }
  }
  'seller_payout.save': {
    methods: ["POST"]
    pattern: '/seller/payout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['save']>>>
    }
  }
  'seller_payout.invoice': {
    methods: ["POST"]
    pattern: '/seller/payout/:id/invoice'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['invoice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['invoice']>>>
    }
  }
  'seller_payout.voucher': {
    methods: ["GET","HEAD"]
    pattern: '/seller/payout/vouchers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['voucher']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_payout_controller').default['voucher']>>>
    }
  }
  'seller_developer.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/developers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['index']>>>
    }
  }
  'seller_developer.create_key': {
    methods: ["POST"]
    pattern: '/seller/developers/keys'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/developer').apiKeyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/developer').apiKeyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['createKey']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['createKey']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_developer.revoke_key': {
    methods: ["POST"]
    pattern: '/seller/developers/keys/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['revokeKey']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['revokeKey']>>>
    }
  }
  'seller_developer.create_webhook': {
    methods: ["POST"]
    pattern: '/seller/developers/webhooks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/developer').webhookEndpointValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/developer').webhookEndpointValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['createWebhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['createWebhook']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_developer.toggle_webhook': {
    methods: ["POST"]
    pattern: '/seller/developers/webhooks/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['toggleWebhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['toggleWebhook']>>>
    }
  }
  'seller_developer.delete_webhook': {
    methods: ["DELETE"]
    pattern: '/seller/developers/webhooks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['deleteWebhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['deleteWebhook']>>>
    }
  }
  'seller_developer.test_webhook': {
    methods: ["POST"]
    pattern: '/seller/developers/webhooks/:id/test'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['testWebhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_developer_controller').default['testWebhook']>>>
    }
  }
  'seller_product.store': {
    methods: ["POST"]
    pattern: '/seller/products'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller_product').createSellerProductValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller_product').createSellerProductValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_product.update': {
    methods: ["PUT"]
    pattern: '/seller/products/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller_product').updateSellerProductValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller_product').updateSellerProductValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller_product.set_status': {
    methods: ["POST"]
    pattern: '/seller/products/:id/status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['setStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['setStatus']>>>
    }
  }
  'seller_product.sample': {
    methods: ["POST"]
    pattern: '/seller/products/:id/sample'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').sampleOrderValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').sampleOrderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['sample']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller_product_controller').default['sample']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rfq.index': {
    methods: ["GET","HEAD"]
    pattern: '/rfqs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['index']>>>
    }
  }
  'rfq.create': {
    methods: ["GET","HEAD"]
    pattern: '/rfqs/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['create']>>>
    }
  }
  'rfq.store': {
    methods: ["POST"]
    pattern: '/rfqs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rfq').rfqCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/rfq').rfqCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rfq.show': {
    methods: ["GET","HEAD"]
    pattern: '/rfqs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['show']>>>
    }
  }
  'rfq.award': {
    methods: ["POST"]
    pattern: '/rfqs/:id/award'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rfq').rfqAwardValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rfq').rfqAwardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['award']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['award']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rfq.cancel': {
    methods: ["POST"]
    pattern: '/rfqs/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rfq_controller').default['cancel']>>>
    }
  }
  'api.openapi': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/openapi.json'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_controller').default['openapi']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_controller').default['openapi']>>>
    }
  }
  'api.orders': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').sellerOrdersQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_controller').default['orders']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_controller').default['orders']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'api.order': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/orders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_controller').default['order']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_controller').default['order']>>>
    }
  }
  'api.products': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/products'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_controller').default['products']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_controller').default['products']>>>
    }
  }
  'maker_dashboard.index': {
    methods: ["GET","HEAD"]
    pattern: '/maker'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_dashboard_controller').default['index']>>>
    }
  }
  'printer.index': {
    methods: ["GET","HEAD"]
    pattern: '/maker/printers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['index']>>>
    }
  }
  'printer.store': {
    methods: ["POST"]
    pattern: '/maker/printers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/printer').createPrinterValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/printer').createPrinterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'printer.update': {
    methods: ["PUT"]
    pattern: '/maker/printers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/printer').updatePrinterValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/printer').updatePrinterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'printer.toggle_active': {
    methods: ["POST"]
    pattern: '/maker/printers/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['toggleActive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['toggleActive']>>>
    }
  }
  'printer.set_profiles': {
    methods: ["POST"]
    pattern: '/maker/printers/:id/profiles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/printer').profilesValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/printer').profilesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['setProfiles']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['setProfiles']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'printer.store_material': {
    methods: ["POST"]
    pattern: '/maker/printers/:id/materials'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/printer').createMaterialValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/printer').createMaterialValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['storeMaterial']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['storeMaterial']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'printer.update_material': {
    methods: ["PUT"]
    pattern: '/maker/printers/:printerId/materials/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/printer').updateMaterialValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { printerId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/printer').updateMaterialValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['updateMaterial']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['updateMaterial']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'printer.destroy_material': {
    methods: ["DELETE"]
    pattern: '/maker/printers/:printerId/materials/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { printerId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['destroyMaterial']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/printer_controller').default['destroyMaterial']>>>
    }
  }
  'maker_work.index': {
    methods: ["GET","HEAD"]
    pattern: '/maker/work'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['index']>>>
    }
  }
  'maker_work.accept': {
    methods: ["POST"]
    pattern: '/maker/offers/:id/accept'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['accept']>>>
    }
  }
  'maker_work.decline': {
    methods: ["POST"]
    pattern: '/maker/offers/:id/decline'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['decline']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['decline']>>>
    }
  }
  'maker_work.packing_slip': {
    methods: ["GET","HEAD"]
    pattern: '/maker/jobs/:id/packing-slip'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['packingSlip']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['packingSlip']>>>
    }
  }
  'maker_work.printing': {
    methods: ["POST"]
    pattern: '/maker/jobs/:id/printing'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['printing']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['printing']>>>
    }
  }
  'maker_work.produced': {
    methods: ["POST"]
    pattern: '/maker/jobs/:id/produced'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['produced']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['produced']>>>
    }
  }
  'maker_work.qc_upload_url': {
    methods: ["POST"]
    pattern: '/maker/jobs/:id/qc/upload-url'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').evidenceUploadValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').evidenceUploadValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['qcUploadUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['qcUploadUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_work.qc_register': {
    methods: ["POST"]
    pattern: '/maker/jobs/:id/qc'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').registerEvidenceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').registerEvidenceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['qcRegister']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['qcRegister']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_work.ship': {
    methods: ["POST"]
    pattern: '/maker/jobs/:id/ship'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').shipValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').shipValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['ship']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['ship']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_work.offer_photo': {
    methods: ["POST"]
    pattern: '/maker/qc-photos/:id/offer'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['offerPhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['offerPhoto']>>>
    }
  }
  'maker_work.download': {
    methods: ["POST"]
    pattern: '/maker/grants/:grantId/download'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { grantId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['download']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_work_controller').default['download']>>>
    }
  }
  'dispute.respond': {
    methods: ["POST"]
    pattern: '/maker/disputes/:id/respond'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').respondDisputeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').respondDisputeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['respond']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dispute_controller').default['respond']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_order_message.show': {
    methods: ["GET","HEAD"]
    pattern: '/maker/orders/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_order_message_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_order_message_controller').default['show']>>>
    }
  }
  'maker_order_message.store': {
    methods: ["POST"]
    pattern: '/maker/orders/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_order_message_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_order_message_controller').default['store']>>>
    }
  }
  'maker_rfq.index': {
    methods: ["GET","HEAD"]
    pattern: '/maker/rfqs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['index']>>>
    }
  }
  'maker_rfq.show': {
    methods: ["GET","HEAD"]
    pattern: '/maker/rfqs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['show']>>>
    }
  }
  'maker_rfq.bid': {
    methods: ["POST"]
    pattern: '/maker/rfqs/:id/bid'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rfq').rfqBidValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rfq').rfqBidValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['bid']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['bid']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_rfq.withdraw': {
    methods: ["POST"]
    pattern: '/maker/rfqs/:id/withdraw'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['withdraw']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_rfq_controller').default['withdraw']>>>
    }
  }
  'maker_finishing.show': {
    methods: ["GET","HEAD"]
    pattern: '/maker/finishing'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_finishing_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_finishing_controller').default['show']>>>
    }
  }
  'maker_finishing.save': {
    methods: ["POST"]
    pattern: '/maker/finishing'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finishing').makerFinishingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finishing').makerFinishingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_finishing_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_finishing_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'maker_payout.show': {
    methods: ["GET","HEAD"]
    pattern: '/maker/payout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['show']>>>
    }
  }
  'maker_payout.save': {
    methods: ["POST"]
    pattern: '/maker/payout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['save']>>>
    }
  }
  'maker_payout.invoice': {
    methods: ["POST"]
    pattern: '/maker/payout/:id/invoice'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['invoice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['invoice']>>>
    }
  }
  'maker_payout.voucher': {
    methods: ["GET","HEAD"]
    pattern: '/maker/payout/vouchers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['voucher']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_payout_controller').default['voucher']>>>
    }
  }
  'maker_performance.scorecard': {
    methods: ["GET","HEAD"]
    pattern: '/maker/performance'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['scorecard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['scorecard']>>>
    }
  }
  'maker_performance.earnings': {
    methods: ["GET","HEAD"]
    pattern: '/maker/earnings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['earnings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['earnings']>>>
    }
  }
  'maker_performance.statement': {
    methods: ["GET","HEAD"]
    pattern: '/maker/earnings/statement.csv'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#services/reports/statement_response').statementMonthValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['statement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maker_performance_controller').default['statement']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'capacity.index': {
    methods: ["GET","HEAD"]
    pattern: '/maker/capacity'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['index']>>>
    }
  }
  'capacity.set_slot': {
    methods: ["POST"]
    pattern: '/maker/capacity/printers/:id/slot'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/capacity').setSlotValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/capacity').setSlotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['setSlot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['setSlot']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'capacity.save_template': {
    methods: ["POST"]
    pattern: '/maker/capacity/printers/:id/template'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/capacity').weeklyTemplateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/capacity').weeklyTemplateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['saveTemplate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['saveTemplate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'capacity.apply_template': {
    methods: ["POST"]
    pattern: '/maker/capacity/printers/:id/apply-template'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/capacity').applyTemplateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/capacity').applyTemplateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['applyTemplate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/capacity_controller').default['applyTemplate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_dashboard.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_dashboard_controller').default['index']>>>
    }
  }
  'admin_catalog.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/catalog'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['index']>>>
    }
  }
  'admin_catalog.store': {
    methods: ["POST"]
    pattern: '/admin/catalog'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalog').createCatalogProductValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/catalog').createCatalogProductValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_catalog.update': {
    methods: ["PUT"]
    pattern: '/admin/catalog/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalog').updateCatalogProductValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalog').updateCatalogProductValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_catalog.toggle_active': {
    methods: ["POST"]
    pattern: '/admin/catalog/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['toggleActive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_catalog_controller').default['toggleActive']>>>
    }
  }
  'admin_category.store': {
    methods: ["POST"]
    pattern: '/admin/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_category_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_category_controller').default['store']>>>
    }
  }
  'admin_category.toggle': {
    methods: ["POST"]
    pattern: '/admin/categories/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_category_controller').default['toggle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_category_controller').default['toggle']>>>
    }
  }
  'admin_dispute.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/disputes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/order').pageQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_dispute.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/disputes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['show']>>>
    }
  }
  'admin_dispute.resolve': {
    methods: ["POST"]
    pattern: '/admin/disputes/:id/resolve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/order').resolveDisputeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/order').resolveDisputeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['resolve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_dispute_controller').default['resolve']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_queue.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/queues'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['index']>>>
    }
  }
  'admin_queue.rematch': {
    methods: ["POST"]
    pattern: '/admin/queues/orders/:id/rematch'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['rematch']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['rematch']>>>
    }
  }
  'admin_queue.acknowledge': {
    methods: ["POST"]
    pattern: '/admin/queues/acknowledge'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['acknowledge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['acknowledge']>>>
    }
  }
  'admin_queue.decide_maker': {
    methods: ["POST"]
    pattern: '/admin/queues/makers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['decideMaker']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['decideMaker']>>>
    }
  }
  'admin_queue.fraud_decision': {
    methods: ["POST"]
    pattern: '/admin/queues/fraud/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['fraudDecision']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['fraudDecision']>>>
    }
  }
  'admin_queue.report_decision': {
    methods: ["POST"]
    pattern: '/admin/queues/reports/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['reportDecision']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['reportDecision']>>>
    }
  }
  'admin_queue.chargeback_decision': {
    methods: ["POST"]
    pattern: '/admin/queues/chargebacks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['chargebackDecision']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['chargebackDecision']>>>
    }
  }
  'admin_queue.support_answered': {
    methods: ["POST"]
    pattern: '/admin/queues/support/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['supportAnswered']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['supportAnswered']>>>
    }
  }
  'admin_queue.shop_photo_decision': {
    methods: ["POST"]
    pattern: '/admin/queues/photos/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['shopPhotoDecision']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_controller').default['shopPhotoDecision']>>>
    }
  }
  'admin_reference_catalog.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/materials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['index']>>>
    }
  }
  'admin_reference_catalog.store_material': {
    methods: ["POST"]
    pattern: '/admin/materials'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['storeMaterial']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['storeMaterial']>>>
    }
  }
  'admin_reference_catalog.toggle_material': {
    methods: ["POST"]
    pattern: '/admin/materials/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['toggleMaterial']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['toggleMaterial']>>>
    }
  }
  'admin_reference_catalog.store_color': {
    methods: ["POST"]
    pattern: '/admin/colors'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['storeColor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['storeColor']>>>
    }
  }
  'admin_reference_catalog.toggle_color': {
    methods: ["POST"]
    pattern: '/admin/colors/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['toggleColor']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_reference_catalog_controller').default['toggleColor']>>>
    }
  }
  'admin_metrics.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/metrics'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_metrics_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_metrics_controller').default['index']>>>
    }
  }
  'admin_growth.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/growth'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_growth_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_growth_controller').default['index']>>>
    }
  }
  'admin_queue_monitor.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/jobs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_monitor_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_monitor_controller').default['index']>>>
    }
  }
  'admin_queue_monitor.run_again': {
    methods: ["POST"]
    pattern: '/admin/jobs/run-again'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_queue_monitor_controller').default['runAgain']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_queue_monitor_controller').default['runAgain']>>>
    }
  }
  'admin_matching.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/matching'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['index']>>>
    }
  }
  'admin_matching.mode': {
    methods: ["POST"]
    pattern: '/admin/matching/mode'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin_matching').matchingModeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/admin_matching').matchingModeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['mode']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['mode']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_matching.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/matching/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['show']>>>
    }
  }
  'admin_matching.offer': {
    methods: ["POST"]
    pattern: '/admin/matching/:id/offer'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin_matching').adminOfferValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/admin_matching').adminOfferValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['offer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_matching_controller').default['offer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_order.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['index']>>>
    }
  }
  'admin_order.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/orders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['show']>>>
    }
  }
  'admin_order.reassign': {
    methods: ["POST"]
    pattern: '/admin/orders/:id/reassign'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['reassign']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_order_controller').default['reassign']>>>
    }
  }
  'admin_message.show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/orders/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_message_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_message_controller').default['show']>>>
    }
  }
  'product_image.admin_show': {
    methods: ["GET","HEAD"]
    pattern: '/admin/images/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_image_controller').default['adminShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_image_controller').default['adminShow']>>>
    }
  }
  'admin_user.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['index']>>>
    }
  }
  'admin_user.suspend': {
    methods: ["POST"]
    pattern: '/admin/users/:id/suspend'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['suspend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['suspend']>>>
    }
  }
  'admin_user.unsuspend': {
    methods: ["POST"]
    pattern: '/admin/users/:id/unsuspend'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['unsuspend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_user_controller').default['unsuspend']>>>
    }
  }
  'admin_audit.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/audit'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_audit_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_audit_controller').default['index']>>>
    }
  }
  'admin_pricing_region.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/pricing-regions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['index']>>>
    }
  }
  'admin_pricing_region.store': {
    methods: ["POST"]
    pattern: '/admin/pricing-regions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_region').pricingRegionCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_region').pricingRegionCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_pricing_region.update': {
    methods: ["POST"]
    pattern: '/admin/pricing-regions/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_region').pricingRegionUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_region').pricingRegionUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_pricing_region.material_price': {
    methods: ["POST"]
    pattern: '/admin/pricing-regions/:id/materials'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_region').pricingRegionMaterialValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_region').pricingRegionMaterialValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['materialPrice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_pricing_region_controller').default['materialPrice']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_finishing.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/finishing'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['index']>>>
    }
  }
  'admin_finishing.store': {
    methods: ["POST"]
    pattern: '/admin/finishing'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finishing').finishingCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/finishing').finishingCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_finishing.update': {
    methods: ["POST"]
    pattern: '/admin/finishing/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/finishing').finishingUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/finishing').finishingUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_finishing_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_print_profile.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/profiles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['index']>>>
    }
  }
  'admin_print_profile.store': {
    methods: ["POST"]
    pattern: '/admin/profiles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['store']>>>
    }
  }
  'admin_print_profile.toggle': {
    methods: ["POST"]
    pattern: '/admin/profiles/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['toggle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_print_profile_controller').default['toggle']>>>
    }
  }
  'admin_shipping.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/shipping'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['index']>>>
    }
  }
  'admin_shipping.update_rate': {
    methods: ["POST"]
    pattern: '/admin/shipping/rates/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['updateRate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['updateRate']>>>
    }
  }
  'admin_shipping.update_extra': {
    methods: ["POST"]
    pattern: '/admin/shipping/zones/:id/extra'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['updateExtra']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_shipping_controller').default['updateExtra']>>>
    }
  }
  'admin_maker.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/makers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['index']>>>
    }
  }
  'admin_maker.set_tier': {
    methods: ["POST"]
    pattern: '/admin/makers/:id/tier'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['setTier']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['setTier']>>>
    }
  }
  'admin_maker.unlock_tier': {
    methods: ["POST"]
    pattern: '/admin/makers/:id/tier/unlock'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['unlockTier']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_maker_controller').default['unlockTier']>>>
    }
  }
  'admin_experiment.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/experiments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_experiment_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_experiment_controller').default['index']>>>
    }
  }
  'admin_report.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/reports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_report_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_report_controller').default['index']>>>
    }
  }
  'admin_report.download': {
    methods: ["GET","HEAD"]
    pattern: '/admin/reports/download/:kind'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { kind: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_report_controller').default['download']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_report_controller').default['download']>>>
    }
  }
  'admin_coupon.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/coupons'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['index']>>>
    }
  }
  'admin_coupon.store': {
    methods: ["POST"]
    pattern: '/admin/coupons'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/coupon').couponValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/coupon').couponValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin_coupon.toggle': {
    methods: ["POST"]
    pattern: '/admin/coupons/:id/toggle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['toggle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_coupon_controller').default['toggle']>>>
    }
  }
  'admin_payout.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/payouts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['index']>>>
    }
  }
  'admin_payout.ready_csv': {
    methods: ["GET","HEAD"]
    pattern: '/admin/payouts/ready.csv'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['readyCsv']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['readyCsv']>>>
    }
  }
  'admin_payout.review_profile': {
    methods: ["POST"]
    pattern: '/admin/payouts/profiles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['reviewProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['reviewProfile']>>>
    }
  }
  'admin_payout.profile_document': {
    methods: ["GET","HEAD"]
    pattern: '/admin/payouts/profiles/:id/document'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['profileDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['profileDocument']>>>
    }
  }
  'admin_payout.review_invoice': {
    methods: ["POST"]
    pattern: '/admin/payouts/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['reviewInvoice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['reviewInvoice']>>>
    }
  }
  'admin_payout.invoice_file': {
    methods: ["GET","HEAD"]
    pattern: '/admin/payouts/documents/:id/file'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['invoiceFile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['invoiceFile']>>>
    }
  }
  'admin_payout.voucher': {
    methods: ["GET","HEAD"]
    pattern: '/admin/payouts/vouchers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['voucher']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['voucher']>>>
    }
  }
  'admin_payout.mark_paid': {
    methods: ["POST"]
    pattern: '/admin/payouts/:id/paid'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['markPaid']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_payout_controller').default['markPaid']>>>
    }
  }
  'admin_launch.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/launch'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_launch_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_launch_controller').default['index']>>>
    }
  }
  'admin_settings.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['index']>>>
    }
  }
  'admin_settings.update': {
    methods: ["POST"]
    pattern: '/admin/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['update']>>>
    }
  }
  'admin_settings.reset': {
    methods: ["POST"]
    pattern: '/admin/settings/reset'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['reset']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_settings_controller').default['reset']>>>
    }
  }
}
