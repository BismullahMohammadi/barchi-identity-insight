export const SPREADSHEET_ID = "1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs";

export type TabDef = { slug: string; title: string; label: string; description: string };

// Only these tabs may be read by the server (whitelist).
export const TABS: TabDef[] = [
  { slug: "total", title: "مجموعی راپور", label: "مجموعی راپور", description: "د مرکز ورځنی مجموعي فعالیت" },
  { slug: "identity", title: "تثبت هویت", label: "تثبت هویت", description: "د هویت تثبیت شوي دوسیې" },
  { slug: "bank", title: "بانکي عواید", label: "بانکي عواید", description: "بانک ته تحویل شوي عواید" },
  { slug: "control", title: "کنټرول", label: "کنټرول", description: "د کنټرول برخې فعالیت" },
  { slug: "services", title: "خدمات", label: "خدمات", description: "خدماتي فعالیتونه" },
  { slug: "distribution", title: "توزیع", label: "توزیع", description: "توزیع شوې تذکرې" },
  { slug: "arrivals", title: "راسیدلې تذکرې", label: "د تذکرو انتقالات", description: "مرکز ته را رسېدلې او ناقصې تذکرې" },
  { slug: "annual", title: "کالنی ګزارش", label: "کالنی ګزارش", description: "د ۱۴۰۵ کال لنډیز" },
];

export const OVERVIEW_SLUGS = ["total", "bank", "identity", "distribution", "services", "control"];
export const TOTAL_REPORT_SLUGS = ["total", "services", "arrivals"];

export function getTab(slug: string): TabDef | undefined {
  return TABS.find((t) => t.slug === slug);
}
