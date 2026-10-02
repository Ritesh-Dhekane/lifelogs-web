// Category icon keys (stored in the database) → Lucide icons, plus small display helpers.

import {
  BookOpen,
  Bus,
  Car,
  Clapperboard,
  Ellipsis,
  Fuel,
  Gift,
  HeartPulse,
  House,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  Coffee,
  Dumbbell,
  PawPrint,
  Baby,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { createElement } from 'react'

import type { PaidWith } from '../../data/db'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  basket: ShoppingBasket,
  bus: Bus,
  fuel: Fuel,
  bag: ShoppingBag,
  receipt: Receipt,
  home: House,
  heart: HeartPulse,
  film: Clapperboard,
  repeat: Repeat,
  plane: Plane,
  book: BookOpen,
  gift: Gift,
  car: Car,
  coffee: Coffee,
  gym: Dumbbell,
  pet: PawPrint,
  baby: Baby,
  phone: Smartphone,
  dots: Ellipsis,
}

export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Ellipsis
}

// A category's icon in its own colour (decorative; the name is always shown next to it).
export function CategoryGlyph({
  icon,
  color,
  className = 'size-4',
}: {
  icon: string
  color?: string
  className?: string
}) {
  return createElement(categoryIcon(icon), { className, style: { color }, 'aria-hidden': true })
}

export const PAID_WITH_LABEL: Record<PaidWith, string> = {
  upi: 'UPI',
  card: 'Card',
  cash: 'Cash',
  other: 'Other',
}
