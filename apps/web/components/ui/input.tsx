// apps/web/components/ui/input.tsx
import * as React from "react"

const cn = (...inputs: (string | undefined)[]) => {
  return inputs.filter(Boolean).join(' ')
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }