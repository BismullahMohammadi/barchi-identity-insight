import { findMonthlyBlock, metricDefinitions, reportNumber, columnName } from './reconciliation';

/** A dry-run, fail-closed plan. Never infer missing values as zero. */
export type DailyCellUpdate = { metric: string; sourceCell: string; targetCell: string; value: number };
export type DailySyncPlan = {
  ready: boolean;
  reason: string | null;
  year: number; month: number; day: number;
  updates: DailyCellUpdate[];
  missing: string[];
  conflicts: string[];
};

/**
 * Construct a safe, reviewable write plan for a single Jalali day.
 * Required metrics are explicit and must reflect the actual reporting configuration.
 * This function performs NO network calls and NO writes.
 */
export function planProvincialDailySync(input: {
  sourceGrid: unknown[][];
  destinationGrid: unknown[][];
  year: number; month: number; day: number; currentYear: number;
  requiredMetrics: readonly string[];
}): DailySyncPlan {
  const { year, month, day, currentYear } = input;
  const fail = (reason: string, missing: string[] = [], conflicts: string[] = []): DailySyncPlan =>
    ({ ready: false, reason, year, month, day, updates: [], missing, conflicts });
  const daysInMonth = month <= 6 ? 31 : month <= 11 ? 30 : 30;
  if (!Number.isInteger(year) || year < 1300 || year > 1499 ||
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(day) || day < 1 || day > daysInMonth) return fail('INVALID_JALALI_DATE');
  const known = new Set<string>(metricDefinitions.map(([key]) => key));
  const required = [...new Set(input.requiredMetrics)];
  if (!required.length || required.some(key => !known.has(key))) return fail('INVALID_REQUIRED_METRICS');
  const source = findMonthlyBlock(input.sourceGrid, year, month, 'local', currentYear);
  const target = findMonthlyBlock(input.destinationGrid, year, month, 'province', currentYear);
  if (source.status !== 'available' || target.status !== 'available') return fail('MONTH_BLOCK_NOT_READY');
  const sourceColumn = source.days.get(day), targetColumn = target.days.get(day);
  if (sourceColumn === undefined || targetColumn === undefined) return fail('DAY_COLUMN_NOT_FOUND');
  const missing: string[] = [], conflicts: string[] = [], updates: DailyCellUpdate[] = [];
  for (const metric of required) {
    const from = source.metrics.get(metric), to = target.metrics.get(metric);
    if (!from || !to) { missing.push(metric); continue; }
    const sourceValue = reportNumber(from.cells[sourceColumn]);
    if (sourceValue.value === null || sourceValue.value < 0) { missing.push(metric); continue; }
    const existing = reportNumber(to.cells[targetColumn]);
    if (existing.reason === 'holiday' || existing.reason === 'invalid' ||
        (existing.value !== null && existing.value !== sourceValue.value)) {
      // Human-entered conflicting numbers are never silently overwritten.
      conflicts.push(metric);
      continue;
    }
    if (existing.value === sourceValue.value) continue; // idempotent
    updates.push({
      metric,
      sourceCell: `${columnName(sourceColumn)}${from.row}`,
      targetCell: `${columnName(targetColumn)}${to.row}`,
      value: sourceValue.value,
    });
  }
  if (missing.length || conflicts.length) return fail('INCOMPLETE_OR_CONFLICTING_REPORT', missing, conflicts);
  return { ready: true, reason: null, year, month, day, updates, missing: [], conflicts: [] };
}
