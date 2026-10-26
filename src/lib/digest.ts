import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';
import type { Digest, LoadedDigest } from './types.ts';

const root = process.cwd();
const livePath = path.join(root, 'data', 'digest.json');
const samplePath = path.join(root, 'docs', 'digest.sample.json');
const schemaPath = path.join(root, 'docs', 'digest.schema.json');
const archiveDir = path.join(root, 'data', 'archive');
const editionDate = /^\d{4}-\d{2}-\d{2}$/;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as object);

function validationError(file: string, errors: ErrorObject[] | null | undefined): Error {
  const lines = (errors ?? []).map((error) => {
    const where = error.instancePath || '/';
    return `- ${where} ${error.message ?? 'is invalid'}`;
  });
  return new Error(
    `Invalid digest (${file}). The build stopped and nothing was rendered.\n${lines.join('\n') || '- The file does not match docs/digest.schema.json.'}`,
  );
}

function readDigest(file: string): Digest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read digest file ${file}. The build stopped.\n${message}`);
  }
  if (!validate(parsed)) throw validationError(file, validate.errors);
  return parsed as Digest;
}

export function loadDigest(): LoadedDigest {
  if (fs.existsSync(livePath)) {
    return { digest: readDigest(livePath), source: 'live', file: livePath };
  }
  if (!fs.existsSync(samplePath)) {
    throw new Error(
      'No digest file found. Write data/digest.json, or keep docs/digest.sample.json available for local builds. The build stopped.',
    );
  }
  return { digest: readDigest(samplePath), source: 'sample', file: samplePath };
}

export function listArchiveDates(): string[] {
  if (!fs.existsSync(archiveDir)) return [];
  return fs
    .readdirSync(archiveDir)
    .filter((name) => editionDate.test(name.replace(/\.json$/, '')) && name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort()
    .reverse();
}

export function loadArchiveEdition(date: string): Digest {
  if (!editionDate.test(date)) {
    throw new Error(`Invalid archive edition date "${date}". Expected YYYY-MM-DD.`);
  }
  return readDigest(path.join(archiveDir, `${date}.json`));
}
