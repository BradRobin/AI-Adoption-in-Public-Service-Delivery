'use client'

import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <h1 className="mb-6 text-2xl font-medium text-white sm:text-3xl">
          Sign in to continue
        </h1>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/"
            className="flex h-12 min-w-[140px] items-center justify-center rounded-lg bg-green-500 px-6 font-medium text-white transition-colors hover:bg-green-600"
          >
            Login
          </Link>
          <Link
            href="/"
            className="flex h-12 min-w-[140px] items-center justify-center rounded-lg border border-white bg-white px-6 font-medium text-black transition-colors hover:bg-gray-100"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
