// apps/web/components/ui/badge.tsx (Updated with all variants)
import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  size?: 'default' | 'sm' | 'lg'
}

function Badge({ className, variant = 'default', size = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-primary text-white border-primary",
    secondary: "bg-gray-100 text-gray-900 border-gray-200",
    destructive: "bg-red-500 text-white border-red-500",
    outline: "border border-gray-200 text-gray-900 bg-transparent",
    success: "bg-green-500 text-white border-green-500",
    warning: "bg-orange-500 text-white border-orange-500",
  }

  const sizeClasses = {
    default: "px-2.5 py-0.5 text-xs",
    sm: "px-2 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full font-semibold transition-colors border",
        variantClasses[variant],
        sizeClasses[size],
        className
      )} 
      {...props} 
    />
  )
}

export { Badge }