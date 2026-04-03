import { ParticleBackground } from '@/components/ParticleBackground'

type AppPageSkeletonVariant = 'auth' | 'dashboard' | 'workspace' | 'hero' | 'form'

type AppPageSkeletonProps = {
  variant?: AppPageSkeletonVariant
  message?: string
}

function AuthSkeletonCard() {
  return (
    <div className="flex w-full max-w-md flex-col rounded-xl border border-white/10 bg-black/70 p-6 shadow-lg backdrop-blur min-h-105">
      <div className="mb-6 flex min-h-37.5 flex-col items-center gap-3">
        <div className="flex gap-3">
          <div className="h-10 w-24 animate-pulse rounded-full bg-green-500/25" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-36 animate-pulse rounded-full bg-white/8" />
      </div>
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-14 animate-pulse rounded-full bg-white/10" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
        </div>
        <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-green-500/20" />
      </div>
    </div>
  )
}

function DashboardSkeletonLayout() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 md:px-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-44 animate-pulse rounded-full bg-white/10" />
        <div className="mx-auto h-5 w-64 animate-pulse rounded-full bg-white/8" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/6" />
        <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/6" />
        <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/6" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/6" />
    </div>
  )
}

function WorkspaceSkeletonLayout() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-56 animate-pulse rounded-full bg-white/8" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-white/8" />
      </div>
      <div className="grid min-h-125 gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-white/8" />
            <div className="h-16 animate-pulse rounded-xl bg-white/6" />
            <div className="h-16 animate-pulse rounded-xl bg-white/6" />
            <div className="h-16 animate-pulse rounded-xl bg-white/6" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="space-y-4">
            <div className="h-14 animate-pulse rounded-xl bg-white/8" />
            <div className="space-y-3">
              <div className="ml-auto h-20 w-3/4 animate-pulse rounded-2xl bg-white/8" />
              <div className="h-24 w-4/5 animate-pulse rounded-2xl bg-white/6" />
              <div className="ml-auto h-18 w-2/3 animate-pulse rounded-2xl bg-white/8" />
            </div>
            <div className="h-12 animate-pulse rounded-xl bg-white/8" />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroSkeletonLayout(message?: string) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 text-center">
      <div className="space-y-4">
        <div className="mx-auto h-4 w-32 animate-pulse rounded-full bg-white/8" />
        <div className="mx-auto h-10 w-72 animate-pulse rounded-full bg-white/12 sm:w-96" />
        <div className="mx-auto h-5 w-64 animate-pulse rounded-full bg-white/8 sm:w-80" />
      </div>
      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/6" />
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
          <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/8" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/8" />
          <div className="h-12 w-48 animate-pulse rounded-full bg-green-500/20" />
        </div>
      </div>
      {message && <p className="text-sm text-white/70">{message}</p>}
    </div>
  )
}

function FormSkeletonLayout(message?: string) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/10" />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="space-y-4">
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
          <div className="h-11 w-2/3 animate-pulse rounded-xl bg-white/8" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-white/6" />
        </div>
      </div>
      {message && <p className="text-sm text-white/70">{message}</p>}
    </div>
  )
}

export function AppPageSkeleton({ variant = 'hero', message }: AppPageSkeletonProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans text-white">
      <ParticleBackground />
      <main id="main-content" className="relative z-10 flex min-h-screen w-full items-center justify-center py-8">
        {variant === 'auth' && <AuthSkeletonCard />}
        {variant === 'dashboard' && <DashboardSkeletonLayout />}
        {variant === 'workspace' && <WorkspaceSkeletonLayout />}
        {variant === 'hero' && <HeroSkeletonLayout message={message} />}
        {variant === 'form' && <FormSkeletonLayout message={message} />}
      </main>
    </div>
  )
}