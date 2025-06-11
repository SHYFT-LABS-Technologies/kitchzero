// apps/web/components/auth/login-form.tsx
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

      if (response.user.mustChangePassword) {
        router.push('/auth/change-password?forced=true&reason=first_login')
        return
      }

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
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-600">Sign in to your account</p>
      </div>

      {/* Enhanced Form Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-slide-up delay-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="animate-shake">
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Sign in failed</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-2 group">
            <Label htmlFor="username" className="text-sm font-semibold text-gray-700 group-focus-within:text-primary-600 transition-colors">
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                className={`h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-primary-500/20 transition-all duration-300 ${
                  errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                }`}
                {...register('username')}
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600 rounded-l-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            </div>
            {errors.username && (
              <p className="text-sm text-red-600 animate-fade-in">{errors.username.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2 group">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700 group-focus-within:text-primary-600 transition-colors">
                Password
              </Label>
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-all duration-200 hover:scale-105"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className={`h-12 pr-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-primary-500/20 transition-all duration-300 ${
                  errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                }`}
                {...register('password')}
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600 rounded-l-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
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
              <p className="text-sm text-red-600 animate-fade-in">{errors.password.message}</p>
            )}
          </div>

          {/* Fixed Submit Button - Always Primary Colors */}
          <Button
            type="submit"
            className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 group">
                <span>Sign in</span>
                <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            )}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center animate-slide-up delay-200">
        <div className="flex justify-center space-x-6 text-sm text-gray-500">
          <a href="#" className="hover:text-primary-600 transition-all duration-200 hover:scale-105">Privacy</a>
          <a href="#" className="hover:text-primary-600 transition-all duration-200 hover:scale-105">Terms</a>
          <a href="#" className="hover:text-primary-600 transition-all duration-200 hover:scale-105">Support</a>
        </div>
      </div>
    </div>
  )
}