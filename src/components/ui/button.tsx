import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded transition-colors active:scale-95 duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "text-outline hover:text-primary hover:bg-surface-variant",
        outline:
          "bg-surface-container border border-outline-variant text-outline hover:text-on-surface hover:border-primary-container",
        tab: "px-2.5 py-1 font-label-caps text-label-caps text-outline hover:text-on-surface hover:bg-surface-variant border border-transparent",
        tabActive:
          "px-2.5 py-1 font-label-caps text-label-caps bg-surface-container-high text-primary border border-primary-container",
      },
      size: {
        default: "h-9 px-3",
        icon: "h-8 w-8 rounded-lg",
        none: "",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
