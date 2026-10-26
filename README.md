# Neurotech Hub Daily

A read-only, static gazette. It renders one JSON file into a single page and publishes that page with GitHub Pages. It does not read Google Sheets, does not call an API, and does not save anything.

The data bot owns the JSON. This repository owns the page.

## Division of labor

Scout bots write Google Sheets. The data bot (Grok) reads those sheets, normalizes and deduplicates them, applies disposition and review-date rules, and commits JSON into this repo. The static build validates that JSON and renders it. A person reading the page cannot change disposition, feedback, or pipeline status. Feedback is given by telling the data bot and quoting `item_id`.

```text
Scout bots -> Google Sheets -> data bot -> data/digest.json -> static build -> GitHub Pages
```

## Where the data bot writes

These are the only files the data bot creates or replaces:

| Path | What it is |
|---|---|
| `data/digest.json` | The current edition. Replace the entire file. |
| `data/archive/YYYY-MM-DD.json` | Optional frozen edition. One file per Chicago date. The page lists these under Archive. |

Do not create `data/digest.json` by copying the sample unless that copy is a real edition that validates. An absent `data/digest.json` is a valid state: the build uses the sample so the page still renders.

## Where the data bot must not write

| Path | Why |
|---|---|
| `src/` | Page components, layout, and CSS. |
| `docs/digest.sample.json` | Fixture for local builds. Not the live file. |
| `docs/digest.schema.json` | The schema the build validates against. Change it only when the contract version changes, and keep `schema_version` in step. |
| `docs/digest-json-contract.md`, `docs/bringup.md` | Spec. Not inputs to the build. |
| `public/`, `dist/` | `dist/` is build output and is not committed. Do not add a second copy of the digest as a static asset. |

Never put email addresses, Google credentials, or raw sheet snapshots in this repo. The schema rejects an `email` field on a person. The page also drops any key whose name contains `email`.

## What the page reads

`npm run build` and `npm run dev` both load the digest like this:

1. If `data/digest.json` exists, use it.
2. If it does not exist, use `docs/digest.sample.json`.
3. Validate the chosen file against `docs/digest.schema.json` (JSON Schema draft 2020-12, Ajv).
4. If validation fails, stop. The site is not rendered, and there is no fallback from a broken live file to the sample.
5. Validate every `data/archive/YYYY-MM-DD.json` the same way. One bad archive file fails the build.

The validator is `src/lib/digest.ts`. `npm run validate` runs it before `npm run build`.

The page does not re-sort items, recompute nav counts, or re-filter by disposition, review date, or score. It renders `sections[]` and `in_progress[]` in the order they arrive. It uses `nav[].count`, each section's `visible_count` only as delivered data, and each in-progress group's `count`. Those counts are not `items.length`. The sample file is trimmed, so its counts are larger than the item arrays. A real edition should make `nav[].count` match the items a reader can see.

The one defensive exception: an item whose `disposition` is `Decline` or `Closed` is not rendered. Those values should never be in the file. If the schema rejects them, the build fails before render.

## Shape the page depends on

`schema_version` is `"1.0"`. `timezone` is `"America/Chicago"`. `generated_at` is an ISO datetime with a numeric offset. `edition_date` is `YYYY-MM-DD` in Chicago. `visibility` is `"internal"` or `"public"`. This version does not build a separate public export. Keep the field, and do not publish a sanitized edition from the UI.

`site.title`, `site.tagline`, and `site.hub_url` fill the masthead. `feedback.instructions` is shown in the footer and is not a save control. Each item has its own `feedback_instructions`.

`nav` is an array of `{key, title, count}` in display order, including one `in_progress` entry. The page prints those titles and counts and anchors to `#{key}`. Do not rename sections in the page. Put the display name in `title`.

`sections` is an array. Current keys, in order: `news`, `opportunity`, `funding`, `innovation`, `acorn`. A new source is a new object in this array. The page does not need a code change to show it: the first three sections sit in a three-column row, the rest sit in a two-column row, and unknown keys use the same story component. Innovation (`key` exactly `"innovation"`) is the only section grouped by `subcategory`. Group labels are the subcategory strings in the file. Do not hardcode Funding, Commercialization, or Market Gap.

Each section needs `key`, `title`, `source`, `last_refreshed`, `last_run_status` (`ok`, `partial`, `error`, or `not_logged`), `new_items_count`, `no_new_items`, `visible_count`, `unavailable`, `unavailable_message`, and `items`. Optional: `cadence`, `last_run_note`, `next_run`, `carried_over`, and `pipeline_counts` (an object such as `{"Open": 8, "Contacted": 15}`, shown only when present).

The page picks one freshness state:

- `unavailable: true` shows `unavailable_message` and any items already in the array. An empty list is not described as "no findings." `carried_over: true` adds a carried-over note.
- `last_run_status: "not_logged"` shows "No run recorded". It is not treated as a successful run.
- `no_new_items: true` shows "No new findings." and still lists the items.
- Otherwise the page shows `new_items_count` and marks items with `is_new: true`.

`last_refreshed` is the bot's latest run time, or `null`. The masthead "Last synchronized" time is the latest `last_refreshed` across sections. If every section is null, it uses `generated_at`. Times are formatted in America/Chicago from the file. The page never uses the browser clock or the build clock as freshness.

`in_progress` is an array of `{disposition, count, items}`. Disposition here is `Pursue`, `Investigate`, or `Monitor`, in the order given. Items keep `source` and `category`. The page does not move items between a section and `in_progress`.

## Item rules that change the page

`item_id` is namespaced, `source:ID`, because bare ids collide (`funding:OPP-007` and `opportunity:OPP-047`). The Copy control copies that string. Related items link to each other with `related_items[]` of `{item_id, title, via}`.

`summary` is the short reading text: news summary, opportunity need, funding need, innovation "why it matters", or ACORN "why".

`category` and `subcategory` are shown as delivered. Do not ask the page to remap them.

Dates stay distinct. `date_published` is when the article was published or the award was noticed. `date_discovered` is when the bot found it. `date_updated` is the bot's last update. A newly discovered old paper must not look published today. `is_new` is true only when discovery is the edition date. Use `null` for a missing date. Unparseable dates should be `null`, not a sentinel string.

`link` is the primary URL. `secondary_links` are extra URLs (DOI, other innovation sources), rendered as compact source links. `product_matches[]` use canonical names and link to `store_url` or, if that is null, `github_url`.

`disposition` on an item is the reader's disposition (`New`, `Pursue`, `Investigate`, `Monitor`). Pipeline status is a different field, `details.pipeline_status` (`Open`, `Contacted`, `Interested`, `Passed`, `Skipped`). The page labels them separately. `due_for_review: true` adds a small "Due for review" label on the item in its original section. Omit the field when it is false.

`matt_feedback` and `next_review_date` fill the read-only feedback block. There is no Save control.

`score` is a 0–100 integer or `null`. Innovation's score is always `null`. The page does not show a numeric score on innovation items. `score_original` keeps the raw scale for the expanded view. Do not invent a score.

`people[]` is `{name, institution, atlas_id, role_note}`. No emails.

`details` is source-specific and rendered as labeled key/value pairs. The page does not special-case sheet columns. It does treat two keys as presentation, not as new fields: `facts` is documented evidence and `inferences` is inferred potential, and `project_end` / `notice_date` are award dates. Never put a deadline label on an award end date. `details.is_deadline` on a funding item is `false`. Outreach, when present, is `details.outreach` with `last_contact`, `channel`, `status`, and `next_follow_up`. `details.outreach_notes` is only `{visibility, present}`. Do not put note text or email in the file.

`source_record` is `{sheet_url, tab, row, record_id}` and is shown as a sheet-row link in the expanded details.

`build_warnings[]` of `{code, note?}` may be shown as a quiet footer line. They are diagnostics, not stories.

## Local commands

```bash
npm install
npm run dev       # http://127.0.0.1:4321
npm run validate  # schema check only
npm run build     # validate, then write dist/
npm run preview   # serve dist/
```

`BASE_PATH` defaults to `/` for local preview. Set it when the site is served from a subpath. `SITE_URL` is the origin used for canonical URLs, without the repo subpath.

## GitHub Pages

`.github/workflows/pages.yml` builds on every push to `main` and deploys the `dist/` artifact. The workflow sets `BASE_PATH` to `/${repository}/` and `SITE_URL` to `https://${owner}.github.io`. In the repo settings, Pages must use GitHub Actions as the source.

This site is public if the repository or the Pages site is public. `data/digest.json` is committed in git, and the built HTML contains the same text. Do not put material there that cannot be public. A private repository does not by itself make GitHub Pages private.

A repository named `*.github.io` is a user site and needs `BASE_PATH=/`. The workflow assumes a project site.

## Page source map

| Piece | File |
|---|---|
| Load and validate | `src/lib/digest.ts` |
| Types | `src/lib/types.ts` |
| Dates, counts, anchors | `src/lib/format.ts` |
| Generic details | `src/lib/details.ts` |
| Masthead | `src/components/Masthead.astro` |
| Section nav | `src/components/SectionNav.astro` |
| Section | `src/components/Section.astro` |
| In progress | `src/components/InProgress.astro` |
| Story | `src/components/Story.astro` |
| Expanded details | `src/components/StoryDetails.astro` |
| Metadata line | `src/components/SourceMetadata.astro` |
| Feedback block | `src/components/FeedbackBlock.astro` |
| Freshness | `src/components/FreshnessNote.astro` |
| Page composition | `src/components/DigestView.astro` |
| Styles | `src/styles/global.css` |
