# Knowledge Tracker

A personal knowledge base for learning and revising interview topics, with spaced repetition.

- **Content** (topics + Markdown notes) lives in a GitHub repo you control.
- **Progress** (status, confidence, review schedule, quick notes) lives in your browser's localStorage.
- No backend, no accounts, no paid services. It deploys to GitHub Pages as static files.

It runs out of the box with bundled sample content in `static/sample-content/`.

## Tech

SvelteKit 3 + Svelte 5 (runes) · TypeScript (strict) · Tailwind CSS 4 + typography ·
adapter-static · marked + DOMPurify + highlight.js · Vitest + Testing Library · ESLint + Prettier · pnpm

## Run locally

```sh
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts:

| Command        | What it does                           |
| -------------- | -------------------------------------- |
| `pnpm test`    | Unit + component tests (Vitest, jsdom) |
| `pnpm check`   | Type-check (svelte-check)              |
| `pnpm lint`    | Prettier check + ESLint                |
| `pnpm format`  | Auto-format everything                 |
| `pnpm build`   | Production build into `build/`         |
| `pnpm preview` | Serve the production build             |

## Point it at your content repo

1. Create a new **public** GitHub repo, e.g. `interview-notes`.
2. Copy everything in [`content-template/`](content-template/) into it and push.
3. Edit [`src/lib/config.ts`](src/lib/config.ts):

   ```ts
   export const contentConfig = {
   	githubUsername: 'your-github-username',
   	repo: 'interview-notes',
   	branch: 'main'
   };
   ```

The app loads `https://raw.githubusercontent.com/<user>/<repo>/<branch>/topics.json`.
If that fails (typo, private repo, offline), it shows a warning and falls back to the sample content.
**Settings → Reload content** fetches again without a page refresh.

> The raw-content CDN caches files for a few minutes, so a push can take a moment to show up.

## Add a topic and a note

In your content repo:

1. Add an entry to `topics.json`:

   ```json
   {
   	"id": "js-closures",
   	"title": "Closures",
   	"category": "JavaScript",
   	"priority": "high",
   	"tags": ["fundamentals"],
   	"note": "notes/javascript/closures.md",
   	"resources": [{ "label": "javascript.info", "url": "https://javascript.info/closure" }]
   }
   ```

2. Create `notes/javascript/closures.md`. Use `##` / `###` headings, since they become the table of contents.
3. Commit and push.

Validation rules (an invalid entry is skipped, and you get a warning banner instead of a crash):

| Field       | Rules                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| `id`        | Required, unique, letters/digits/`-`/`_`. Progress is keyed by it; don't rename. |
| `title`     | Required.                                                                        |
| `category`  | Required. Categories appear in the order they first occur.                       |
| `priority`  | `high` / `medium` / `low`. Optional, defaults to `medium`.                       |
| `tags`      | Optional array of strings.                                                       |
| `note`      | Optional relative path to a `.md` file (no `..`, no absolute URLs).              |
| `resources` | Optional array of `{ label, url }` with `http(s)` URLs.                          |

## Deploy to GitHub Pages

1. Push this project to its own GitHub repo (e.g. `knowledge-tracker`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) type-checks, lints, tests, builds and deploys.
4. Open `https://<user>.github.io/knowledge-tracker/`.

The workflow sets `BASE_PATH=/<repo-name>` because project sites are served from a subfolder.
If you deploy to `<user>.github.io` itself (a user site), set `BASE_PATH: ''` in the workflow.
Topic pages (`/topics/<id>`) aren't known at build time, so they're served by the `404.html` SPA fallback.
That works on GitHub Pages, but the HTTP status of a fresh load on those URLs is 404.

## How it works

```
src/
  lib/
    config.ts               ← your GitHub username / repo / branch
    types/                  ← Topic, TopicProgress, …
    utils/                  ← pure, tested logic
      schedule.ts             spaced-repetition scheduling
      validate.ts             topics.json + progress validation
      filter.ts               search / filter / sort / URL params
      stats.ts                due list, streak, weekly count, status counts
      markdown.ts             marked + highlight.js + DOMPurify + TOC (lazy-loaded)
      dates.ts                local YYYY-MM-DD date helpers
    stores/
      storage.ts              the ONLY module touching localStorage (all try/catch)
      content.svelte.ts       loads topics/notes; GitHub → sample fallback; AbortController
      progress.svelte.ts      rune-based progress state; persists via storage.ts
      theme.svelte.ts         system / light / dark
    components/             ← TopicCard, StatusBadge, ProgressBar, FilterBar, MarkdownViewer,
                              ReviewButtons, ConfidenceInput, StatusPicker, …
  routes/
    +page.svelte            ← dashboard
    topics/+page.svelte     ← list with filters (state lives in URL search params)
    topics/[id]/+page.svelte← note + progress editors
    settings/+page.svelte   ← source, reload, export / import / reset
static/sample-content/      ← fallback content
content-template/           ← starter for your content repo
```

**Data flow.** The root layout calls `content.load()` once. Pages read `content.topics` and
`progress.map` and compute everything else with `$derived`, so reviewing a topic updates the
dashboard automatically. The topics page treats the URL as the source of truth for filters.
The topic page fetches its note in an `$effect` whose cleanup aborts the request when you navigate away.

### Spaced repetition

Intervals: **1 → 3 → 7 → 14 → 30 days**.

| Rating | Effect                                  |
| ------ | --------------------------------------- |
| Hard   | Back to the start: review tomorrow.     |
| OK     | One step forward.                       |
| Easy   | Two steps forward (skips one interval). |

After 30 days it stays at 30. The first OK is 1 day and the first Easy is 3 days.

## Decisions & defaults

Where the spec was open, I chose:

- **SvelteKit 3 conventions.** Kit config lives in `vite.config.ts` (there is no `svelte.config.js`).
  `$lib` is replaced by `#lib/...` subpath imports with explicit `.ts` extensions, and
  `$app/environment` became `$app/env`.
- **highlight.js** over shiki. It's much smaller, and only ~11 common languages are registered.
  Add more in `src/lib/utils/markdown.ts`.
- **Dates are local `YYYY-MM-DD`** strings, so "due today" follows your timezone.
- **Reviewing a not-started topic** moves it to _Learning_. Status and confidence are otherwise only changed by you.
- **Hard resets** the interval sequence, not just the next date.
- **Streak**: consecutive days with at least one review. It isn't broken until a full day passes
  without one, so a streak still shows in the morning before you've reviewed.
- **"Reviews this week"** counts review events in the last 7 days, including today.
- **Import merges.** Topics in the file overwrite this device's progress for the same id, and other progress is kept.
  Both the export envelope `{ version, progress }` and a bare `{ id: progress }` map are accepted.
- **Progress for topics removed from `topics.json`** is kept (harmless), in case you re-add them.
- **Relative links inside notes** resolve to the raw GitHub file next to the note.
- **Reset** uses an inline two-step confirmation instead of `window.confirm()`.
- **pnpm**: on this machine the corepack `pnpm` shim was broken for pnpm 12. If `pnpm` errors with
  `Cannot find module …/pnpm.cjs`, run `corepack disable` and install pnpm with `npm i -g pnpm`
  (or `brew install pnpm`).

## Svelte 5 cheat sheet (as used here)

| Pattern                                                | Where to look                               |
| ------------------------------------------------------ | ------------------------------------------- |
| `$props()` instead of `export let`                     | any component                               |
| `$state` / `$derived` on class fields as shared stores | `stores/*.svelte.ts`                        |
| `$derived` for computed values                         | `routes/+page.svelte`                       |
| `$effect` with cleanup (AbortController)               | `routes/topics/[id]/+page.svelte`           |
| `$state.snapshot`                                      | `progress.svelte.ts` → `exportJSON`         |
| `$props.id()` for unique ids                           | `ConfidenceInput.svelte`                    |
| Snippets + `{@render}` instead of slots                | `ContentGate.svelte`, `StateMessage.svelte` |
| `bind:this` + `tick()` for focus                       | `ReviewButtons.svelte`                      |
| `<svelte:window onkeydown>`                            | `ReviewButtons.svelte`                      |
| Event attributes (`onclick`) instead of `on:click`     | everywhere                                  |
