import { ButtonHTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        variant === "primary"
          ? "btn-primary"
          : "btn-secondary",
        className
      )}
      {...props}
    />
  );
}