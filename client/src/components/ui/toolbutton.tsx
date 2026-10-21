import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export default function ToolButton({
  label,
  children,
  className,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className={cn("size-8 shrink-0", className)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}