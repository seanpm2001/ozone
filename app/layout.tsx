'use client' // @TODO Totally circumventing SSC

import 'react-toastify/dist/ReactToastify.css'
import '../styles/globals.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'

import { isDarkModeEnabled } from '@/common/useColorScheme'
import { AuthProvider } from '@/shell/AuthContext'
import { CommandPaletteRoot } from '@/shell/CommandPalette/Root'
import { ConfigurationProvider } from '@/shell/ConfigurationContext'
import { Shell } from '@/shell/Shell'
import { queryClient } from 'components/QueryClient'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Since we're doing everything client side and not using RSC, we can't use `Metadata` feature from next
  // to have these head tags from the server
  const isLocal =
    typeof window !== 'undefined'
      ? window?.location.host.includes('localhost:')
      : false

  return (
    <html
      lang="en"
      className={`h-full bg-gray-50 dark:bg-slate-900 ${
        isDarkModeEnabled() ? 'dark' : ''
      }`}
    >
      <title>Ozone</title>
      <link
        rel="icon"
        href={`/img/logo-${isLocal ? 'white' : 'colorful'}.png`}
        sizes="any"
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body className="h-full overflow-hidden">
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          closeOnClick
        />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ConfigurationProvider>
              <CommandPaletteRoot>
                <Shell>{children}</Shell>
              </CommandPaletteRoot>
            </ConfigurationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
