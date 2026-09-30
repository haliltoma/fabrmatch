import './css/app.css'
import { client } from './client'
import { withLayout } from '~/lib/layouts'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

const appName = import.meta.env.VITE_APP_NAME || 'Fabrmatch'

createInertiaApp({
  // pages that already name the brand keep their title as is
  title: (title) => (!title ? appName : title.includes(appName) ? title : `${title} - ${appName}`),
  resolve: async (name) =>
    withLayout(
      await resolvePageComponent<ResolvedComponent>(
        `./pages/${name}.tsx`,
        import.meta.glob<ResolvedComponent>('./pages/**/*.tsx')
      )
    ),
  setup({ el, App, props }) {
    const app = (
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    )
    // server-rendered pages are hydrated in place; anything else is rendered fresh
    if (el.hasChildNodes()) hydrateRoot(el, app)
    else createRoot(el).render(app)
  },
  progress: {
    color: '#f0501e',
  },
})
