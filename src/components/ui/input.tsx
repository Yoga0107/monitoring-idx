import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full h-9 pl-8 pr-3 bg-surface-container border border-outline-variant rounded font-data-mono-sm text-data-mono-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary-container focus:ring-0",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
