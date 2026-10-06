<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on this site

This site has visitors but no user data or accounts, so no change needs to keep old behavior working.

- Do not write backward compatibility, migrations, or "just in case" code. Replace what you change with the simplest code that works, and update every caller in the same change.
- Update the README and comments in the same change, so they never contradict the code.
- After the change, delete the code, files, and assets it made unused. If you are not sure something is unused, ask.
- Before you say done, run `npm run lint` and `npm run build` and read the output. Report what you deleted and which checks you ran. Say if you did not run one.
