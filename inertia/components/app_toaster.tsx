import { Toaster } from 'sonner'
import { useTheme } from '~/lib/theme'

/**
 * The one toast host for every layout, drawn with the site's tokens instead of sonner's own
 * "rich colors": those failed WCAG contrast for error toasts on small screens. Tokens switch with
 * the theme, so light and dark both pass.
 */
export function AppToaster() {
  const { dark } = useTheme()
  return (
    <Toaster
      position="top-center"
      theme={dark ? 'dark' : 'light'}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: 'border-2 !border-ink-900 !bg-paper-raised !text-ink-900 font-sans',
          error: '!border-danger !bg-danger-soft !text-danger',
          success: '!border-fil-600 !bg-fil-100 !text-fil-700',
          description: '!text-ink-700',
        },
      }}
    />
  )
}
