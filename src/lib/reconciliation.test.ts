import { describe, expect, it } from 'vitest';
import { compareMonthlyReports, findMonthlyBlock, metricKey, reportNumber } from './reconciliation';

const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
const today = { y: 1405, m: 8, d: 30 };
function fixture() {
  const local: unknown[][] = [['بخشونه (عقرب ۸)', ...days], ['تصدیق فامیلی', '', 30, 35], ['دیموگرافی', ...Array.from({ length: 13 }, (_, i) => i === 12 ? 109 : '')]];
  const province: unknown[][] = [['گزارش ماه (عقرب) سال مالی 1405'], ['', '', '', '', '', '', ...days], ['4', '', 'تصدیق فامیلی', '', '', '0', '', 25, 23], ['5', '', 'دیموگرافی (ثبت معلومات انفرادی شهروندان در سیستم)', '', '', '4', ...Array.from({ length: 13 }, (_, i) => i === 12 ? 95 : '')]];
  return { local, province };
}
function compare(l: unknown[][], p: unknown[][]) { return compareMonthlyReports(findMonthlyBlock(l, 1405, 8, 'local', 1405), findMonthlyBlock(p, 1405, 8, 'province', 1405), 1405, 8, today); }
describe('report reconciliation', () => {
  it('aligns live-source layout by Jalali day and semantic metric, not offsets', () => {
    const { local, province } = fixture();
    const rows = compare([[], [], ...local], [[], ...province]);
    expect(rows.find(r => r.day === 2 && r.metric === 'family')).toMatchObject({ local: 30, province: 25, delta: 5, status: 'mismatch', localCell: 'C4', provinceCell: 'H4' });
    expect(rows.find(r => r.day === 3 && r.metric === 'family')?.delta).toBe(12);
    expect(rows.find(r => r.day === 13 && r.metric === 'demographic')?.delta).toBe(14);
    expect(rows).toHaveLength(30 * 19); // AqRAB day 31 is not a valid date.
  });
  it('never converts blanks or Friday text to zero', () => {
    expect(reportNumber('')).toEqual({ value: null, reason: 'blank' });
    expect(reportNumber('جــمــعــــه')).toEqual({ value: null, reason: 'holiday' });
    const { local, province } = fixture();
    expect(compare(local, province).find(r => r.day === 4 && r.metric === 'family')).toMatchObject({ province: null, delta: null, status: 'missing' });
  });
  it('handles currency, separators, Arabic and Persian digits without guessing invalid text', () => {
    expect(reportNumber('؋ ۴۳٬۵۰۰').value).toBe(43500);
    expect(reportNumber('١٢٣٫٥ AFN').value).toBe(123.5);
    expect(reportNumber('۰').value).toBe(0);
    expect(reportNumber('#REF!').reason).toBe('invalid');
  });
  it('distinguishes explicit equal zero from missing and ignores holiday/future comparisons', () => {
    const { local, province } = fixture();
    const lr = local[1], pr = province[2];
    if (!lr || !pr) throw new Error('fixture missing');
    lr[1] = 9; pr[6] = 1; // 1405/08/01 is Friday.
    lr[4] = 0; pr[9] = 0;
    expect(compare(local, province).find(r => r.day === 1 && r.metric === 'family')).toMatchObject({ status: 'missing', reason: 'holiday' });
    expect(compare(local, province).find(r => r.day === 4 && r.metric === 'family')).toMatchObject({ status: 'equal', delta: 0 });
    const blocks = [findMonthlyBlock(local, 1405, 8, 'local', 1405), findMonthlyBlock(province, 1405, 8, 'province', 1405)] as const;
    expect(compareMonthlyReports(blocks[0], blocks[1], 1405, 8, { y: 1405, m: 8, d: 3 }).find(r => r.day === 4)?.reason).toBe('future');
  });
  it('maps service subtypes separately from ordinary revenue', () => {
    expect(metricKey('عواید خدمات بعد از توزیع (مثنی، تجدید، اصلاحات)')).toBe('serviceRevenue');
    expect(metricKey('خدمات بعد ( مثنی/ تجدید، ثبت و پاس)')).toBe('renewal');
    expect(metricKey('توزیع تذکره های بخش خدمات بعد از توزیع (02 و 03 )')).toBe('serviceDistribution');
    expect(metricKey('تثبیت هویت مطابق تذکره کاغذی')).toBe('paper');
  });
  it('fails safely for missing or duplicated monthly blocks and unknown years', () => {
    const { local } = fixture();
    expect(findMonthlyBlock(local, 1404, 8, 'local', 1405).status).toBe('month_missing');
    expect(findMonthlyBlock([...local, ...local], 1405, 8, 'local', 1405).status).toBe('ambiguous_month');
    expect(compare(local, []).every(r => r.status === 'missing')).toBe(true);
  });
  it('refuses duplicate semantic metrics and day headers rather than guessing', () => {
    const { local } = fixture();
    const block = findMonthlyBlock([...local, ['تصدیق فامیلی', 8]], 1405, 8, 'local', 1405);
    expect(block.metrics.has('family')).toBe(false);
    expect(block.ambiguous).toContain('family');
    expect(findMonthlyBlock([['بخشونه (عقرب ۸)', ...days, '2']], 1405, 8, 'local', 1405).status).toBe('day_header_missing');
  });
});