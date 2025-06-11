'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthService } from '@/lib/auth'
import { formatError } from '@/lib/utils'

const loginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(1, 'Password is required')
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError: setFieldError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await AuthService.login(data)

      // CRITICAL: Check if password change is required
      if (response.user.mustChangePassword) {
        // Redirect to password change with context
        router.push('/auth/change-password?forced=true&reason=first_login')
        return
      }

      // CRITICAL: Role-based dashboard routing
      switch (response.user.role) {
        case 'KITCHZERO_ADMIN':
          router.push('/dashboard/admin')
          break
        case 'RESTAURANT_ADMIN':
          router.push('/dashboard/restaurant-admin')
          break
        case 'BRANCH_ADMIN':
          router.push('/dashboard/branch-admin')
          break
        default:
          router.push('/dashboard')
      }
    } catch (err) {
      const errorMessage = formatError(err)

      if (errorMessage.includes('Invalid username or password')) {
        setFieldError('username', { message: ' ' })
        setFieldError('password', { message: ' ' })
        setError('Invalid credentials. Please check your username and password.')
      } else if (errorMessage.includes('Account is disabled')) {
        setError('Account disabled. Contact support for assistance.')
      } else if (errorMessage.includes('Too many')) {
        setError('Too many attempts. Please wait 15 minutes.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Mobile Logo */}
      <div className="lg:hidden text-center">
        <div className="inline-flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-neutral-900">KitchZero</span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900">Welcome back</h1>
        <p className="text-neutral-600">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Sign in failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-neutral-800">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            className={`h-12 text-base ${errors.username
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : ''
              }`}
            {...register('username')}
            disabled={isLoading}
          />
          {errors.username && (
            <p className="text-sm text-red-600">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-800">
              Password
            </Label>
            <button
              type="button"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={`h-12 text-base pr-12 ${errors.password
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : ''
                }`}
              {...register('password')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isLoading || !isValid}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>Sign in</span>
              <ArrowRightIcon className="w-4 h-4" />
            </div>
          )}
        </Button>
      </form>

      {/* Demo Credentials - Compact */}
      <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-800 mb-3 text-center">Demo Accounts</h3>
        <div className="space-y-2">
          {[
            { role: 'Admin', user: 'admin', pass: 'Admin123!' },
            { role: 'Restaurant', user: 'restaurant_admin', pass: 'RestaurantAdmin123!' },
            { role: 'Branch', user: 'branch_admin', pass: 'BranchAdmin123!' }
          ].map((account, index) => (
            <div key={index} className="flex items-center justify-between text-sm bg-white rounded p-2 border">
              <span className="font-medium text-neutral-700">{account.role}</span>
              <div className="text-neutral-600">
                <span className="font-mono">{account.user}</span>
                <span className="mx-2">•</span>
                <span className="font-mono">{account.pass}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 space-y-3">
        <div className="flex justify-center space-x-6">
          <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-primary-600 transition-colors">Support</a>
        </div>
        <p>© 2024 KitchZero. All rights reserved.</p>
      </div>
    </div>
  )
}