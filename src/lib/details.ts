import { formatItemDate, formatUsd } from './format.ts';

export interface DetailRow {
  label: string;
  text: string;
  tone?: 'evidence' | 'inference';
}

const LABELS: Record<string, string> = {
  washu: 'WashU',
  doi: 'DOI',
  pmid: 'PMID',
  project_end: 'Project end',
  notice_date: 'Notice date',
  facts: 'Documented evidence',
  inferences: 'Inferred potential',
  pipeline_status: 'Pipeline status',
  hub_relevance: 'Hub relevance',
  hub_asset: 'Hub asset',
  potential_value: 'Potential value',
  award_amount_usd: 'Award amount',
  amount_basis: 'Amount basis',
  recommended_action: 'Recommended action',
  needs_human_review: 'Needs human review',
  last_contact: 'Last contact',
  next_follow_up: 'Next follow-up',
  bot_status: 'Bot status',
  bot_state: 'Bot state',
  bot_review_status: 'Bot review status',
  review_notes: 'Review notes',
  review_note: 'Review note',
  product_matches_raw: 'Product matches (raw)',
  hub_match_raw: 'Hub match (raw)',
  award_id: 'Award ID',
  award_type: 'Award type',
  evidence_type: 'Evidence type',
  outreach_notes: 'Outreach notes',
};

export const PROMOTED_DETAIL_KEYS = new Set([
  'publisher',
  'agency',
  'award_amount_usd',
  'notice_date',
  'hub_asset',
  'potential_value',
  'effort',
  'hub_relevance',
  'pipeline_status',
  'outreach',
]);

function humanize(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEmailKey(key: string): boolean {
  return key.toLowerCase().includes('email');
}

function isPresentFlag(value: unknown): value is { present: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.present === 'boolean' && 'visibility' in record;
}

function scalarText(key: string, value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return null;
    if (key === 'notice_date' || key === 'project_end' || key === 'last_contact' || key === 'next_follow_up' || key.endsWith('_date')) {
      return formatItemDate(trimmed) ?? trimmed;
    }
    return trimmed;
  }
  if (typeof value === 'number') {
    if (key === 'award_amount_usd' || key.endsWith('_usd')) return formatUsd(value);
    return String(value);
  }
  if (typeof value === 'boolean') {
    if (key === 'is_deadline') return null;
    return value ? 'Yes' : 'No';
  }
  return null;
}

function appendRow(
  rows: DetailRow[],
  key: string,
  label: string,
  value: unknown,
  tone?: 'evidence' | 'inference',
): void {
  if (value == null) return;
  if (isEmailKey(key)) return;
  if (key === 'is_deadline' && (value === false || value === 'false' || value === 'FALSE')) return;
  if (isPresentFlag(value)) {
    rows.push({ label, text: value.present ? 'On file' : 'None', tone });
    return;
  }
  if (Array.isArray(value)) {
    const texts = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
    if (texts.length) rows.push({ label, text: texts.join(', '), tone });
    return;
  }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      if (isEmailKey(childKey) || childKey === 'visibility') continue;
      appendRow(rows, childKey, `${label} · ${humanize(childKey)}`, childValue, tone);
    }
    return;
  }
  const text = scalarText(key, value);
  if (text) rows.push({ label, text, tone });
}

export function detailRows(details: Record<string, unknown>, skip: Set<string>): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (skip.has(key) || isEmailKey(key)) continue;
    const tone = key === 'facts' ? 'evidence' : key === 'inferences' ? 'inference' : undefined;
    appendRow(rows, key, humanize(key), value, tone);
  }
  return rows;
}

export function stringDetail(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function outreachLines(details: Record<string, unknown>): { label: string; value: string }[] {
  const outreach = details.outreach;
  if (!outreach || typeof outreach !== 'object' || Array.isArray(outreach)) return [];
  const record = outreach as Record<string, unknown>;
  const fields: { key: string; label: string }[] = [
    { key: 'last_contact', label: 'Last contact' },
    { key: 'channel', label: 'Channel' },
    { key: 'status', label: 'Outreach status' },
    { key: 'next_follow_up', label: 'Next follow-up' },
  ];
  const lines: { label: string; value: string }[] = [];
  for (const field of fields) {
    const raw = record[field.key];
    if (raw == null || raw === '') continue;
    const asString = String(raw);
    const value =
      field.key === 'last_contact' || field.key === 'next_follow_up'
        ? (formatItemDate(asString) ?? asString)
        : asString;
    lines.push({ label: field.label, value });
  }
  return lines;
}
