import { useSyncExternalStore } from "react";

export type DashboardSettings = {
  refreshSeconds: 30 | 60 | 120 | 300;
  showDailyVisitors: boolean;
  showCharts: boolean;
  compactCards: boolean;
  showTodo: boolean;
  showReportHealth: boolean;
};
export const DEFAULT_SETTINGS: DashboardSettings = Object.freeze({
  refreshSeconds: 60,
  showDailyVisitors: true,
  showCharts: true,
  compactCards: false,
  showTodo: true,
  showReportHealth: true,
});
const KEY = "barchi-dashboard-preferences-v1";
let snapshot: DashboardSettings = DEFAULT_SETTINGS;
let initialized = false;
const listeners = new Set<() => void>();
const emit = () => { for (const fn of listeners) fn(); };
function parseSettings(value: unknown): DashboardSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const obj = value as Partial<DashboardSettings>;
  const refreshSeconds = [30,60,120,300].includes(Number(obj.refreshSeconds))
    ? obj.refreshSeconds as DashboardSettings["refreshSeconds"] : 60;
  return {
    refreshSeconds,
    showDailyVisitors: typeof obj.showDailyVisitors === "boolean" ? obj.showDailyVisitors : true,
    showCharts: typeof obj.showCharts === "boolean" ? obj.showCharts : true,
    compactCards: typeof obj.compactCards === "boolean" ? obj.compactCards : false,
    showTodo: typeof obj.showTodo === "boolean" ? obj.showTodo : true,
    showReportHealth: typeof obj.showReportHealth === "boolean" ? obj.showReportHealth : true,
  };
}
function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) snapshot = parseSettings(JSON.parse(saved));
  } catch { snapshot = DEFAULT_SETTINGS; }
}
function subscribe(callback: () => void) {
  init();
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
function getSnapshot() { init(); return snapshot; }
function getServerSnapshot() { return DEFAULT_SETTINGS; }
export function useDashboardSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function saveDashboardSettings(input: DashboardSettings) {
  snapshot = parseSettings(input);
  initialized = true;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* storage may be disabled */ }
  }
  emit();
}
export function resetDashboardSettings() {
  snapshot = DEFAULT_SETTINGS;
  initialized = true;
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(KEY); } catch { /* storage may be disabled */ }
  }
  emit();
}
export function settingsRefreshMs(settings: DashboardSettings): number { return settings.refreshSeconds * 1000; }
