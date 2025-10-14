import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import GlobalLocationCheck from '@/components/GlobalLocationCheck'
import AudioInitializer from '@/components/AudioInitializer'
import './globals.css'

export const metadata: Metadata = {
  title: 'DropDollar - Professional Gaming Marketplace',
  description: 'Professional gaming marketplace with secure authentication and session management',
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
          <AuthProvider>
            <AudioInitializer />
            <GlobalLocationCheck />
            <div className="location-banner-spacer">
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}