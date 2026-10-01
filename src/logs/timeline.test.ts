import { describe, expect, it } from 'vitest'

import { filterTimeline, groupByDay, type TimelineItem } from './timeline'

const item = (id: string, at: string, searchText: string): TimelineItem => ({
  id,
  log: 'lift',
  at,
  title: id,
  to: '/',
  searchText,
})

const ITEMS = [
  item('a', new Date(2026, 9, 2, 18).toISOString(), 'workout push day barbell bench press chest'),
  item('b', new Date(2026, 9, 2, 7).toISOString(), 'weight before gym felt light'),
  item('c', new Date(2026, 9, 1, 7).toISOString(), 'weight general'),
]

describe('timeline helpers', () => {
  it('matches every search word, case-insensitively', () => {
    expect(filterTimeline(ITEMS, 'Bench  chest', 'all').map((i) => i.id)).toEqual(['a'])
    expect(filterTimeline(ITEMS, 'weight', 'all').map((i) => i.id)).toEqual(['b', 'c'])
    expect(filterTimeline(ITEMS, '', 'water')).toEqual([])
  })

  it('groups consecutive items by local day', () => {
    const groups = groupByDay(ITEMS)
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['a', 'b'], ['c']])
  })
})
