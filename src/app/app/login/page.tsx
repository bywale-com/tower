import Link from "next/link";
import { login } from "./actions";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    message?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="min-h-screen bg-background text-on-background flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl bg-surface-container-low p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold tracking-tight">Log In</h1>
          <p className="text-sm text-on-surface-variant">
            Access your Sovereign Intelligence workspace.
          </p>
        </div>

        {searchParams?.error ? (
          <p className="rounded-md bg-error/20 text-error px-3 py-2 text-sm">
            {searchParams.error}
          </p>
        ) : null}

        {searchParams?.message ? (
          <p className="rounded-md bg-primary/15 text-primary px-3 py-2 text-sm">
            {searchParams.message}
          </p>
        ) : null}

        <form action={login} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-on-surface-variant">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-outline bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-on-surface-variant">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-outline bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Log In
          </button>
        </form>

        <p className="text-sm text-on-surface-variant">
          Need an account?{" "}
          <Link href="/app/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
