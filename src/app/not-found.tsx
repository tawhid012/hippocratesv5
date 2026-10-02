import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">
        Page Not Found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The requested page or conversation could not be located.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
      >
        Return to Hippocrates
      </Link>
    </div>
  );
}
