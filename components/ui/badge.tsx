import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-mono transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-foreground/5 text-muted-foreground",
        glass: "glass text-foreground",
        citation:
          "border-transparent bg-gradient-to-r from-accent-cyan/25 to-accent-violet/25 text-foreground hover:from-accent-cyan/40 hover:to-accent-violet/40 cursor-pointer",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 text-[10px] h-[18px] min-w-[18px] justify-center",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { Badge, badgeVariants };
