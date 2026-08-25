import { HTMLAttributes, forwardRef } from "react"
import { cn } from "@/src/lib/utils"

export interface NeoCardProps extends HTMLAttributes<HTMLDivElement> {
  color?: "white" | "yellow" | "pink" | "cyan" | "green"
}

const colorMap = {
  white: "bg-white",
  yellow: "bg-neo-yellow",
  pink: "bg-neo-pink",
  cyan: "bg-neo-cyan",
  green: "bg-neo-green",
}

export const NeoCard = forwardRef<HTMLDivElement, NeoCardProps>(
  ({ className, color = "white", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
          colorMap[color],
          className
        )}
        {...props}
      />
    )
  }
)
NeoCard.displayName = "NeoCard"
