import { HTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "cutato-card",
        className
      )}
      {...props}
    />
  );
}