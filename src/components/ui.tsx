// Small shared building blocks used across logs.

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'li'
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  return (
    <Tag
      className={`rounded-[18px] border border-hairline bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-1 pt-2 pb-2 text-meta uppercase text-ink-3">
      {children}
    </h2>
  )
}

// Pill-shaped segmented control (tabs, ranges, theme picker…).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-card-2 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full transition-all ${
              size === 'sm' ? 'h-8 px-3 text-label' : 'h-9 px-4 text-label font-medium'
            } ${active ? 'bg-card text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-ink-2'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-success' : 'bg-ink-3/30'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export function LogBadge({
  icon: Icon,
  colorClass,
  softClass,
  size = 'md',
}: {
  icon: LucideIcon
  colorClass: string
  softClass: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const box =
    size === 'lg'
      ? 'size-12 rounded-2xl'
      : size === 'sm'
        ? 'size-8 rounded-[10px]'
        : 'size-10 rounded-xl'
  const glyph = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-5'
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${softClass} ${colorClass}`}>
      <Icon className={glyph} strokeWidth={2} />
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-card-2 text-ink-2">
        <Icon className="size-6" strokeWidth={1.8} />
      </span>
      <p className="mt-1 text-heading">{title}</p>
      <p className="max-w-xs text-label text-ink-2">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
