# AGENTS.md

Scope: this file applies to the ci-admin project in this directory.

## Start Here

- Run commands from this directory: /Users/leon/Documents/workspace/gerrit/web-desgin/ci-admin
- Install dependencies with `npm i`
- Start dev server with `npm run dev`
- Validate changes with `npm run build`
- Read [README.md](README.md) for the basic project bootstrap
- Read [guidelines/Guidelines.md](guidelines/Guidelines.md) for any future design-system notes

## Architecture

- App entry is [src/main.tsx](src/main.tsx), root layout is [src/app/App.tsx](src/app/App.tsx)
- This app does not use React Router for page navigation
- Page switching is controlled by Zustand state in [src/store/useAppStore.ts](src/store/useAppStore.ts)
- Main pages and feature components live together in [src/app/components](src/app/components)
- Mock data comes from [src/mock/data.ts](src/mock/data.ts)

## State And Navigation

- Add new top-level pages by updating the page union and actions in [src/store/useAppStore.ts](src/store/useAppStore.ts), then register the page in [src/app/App.tsx](src/app/App.tsx)
- Project detail sub-pages are also store-driven via `projectSubPage`
- `ProjectSubSidebar` only appears when `currentPage === 'project-detail'`

## Styling And UI

- Theme is class-based: `dark` and `light` are toggled on `document.documentElement`
- Theme tokens and shared surface styles live in [src/styles/theme.css](src/styles/theme.css)
- Prefer existing OKLCH tokens and shared classes over hard-coded colors
- The codebase mixes custom Tailwind styling with Radix UI primitives and some MUI dependencies; preserve the existing local pattern in the file you touch
- For new badges or status chips, check both light and dark mode contrast before finishing

## Editing Guidance

- Prefer small targeted edits in the existing component rather than introducing new abstractions unless repetition is already painful
- Keep copy bilingual only when the file already handles `zh` and `en` via [src/i18n/index.ts](src/i18n/index.ts)
- When changing UI behavior, verify the touched page still builds with `npm run build`
- There is no dedicated test script in this package today; use build validation as the default executable check

## Good First Reads

- [src/app/App.tsx](src/app/App.tsx)
- [src/store/useAppStore.ts](src/store/useAppStore.ts)
- [src/styles/theme.css](src/styles/theme.css)
- [src/app/components/TopBar.tsx](src/app/components/TopBar.tsx)