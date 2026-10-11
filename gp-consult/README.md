# GP Consult

A personal, single-user web app for keeping GP-level clinical knowledge current through
simulated primary-care consultations that are graded against guideline summaries
(NICE CKS/guidelines, BNF/BNFc, RCOG Green-top, BTS/SIGN, UKHSA Green Book).

- **Consult**: triage note → history (streaming chat with a simulated patient) → examine →
  investigate (bedside tests return immediately; bloods and imaging come back as “results back”) →
  structured plan → graded feedback.
- **Grading**: eight domains with quoted evidence, misses and sourced guideline points, a
  model consultation and 1–3 learning points. Judged against the ConditionCard and CaseFile,
  not free recall. Problems with the card itself are flagged.
- **Adaptive**: Elo rating per condition and per specialty, spaced repetition, and cases
  pitched one tier above your current rating (tiers 1–5).
- **Fun**: clinic sessions (6 mixed patients and a summary), XP, levels, daily streak, a specialty
  map, and 60-second red-flag rapid-fire rounds.
- **Keeping current**: each card shows its guideline date. “Check for updates” searches guideline
  publishers and proposes a diff, and nothing changes until you approve it.
- **Local practice mode** (Zimbabwe/EDLIZ): adds local-practice notes to the grade and flags
  drugs that aren't on your pasted formulary.

> This app lives in `gp-consult/` inside an unrelated repository. It is self-contained (its own
> `package.json`, lockfile and database) and can be moved into its own repo as-is.

---

## Setup

Requirements: Node.js 20+ (22 recommended). `better-sqlite3` compiles a native module on install.

```bash
cd gp-consult
npm install
cp .env.example .env.local      # then add your ANTHROPIC_API_KEY
npm run dev                      # http://localhost:3000
```

The SQLite database (`data/gp.db`) is created, migrated and seeded with the condition cards on
first request. Nothing else is needed.

To try the app without an API key, set `MOCK_LLM=1` in `.env.local`. Every AI call (patient,
exam, results, case generation, grading, rapid-fire generation, update checks) is then replaced by
deterministic canned output built from the condition cards.

For a phone on the same network: `npm run build && npm start -- -H 0.0.0.0`, then open
`http://<your-computer-ip>:3000`. Set `APP_PASSWORD` if the network isn't private.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Required for real consultations. Used only by server routes, never sent to the browser. |
| `PATIENT_MODEL` | `claude-haiku-5-5` | Simulated patient (streamed), examination findings, investigation results. Fast and cheap. |
| `GRADER_MODEL` | `claude-opus-5-5` | Case generation, grading, rapid-fire vignette generation, guideline update checks. |
| `APP_PASSWORD` | – | If set, every page and API route requires this password (90-day HttpOnly cookie). |
| `DATABASE_PATH` | `./data/gp.db` | SQLite file location. |
| `APP_TIMEZONE` | server local | IANA zone used for the daily streak, e.g. `Africa/Harare`. |
| `MOCK_LLM` | `0` | `1` = offline canned responses (no API calls). |
| `LLM_FALLBACKS` | on | Calls on Opus/Sonnet-tier models use the API's server-side refusal fallback (`fallbacks: "default"`), so an occasional safety-classifier refusal on medical content doesn't fail a consultation. Set `0` to disable. |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm test` | Vitest unit tests (Elo, spaced repetition, case selection, XP/streaks, investigation triage, formulary matching, card diff, seed-content validation) |
| `npm run typecheck`, `npm run lint` | TypeScript and ESLint |
| `npm run cards:import` | Import new cards from `seed/cards/` (see below) |
| `npm run db:generate` | Generate a Drizzle migration after editing `db/schema.ts` |

---

## Condition cards

ConditionCards are the evidence base: case generation and grading are told to use the card,
not free recall. The 21 seed cards were **written from memory of current UK guidance and have
not been checked against the live sources**. All of them start `verified: false`. Unverified
cards show an amber “not authoritative” banner on the card, in consultations and in the grade.

**Review workflow:** Cards → filter “Unverified” → open a card → read it in the formatted view →
**Edit** to correct anything (one item per line; thresholds as `label | value`, sources as
`title | url`) → **Mark verified**. Editing never changes the verified flag by itself.

**Guideline dates to check first.** These areas have had recent or ongoing updates, so verify
the seed content carefully:
- T2DM: the card reflects NG28 as of 2022.
- Asthma: the card reflects the 2024 NICE/BTS/SIGN guideline (NG245), with AIR/MART.
- Menopause: the card reflects the NG23 2024 update.
- Colorectal: the card reflects FIT-guided referral (DG56).

### Adding new cards

1. **In the app:** Cards → **+ New**, fill in the form, save. The card id is generated from its name.
2. **From JSON:** copy `seed/cards/custom/example.json.sample` to `seed/cards/custom/<anything>.json`
   (one card object or an array per file). Then run `npm run cards:import`, or just start the app
   on a fresh database. Invalid cards are skipped with a warning.
3. **In code:** add an entry to the relevant `seed/cards/<specialty>.ts` and run `npm run cards:import`.

Import only inserts ids that don't exist yet, so your edits and verification are never overwritten.
Specialty must be one of `medicine | surgery | obgyn | paediatrics | psychiatry`.

### Checking for updates

On a card, **Check for updates**:
1. Asks `GRADER_MODEL`, with the Anthropic web search tool restricted to guideline publishers
   (nice.org.uk, cks/bnf/bnfc.nice.org.uk, rcog.org.uk, brit-thoracic.org.uk, sign.ac.uk,
   gov.uk, fsrh.org), to look for guidance newer than the card's guideline date.
2. Turns those findings into a minimal proposed edit and a summary with the sources consulted.
3. Shows a field-by-field diff. **Approve & apply** updates the card and its guideline date.
   **Reject** discards the proposal. Approving keeps the card's verified state, because you have
   just reviewed the change.

Each check makes several web searches, which the API bills per search on top of tokens.

---

## How it works

### Consultation flow and secrecy
The CaseFile (diagnosis, hidden agenda, findings, model plan) stays on the server. The browser
only gets the triage note, the patient's replies, the findings you asked for and the results you
ordered. You see the full case file only on the feedback page.

- **Patient**: `PATIENT_MODEL` gets a patient-facing subset of the CaseFile (no diagnosis or
  findings) and strict rules: lay language, answer only what is asked, never hint at the diagnosis,
  raise any hidden agenda late. Replies stream to the chat.
- **Examination / investigations**: structured calls that return findings or results only for
  what you requested. Anything the case file doesn't list comes back normal or plausible, but
  consistent with the case. Lab results take about 20 s to come back and imaging about 30 s.
  Every order is graded.
- **Grading**: one `GRADER_MODEL` call with the CaseFile, ConditionCard (and its verified flag),
  timestamped transcript, orders and plan. Each domain is scored 0–10. The overall score is a
  fixed weighted sum computed by the app: history 15, examination 10, investigations 10,
  diagnosis 15, management 20, referral 10, safety-netting 10, communication 10.

Every call that returns data uses Anthropic structured outputs (a JSON schema built from the Zod
schemas in `lib/schemas/`). The result is validated again with Zod. Structured calls stream
internally, so long outputs (grading, case generation) never hit request timeouts.

### Adaptive difficulty
- **Tiers**: 1 classic presentation; 2 standard first-line management; 3 atypical presentation or
  complicating factors; 4 escalation, thresholds, timing, consent/capacity; 5 multi-problem, hidden
  agenda, buried red flags, vague historian.
- **Elo** (`lib/engine/elo.ts`): each graded consultation is a match against the case. Case
  ratings are T1 800, T2 1000, T3 1200, T4 1400, T5 1600. Your result is
  `(score − 30) / 60`, clamped to 0–1, so 60% against an equally rated case is par. K is 40 for
  the first 5 attempts at a condition, then 24. Per-specialty ratings use K 16. You start at 900.
- **Next case** (`lib/engine/select.ts`):
  1. Conditions due for review, most overdue first.
  2. Otherwise an unseen condition from your weakest specialty.
  3. Otherwise your weakest condition.

  The tier is the one closest to your rating + 100.
- **Spaced repetition** (`lib/engine/srs.ts`, SM-2 style): a score below 60 brings the condition
  back tomorrow. Passes space it out to 3 days, then 7, then interval × ease.
- **Case cache**: generated cases are stored and reused only until they are seen, so the same
  condition yields different patients over time. Recent patients for that condition are passed to
  the generator to avoid repeats. After each grade, the likely next case is generated in the
  background so the next patient starts instantly.

### XP
Score × (1 + 0.25 × (tier − 1)). Finishing within the 10-minute clock adds 20. The first activity
of the day adds 25 and finishing a clinic adds 50. Rapid-fire earns 5 per correct answer.
The streak counts consecutive days with any XP.

---

## Architecture & files

```
gp-consult/
  app/                         Next.js App Router pages + API route handlers
    page.tsx                   dashboard
    consult/new, consult/[id], consult/[id]/feedback
    clinic/, clinic/[id]       clinic sessions + summary
    rapid-fire/, map/, history/, settings/, login/
    cards/, cards/[id], cards/new
    api/consult/…              start, adaptive next, message (stream), exam, investigate, plan, grade
    api/clinic, api/rapid-fire/…, api/cards/…, api/revisions/[id], api/settings, api/login
  components/                  UI (consult room, feedback, dashboard charts, card editor/diff…)
  lib/
    llm/client.ts              Anthropic SDK client, model env, structured() helper
    llm/services.ts            patient stream, exam, investigations, case generation, grading
    llm/extras.ts              rapid-fire generation, guideline update checker (web search)
    llm/mock.ts                MOCK_LLM implementations
    prompts/                   all system/user prompts
    schemas/                   Zod: ConditionCard, CaseFile, consultation, grade, misc
    engine/                    pure logic: elo, srs, select, xp, mastery (unit-tested)
    repo/                      database access
    grading.ts, progress.ts    grade orchestration; Elo/SRS/XP updates
  db/schema.ts, db/client.ts   Drizzle schema; the only file that knows the driver
  drizzle/                     generated SQL migrations (applied automatically at startup)
  seed/cards/*.ts              21 seed ConditionCards; seed/cards/custom/*.json for your own
  seed/rapidfire.ts            43 seed rapid-fire vignettes
  tests/                       Vitest
```

### Moving to Turso or Postgres
All database access goes through Drizzle. Only `db/client.ts` knows about `better-sqlite3`, and
the schema uses plain text/integer/real columns, with JSON stored as text.
- **Turso/libSQL**: switch `db/client.ts` to `drizzle-orm/libsql` with `@libsql/client` and use
  libSQL's migrator. The schema and queries don't change. libSQL is async, so wrap the
  synchronous transaction in `lib/progress.ts` with `await db.transaction(async (tx) => …)`.
- **Postgres**: port `db/schema.ts` to `pg-core` (JSON columns → `jsonb`), regenerate migrations
  and swap the client. The repository functions would become async.

### Costs (rough)
- Patient replies, exam and results run on Haiku and cost very little.
- Each case generation and each grade is one Opus call.
- A clinic generates 6 cases in parallel.
- Update checks add web-search charges.
- Prompts are structured so stable instructions come first and can be prompt-cached.

## Caveats
- This is a revision tool for a qualified clinician, not clinical decision support. The seed
  cards are unverified until you review them.
- Simulated patients and the grader can be wrong. When feedback conflicts with a guideline you
  trust, fix the card, and the grader will follow it.
