import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { ProductShowcase } from '@/components/auth/product-showcase'

export const metadata: Metadata = {
  title: 'Sign In | KitchZero',
  description: 'Access your KitchZero dashboard',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Product Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ProductShowcase />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}