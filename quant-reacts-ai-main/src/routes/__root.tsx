"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OverReact — Measuring the market's memory" },
      { name: "description", content: "An editorial study of overreaction in Indian equities." },
      { name: "author", content: "OverReact" },
      { property: "og:title", content: "OverReact" },
      { property: "og:description", content: "Measuring the market's memory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:creator", content: "@OverReact" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen">
        <div className="aurora">
          <div className="aurora-mid" />
        </div>
        <SiteHeader />
        <main className="relative">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}

function SiteHeader() {
  const links = [
    { to: "/", label: "Summary" },
    { to: "/sector", label: "Sectors" },
    { to: "/model", label: "Model" },
    { to: "/events", label: "Events" },
    { to: "/predict", label: "Predict" },
  ] as const;
  return (
    <header className="sticky top-0 z-40">
      <div className="glass border-x-0 border-t-0">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:px-12">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="display text-2xl tracking-tight">OverReact</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-foreground bg-foreground/5" }}
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              NIFTY · 50
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
          </div>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t hairline">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10 md:flex-row md:items-end md:justify-between md:px-12">
        <div>
          <div className="display text-3xl">OverReact</div>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Measuring the market's memory
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-xs text-muted-foreground md:text-right">
          <span>Universe</span><span>NIFTY 50</span>
          <span>Method</span><span>Event study · ML</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] border-t hairline px-6 py-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:px-12">
        Not investment advice · A research instrument
      </div>
    </footer>
  );
}
