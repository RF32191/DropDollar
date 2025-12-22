import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SiteThemeProvider } from '@/contexts/SiteThemeContext'
import AudioInitializer from '@/components/AudioInitializer'
import './globals.css'

export const metadata: Metadata = {
  title: 'DropDollar - Professional Gaming Marketplace',
  description: 'Professional gaming marketplace with secure authentication and session management',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

// Force dynamic rendering to prevent build timeouts
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <SiteThemeProvider>
            <AuthProvider>
              <AudioInitializer />
              {children}
            </AuthProvider>
          </SiteThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}