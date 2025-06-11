// apps/web/app/login/page.tsx
import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { ProductShowcase } from '@/components/auth/product-showcase'

export const metadata: Metadata = {
  title: 'Sign In | KitchZero',
  description: 'Access your KitchZero dashboard',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Product Showcase */}
      <div className="hidden lg:flex lg:w-1/2">
        <ProductShowcase />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">KitchZero</span>
            </div>
          </div>
          
          <LoginForm />
        </div>
      </div>
    </div>
  )
}