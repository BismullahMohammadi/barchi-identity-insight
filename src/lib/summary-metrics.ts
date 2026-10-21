import { normalizeGrid, sumColumn } from "./normalize";

/** Derived only from verified source columns: خدمات B,C,D,E,G; arrivals C. */
export type SummaryMetrics = {
  duplicate: number;
  renewal: number;
  births: number;
  marriages: number;
  serviceRevenue: number;
};
export function getSummaryMetrics(grid: string[][]): SummaryMetrics {
  const table = normalizeGrid(grid, "خدمات");
  return {
    duplicate: sumColumn(table.rows, 1),
    renewal: sumColumn(table.rows, 2),
    births: sumColumn(table.rows, 3),
    marriages: sumColumn(table.rows, 4),
    serviceRevenue: sumColumn(table.rows, 6),
  };
}
export function getTransferCount(grid: string[][]): number {
  const table = normalizeGrid(grid, "راسیدلې تذکرې");
  return sumColumn(table.rows, 2);
}
