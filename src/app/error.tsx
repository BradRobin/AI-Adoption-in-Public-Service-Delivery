'use client';

import Link from 'next/link';

import { ParticleBackground } from '@/components/ParticleBackground';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <html lang="en">
      <body className="relative flex min-h-screen w-full overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Something went wrong in PARP.
          </h1>
          <p className="mt-3 text-sm text-white/80 md:text-base">
            An unexpected error occurred. You can try again or go back to the home
            page.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-2 max-w-xl break-words text-xs text-white/50">
              {error.message}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="flex h-10 min-w-[140px] items-center justify-center rounded-lg bg-green-500 px-5 text-sm font-medium text-black transition-colors hover:bg-green-600"
            >
              Try again
            </button>
            <Link
              href="/"
              className="flex h-10 min-w-[140px] items-center justify-center rounded-lg border border-white/30 bg-black/60 px-5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

