export const SPREADSHEET_ID = "1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs";

export type TabDef = { slug: string; title: string; label: string; description: string };

// Only these tabs may be read by the server (whitelist).
export const TABS: TabDef[] = [
  { slug: "total", title: "مجموعی راپور", label: "مجموعي راپور", description: "د مرکز ورځنی مجموعي فعالیت" },
  { slug: "identity", title: "تثبت هویت", label: "هویت تثبیت", description: "د هویت تثبیت شوي دوسیې" },
  { slug: "bank", title: "بانکي عواید", label: "عواید", description: "بانک ته تحویل شوي عواید" },
  { slug: "control", title: "کنټرول", label: "کنټرول کیفیت", description: "د کنټرول کیفیت برخې فعالیت" },
  { slug: "services", title: "خدمات", label: "له وېش ورسته خدامات", description: "خدماتي فعالیتونه" },
  { slug: "distribution", title: "توزیع", label: "د تذکرو وېش", description: "توزیع شوې تذکرې" },
  { slug: "archive-scan", title: "د آرشیف او سکن", label: "د آرشیف دوسیو سکن", description: "د سکن او کنټرول کیفیت د کتل شوو او ناکتل شوو ورقو ورځنی راپور" },
  { slug: "arrivals", title: "راسیدلې تذکرې", label: "د تذکرو لېږد", description: "مرکز ته را رسېدلې او ناقصې تذکرې" },
  // Source for the overview trend only: not reintroduced to the sidebar/navigation.
  { slug: "weekly", title: "پاس شوي دوسیې (هفته وار)", label: "اونیز فعالیت", description: "د پاس شويو، مثنی او تجدید اونیزې شمېرې" },
  { slug: "annual", title: "کالنی ګزارش", label: "کلنی راپور", description: "د ۱۴۰۵ کال لنډیز" },
];

const TAB_TITLE_ALIASES: Record<string, string[]> = {
  "archive-scan": ["د آرشیف دوسیو سکن"],
};

export function resolveTabTitle(slug: string, availableTitles: readonly string[]): string | null {
  const tab = TABS.find((item) => item.slug === slug);
  if (!tab) return null;
  return [tab.title, ...(TAB_TITLE_ALIASES[slug] ?? [])].find((title) => availableTitles.includes(title)) ?? null;
}

export const OVERVIEW_SLUGS = ["total", "bank", "identity", "distribution", "services"];

export function getTab(slug: string): TabDef | undefined {
  return TABS.find((t) => t.slug === slug);
}

export const sectionLabels: Record<string, string> = {
  ...Object.fromEntries(TABS.map(tab => [tab.slug, tab.label])),
  dashboard: "د مرکز کاري بهیر",
  "admin-users": "کاروونکي",
  "problem-visitors": "مشلاتي مراجعین",
  "fuel-management": "ډیزل",
  reconciliation: "د راپورونو پرتله",
  "staff-reconciliation": "د کارکوونکو او تخنیکي راپورونو پرتله",
  "center-quality": "د مرکزونو د فعالیت پرتله",
  settings: "تنظیمات",
};
