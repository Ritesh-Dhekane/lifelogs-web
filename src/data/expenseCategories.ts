// Built-in spending categories, seeded into the database on first run. Users can add their own,
// rename these, set budgets or hide them; ids never change so old entries keep their category.

import type { ExpenseCategory } from './db'

const base = (
  id: string,
  name: string,
  icon: string,
  color: string,
  position: number,
): ExpenseCategory => ({
  id,
  name,
  icon,
  color,
  budgetMinor: null,
  position,
  isCustom: false,
  archived: false,
})

export const BUILT_IN_CATEGORIES: ExpenseCategory[] = [
  base('cat-food', 'Food & dining', 'utensils', '#ff9f0a', 0),
  base('cat-groceries', 'Groceries', 'basket', '#34c759', 1),
  base('cat-transport', 'Transport', 'bus', '#0a84ff', 2),
  base('cat-fuel', 'Fuel', 'fuel', '#ff453a', 3),
  base('cat-shopping', 'Shopping', 'bag', '#af52de', 4),
  base('cat-bills', 'Bills & utilities', 'receipt', '#5ac8fa', 5),
  base('cat-rent', 'Rent & home', 'home', '#a2845e', 6),
  base('cat-health', 'Health', 'heart', '#ff2d55', 7),
  base('cat-fun', 'Entertainment', 'film', '#5856d6', 8),
  base('cat-subscriptions', 'Subscriptions', 'repeat', '#30b0c7', 9),
  base('cat-travel', 'Travel', 'plane', '#00c7be', 10),
  base('cat-education', 'Education', 'book', '#ffcc00', 11),
  base('cat-gifts', 'Gifts & giving', 'gift', '#ff6482', 12),
  base('cat-vehicle', 'Vehicle', 'car', '#8e8e93', 13),
  base('cat-other', 'Other', 'dots', '#98989d', 14),
]

// Colours offered for custom categories.
export const CATEGORY_COLORS = [
  '#ff9f0a',
  '#34c759',
  '#0a84ff',
  '#ff453a',
  '#af52de',
  '#5ac8fa',
  '#a2845e',
  '#ff2d55',
  '#5856d6',
  '#30b0c7',
  '#00c7be',
  '#ffcc00',
]
