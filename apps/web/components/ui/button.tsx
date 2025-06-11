// apps/web/components/ui/button.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    
    const variantClasses = {
      default: "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:shadow-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-primary-600 disabled:hover:to-primary-700",
      destructive: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl disabled:opacity-60",
      outline: "border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-60",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-60",
      ghost: "text-gray-700 hover:bg-gray-100 disabled:opacity-60",
      link: "text-primary-600 underline-offset-4 hover:underline disabled:opacity-60",
    }
    
    const sizeClasses = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-6 text-base",
      icon: "h-10 w-10",
    }
    
    return (
      <button
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }