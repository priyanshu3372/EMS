import { describe, it, expect } from 'vitest'
import {
  workingDays,
  balanceFrom,
  checkBalance,
  InvalidRangeError,
  type Weekday,
} from './leaveDays'

/**
 * Counting leave days.
 *
 * This is the number that comes off a balance and eventually off a salary.
 * Every case here — a holiday landing on a Sunday, a half day on a weekend, a
 * single-day request — is one where being out by one day is somebody's pay.
 */

/** Sunday only, which is the most common Indian office pattern. */
const SUNDAY_OFF: Weekday[] = [0]
/** Saturday and Sunday. */
const WEEKEND_OFF: Weekday[] = [0, 6]

/** April 2026: the 1st is a Wednesday. */
const NO_HOLIDAYS: string[] = []

describe('counting working days', () => {
  it('counts a single day as one', () => {
    const result = workingDays({
      from: '2026-04-01',
      to: '2026-04-01',
      weeklyOffDays: SUNDAY_OFF,
      holidays: NO_HOLIDAYS,
    })
    expect(result.days).toBe(1)
  })

  it('counts both ends of the range', () => {
    // Wednesday to Friday. "Leave from Monday to Friday" means five days to
    // everybody who has ever applied for it; an exclusive end would quietly
    // short them by one.
    const result = workingDays({
      from: '2026-04-01',
      to: '2026-04-03',
      weeklyOffDays: SUNDAY_OFF,
      holidays: NO_HOLIDAYS,
    })
    expect(result.days).toBe(3)
  })

  it('does not charge for a Sunday in the middle', () => {
    // Friday 3rd to Monday 6th: the 5th is a Sunday.
    const result = workingDays({
      from: '2026-04-03',
      to: '2026-04-06',
      weeklyOffDays: SUNDAY_OFF,
      holidays: NO_HOLIDAYS,
    })

    expect(result.days).toBe(3)
    expect(result.breakdown.find((d) => d.date === '2026-04-05')?.reason).toBe('weekly_off')
  })

  it('does not charge for a Saturday when the company takes them off', () => {
    const result = workingDays({
      from: '2026-04-03',
      to: '2026-04-06',
      weeklyOffDays: WEEKEND_OFF,
      holidays: NO_HOLIDAYS,
    })
    expect(result.days).toBe(2)
  })

  it('does not charge for a public holiday', () => {
    const result = workingDays({
      from: '2026-04-01',
      to: '2026-04-03',
      weeklyOffDays: SUNDAY_OFF,
      holidays: ['2026-04-02'],
    })

    expect(result.days).toBe(2)
    expect(result.breakdown.find((d) => d.date === '2026-04-02')?.reason).toBe('holiday')
  })

  it('does NOT charge twice when a holiday falls on a Sunday', () => {
    // 5 April 2026 is a Sunday. Marking it a holiday as well must not subtract
    // it twice, and must not accidentally make it a working day either.
    const result = workingDays({
      from: '2026-04-03',
      to: '2026-04-06',
      weeklyOffDays: SUNDAY_OFF,
      holidays: ['2026-04-05'],
    })

    expect(result.days).toBe(3)
    expect(result.breakdown.find((d) => d.date === '2026-04-05')?.counted).toBe(0)
  })

  it('charges half a day where one is marked', () => {
    // Leaving at lunch on the Friday of a week's leave.
    const result = workingDays({
      from: '2026-04-01',
      to: '2026-04-03',
      weeklyOffDays: SUNDAY_OFF,
      holidays: NO_HOLIDAYS,
      halfDays: ['2026-04-03'],
    })

    expect(result.days).toBe(2.5)
  })

  it('does not charge a half day that falls on a holiday', () => {
    // The day is already free. Charging half of nothing is still nothing.
    const result = workingDays({
      from: '2026-04-01',
      to: '2026-04-02',
      weeklyOffDays: SUNDAY_OFF,
      holidays: ['2026-04-02'],
      halfDays: ['2026-04-02'],
    })

    expect(result.days).toBe(1)
  })

  it('returns zero for a range that is entirely weekend and holidays', () => {
    const result = workingDays({
      from: '2026-04-04',
      to: '2026-04-05',
      weeklyOffDays: WEEKEND_OFF,
      holidays: NO_HOLIDAYS,
    })

    // Zero, not an error. Applying for leave across a long weekend is a real
    // thing people do, and the honest answer is that it costs nothing.
    expect(result.days).toBe(0)
  })

  it('handles a range that crosses a month boundary', () => {
    const result = workingDays({
      from: '2026-04-29',
      to: '2026-05-04',
      weeklyOffDays: WEEKEND_OFF,
      holidays: NO_HOLIDAYS,
    })

    // Wed 29, Thu 30, Fri 1, Mon 4 — the 2nd and 3rd are the weekend.
    expect(result.days).toBe(4)
  })

  it('handles a range that crosses a year boundary', () => {
    const result = workingDays({
      from: '2026-12-31',
      to: '2027-01-01',
      weeklyOffDays: SUNDAY_OFF,
      holidays: NO_HOLIDAYS,
    })
    expect(result.days).toBe(2)
  })

  it('explains every day, not just the total', () => {
    const result = workingDays({
      from: '2026-04-03',
      to: '2026-04-06',
      weeklyOffDays: SUNDAY_OFF,
      holidays: ['2026-04-06'],
    })

    // The breakdown is what lets somebody see WHY it is two days and not four,
    // without anybody having to reconstruct the rules.
    expect(result.breakdown).toHaveLength(4)
    expect(result.breakdown.map((d) => d.reason)).toEqual([
      'working',
      'working',
      'weekly_off',
      'holiday',
    ])
  })
})

describe('rejecting ranges that make no sense', () => {
  it('refuses an end before the start', () => {
    expect(() =>
      workingDays({
        from: '2026-04-10',
        to: '2026-04-01',
        weeklyOffDays: SUNDAY_OFF,
        holidays: NO_HOLIDAYS,
      }),
    ).toThrow(InvalidRangeError)
  })

  it('refuses a date that is not a date', () => {
    expect(() =>
      workingDays({
        from: '2026-02-31',
        to: '2026-03-01',
        weeklyOffDays: SUNDAY_OFF,
        holidays: NO_HOLIDAYS,
      }),
    ).toThrow(/not a date/)
  })

  it('refuses a range longer than two years rather than looping', () => {
    expect(() =>
      workingDays({
        from: '2026-01-01',
        to: '2030-01-01',
        weeklyOffDays: SUNDAY_OFF,
        holidays: NO_HOLIDAYS,
      }),
    ).toThrow(/two years/)
  })
})

describe('balances, from the ledger', () => {
  it('sums entries into a balance', () => {
    // Granted 12, took 3, took a half day, one day given back.
    expect(balanceFrom([{ days: 12 }, { days: -3 }, { days: -0.5 }, { days: 1 }])).toBe(9.5)
  })

  it('is zero for somebody with no entries', () => {
    expect(balanceFrom([])).toBe(0)
  })

  it('can go negative, and says so rather than clamping', () => {
    // An approved exception, or a correction after the fact. Clamping to zero
    // would hide that somebody owes days back.
    expect(balanceFrom([{ days: 2 }, { days: -3 }])).toBe(-1)
  })
})

describe('checking a request against a balance', () => {
  it('allows a request that fits', () => {
    expect(checkBalance(3, 5, 12)).toEqual({ ok: true })
  })

  it('allows a request that uses the balance exactly', () => {
    expect(checkBalance(5, 5, 12)).toEqual({ ok: true })
  })

  it('says how many days short, not just no', () => {
    const result = checkBalance(7, 4.5, 12)

    // "You are 2.5 days short" is actionable. "Insufficient balance" is not.
    expect(result).toEqual({ ok: false, reason: 'insufficient', shortBy: 2.5 })
  })

  it('distinguishes no quota from an exhausted one', () => {
    // Comp-off and work-from-home are granted, not accrued. Telling somebody
    // they are "3 days short" of a leave type that has no quota at all sends
    // them looking for days that were never going to exist.
    const noQuota = checkBalance(1, 0, 0)
    expect(noQuota).toEqual({ ok: false, reason: 'no_quota', shortBy: 1 })

    const exhausted = checkBalance(1, 0, 12)
    expect(exhausted).toEqual({ ok: false, reason: 'insufficient', shortBy: 1 })
  })
})
