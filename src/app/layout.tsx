import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import GlobalLocationCheck from '@/components/GlobalLocationCheck'
import UsernameDropdown from '@/components/UsernameDropdown'
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
        <AuthProvider>
          <AudioInitializer />
          <GlobalLocationCheck />
          <div className="location-banner-spacer">
            {/* Username Dropdown - appears beneath location banner */}
            <div className="w-full bg-gray-800 border-b border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                <div className="flex justify-end">
                  <UsernameDropdown />
                </div>
              </div>
            </div>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}