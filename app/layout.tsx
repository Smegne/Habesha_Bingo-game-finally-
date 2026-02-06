// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Habesha Bingo',
  description: 'Play bingo with your friends and win exciting prizes!',
  applicationName: 'Habesha Bingo',
  authors: [{ name: 'Habesha Bingo Team' }],
  metadataBase: new URL('https://habesha-bingo.vercel.app'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          {/* Global Notifications */}
          <Toaster
            richColors
            position="top-right"
            closeButton
          />
        </ThemeProvider>

        {/* Analytics */}
        <Analytics />
      </body>
    </html>
  )
}
