import type { ComponentType, InputHTMLAttributes } from "react";

interface CampoConIconoProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
}

export function CampoConIcono({ label, hint, icon: Icon, ...inputProps }: CampoConIconoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputProps.name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          id={inputProps.name}
          className="h-11 w-full rounded-xl border border-line bg-paper/70 pl-10 pr-3 text-sm text-ink outline-none focus-visible:border-primary"
          {...inputProps}
        />
      </div>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
