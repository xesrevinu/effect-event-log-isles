import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "sky" | "sun";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      data-cuelume-press=""
      data-cuelume-release=""
      className={cn(
        "chunk inline-flex items-center justify-center gap-1.5 font-bold",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-10 rounded-xl px-3 text-sm",
        size === "md" && "h-12 rounded-2xl px-4 text-[15px]",
        size === "lg" && "h-14 rounded-2xl px-5 text-lg",
        variant === "primary" && "tex-grain border-accent-deep bg-accent text-accent-fg",
        variant === "sky" && "tex-grain border-sky-deep bg-sky text-accent-fg",
        variant === "sun" && "tex-grain border-sun-deep bg-sun text-fg",
        variant === "quiet" && "border-faint bg-inset text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { id: T; label: string }[];
  ariaLabel?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative grid rounded-2xl bg-inset p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-xl bg-surface transition-transform duration-200 ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: 4,
        }}
      />
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative z-10 h-10 px-2 text-sm font-extrabold transition-colors duration-150",
              on ? "text-fg" : "text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
