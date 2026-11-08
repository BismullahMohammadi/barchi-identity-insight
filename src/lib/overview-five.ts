import type {GlobalRange} from "./global-date-range";
import { normalizeGrid, sumColumn,filterByDate,isTotalRow } from "./normalize";
import { periodRows, previousDayChange, type OverviewPeriod } from "./overview-period";
import type { JDate } from "./jalali";

export type OverviewSource = { slug: string; title: string; grid: string[][] };
export type MetricValue = {value:number|null;change:number|null};
export type OverviewFive = {individual:MetricValue;newCards:MetricValue;income:MetricValue;identity:MetricValue;distribution:MetricValue;duplicateRenewal:MetricValue};

export function sourceMetric(sources: OverviewSource[], slug: string, col: number, period: OverviewPeriod, today: JDate, yesterday: JDate,range?:GlobalRange): MetricValue {
  const source = sources.find(s => s.slug === slug);
  if (!source) return {value:null,change:null};
  try {
    const table = normalizeGrid(source.grid, source.title);
    const rows = range?filterByDate(table,range).rows.filter(r=>!isTotalRow(r)):periodRows(table, period, today, yesterday);
    if (!table.numericCols.includes(col) || !rows.some(row => typeof row[col] === "number")) return {value:null,change:null};
    return {
      value:sumColumn(rows,col),
      change:!range&&period==="today" ? previousDayChange(table,col,today,yesterday) : null,
    };
  } catch { return {value:null,change:null}; }
}

/** Individual activity includes newly passed dossiers, duplicates, and renewals.
 * A missing source is not zero; require all three components to avoid partial totals. */
export function deriveOverviewFive(sources: OverviewSource[], period: OverviewPeriod, today: JDate, yesterday: JDate,range?:GlobalRange): OverviewFive {
  const newlyPassed = sourceMetric(sources,"total",3,period,today,yesterday,range);
  const duplicate = sourceMetric(sources,"services",1,period,today,yesterday,range);
  const renewal = sourceMetric(sources,"services",2,period,today,yesterday,range);
  const individual = newlyPassed.value!==null && duplicate.value!==null && renewal.value!==null
    ? {value:newlyPassed.value+duplicate.value+renewal.value,change:null}
    : {value:null,change:null};
  return {
    individual,
    duplicateRenewal: duplicate.value!==null && renewal.value!==null ? {value:duplicate.value+renewal.value,change:null} : {value:null,change:null},
    newCards:newlyPassed,
    income:sourceMetric(sources,"bank",6,period,today,yesterday,range),
    identity:sourceMetric(sources,"identity",10,period,today,yesterday,range),
    distribution:sourceMetric(sources,"distribution",3,period,today,yesterday,range),
  };
}
