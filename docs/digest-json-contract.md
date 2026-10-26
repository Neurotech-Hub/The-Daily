# Neurotech Hub Daily: `digest.json` contract (v1.0)

**Division of labor.** Hub - The Daily (the data side) reads every Google Sheet, normalizes the data, and commits a single `digest.json` to the repo each day. The UI only reads `digest.json`. It never calls Google APIs, never sees sheet credentials, and never writes back. In v1 the UI is **read-only**: there is no save or disposition control. Feedback goes through Hub - The Daily (chat).

- File: `data/digest.json`. The exact path is the UI developer's choice; the data side commits to whatever path is agreed.
- Optional: `data/archive/YYYY-MM-DD.json`, a frozen copy of each edition.
- Built daily at about 5:00 AM America/Chicago, after the bots run at 3:30 and Atlas at 3:50. It is rebuilt on demand after Matt gives feedback.
- Validated against `digest.schema.json` before every commit. Example: `digest.sample.json`, built from real sheet rows on 2026-10-26.

## Top level
| field | type | notes |
|---|---|---|
| schema_version | "1.0" | Bumped on any breaking change |
| generated_at | ISO datetime with offset, America/Chicago | e.g. `2026-10-26T05:04:00-05:00` |
| timezone | "America/Chicago" | |
| edition_date | YYYY-MM-DD | Chicago date of the edition |
| visibility | "internal" \| "public" | The whole file. Everything is `internal` for now |
| site | {title, tagline, hub_url} | |
| feedback | {mode:"read_only", instructions} | Text shown in the page footer and on each item |
| nav | [{key, title, count}] | `count` = number of items visible in the main digest, plus one `in_progress` entry |
| sections | [Section] | Fixed order: news, opportunity, funding, innovation, acorn. New sources are added as new keys |
| in_progress | [{disposition, count, items[]}] | Grouped as Pursue, Investigate, Monitor |
| build_warnings | [{code, ...}] | Diagnostics for the data side. The UI may ignore these or show them in a footer |

## Section
`key` (news | opportunity | funding | innovation | acorn), `title` (News, Research Leads, Funded Research, Innovation Opportunities, Product Leads), `source` (bot name), `cadence`,
`last_refreshed` (ISO datetime with Chicago offset, taken from the bot's latest Run Health row; null if it has none),
`last_run_status` (ok | partial | error | not_logged), `last_run_note`, `next_run` (free text), `rows_added_last_run`,
`new_items_count`, `no_new_items` (true when 0 new), `visible_count`,
`unavailable` (true if the source could not be read in this build) and `unavailable_message`,
`items` (sorted in display order; the UI does not re-sort).

UI states:
- `unavailable` → show the message. Items may then be carried over from the previous edition (`carried_over: true` on the section).
- `no_new_items` → show "No new items" and still list the older unreviewed items.
- `not_logged` → show freshness as unknown.

## Item (normalized card)
| field | notes |
|---|---|
| source | Section key |
| item_id | Namespaced `source:ID`, e.g. `funding:OPP-007`, `opportunity:OPP-047`. Bare IDs collide (both scouts use OPP-###) |
| visibility | "internal" for now. Fields that are internal-only inside a public item are wrapped `{visibility:"internal_only", ...}` |
| title, summary | Plain text. summary = News summary / Opportunity Need / Funding need / Innovation Why It Matters / ACORN Why |
| category, subcategory | News: category / null. Opportunity: "Research Lead" / Classification. Funding: "Funded Research" / segment (WashU, External). Innovation: "Innovation" / Category (Funding, Commercialization, Market Gap). ACORN: "Product Lead" / "ACORN" |
| date_published | When the article was published or the award noticed. Null for Innovation and ACORN. Date or datetime |
| date_discovered | When the bot found it. Null for Funding (no column for it) |
| date_updated | Bot's Last Updated / last_verified |
| is_new | date_discovered is the edition date. **Never** derived from date_published |
| link | Primary external URL |
| secondary_links[] | Extra URLs, e.g. DOI or the other Innovation Sources |
| confidence | Lower-cased: low, low-medium, medium-low, medium, medium-high, high, or null |
| score | 0-100 integer or null. Use it to sort within a section; do not compare it across sections |
| score_original | Raw values plus scale (see "Scores") |
| disposition | New \| Pursue \| Investigate \| Monitor. A blank Disposition becomes New. Decline/Closed are never in the file |
| matt_feedback | Text or null |
| next_review_date | From the Feedback Log, or null |
| atlas_ids[] | ATL-###### |
| related_items[] | {item_id, title, via: ATL ID}: other items that share an Atlas ID. **They are linked, not merged** |
| product_matches[] | {product_id, name, store_url, github_url}, using canonical names from the Products sheet |
| people[] | {name, institution, atlas_id, role_note?}. **No emails, ever** |
| details{} | Source-specific (see below). Render as a key/value disclosure |
| source_record | {sheet_url, tab, row, record_id}. Internal: the link to the sheet row |
| feedback_instructions | e.g. "tell Hub - The Daily, quote item_id" |

### details by source
- **news**: publisher, hub_relevance, evidence_type, doi, pmid, bot_status, review_notes
- **opportunity**: washu, preprint, doi, facts, inferences, product_matches_raw, recommended_action, needs_human_review, review_note, bot_state
- **funding**: award_id, agency, award_type, award_amount_usd, amount_basis ("fiscal-year award amount"), notice_date, project_end, `is_deadline: false`, need_basis, hub_match_raw, recommended_action, bot_review_status
- **innovation**: hub_asset, potential_value, effort, priority, recommended_action, bot_status (may contain deadline text such as "Open (closes Dec 4, 2026)")
- **acorn**: pipeline_status (Open/Contacted/Interested/Passed/Skipped), outreach_notes `{visibility:"internal_only", present}`, outreach {last_contact, channel, status, next_follow_up} from the Outreach Log

## Rules the data side enforces
1. **Visibility by disposition.** Blank or New goes in the section. Pursue, Investigate and Monitor go in `in_progress`. Decline and Closed are dropped. A Monitor item whose next_review_date is on or before the edition date moves back into its section.
2. **Funding awards are not deadlines.** notice_date and project_end are award dates. The UI must not show them as "due".
3. **Dedupe News** by doi, then canonical_url. Keep the earliest news_id.
4. **No invented scores.** Innovation's score is always null. ACORN score = round(raw 0-1 × 100).
5. **Scores.**
   - News: relevance_score, 0-100.
   - Opportunity and Funding: score = max(sales, collab), both raw values kept.
   - ACORN: raw 0-1 plus 1-5 components.
6. **Dates.**
   - Timestamps are converted to Chicago time with an offset.
   - Date-only values stay as YYYY-MM-DD.
   - MM/DD/YYYY and sheet serials are converted to ISO.
   - Unparseable values become null.
7. **Privacy.** No emails. ACORN Notes, outreach notes and Outreach Log Notes are excluded: only a `present` flag is kept. No credentials go in the file.
8. **Cross-source identity.** Atlas IDs come from the source's Atlas ID column, plus resolved Resolution Requests matched on (Requesting Bot, Source Item ID). Items stay separate and are linked through related_items.
9. **Public build later.** A filter keeps only items with `visibility:"public"` and strips internal fields. This is not active in v1, so the internal file must not be published on a public GitHub Pages site.

## UI developer checklist
Render only from the file. Handle null in every nullable field. Show per-section freshness from last_refreshed and last_run_status. Show "Published" and "Discovered" separately. No editing controls in v1.


## Optional fields (added for the UI spec; may be absent)
- Section `pipeline_counts` (object of status to count, acorn only).
- Item `due_for_review` (boolean, true when a Monitor item's Next Review Date has passed; the item is then delivered in its original section instead of `in_progress`).
- The UI treats absent optional fields as false/none.
