# Barchi Identity Insight

Build a polished private online eNID analytics dashboard for Dasht-e-Barchi center year 1405, Pashto RTL. React TypeScript Vite Tailwind shadcn/ui Recharts. Pages: overview, مجموعی راپور, تثبت هویت, عواید, بانکي عواید, کنټرول, خدمات, توزیع, ریاست ته ګزارش, پاس شوي دوسیې (هفته وار), کالنی ګزارش. Google spreadsheet ID 1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs (25 tabs). Do not invent real data: label sample metrics DEMO until securely connected. Implement server-side Google OAuth with spreadsheets.readonly scope and owner email allowlist via environment variable (default deny), safe secure session and sign out; never expose Google credentials, access tokens or private sheet data in public client. Read/normalize multiple tabs, Jalali date filtering, charts, 60-second refresh, sync state/errors, CSV/PDF export, mobile responsive. Provide setup instructions for owner authorization and deployment; do not modify source sheet. Do not publish until security/access is verified.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc6becd3-d3f7-4266-a465-8ff0356936f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
