import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:brightness-90",
        secondary:
          "game-edge border-primary/30 bg-paper-raised text-ink hover:border-primary/50",
        accent:
          "game-edge border-gold bg-gold text-[#1f2430] hover:brightness-95",
        danger:
          "game-edge border-alert bg-alert text-white hover:brightness-95",
        ghost: "text-ink hover:bg-ink/5",
        // ALIAS de compatibilidad — no usar en código nuevo.
        // Se eliminan cuando todos los usos migren a secondary/accent.
        gold: "game-edge border-gold bg-gold text-[#1f2430] hover:brightness-95",
        outline:
          "game-edge border-primary/30 bg-paper-raised text-ink hover:border-primary/50",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

/**
 * Botón base de preparatorIA. Ejemplo:
 *   <Button variant="accent">Reclamar recompensa</Button>
 *   <Button variant="danger" size="sm">Eliminar</Button>
 *   <Button variant="secondary" size="icon" aria-label="Cerrar">
 *     <X className="h-4 w-4" />
 *   </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
