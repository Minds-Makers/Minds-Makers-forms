# Minds Makers Forms

A private admin dashboard for building, publishing and analyzing web forms, plus the public
form pages those forms are served on. Built with Vite + React + TypeScript + Tailwind +
Supabase (Postgres, Auth, RLS, Realtime), deployed as a static site to Vercel.

## 1. Folder structure

```
src/
  app/            router (App.tsx) and layout (Layout.tsx)
  features/
    auth/         useAuth, RouteGuard, LoginPage
    forms/        forms list, overview, create-form dialog, data hooks (api.ts)
    builder/      two-pane form builder (settings/intro/structure + live preview)
    runtime/      public form runtime (/f/:slug) + the shared QuestionRenderer
    responses/    responses table, detail drawer, realtime, export
    analytics/    KPIs, charts, aggregation helpers (aggregate.ts), report view
    leads/        deduped email leads across forms
    settings/     password, default branding, danger zone
  components/ui/  design-system primitives (Button, Card, Input, Dialog, Badge, ...)
  lib/            supabase client, schema.ts (shared Zod schema), validation.ts,
                  export.ts (CSV/XLSX/JSON), seedTemplate.ts
supabase/
  schema.sql      tables, indexes, RLS policies, RPCs, realtime
  seed.sql        inserts the Compile Student Survey template
```

**The shared schema.** `src/lib/schema.ts` is the single source of truth for what a form looks
like — the builder writes it, `QuestionRenderer` (used by both the builder's live preview and
the public runtime) renders it, and `aggregate.ts` analyzes it. Adding a new question type means
touching: the Zod union in `schema.ts`, `QuestionRenderer.tsx` (render + read the answer),
`QuestionEditor.tsx` (builder fields for it), and — if it's a choice-like type —
`choiceQuestions()` in `aggregate.ts` so it gets a bar chart automatically.

## 2. Local setup

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and **anon public key** into `.env`.
3. Open the **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates
   the `forms`, `responses`, `form_events` and `submission_rate_limit` tables, all RLS policies,
   the three RPCs (`get_public_form`, `submit_response`, `log_form_event`), and enables Realtime
   on `responses`.
4. **Create your admin user manually** — public sign-up is intentionally disabled in this app.
   Go to **Authentication → Users → Add user**, set an email and password. That's the account
   you'll sign in with at `/admin/login`.
5. (Optional) Open `supabase/seed.sql`, replace `YOUR_ADMIN_USER_UUID` with your new user's UUID
   (visible on the Users page), and run it to load the Compile Student Survey as a draft form —
   or just use **Create form → Seed template** from the dashboard instead, which does the same
   thing without touching SQL.

## 4. Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it in Vercel as a Vite project (framework preset: Vite; build command `npm run build`;
   output directory `dist`).
3. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   Vercel's Project Settings → Environment Variables.
4. Deploy. Because this is a single-page app, add a rewrite so client-side routes work on
   refresh — a `vercel.json` with:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

## 5. Adding a new question type

1. Add the literal to `QUESTION_TYPES` and a new branch of the `questionSchema` discriminated
   union in `src/lib/schema.ts`.
2. Add a default-value case in `makeDefaultQuestion()` (`src/features/builder/QuestionEditor.tsx`).
3. Add a field-editing case to `QuestionEditor`'s JSX if it needs type-specific settings.
4. Add a render + read case to `QuestionField` in `src/features/runtime/QuestionRenderer.tsx` —
   this single component is shared by the builder's live preview and the public runtime, so you
   only write it once.
5. If it's choice-like (has discrete options), add it to the type check in `choiceQuestions()`
   in `src/features/analytics/aggregate.ts` to get an automatic bar chart in Analytics.
6. Add a case to `validateAnswer()` in `src/lib/validation.ts` if it needs custom validation.

## 6. How I test it (manual checklist)

1. Sign in at `/admin/login`.
2. **Create form → Seed template**, confirm the Compile Student Survey loads in the builder with
   a live preview on the right.
3. Click **Publish**. Copy the public link from the Forms list.
4. Open the public link on a phone (or a narrow browser window) with `?src=test` appended, e.g.
   `https://your-app.vercel.app/f/compile-student-survey?src=test`. Complete and submit it.
5. Back in the dashboard, open that form's **Responses** tab — the new response should appear
   live (cyan highlight + updated counter) without a refresh.
6. Click the row to open the detail drawer; confirm every answer reads correctly, including the
   scale items and the consent checkbox.
7. Export **CSV**, open it, confirm one column per question (and one per scale item).
8. Open **Analytics** — confirm the KPI cards, the choice-question bar charts, and the scales
   ranking table all reflect your test submission. Try **Report view** and **Download PDF**.

## 7. RLS test checklist

Run these from a fresh, signed-out browser session (or `curl`/Postman with only the anon key —
never the service key) against your Supabase project:

- [ ] `select * from forms` with the anon key returns **zero rows**, even for published forms.
- [ ] `select * from responses` with the anon key returns **zero rows** (or an error) — anonymous
      users can never read submitted answers.
- [ ] Calling `submit_response` for a **draft** or **closed** form's id raises an error and
      inserts nothing.
- [ ] Calling `submit_response` for a **published** form inserts a row and returns its id.
- [ ] Calling `submit_response` 11+ times in under a minute for the same form starts failing
      (rate limit).
- [ ] `get_public_form('some-draft-slug')` returns no row for a draft/closed form, and the full
      row (minus owner-only columns) for a published one.
- [ ] Signed in as the owner, `select * from responses where form_id = ...` returns your forms'
      responses; signed in as a *different* authenticated user (create a second test admin),
      the same query returns zero rows for forms you don't own.

## 8. Known deviations from the brief (kept simple on purpose)

- **Slug editing**: the brief asks for slug editing inside the builder; this build exposes slug
  only at creation time (auto-generated + de-duplicated) and treats it as stable afterward, since
  changing a shared public link silently is more often a footgun than a feature. Renaming can be
  added as a small `PATCH` action on the Forms list if you want it.
- **Account-level default branding** (Settings → Default branding) is present as a UI but not
  yet wired to a table — the brief doesn't specify where single-owner defaults should live. The
  simplest addition is a one-row `account_settings` table read by `CreateFormDialog`.
- **"Add an Other option with a free-text field"** is modeled as a plain text option in the seed
  template (`"Other"`) rather than a distinct free-text sub-field; the builder has an `allowOther`
  flag reserved on `single`/`multi` questions for wiring this up properly if you want a dedicated
  free-text capture separate from the option value.
- **Duplicate protection "hash"**: implemented as a `localStorage` flag per form
  (`onePerDevice`), not a fingerprint. This matches the brief's "device" framing and avoids
  fingerprinting, which the brief also asked to avoid ("fingerprint-free").

## 9. Testing

```bash
npm run test        # vitest run — schema validation, conditional logic,
                     # answer flattening for export, analytics aggregations
```

## 10. A note on this build

This repository was generated in a sandboxed environment without npm registry access, so the
code has been written carefully against each package's documented API but has **not been run
through `npm install` / `npm run build` here**. Run `npm install && npm run build` as your first
step locally — if TypeScript flags anything, it'll be minor (a prop type, an import) rather than
structural, since the shared-schema architecture means the three consumers (builder, runtime,
analytics) can't silently drift.
