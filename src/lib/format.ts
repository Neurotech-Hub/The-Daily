import type { Item, Section } from './types.ts';

const TIME_ZONE = 'America/Chicago';

export function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function hostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

export function itemAnchor(itemId: string): string {
  return `item-${itemId.replace(/[^A-Za-z0-9_-]/g, '-')}`;
}

export function productHref(storeUrl: string | null | undefined, githubUrl: string | null | undefined): string | null {
  return httpUrl(storeUrl) ?? httpUrl(githubUrl);
}

export function parseTimestamp(value: string): Date | null {
  const normalized = value.replace(/T(\d{2}:\d{2})(?!:)(?=\d|Z|[+-]|$)/, 'T$1:00');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarParts(value: string): { year: string; month: string; day: string } | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return { year: dateOnly[1], month: dateOnly[2], day: dateOnly[3] };
  }
  const date = parseTimestamp(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatCalendar(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string | null {
  if (!value) return null;
  const parts = calendarParts(value);
  if (!parts) return null;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options }).format(anchor);
}

export function formatEditionDate(value: string | null | undefined): string | null {
  return formatCalendar(value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatItemDate(value: string | null | undefined): string | null {
  return formatCalendar(value, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatLongDate(value: string | null | undefined): string | null {
  return formatCalendar(value, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatSyncTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = parseTimestamp(value);
  if (!date) return null;
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${time} CT`;
}

export function synchronizationTime(sections: Section[], generatedAt: string): string | null {
  let latest: { time: number; raw: string } | null = null;
  for (const section of sections) {
    if (!section.last_refreshed) continue;
    const date = parseTimestamp(section.last_refreshed);
    if (!date) continue;
    if (!latest || date.getTime() > latest.time) {
      latest = { time: date.getTime(), raw: section.last_refreshed };
    }
  }
  return formatSyncTime(latest?.raw ?? generatedAt);
}

export function formatUsd(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function peopleLine(people: Item['people']): string | null {
  const names = people
    .filter((person) => person.name.trim())
    .map((person) => {
      const name = person.role_note ? `${person.name} (${person.role_note})` : person.name;
      return person.institution ? `${name}, ${person.institution}` : name;
    });
  return names.length ? names.join('; ') : null;
}

export function pipelineCountLine(counts: Record<string, number> | undefined): string | null {
  if (!counts) return null;
  const parts = Object.entries(counts)
    .filter(([, count]) => typeof count === 'number')
    .map(([status, count]) => `${status} ${count}`);
  return parts.length ? parts.join(' · ') : null;
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatScoreOriginal(value: Record<string, unknown> | null): string | null {
  if (!value) return null;
  const parts: string[] = [];
  const push = (label: string, raw: unknown) => {
    if (raw == null || raw === '') return;
    if (typeof raw === 'object') {
      const inner = Object.entries(raw as Record<string, unknown>)
        .filter(([, entry]) => entry != null && entry !== '')
        .map(([key, entry]) => `${humanize(key)} ${String(entry)}`);
      if (inner.length) parts.push(`${label}: ${inner.join(', ')}`);
      return;
    }
    parts.push(`${label} ${String(raw)}`);
  };
  push('Value', value.value);
  push('Scale', value.scale);
  push('Label', value.label);
  push('Sales', value.sales);
  push('Collaboration', value.collab);
  push('Normalized as', value.normalized_as);
  push('Sales components', value.sales_components);
  push('Collaboration components', value.collab_components);
  push('Components', value.components_1_5);
  return parts.length ? parts.join(' · ') : null;
}

export function deliveredItems(items: Item[]): Item[] {
  return items.filter((item) => item.disposition !== 'Decline' && item.disposition !== 'Closed');
}

export function groupBySubcategory(items: Item[]): { label: string | null; items: Item[] }[] {
  const groups: { label: string | null; items: Item[] }[] = [];
  const index = new Map<string, number>();
  for (const item of items) {
    const label = item.subcategory?.trim() || null;
    const key = label ?? '';
    const existing = index.get(key);
    if (existing == null) {
      index.set(key, groups.length);
      groups.push({ label, items: [item] });
    } else {
      groups[existing].items.push(item);
    }
  }
  return groups;
}

export function warningLine(warning: { code: string; note?: string }): string {
  return warning.note ? `${warning.code}: ${warning.note}` : warning.code;
}
