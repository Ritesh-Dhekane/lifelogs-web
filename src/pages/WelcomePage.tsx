const LOG_DOTS = [
  'bg-lift',
  'bg-water',
  'bg-meals',
  'bg-expenses',
  'bg-distance',
  'bg-screen',
  'bg-thoughts',
  'bg-tasks',
]

// Placeholder until the app shell (TASK-006) lands: proves the theme, fonts and PWA work.
export function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-16 rounded-2xl" />
      <div>
        <p className="text-meta uppercase text-ink-3">LifeLogs</p>
        <h1 className="mt-1 text-display">Your day, logged calmly.</h1>
        <p className="mt-3 text-ink-2">
          Lifts first, then everything else. Your data stays on this device.
        </p>
      </div>
      <div className="flex gap-2">
        {LOG_DOTS.map((className) => (
          <span key={className} className={`size-3 rounded-full ${className}`} />
        ))}
      </div>
    </main>
  )
}
