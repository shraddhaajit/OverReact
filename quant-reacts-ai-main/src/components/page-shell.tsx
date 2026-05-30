import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  italic,
  lede,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  lede?: string;
}) {
  return (
    <header className="rise grid gap-6 pt-16 md:grid-cols-12 md:gap-12 md:pt-28">
      <div className="md:col-span-8">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          <span className="h-px w-10 bg-foreground/40" />
          {eyebrow}
        </div>
        <h1 className="display mt-6 text-[12vw] leading-[0.9] md:text-[7rem]">
          {title}
          {italic && (
            <>
              <br />
              <span className="italic text-foreground/80">{italic}</span>
            </>
          )}
        </h1>
      </div>
      {lede && (
        <p className="md:col-span-4 md:col-start-9 md:self-end text-lg leading-relaxed text-foreground/75">
          {lede}
        </p>
      )}
    </header>
  );
}

export function Panel({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-6 md:p-8 ${className}`}>
      {label && (
        <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function ChartBox({ height = 320, label }: { height?: number; label?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border hairline bg-background/40" style={{ height }}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="h-full w-full text-foreground/60">
        <defs>
          <linearGradient id={`cg-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,160 C50,90 90,170 140,110 C190,50 230,140 280,90 C330,40 370,110 400,80 L400,200 L0,200 Z"
          fill={`url(#cg-${label})`}
        />
        <path
          d="M0,160 C50,90 90,170 140,110 C190,50 230,140 280,90 C330,40 370,110 400,80"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
      {label && (
        <span className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}