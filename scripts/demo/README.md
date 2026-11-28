# scripts/demo

## Purpose

Demo video recorder: records a scripted phone-sized walk through a local
build with Playwright and composes it into a 1080x1920 captioned mp4. Output
goes to `out/` (gitignored). Copied from qkit's recorder with the generic core
kept apart from Merqo-specific files so it can later move to a shared package.

## Contents

Generic core (kept close to qkit; change here only for fixes that apply to
every kit):

- `base-url.mjs` - loopback guards for the app URL and the demo database.
- `filters.mjs` - ffmpeg filtergraph builders (layout, captions, outro, audio).
- `compose.mjs` - turns `out/<scene>/` into `out/<scene>.mp4`.
- `scenes.mjs` - scene registry shape, argument parsing and caption helpers.
- `harness.mjs` - browser pacing, cursor, masking, step timing and the CLI runner.

Merqo-specific:

- `brand.mjs` - wordmark, outro line, DB container and the off-camera hide script.
- `record.mjs` - the `one-account` flow.
- `reset.sql` - idempotent local reset and legal-acceptance seed for the demo vendor.
- `join-kits.sql` - idempotent seed that links the demo vendor to qkit and loopkit.

The scene-copy test is `test/demo-scenes.test.ts`.

## Usage

`pnpm demo:record -- --scene one-account` drives a local build in a phone
viewport (390x844) and writes a webm plus `steps.json` to
`scripts/demo/out/<scene>/` (gitignored). `pnpm demo:compose -- --scene
one-account` turns that into `scripts/demo/out/<scene>.mp4`, a vertical 9:16
clip (1080x1920) with a hook, step captions and a wordmark outro. Compose runs
from the recorded files alone, so a caption or layout change needs no re-record.

Prerequisites:

- Docker and a local Supabase stack with every migration applied
  (`supabase start`, then `supabase migration up --local`).
- `pnpm build && pnpm start`, with `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` pointing at
  that local stack.
- `ffmpeg` and `ffprobe` on PATH, and a bold `.ttf` (set `DEMO_FONT` when the
  default `C:/Windows/Fonts/arialbd.ttf` is absent).

Environment variables:

| Variable               | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `DEMO_DB_URL`          | Local Postgres URL; loopback only, the recorder refuses anything else |
| `DEMO_BASE_URL`        | App under test, default `http://localhost:3000`; loopback only        |
| `DEMO_DB_CONTAINER`    | Docker container used when `psql` is not on PATH                      |
| `DEMO_HEADLESS`        | `1` records without a visible browser                                 |
| `DEMO_SPEED`           | Pacing multiplier, default `0.75`                                     |
| `DEMO_BROWSER_CHANNEL` | Playwright browser channel, for example `chrome`                      |
| `DEMO_FONT`            | Caption font file                                                     |

Scenes:

| Scene         | Mode   | Shows                                                       |
| ------------- | ------ | ----------------------------------------------------------- |
| `one-account` | single | Sign up, then the dashboard with the vendor's kits together |

Guardrails: the pilot is free, so prices are blurred (`maskPrices`) and no
price or upgrade amount may be legible; the localhost address is blurred too.
Captions say only what ships, and no caption, hook or outro line may contain an
em dash (`test/demo-scenes.test.ts` enforces this and a 40 character limit).
`reset.sql` and `join-kits.sql` run against the local database only and are
idempotent; `reset.sql` also seeds legal acceptances for the demo email so the
legal gate does not interrupt the clip.

## Parent

See the repo root [README.md](../../README.md).
