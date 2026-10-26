import React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "success"
  size?: "default" | "sm" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"

    const variantStyles = {
      default: "bg-[#4B8BF4] text-white hover:bg-[#3B7BE4] shadow-sm",
      outline: "border border-[#263246] bg-transparent text-white hover:bg-[#161F2E] hover:border-[#4B8BF4]",
      ghost: "bg-transparent text-[#98A7BB] hover:text-white hover:bg-[#161F2E]",
      danger: "bg-[#FF6577] text-white hover:bg-[#E05466]",
      success: "bg-[#35C98A] text-white hover:bg-[#2EB37A]",
    }

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-xs",
      sm: "h-7 px-3 text-xs",
      lg: "h-11 px-6 text-sm",
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
