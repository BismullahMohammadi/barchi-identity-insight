import { describe, expect, it } from 'vitest';
import { planProvincialDailySync } from './provincial-daily-sync';

// Deliberately no live Sheet writes in tests.
const base = { year: 1405, month: 1, day: 3, currentYear: 1405, requiredMetrics: ['quality'] };
describe('provincial daily sync fail-closed planning', () => {
  it('rejects unknown metrics', () => {
    const result = planProvincialDailySync({ ...base, requiredMetrics: ['unknown'], sourceGrid: [], destinationGrid: [] });
    expect(result.ready).toBe(false);
    expect(result.reason).toBe('INVALID_REQUIRED_METRICS');
  });
  it('rejects a missing monthly report', () => {
    const result = planProvincialDailySync({ ...base, sourceGrid: [], destinationGrid: [] });
    expect(result.ready).toBe(false);
    expect(result.updates).toEqual([]);
  });
  it('rejects an invalid date', () => {
    const result = planProvincialDailySync({ ...base, day: 40, sourceGrid: [], destinationGrid: [] });
    expect(result.reason).toBe('INVALID_JALALI_DATE');
  });
});
