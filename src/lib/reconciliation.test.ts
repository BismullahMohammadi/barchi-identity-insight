import { describe, expect, it } from 'vitest';
import { compareMonthlyReports, compareSourceMonthlyTotals, findMonthlyBlock, findTotalColumn, metricKey, reportNumber } from './reconciliation';
import { JALALI_MONTHS } from './jalali';

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
    expect(compare(local, province).find(r => r.day === 1 && r.metric === 'family')).toMatchObject({ status: 'holiday', reason: 'holiday' });
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
    expect(compare(local, []).every(r => r.status === 'missing' || r.status === 'holiday')).toBe(true);
  });
  it('finds the Qaws day header after extra month-title rows', () => {
    const qawsDays = days.slice(0, 30);
    const extraRows = Array.from({ length: 18 }, () => []);
    const local: unknown[][] = [['بخشونه (قوس ۹)'], ...extraRows, qawsDays];
    const province: unknown[][] = [['گزارش ماه قوس سال مالی ۱۴۰۵'], ...extraRows, ['', '', '', '', '', '', ...qawsDays]];
    expect(findMonthlyBlock(local, 1405, 9, 'local', 1405).status).toBe('available');
    expect(findMonthlyBlock(province, 1405, 9, 'province', 1405).status).toBe('available');
  });
  it('matches Qaws when the source heading shows a fiscal-year range', () => {
    const qawsDays = days.slice(0, 30);
    const local: unknown[][] = [['بخشونه (قوس ۹) - سال مالی ۱۴۰۴-۱۴۰۵'], qawsDays];
    const province: unknown[][] = [['گزارش ماه قوس سال مالی ۱۴۰۴-۱۴۰۵'], ['', '', '', '', '', '', ...qawsDays]];
    expect(findMonthlyBlock(local, 1405, 9, 'local', 1405).status).toBe('available');
    expect(findMonthlyBlock(province, 1405, 9, 'province', 1405).status).toBe('available');
  });
  it('maps Jalali date labels and ignores a duplicate serial value before the day sequence', () => {
    const dateHeaders = Array.from({ length: 30 }, (_, index) => `۱۴۰۵/۰۹/${String(index + 1).padStart(2, '0')}`);
    const local: unknown[][] = [['بخشونه (قوس ۹)'], ['1', ...dateHeaders]];
    const block = findMonthlyBlock(local, 1405, 9, 'local', 1405);
    expect(block.status).toBe('available');
    expect(block.days.get(1)).toBe(1);
    expect(block.days.get(30)).toBe(30);
  });
  it('maps day-first Jalali date headings used by Sheets', () => {
    const dateHeaders = Array.from({ length: 30 }, (_, index) => `${String(index + 1).padStart(2, '0')}/۰۹/۱۴۰۵`);
    const local: unknown[][] = [['بخشونه (قوس ۹)'], dateHeaders];
    const block = findMonthlyBlock(local, 1405, 9, 'local', 1405);
    expect(block.status).toBe('available');
    expect(block.days.get(1)).toBe(0);
    expect(block.days.get(30)).toBe(29);
  });
  it('maps Qaws headers where Friday labels share the day cell', () => {
    const header = ['بخشونه (قوس ۹)', ...Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      return [6, 13, 20, 27].includes(day) ? `${day} جمعه` : String(day);
    }), 'جمله'];
    const block = findMonthlyBlock([header], 1405, 9, 'local', 1405);
    expect(block.status).toBe('available');
    expect(block.days.get(6)).toBe(6);
    expect(block.days.get(30)).toBe(30);
  });
  it('finds month blocks for every Jalali month, including both Jadi spellings', () => {
    for (let month = 1; month <= 12; month++) {
      const monthName = month === 10 ? 'جدی' : JALALI_MONTHS[month - 1]!;
      const count = month <= 6 ? 31 : month <= 11 ? 30 : 29;
      const days = Array.from({length:count},(_,index)=>String(index+1));
      const grid:unknown[][] = [[`بخشونه (${monthName} ${month}) - سال مالی ۱۴۰۴-۱۴۰۵`,...days]];
      const block = findMonthlyBlock(grid,1405,month,'local',1405);
      const provinceGrid:unknown[][] = [[`گزارش ماه ${monthName} سال مالی ۱۴۰۴-۱۴۰۵`],["","","","","","",...days]];
      const provinceBlock = findMonthlyBlock(provinceGrid,1405,month,'province',1405);
      expect(block.status,`month ${month}`).toBe('available');
      expect(block.days.size,`month ${month} day columns`).toBe(count);
      expect(provinceBlock.status,`province month ${month}`).toBe('available');
      expect(provinceBlock.days.size,`province month ${month} day columns`).toBe(count);
    }
  });
  it('allows a validated manual day-header row override', () => {
    const days = Array.from({length:30},(_,index)=>String(index+1));
    const grid:unknown[][] = [['بخشونه (قوس ۹)'],days,['یادښت'],days];
    expect(findMonthlyBlock(grid,1405,9,'local',1405,4).dayHeaderRow).toBe(4);
    expect(findMonthlyBlock(grid,1405,9,'local',1405,3).status).toBe('day_header_missing');
  });
  it('refuses duplicate semantic metrics and day headers rather than guessing', () => {
    const { local } = fixture();
    const block = findMonthlyBlock([...local, ['تصدیق فامیلی', 8]], 1405, 8, 'local', 1405);
    expect(block.metrics.has('family')).toBe(false);
    expect(block.ambiguous).toContain('family');
    expect(findMonthlyBlock([['بخشونه (عقرب ۸)', ...days, '2']], 1405, 8, 'local', 1405).status).toBe('day_header_missing');
  });
});

describe('source monthly totals', () => {
  function blocks(localTotal: unknown = '۱٬۰۰۰', provinceTotal: unknown = '950') {
    const { local, province } = fixture();
    const lh = local[0], ph = province[1], lr = local[1], pr = province[2];
    if (!lh || !ph || !lr || !pr) throw new Error('fixture missing');
    lh[32] = 'جمله'; ph[37] = 'مجموع';
    lr[32] = localTotal; pr[37] = provinceTotal;
    return [findMonthlyBlock(local, 1405, 8, 'local', 1405), findMonthlyBlock(province, 1405, 8, 'province', 1405)] as const;
  }
  it('reads AG/AL source totals by metric instead of summing incomplete daily values', () => {
    const [l,p] = blocks();
    expect(l.totalColumn).toBe(32); expect(p.totalColumn).toBe(37);
    expect(compareSourceMonthlyTotals(l,p,1405,8,today).find(r=>r.metric==='family')).toMatchObject({local:1000,province:950,delta:50,status:'mismatch',localCell:'AG2',provinceCell:'AL3'});
  });
  it('accepts normalized total labels only after days, ignoring day and distant side-table columns', () => {
    const headers: unknown[][] = [['مجموعه', '1', '2', '3', 'مجموعه', '', '', '', 'مجموع']];
    expect(findTotalColumn(headers,new Map([[1,1],[2,2],[3,3]]))).toEqual({totalColumn:4,totalHeaderStatus:'available'});
    expect(findTotalColumn([['',1,2,3,'مــجــمــوع']],new Map([[1,1],[2,2],[3,3]]))).toMatchObject({totalColumn:4});
  });
  it('does not guess duplicate total columns or fall back to daily sums when header is absent', () => {
    const days = new Map([[1,1],[2,2]]);
    expect(findTotalColumn([['',1,2,'مجموع','مجموعه']],days)).toEqual({totalColumn:null,totalHeaderStatus:'ambiguous'});
    const [l,p] = blocks(); l.totalColumn=null; l.totalHeaderStatus='missing';
    expect(compareSourceMonthlyTotals(l,p,1405,8,today).find(r=>r.metric==='family')).toMatchObject({local:null,province:950,delta:null,status:'missing'});
  });
  it.each(['', '#REF!', 'رخصت'])('keeps missing or invalid total %s missing', value => {
    const [l,p] = blocks(value);
    expect(compareSourceMonthlyTotals(l,p,1405,8,today).find(r=>r.metric==='family')).toMatchObject({local:null,delta:null,status:'missing'});
  });
  it('compares explicit zeros as equal and masks unverified error/future totals', () => {
    const [l,p] = blocks('۰','0');
    expect(compareSourceMonthlyTotals(l,p,1405,8,today).find(r=>r.metric==='family')).toMatchObject({local:0,province:0,delta:0,status:'equal'});
    expect(compareSourceMonthlyTotals(l,p,1405,8,today,{local:false,province:true}).find(r=>r.metric==='family')).toMatchObject({province:null,delta:null,status:'missing',reason:'source_error'});
    expect(compareSourceMonthlyTotals(l,p,1405,8,{y:1405,m:7,d:30}).find(r=>r.metric==='family')).toMatchObject({local:null,province:null,delta:null,reason:'future'});
  });
  it('keeps missing or ambiguous metrics unavailable independently of total header', () => {
    const [l,p] = blocks(); l.metrics.delete('family');
    expect(compareSourceMonthlyTotals(l,p,1405,8,today).find(r=>r.metric==='family')).toMatchObject({local:null,status:'missing',reason:'metric_missing'});
  });
});