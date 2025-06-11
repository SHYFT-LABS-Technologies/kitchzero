// apps/web/components/auth/password-strength-indicator.tsx
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface PasswordStrengthProps {
  strength: {
    score: number
    strength: 'weak' | 'fair' | 'good' | 'strong'
    isAcceptable: boolean
    issues: string[]
    suggestions: string[]
  }
  className?: string
}

export function PasswordStrengthIndicator({ strength, className }: PasswordStrengthProps) {
  const getStrengthColor = (level: string, element: 'bg' | 'text' = 'bg') => {
    const colors = {
      weak: element === 'bg' ? 'bg-red-500' : 'text-red-600',
      fair: element === 'bg' ? 'bg-orange-500' : 'text-orange-600',
      good: element === 'bg' ? 'bg-yellow-500' : 'text-yellow-600',
      strong: element === 'bg' ? 'bg-green-500' : 'text-green-600',
    }
    return colors[level] || (element === 'bg' ? 'bg-gray-300' : 'text-gray-500')
  }

  const getStrengthBadgeVariant = (level: string) => {
    switch (level) {
      case 'weak': return 'destructive'
      case 'fair': return 'warning'
      case 'good': return 'secondary'
      case 'strong': return 'success'
      default: return 'outline'
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar and Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <Badge variant={getStrengthBadgeVariant(strength.strength)}>
            {strength.strength.charAt(0).toUpperCase() + strength.strength.slice(1)} ({strength.score}/100)
          </Badge>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              getStrengthColor(strength.strength)
            )}
            style={{ width: `${Math.max(strength.score, 5)}%` }}
          />
        </div>
      </div>

      {/* Issues */}
      {strength.issues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
            <span className="mr-1">⚠️</span>
            Security Issues:
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {strength.issues.map((issue, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {strength.suggestions.length > 0 && !strength.isAcceptable && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
            <span className="mr-1">💡</span>
            Suggestions:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {strength.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {strength.isAcceptable && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center text-sm">
            <span className="text-green-500 mr-2">✅</span>
            <span className="font-medium text-green-800">
              Password meets all security requirements
            </span>
          </div>
        </div>
      )}
    </div>
  )
}