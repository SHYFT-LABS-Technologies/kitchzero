import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KitchZero - Food Waste Management',
  description: 'Reduce food waste, manage inventory, and track cost analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}