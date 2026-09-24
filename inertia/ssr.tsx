import { client } from '~/client'
import { withLayout } from '~/lib/layouts'
import ReactDOMServer from 'react-dom/server'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

export default function render(page: any) {
  return createInertiaApp({
    page,
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
