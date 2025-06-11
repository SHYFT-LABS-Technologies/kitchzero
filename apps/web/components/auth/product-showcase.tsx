'use client'

import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { ChartBarIcon, CubeIcon, UsersIcon } from '@heroicons/react/24/outline'

export function ProductShowcase() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-800 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-300 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-lg text-white text-center px-12">
        {/* Logo & Brand */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4">KitchZero</h1>
        <p className="text-white/90 text-lg mb-12 leading-relaxed">
          Transform your restaurant operations with AI-powered food waste management
        </p>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-300 mb-1">45%</div>
            <div className="text-sm text-white/80">Waste Reduction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-300 mb-1">12K+</div>
            <div className="text-sm text-white/80">Restaurants</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-300 mb-1">$2.3B</div>
            <div className="text-sm text-white/80">Saved</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-300 mb-1">99.9%</div>
            <div className="text-sm text-white/80">Uptime</div>
          </div>
        </div>

        {/* Key Features */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <span className="text-white/90">Real-time analytics & insights</span>
          </div>
          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CubeIcon className="w-5 h-5" />
            </div>
            <span className="text-white/90">Smart inventory management</span>
          </div>
          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="text-white/90">Multi-location support</span>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">Trusted by industry leaders</span>
        </div>
      </div>
    </div>
  )
}