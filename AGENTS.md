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
