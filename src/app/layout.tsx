import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import AudioInitializer from '@/components/AudioInitializer'
import DataValidationInitializer from '@/components/DataValidationInitializer'
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
            <DataValidationInitializer />
            <AudioInitializer />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}