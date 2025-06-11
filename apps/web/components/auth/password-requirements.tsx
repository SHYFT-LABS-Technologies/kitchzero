// apps/web/components/auth/password-requirements.tsx
import { cn } from '@/lib/utils'

interface PasswordRequirementsProps {
  requirements: {
    minLength: number
    maxLength: number
    requireLowercase: boolean
    requireUppercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    preventCommonPasswords: boolean
    preventPersonalInfo: boolean
    preventPasswordReuse: number
  }
  tips: string[]
  currentPassword?: string
  passwordStrength?: any
  className?: string
}

export function PasswordRequirements({ 
  requirements, 
  tips, 
  currentPassword = '',
  passwordStrength,
  className 
}: PasswordRequirementsProps) {
  const checkRequirement = (requirement: string): boolean => {
    if (!currentPassword) return false
    
    switch (requirement) {
      case 'length':
        return currentPassword.length >= requirements.minLength
      case 'lowercase':
        return /[a-z]/.test(currentPassword)
      case 'uppercase':
        return /[A-Z]/.test(currentPassword)
      case 'numbers':
        return /\d/.test(currentPassword)
      case 'special':
        return /[!@#$%^&*(),.?":{}|<>]/.test(currentPassword)
      default:
        return false
    }
  }

  const RequirementItem = ({ 
    met, 
    children 
  }: { 
    met: boolean
    children: React.ReactNode 
  }) => (
    <li className={cn(
      'flex items-center space-x-2 text-sm',
      met ? 'text-green-600' : 'text-gray-600'
    )}>
      <span className={cn(
        'w-4 h-4 rounded-full flex items-center justify-center text-xs',
        met ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      )}>
        {met ? '✓' : '○'}
      </span>
      <span>{children}</span>
    </li>
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Requirements Checklist */}
      <div className="bg-gray-50 border rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Password Requirements:
        </h4>
        <ul className="space-y-2">
          <RequirementItem met={checkRequirement('length')}>
            At least {requirements.minLength} characters long
          </RequirementItem>
          <RequirementItem met={checkRequirement('lowercase')}>
            Contains lowercase letters (a-z)
          </RequirementItem>
          <RequirementItem met={checkRequirement('uppercase')}>
            Contains uppercase letters (A-Z)
          </RequirementItem>
          <RequirementItem met={checkRequirement('numbers')}>
            Contains numbers (0-9)
          </RequirementItem>
          <RequirementItem met={checkRequirement('special')}>
            Contains special characters (!@#$%^&*)
          </RequirementItem>
        </ul>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">
          💡 Password Tips:
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {tips.slice(0, 4).map((tip, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-blue-500 mt-0.5 text-xs">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Example Passwords */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-green-900 mb-3">
          ✨ Example Strong Passwords:
        </h4>
        <div className="space-y-2">
          <div className="bg-white rounded border p-2 font-mono text-sm text-gray-700">
            Coffee$Mountain#Running2025
          </div>
          <div className="bg-white rounded border p-2 font-mono text-sm text-gray-700">
            Blue^Ocean*Sunset!Dreams
          </div>
          <div className="bg-white rounded border p-2 font-mono text-sm text-gray-700">
            Pizza&Code#Weekend@Fun
          </div>
        </div>
        <p className="text-xs text-green-600 mt-2">
          These combine unrelated words with symbols for maximum security
        </p>
      </div>
    </div>
  )
}