// apps/web/app/auth/change-password/page.tsx (Updated with AuthService methods)
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthService } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type PasswordFormData = z.infer<typeof changePasswordSchema>

export default function ChangePasswordPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<any>(null)
  const [requirements, setRequirements] = useState<any>(null)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setError: setFieldError,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange'
  })

  const newPassword = watch('newPassword')

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setIsFirstTime(currentUser.mustChangePassword || searchParams.get('forced') === 'true')
    }

    const fetchRequirements = async () => {
      try {
        const data = await AuthService.getPasswordRequirements()
        setRequirements(data.data)
      } catch (error) {
        console.error('Failed to fetch password requirements:', error)
        // Set default requirements if API fails
        setRequirements({
          requirements: {
            minLength: 12,
            maxLength: 128,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialChars: true
          },
          tips: [
            'Use a passphrase with 4+ unrelated words',
            'Include a mix of letters, numbers, and symbols',
            'Avoid personal information like names or dates'
          ]
        })
      }
    }

    checkAuth()
    fetchRequirements()
  }, [router, searchParams])

  // Real-time password strength checking
  useEffect(() => {
    const checkPasswordStrength = async () => {
      if (!newPassword || newPassword.length < 4) {
        setPasswordStrength(null)
        return
      }

      try {
        const data = await AuthService.checkPasswordStrength(newPassword, user?.username)
        setPasswordStrength(data.data)
      } catch (error) {
        console.error('Password strength check failed:', error)
        // Fallback to simple strength check
        const score = getSimplePasswordStrength(newPassword)
        setPasswordStrength({
          score,
          strength: score >= 80 ? 'strong' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'weak',
          isAcceptable: score >= 70,
          issues: [],
          suggestions: []
        })
      }
    }

    const debounceTimer = setTimeout(checkPasswordStrength, 500)
    return () => clearTimeout(debounceTimer)
  }, [newPassword, user])

  const getSimplePasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 12) score += 25
    if (/[a-z]/.test(password)) score += 20
    if (/[A-Z]/.test(password)) score += 20
    if (/\d/.test(password)) score += 20
    if (/[!@#$%^&*]/.test(password)) score += 15
    return score
  }

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const result = await AuthService.changePassword(data)

      // Success - redirect based on role
      if (isFirstTime) {
        setTimeout(() => {
          if (user.role === 'RESTAURANT_ADMIN') {
            router.push('/dashboard/restaurant-admin')
          } else if (user.role === 'BRANCH_ADMIN') {
            router.push('/dashboard/branch-admin')
          } else {
            router.push('/dashboard')
          }
        }, 1000)
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(error.message || 'Password change failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !requirements) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isFirstTime ? 'Set Your New Password' : 'Change Password'}
            </CardTitle>
            {isFirstTime && (
              <p className="text-sm text-gray-600 mt-2">
                For security reasons, you must change your password before accessing the system.
              </p>
            )}
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Current Password */}
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder={isFirstTime ? "Your temporary password" : "Enter current password"}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                  {...register('currentPassword')}
                  disabled={isLoading}
                />
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  className={errors.newPassword ? 'border-red-500' : ''}
                  {...register('newPassword')}
                  disabled={isLoading}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
                
                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength === 'strong' ? 'bg-green-500' :
                            passwordStrength.strength === 'good' ? 'bg-yellow-500' :
                            passwordStrength.strength === 'fair' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength === 'strong' ? 'text-green-600' :
                        passwordStrength.strength === 'good' ? 'text-yellow-600' :
                        passwordStrength.strength === 'fair' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {passwordStrength.strength}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  {...register('confirmPassword')}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isValid || (passwordStrength && !passwordStrength.isAcceptable)}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Changing Password...</span>
                  </div>
                ) : (
                  isFirstTime ? 'Set New Password' : 'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}