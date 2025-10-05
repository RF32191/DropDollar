import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DropDollar - Every Dollar Drops the Price',
  description: 'Every Dollar Drops the Price! A revolutionary marketplace where every $1 bid drops the price by $1 - guess the sum of the final price and amount of bidders to win amazing deals!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-900 transition-colors">
            {children}
          </div>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
