import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CardTone =
  | "default"
  | "highlight"
  | "mission"
  | "reward"
  | "warning"
  | "success"
  | "game";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

const TONES: Record<CardTone, string> = {
  default: "border-line shadow-[var(--shadow-flat)]",
  highlight: "game-edge border-primary/40",
  mission: "game-edge border-gold shadow-[var(--shadow-edge-gold)]",
  reward: "game-edge border-gold bg-gold-soft",
  warning: "game-edge border-alert/40 bg-alert-soft",
  success: "game-edge border-growth/40 bg-growth-soft",
  game: "game-edge border-primary/40",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border bg-paper-raised",
        TONES[tone],
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-display text-xl font-semibold text-ink", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-ink-soft", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
