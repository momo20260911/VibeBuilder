import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-100 outline-none transition-all duration-200 focus:border-indigo-500",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
