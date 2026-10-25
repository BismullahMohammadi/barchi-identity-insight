# Barchi Identity Insight — UI/UX Pro Max Design System
Version: 1.0 · Scope: private eNID management dashboard · Direction: understated, confident, readable

## Source and evidence
Derived from the installed `ui-ux-pro-max` Skill priority rules (accessibility → interaction → performance → layout → typography → data visualization), the project's existing tokens, and React/shadcn + Tailwind constraints. Existing theme is teal/ink/cream; this system refines rather than replaces that identity. Do not fabricate search tool rankings or pretend a generated CLI report was executed.

## Experience principles
1. **Data first:** manager answers "what happened, when, from which source?" in seconds. Main KPIs and report period before optional tools and details.
2. **Quiet official character:** neutral backgrounds, deep teal emphasis, sparse gold for money/warnings. No decorative stock imagery, neon colors, animated gradients, or dense charts.
3. **Pashto RTL first:** Vazirmatn, 16px base type, relaxed line-height (1.65), right-aligned labels, start/end logical CSS spacing. Date labels are Jalali; numerals tabular. Currency units explicitly shown as AFN.
4. **Truthful data:** missing values use an em dash plus explanation; never replace missing with zero. Semantically distinct status labels even when color is used; chart/bar must also display number.
5. **Agency:** tasks and advice live in an on-demand drawer available across authenticated pages; sticky header retains one clear action. Dragging has a button alternative.
6. **Privacy:** owner auth, read-only Sheets and account-scoped To-Dos are unchanged. No outside AI provider or unapproved data transport.

## Tokens
- Main: `--primary` deep teal; use for active navigation, primary action, signed-off metric.
- Body: `--foreground` dark ink; `--muted-foreground` remains readable on `--card`.
- Surface: warm ivory `--background`, white `--card`, soft grey `--muted`; single subtle border.
- Alerts: `--destructive` for actual errors; amber for review; green for confirmed success; blue for independent operational count. Never rely on colors alone.
- Radius: 12px cards / 10px controls / 16px panels; subtle two-layer elevation at most.
- Gutter: 16px mobile, 24px tablet, 32px wide desktop; max content width 1280px.
- Rhythm: 4/8/12/16/24/32px. Header height ~64px, navigation touch targets >=44px.
- Motion: 150–220ms only for hover/focus/expand, obey `prefers-reduced-motion`.

## Components
- Navigation: dark teal sidebar on desktop; mobile dismissible Sheet, focused visible state, a skip-to-main link.
- Dashboard header: compact official title, account information (truncated safely), persistent tools action, logout.
- Overview: concise hero; freshness status; Jalali period as wrapping segmented radio-style buttons; 4 KPI cards; visitor summary optional. No duplicate mini-charts.
- Reports: report heading, one filter, up to four headline metrics in responsive 1→2→4 grid; employee/team bars with exact numbers and missing states. Source details collapsed with accessible search/CSV/print.
- To-Do / Advisor: in one drawer, compact vertical cards, actionable controls large enough for touch, clear saved/failed states and evidence.
- Settings: grouped refresh / visibility / access cards, explanations aligned with current feature placement.

## Accessibility and quality gates
- Semantic landmarks, one page h1, headings in order, focus ring visible on keyboard, form input labels, meaningful icon aria-labels, button aria-pressed/expanded.
- 4.5:1 minimum body contrast and 3:1 for large/non-text contrast to be tested in a real browser; no unverified blanket WCAG certification.
- Minimum 44px touch target for primary small controls, 8px touch spacing. Avoid horizontal overflow except data tables inside explicit scroll containers.
- Sticky elements must not occlude focused elements (`scroll-margin-top`). Right-to-left language on dashboard layout; LTR explicitly for email and codes.
- Test 375, 768, 1024, 1440 widths, keyboard-only flow, 200% zoom, reduced motion and loading/error/empty states. CI verifies type/tests/build; manual visual checks require authenticated preview.

## Page-specific guardrails
- Identity/control: named employees shown even when source columns are empty; never distribute totals across staff.
- Banking: separate AFN from counts; no comparison of unlike units.
- Services: four essential groups (مثنی، تجدید، ثبت تولد، ثبت ازدواج).
- Annual: monthly comparison; do not sum subtotal rows twice.
