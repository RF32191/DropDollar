import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DropDollar - Gaming Marketplace',
  description: 'Gaming marketplace where you can buy, sell, and compete',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
