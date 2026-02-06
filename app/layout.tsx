// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'

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
      <head>
        {/* Add Inter font via link tag */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen bg-background"
        style={{ fontFamily: "'Inter', sans-serif" }}
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