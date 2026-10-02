import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        accent: "bg-accent/10 text-accent",
        success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
        muted: "bg-muted text-muted-foreground",
        upcoming:
          "bg-hippo-navy/[0.06] text-hippo-navy/60 ring-1 ring-hippo-navy/[0.08]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
