import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "sky" | "sun" | "danger";
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
        variant === "danger" && "tex-grain border-[#b42323] bg-danger text-accent-fg",
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
      className="help-tabs"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="help-tabs-thumb"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: 3,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={opt.id === value}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
