import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
