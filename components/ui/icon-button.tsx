import { forwardRef } from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
}

/**
 * Botón icon-only. Delega a Button con size="icon".
 * Requiere aria-label para accesibilidad — no es opcional.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      size="icon"
      className={cn("press", className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
