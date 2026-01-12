import type { Metadata } from 'next'
import { Noto_Sans_JP, Manrope } from 'next/font/google'
import './globals.css'
import { MainLayout } from '@/components/layout'
import { Providers } from '@/components/Providers'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'お任せAI管理システム',
  description: 'MEO特化型ツール事業の契約・請求・稼働管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased bg-white text-navy-800">
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  )
}
