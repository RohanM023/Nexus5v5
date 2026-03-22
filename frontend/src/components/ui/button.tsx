"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
          {
            "bg-amber-600 text-black hover:bg-amber-500 rounded-md":
              variant === "primary",
            "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md":
              variant === "secondary",
            "bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-white rounded-md":
              variant === "outline",
            "bg-transparent text-[var(--color-text-secondary)] hover:text-white rounded-md":
              variant === "ghost",
            "bg-red-600/80 text-white hover:bg-red-500 rounded-md":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-2.5 text-sm": size === "lg",
          },
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
