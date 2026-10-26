# Neurotech Hub Daily — Implementation Specification v3 (UI)

## 0. What changed from v2

The UI agent no longer touches Google Sheets, Digest Control, Run Health, Outreach Log, Products, or Atlas. **Hub - The Daily (the data bot) owns all of that.** It reads the sources, normalizes, deduplicates, applies disposition and review-date rules, computes counts and freshness, and commits a single file, `digest.json`, to this repository.

**The UI agent builds a read-only, static, text-first page that renders `digest.json`. That is the whole job.**

Files provided with this spec (treat as authoritative):

- `digest-json-contract.md`: field-by-field description of `digest.json`.
- `digest.schema.json`: JSON Schema (draft 2020-12). Validate the input at build time.
- `digest.sample.json`: real sample data (internal; do not publish).
- `hub-data-structures.md`: background only. The UI does not need source columns.

Develop against `digest.sample.json`. The data bot will replace it with the real `digest.json` daily. Never hand-edit `digest.json`.

---

## 1. Objective

Build **Neurotech Hub Daily**, a single-page, authenticated intelligence digest that renders the Neurotech Hub's scouting results. It should feel like a carefully curated scholarly newspaper, not a CRM, analytics dashboard, or web app.

Design references:

- [Arts & Letters Daily](https://www.aldaily.com/): typography, three-column editorial layout, minimal decoration, density.
- [Mediagazer](https://mediagazer.com/): hierarchy, grouped stories, source attribution, compact reporting.

Guiding principle: the content does the visual work.

---

## 2. Architecture

```text
Scout bots -> Google Sheets -> [Hub - The Daily: export, normalize, dedupe, filter]
           -> digest.json (committed to this repo) -> static build -> authenticated host
```

- The site is **read-only** in v1: no Save control, no editable dropdowns, no Sheets calls, no API keys.
- The page is built statically from `digest.json` (and its sibling edition files, if provided; see the contract).
- All filtering is done by the data bot. **The UI must not re-filter by Disposition, Monitor review dates, or counts. It renders what each section array and `in_progress` contain, and uses the provided counts.** The one exception is defensive: never render an item whose disposition is Decline or Closed.
- Source-specific field mapping lives in the data bot. The UI maps only the normalized item model in the contract. Source-specific content arrives in `details` and is rendered generically (see section 7).
- New sources appear as new entries in `sections[]`; the UI should render unknown sections with the generic story component rather than requiring a redesign.

---

## 3. Visual Design

Typography
- **Newsreader** or **Source Serif 4** for headlines and summaries.
- **Inter** or **Inter Tight** for navigation, metadata, labels, timestamps.
- Compact but readable; hierarchy through size and spacing, not decoration.

Colors

| Element | Color |
|---|---|
| Background | `#FAF9F6` |
| Primary text | `#242424` |
| Secondary text | `#77736D` |
| Dividers | `#DFDDD7` |
| Accent | `#913E36` |
| Hover | `#F2F0EB` |

Rules: primarily text; no thumbnails; no KPI cards; no rounded containers, shadows or gradients; fine rules between stories; restrained color; compact metadata; minimal interactive elements. Target aesthetic: modern academic gazette.

---

## 4. Page Layout

Masthead:

```text
NEUROTECH HUB DAILY
Research, technology, and opportunity intelligence.
Monday, October 26, 2026
Last synchronized: 5:02 AM CT
```

Date comes from `edition_date`; the synchronization time shown is the latest `last_refreshed` across sections (fall back to `generated_at` only if none exist). All times in America/Chicago. Never use the browser's clock or build time as data freshness. Optional small link to the Neurotech Hub website and archive link if editions are provided.

Section navigation, with counts from the data (`nav[].count`, which equals each section's `visible_count`; never computed from raw rows):

```text
News (n) · Research Leads (n) · Funded Research (n)
Innovation (n) · Product Leads (n) · In Progress (n)
```

Anchors to sections on the same page; no tabs.

Desktop: three columns for News, Research Leads, Funded Research; then two columns for Innovation Opportunities and Product Leads; then a full-width In Progress section. Variable section lengths; no equal heights; no independent column scrolling. Max content width about 1300 to 1400 px. Tablet: two columns. Mobile: single column in the same order.

Use the section titles supplied in `digest.json`. Do not rename them.

---

## 5. Sections

Section order: news, research leads, funded research, innovation, product leads, in progress. Each section independently shows its freshness and state (section 8).

### 01 News
Headline links to the original source; publisher; publication date; short summary; Hub relevance when present; related products (canonical names, linked to store or GitHub URL when a verified `url` is provided). Duplicate coverage arrives pre-grouped as a primary item with `secondary_links`; render those as compact source links, Mediagazer style. Order as delivered.

### 02 Research Leads
Publication title; investigator and institution; research need; relevant Hub product or capability; classification; DOI or publication link. Show the `category` value exactly as delivered (existing capitalization and terminology). Do not map or simplify it. Expanded: scores, confidence, evidence vs inference, recommended action, outreach history, related Atlas records. Visually distinguish documented evidence from inferred commercial potential (the contract's `details` keeps these separate).

### 03 Funded Research
Curated opportunity records only. Award title; PI and organization; agency; amount; notice date; Hub product match; link to original award. Awards are not solicitations. Never label an award end date as a deadline.

### 04 Innovation Opportunities
Group by `subcategory` exactly as delivered. Current live values: **Funding**, **Commercialization**, **Market Gap** (singular). Do not hardcode the list; group by whatever values arrive. Show title, Hub asset, why it matters, potential value, effort, confidence, source links. Show whether a market gap is validated or speculative if the data says so. Innovation Scout is weekly: display the section's actual `last_refreshed`. Never show a numeric score for Innovation (it has none).

### 05 Product Leads
Investigator; institution; product; identified need; relevance; pipeline status (Open / Contacted / Interested / Passed / Skipped; this is not a disposition); latest outreach event and next follow-up date when present (the data bot fills these from the Outreach Log). A plain-text pipeline count line at the top of the section if the optional section field `pipeline_counts` (for example `{Open: 8, Contacted: 15}`) is present. No email addresses are ever provided or shown. The section must tolerate multiple products later.

### 06 In Progress
From `in_progress[]`, grouped by disposition (Pursue, Investigate, Monitor), preserving source and original category. Each item shows title, source, disposition, most recent feedback, and relevant review or follow-up date. Expect many ACORN leads at launch. Do not equalize counts across sections.

---

## 6. Review State (display rules only)

The data bot decides what appears where. The UI just needs to display it correctly:

- Items in a section array are unreviewed or due for review. Items in `in_progress` are Pursue, Investigate, or Monitor with a future review date (or no date). Decline and Closed are never delivered.
- If an item has the optional field `due_for_review: true`, add a small, subtle **Due for review** label. Do not style it as newly discovered.
- Bot pipeline status (for example ACORN "Contacted") and user Disposition are separate fields; show both when present, labelled distinctly, never merged.
- Each item appears once (see `related_items` for cross-links).

---

## 7. Record Presentation

Collapsed (default, reading-first):
1. Title in serif (links to the external source when `link` exists).
2. One or two sentence summary.
3. Metadata line: source or publisher, institution, date, category or product.
4. Optional related links.

Example (illustrative only):

```text
New behavioral monitoring technique for
longitudinal rodent studies

Researchers describe a minimally invasive method for
continuous home-cage assessment.

Journal · Oct 24 · BEAM
------------------------------------------
```

A separate small **Details** control expands the item inline (no modals, no detail pages). The title link and the Details control are different targets.

Expanded (decision-first): evidence and reasoning, scores (original value and scale; normalized only where the contract says it is for sorting), confidence, product matches, recommended action, related records, outreach history, disposition and feedback.

`details` is source-specific. Render it with one generic key/value component driven by the labels the data bot supplies. Do not write per-source field logic that depends on sheet columns.

Feedback block (read-only, always shown in expanded view):

```text
Disposition: Investigate
Next review: November 3, 2026

Your feedback:
"Explore whether this lab needs custom engineering."

To update: tell The Daily
Reference: opportunity:OPP-008   [Copy]
```

Use the real namespaced `item_id` as the reference and provide a Copy button. Never imply anything on the page was saved.

Dates: always keep published, discovered, and updated distinct, and label them. A newly discovered historical publication must not look published today. Use `null` handling: omit missing fields; never show "null" or "Invalid Date".

---

## 8. Freshness and Section States

Each section object carries (see contract): `last_refreshed`, `last_run_status`, `new_items_count`, `no_new_items`, `unavailable`, `unavailable_message` (and `carried_over` when items were kept from the previous edition).

Render one of three states:

1. **New records:** display normally; indicate `new_items_count` and mark items with `is_new: true`.
2. **Successful run, no new records** (`no_new_items: true`): keep showing older eligible items and a quiet note "No new findings."
3. **Unavailable or stale** (`unavailable: true`): show previously synchronized items if any, with a visible stale or unavailable notice and the `unavailable_message`. Never treat an empty list as "no findings" when `unavailable` is true.

`last_run_status: "not_logged"` means the bot has not recorded a run yet. Show "No run recorded," not an error or a success. Never invent placeholder headlines.

---

## 9. Security and Hosting

The digest contains internal commercial intelligence (scores, prospect pipelines, outreach history, recommendations, feedback).

- V1 must be served only behind real, server-enforced authentication (for example, Cloudflare Pages with Cloudflare Access). **Do not deploy to unprotected GitHub Pages.** A private repository alone does not make GitHub Pages private.
- Do not rely on a JavaScript password prompt or client-side hiding.
- Protect all assets, including `digest.json`, historical editions, and any generated reports, not just the HTML. Ensure there is no second public URL serving the same files.
- No email addresses and no Google credentials appear anywhere in the repo or frontend. The schema forbids an `email` field.
- Do not commit the data bot's `raw/` snapshots or any real export to a public repo or public CI artifact.
- Until authenticated hosting is ready, develop with `digest.sample.json`, which should stay out of any public deployment.
- A public edition, if ever wanted, is a separate sanitized export produced by the data bot, with `visibility: public` items only. Do not build it in v1; just keep the `visibility` field in the types.

---

## 10. Implementation Requirements

- Use the existing project framework and conventions; minimize dependencies and client JS.
- Validate `digest.json` against `digest.schema.json` at build time; fail the build with a clear message if invalid (never silently render partial data).
- Separate: data loading and typing (read `digest.json` only), presentation components (`Masthead`, `SectionNav`, `Section`, `Story`, `StoryDetails`, `SourceMetadata`, `FeedbackBlock`, `FreshnessNote`), and layout.
- Semantic HTML, keyboard-operable expansion controls (buttons with `aria-expanded`), comfortable mobile tap targets, legible dates and external links. Small hover and expansion transitions only.
- Meaningful empty and error states for each section.
- Static rendering. No database, no runtime API calls.

---

## 11. Acceptance Criteria

- The page renders entirely from `digest.json` and validates against the schema.
- All five scouting feeds plus In Progress are represented, using section titles and category values from the data (no hardcoded value lists).
- Masthead date and synchronization time come from the data, not the browser.
- Counts shown in navigation equal the visible items delivered.
- In Progress groups by disposition; "Due for review" items show their label in their original section.
- Pipeline status and disposition render as separate fields.
- Details expand inline; the title link and the Details control are separate.
- Feedback block is read-only with a copyable record reference and no Save control.
- Related-record links work for items sharing Atlas IDs (for example `funding:OPP-007` and `acorn:ACN-019`).
- Each section handles the three freshness states, including `not_logged`.
- No email addresses, no credentials, and no private data in a public deployment.
- Fully responsive (three columns, two, one) and clean, text-first, and editorial in default view.

## 12. Final Design Directive

**Build a scholarly intelligence publication, not a business dashboard.** Arts & Letters Daily guides the typography and composition. Mediagazer guides how stories, sources, and related developments are organized. Data complexity belongs behind the scenes, in the data bot.
