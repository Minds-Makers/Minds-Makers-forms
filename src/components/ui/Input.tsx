import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-ink placeholder:text-faint focus:ring-2 focus:ring-cyan-soft outline-none ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`w-full bg-field border border-line2 rounded-sm px-3 py-2 text-ink placeholder:text-faint focus:ring-2 focus:ring-cyan-soft outline-none ${className}`}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
