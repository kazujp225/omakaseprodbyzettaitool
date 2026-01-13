'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SidebarProvider } from './SidebarContext'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main className="lg:ml-64 pt-16">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  )
}
