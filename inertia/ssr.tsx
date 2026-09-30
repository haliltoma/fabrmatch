import { client } from '~/client'
import { withLayout } from '~/lib/layouts'
import ReactDOMServer from 'react-dom/server'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

const appName = import.meta.env.VITE_APP_NAME || 'Fabrmatch'

export default function render(page: any) {
  return createInertiaApp({
    page,
    // the same title rule as the browser, so crawlers see the real page title
    // pages that already name the brand keep their title as is
    title: (title) =>
      !title ? appName : title.includes(appName) ? title : `${title} - ${appName}`,
    render: ReactDOMServer.renderToString,
    resolve: async (name) =>
      withLayout(
        await resolvePageComponent<ResolvedComponent>(
          `./pages/${name}.tsx`,
          import.meta.glob<ResolvedComponent>('./pages/**/*.tsx', { eager: true })
        )
      ),
    setup: ({ App, props }) => {
      return (
        <TuyauProvider client={client}>
          <App {...props} />
        </TuyauProvider>
      )
    },
  })
}
