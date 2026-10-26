export interface Digest {
  schema_version: string;
  generated_at: string;
  timezone: string;
  edition_date: string;
  visibility: 'internal' | 'public';
  sample_note?: string;
  site?: {
    title?: string;
    tagline?: string;
    hub_url?: string;
  };
  feedback: {
    mode: 'read_only';
    instructions: string;
  };
  nav: NavEntry[];
  sections: Section[];
  in_progress: InProgressGroup[];
  build_warnings?: BuildWarning[];
}

export interface BuildWarning {
  code: string;
  note?: string;
  [key: string]: unknown;
}

export interface NavEntry {
  key: string;
  title: string;
  count: number;
}

export interface Section {
  key: string;
  title: string;
  source: string;
  cadence?: string | null;
  last_refreshed: string | null;
  last_run_status: 'ok' | 'partial' | 'error' | 'not_logged';
  last_run_note?: string | null;
  next_run?: string | null;
  rows_added_last_run?: number | null;
  new_items_count: number;
  no_new_items: boolean;
  visible_count: number;
  unavailable: boolean;
  unavailable_message: string | null;
  carried_over?: boolean;
  pipeline_counts?: Record<string, number>;
  items: Item[];
}

export interface Person {
  name: string;
  institution?: string | null;
  atlas_id?: string | null;
  role_note?: string | null;
}

export interface RelatedItem {
  item_id: string;
  title?: string;
  via?: string;
}

export interface ProductMatch {
  product_id: string;
  name: string;
  store_url?: string | null;
  github_url?: string | null;
}

export interface SourceRecord {
  sheet_url: string;
  tab: string;
  row: number;
  record_id: string;
}

export interface Item {
  source: string;
  item_id: string;
  visibility: 'internal' | 'public';
  title: string;
  summary: string | null;
  category: string | null;
  subcategory: string | null;
  date_published: string | null;
  date_discovered: string | null;
  date_updated: string | null;
  is_new: boolean;
  link: string | null;
  secondary_links: string[];
  confidence: string | null;
  score: number | null;
  score_original: Record<string, unknown> | null;
  disposition: string;
  matt_feedback: string | null;
  next_review_date: string | null;
  due_for_review?: boolean;
  atlas_ids: string[];
  related_items: RelatedItem[];
  product_matches: ProductMatch[];
  people: Person[];
  details: Record<string, unknown>;
  source_record: SourceRecord;
  feedback_instructions: string;
}

export interface InProgressGroup {
  disposition: string;
  count: number;
  items: Item[];
}

export type DigestSource = 'live' | 'sample';

export interface LoadedDigest {
  digest: Digest;
  source: DigestSource;
  file: string;
}
