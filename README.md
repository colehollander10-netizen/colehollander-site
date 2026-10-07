# colehollander.com

The source for [colehollander.com](https://colehollander.com). Next.js static export, Tailwind, shadcn/ui, Geist.

## Local development

Requires [pnpm](https://pnpm.io) (see `packageManager` in `package.json`).

```bash
pnpm install
pnpm dev        # next dev — http://localhost:3000
pnpm build      # next build — static site in out/
pnpm lint       # eslint
```

Content lives in `src/app/page.tsx`. The Order Desk mark in `public/` comes from orderdesk.com. The GitHub hover card uses [GitHub Activity](https://rareui.com/components) from [Rare UI](https://rareui.com) (MIT + Commons Clause + Attribution), in `src/components/ui/github-activity.tsx`.
