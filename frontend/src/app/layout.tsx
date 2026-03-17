import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RegenSupply | CMO Risk Tracker',
  description: 'Third-Party Manufacturer Form 483 Compliance & Risk Assessment Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900`}>
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                    RS
                  </div>
                  <span className="font-bold text-xl text-slate-800 tracking-tight">RegenSupply</span>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <a href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Dashboard</a>
                <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Alerts</a>
                <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Compare Vendors</a>
                <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-xs font-bold text-slate-500">
                  QA
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        
        <footer className="bg-slate-900 py-8 text-center text-slate-400 text-sm mt-auto">
          <p>© 2026 RegenSupply. Internal validation engineering supply chain risk assessment tool.</p>
          <p className="text-xs mt-2 text-slate-500">Data sourced from public FDA Enforcement and Inspection Classification databases.</p>
        </footer>
      </body>
    </html>
  )
}
