import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/src/lib/utils"

export interface NeoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: "white" | "yellow" | "pink" | "cyan" | "green" | "blue" | "purple" | "red" | "orange" | "lime" | string
}

const colorMap = {
  white: "bg-white",
  yellow: "bg-neo-cyan",
  pink: "bg-neo-pink",
  cyan: "bg-neo-cyan",
  green: "bg-neo-green",
  blue: "bg-neo-blue",
  purple: "bg-neo-purple",
  red: "bg-neo-red",
  orange: "bg-neo-orange",
  lime: "bg-neo-lime",
}

export const NeoButton = forwardRef<HTMLButtonElement, NeoButtonProps>(
  ({ className, color = "yellow", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "btn-brutal",
          colorMap[color],
          className
        )}
        {...props}
      />
    )
  }
)
NeoButton.displayName = "NeoButton"
