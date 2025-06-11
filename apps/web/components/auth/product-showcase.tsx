// apps/web/components/auth/product-showcase.tsx
'use client'

import { ChartBarIcon, CubeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export function ProductShowcase() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center overflow-hidden">
      {/* Minimalist Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-emerald-300/10 rounded-full animate-pulse"></div>
      </div>

      <div className={`relative z-10 w-full max-w-lg text-white px-8 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
        
        {/* Compact Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Compact Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
            KitchZero
          </h1>
          <p className="text-lg text-emerald-50 leading-relaxed">
            AI-powered food waste management
          </p>
        </div>

        {/* Compact Features - 3 in a row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Analytics</h3>
            <p className="text-xs text-emerald-100/70">Real-time insights</p>
          </div>
          
          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <CubeIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Inventory</h3>
            <p className="text-xs text-emerald-100/70">Smart management</p>
          </div>
          
          <div className="text-center group">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Security</h3>
            <p className="text-xs text-emerald-100/70">Enterprise-grade</p>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent mb-1">
              45%
            </div>
            <div className="text-sm text-emerald-100">Waste Reduction</div>
          </div>
          <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1">
              500+
            </div>
            <div className="text-sm text-emerald-100">Restaurants</div>
          </div>
        </div>
      </div>
    </div>
  )
}