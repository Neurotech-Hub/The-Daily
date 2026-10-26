import { listArchiveDates, loadArchiveEdition, loadDigest } from '../src/lib/digest.ts';

const loaded = loadDigest();
console.log(`Validated ${loaded.file} (${loaded.source}).`);
for (const date of listArchiveDates()) {
  loadArchiveEdition(date);
  console.log(`Validated data/archive/${date}.json.`);
}
