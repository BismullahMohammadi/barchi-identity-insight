<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->


## UI/UX Pro Max (project skill)

For interface design, visual redesign, dashboard layout, navigation, accessibility, RTL responsiveness, charts, colors, or typography, first read `.agents/skills/ui-ux-pro-max/SKILL.md`. Use the bundled local search database and stack guidance before changing UI code. Examples:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "accessible internal government dashboard" --design-system -p "Barchi Identity Insight"
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "dashboard keyboard navigation" --domain ux
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "responsive dense management dashboard" --stack react
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "card table shadcn" --stack shadcn
```

Project requirements override generic presets: Pashto RTL, legible Vazirmatn, Afghan Jalali dates, uncluttered management KPIs, clear missing-data states, sensitive private records, keyboard/mobile usability, and truthful data visualization. The skill provides design recommendations; it does **not** change production UI automatically. Do not send project data to external searches or services.

## Generator diesel model
- Generator stock is modeled separately (`generator_meter_readings`, `generator_diesel_deliveries`, logic in `src/lib/generator-model.ts`) from `fuel_entries` and the Google Sheet — why: prevents double-counting; only separately confirmed post-baseline deliveries count.
- Both generator tables are append-only (triggers block UPDATE/DELETE) and validate baseline/chronology/monotonic meter in BEFORE INSERT triggers — why: audit trail and integrity even if the client is bypassed.

## Registration referrals (coordination workbook)
- Coordination tabs use the tolerant `parseCoordinationTabDate`/`selectTodayCoordinationTab` (look-alike letters, one-letter month typos, missing year = current year) and rows are located by detecting the «اسم/ولد/تعداد» header; the intake parser stays strict — why: hand-typed tab names broke today's lookup, while intake must not change.
- Registration only ever shows today's tab and returns a safe diagnostic (status, dates, tab titles, counts — never person data) — why: never present yesterday as today and explain empty states.

## Report reconciliation
- Keep workbook configuration and raw snapshots in server-only modules; authorize the owner before per-user cache reads and return only aggregate comparisons and authenticated source-cell links — why: private read-only reconciliation must not expose raw workbooks or credentials.
- Discover month/day headings dynamically and map metrics semantically; blanks, holidays, future dates and ambiguous mappings remain unavailable, never zero or mismatches — why: missing provincial evidence must not become a false discrepancy.
