// apps/web/components/ui/alert.tsx
import * as React from "react"

// Simple utility function (no external dependencies)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success'
}

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseClasses = "relative w-full rounded-lg border p-4"
    
    const variantClasses = {
      default: "bg-white border-gray-200 text-gray-900",
      destructive: "bg-red-50 border-red-200 text-red-800",
      warning: "bg-orange-50 border-orange-200 text-orange-800",
      success: "bg-green-50 border-green-200 text-green-800",
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h5>
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }