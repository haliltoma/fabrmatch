import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/shield'

const s3Endpoint = env.get('S3_ENDPOINT') ?? null

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more.
   */
  csp: {
    /**
     * Enable the Content-Security-Policy header.
     */
    enabled: app.inProduction,

    /**
     * Per-resource CSP directives. Inertia inlines the first page's data and Tailwind ships inline
     * styles, so 'unsafe-inline' stays for now; storage uploads go straight from the browser to S3/R2.
     */
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', ...(s3Endpoint ? [s3Endpoint] : [])],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", ...(s3Endpoint ? [s3Endpoint] : [])],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },

    /**
     * Report violations without blocking resources. Switch to false after a clean week in production.
     */
    reportOnly: true,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Enable CSRF token verification for state-changing requests.
     */
    enabled: true,

    /**
     * Route patterns to exclude from CSRF checks.
     * Useful for external webhooks or API endpoints.
     */
    // Provider webhooks authenticate with a signature instead of a session/CSRF token; the
    // payment return is a cross-site POST from the hosted page, verified against the provider.
    exceptRoutes: [
      '/webhooks/payments',
      '/webhooks/carrier',
      '/payments/return',
      '/webhooks/stores/:id/orders',
      '/webhooks/wix',
      // W4: the seller API authenticates with a bearer key only (no session, no cookies)
      '/api/v1/quotes',
      '/api/v1/orders',
      '/api/v1/orders/:id/cancel',
    ],

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,

    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig
