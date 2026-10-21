import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { masteryColor } from "../lib/progress";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300",
  danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>;
}

/**
 * A popup over the page. Closes with ✕, Escape or a click outside it. Rendered into
 * <body> so it covers the whole window even when opened from the sticky header.
 */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto my-8 w-full max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** The "← back" button at the top of a page. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-base font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ←
      </span>
      {children}
    </a>
  );
}

/** Main column plus a side column that widens with the screen (side column hidden below lg). */
export const WITH_SIDE_PANEL =
  "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]";

/** The side column: stays in view while the page scrolls, and scrolls on its own when long. */
export const SIDE_COLUMN = "hidden space-y-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto";

/** A compact card for the side column of wide layouts. */
export function SidePanel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {aside && <span className="text-xs text-slate-500">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

type Tone = "slate" | "indigo" | "emerald" | "amber" | "rose";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function difficultyTone(difficulty: "easy" | "medium" | "hard"): Tone {
  return difficulty === "easy" ? "emerald" : difficulty === "medium" ? "amber" : "rose";
}

export function Bar({ value, colorClass = "bg-indigo-500" }: { value: number; colorClass?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function MasteryBar({ value }: { value: number }) {
  return <Bar value={value} colorClass={masteryColor(value)} />;
}
