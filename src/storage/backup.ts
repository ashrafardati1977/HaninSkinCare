import type { AppData, Patient, Session, TreatmentType } from '../types';
import { createEmptyData, sanitiseAppData } from './schema';

export const BACKUP_FORMAT = 'hanin-skincare-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: AppData;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportSummary {
  mode: ImportMode;
  sessionsAdded: number;
  sessionsUpdated: number;
  patientsAdded: number;
  patientsUpdated: number;
  treatmentTypesAdded: number;
  settingsApplied: boolean;
}

export function buildBackup(data: AppData): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function serialiseBackup(data: AppData): string {
  return JSON.stringify(buildBackup(data), null, 2);
}

/** Timestamp for a file name, e.g. 2026-10-18-1432. */
export function backupFileStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

/**
 * Parses a backup file. Accepts the versioned envelope this app writes, and also
 * a bare AppData object, so a hand-made or older file still imports.
 */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('That file does not contain any data.');
  }

  const envelope = raw as Partial<BackupFile>;
  const candidate =
    envelope.format === BACKUP_FORMAT && 'data' in envelope ? envelope.data : raw;

  const data = sanitiseAppData(candidate);
  // Treatment types are always populated by sanitise, so they cannot be used as
  // evidence the file held anything. Only sessions and patients count.
  if (data.sessions.length === 0 && data.patients.length === 0) {
    throw new Error('That file does not contain any sessions or patients.');
  }
  return data;
}

/** Newest wins by updatedAt, falling back to createdAt for records without one. */
function recency(record: { updatedAt?: string; createdAt?: string }): number {
  const stamp = record.updatedAt ?? record.createdAt;
  const parsed = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface MergeResult<T> {
  items: T[];
  added: number;
  updated: number;
}

function mergeById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  pick: (a: T, b: T) => T,
): MergeResult<T> {
  const byId = new Map(current.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;

  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      added += 1;
      continue;
    }
    const winner = pick(existing, item);
    if (winner !== existing) updated += 1;
    byId.set(item.id, winner);
  }

  return { items: [...byId.values()], added, updated };
}

const newestWins = <T extends { id: string; updatedAt?: string; createdAt?: string }>(a: T, b: T) =>
  recency(b) > recency(a) ? b : a;

/**
 * Merges a backup into existing data. Records are matched by id, and the most
 * recently updated copy wins, so restoring an older backup cannot silently
 * overwrite newer edits.
 */
export function mergeAppData(current: AppData, incoming: AppData): { data: AppData; summary: ImportSummary } {
  const sessions = mergeById(current.sessions, incoming.sessions, newestWins);
  const patients = mergeById(current.patients, incoming.patients, newestWins);
  const treatmentTypes = mergeById<TreatmentType>(
    current.treatmentTypes,
    incoming.treatmentTypes,
    newestWins,
  );

  return {
    data: {
      sessions: sessions.items,
      patients: patients.items,
      treatmentTypes: treatmentTypes.items,
      // Clinic identity stays with the device doing the restore; the backup only
      // fills in settings the device has never set.
      settings: { ...incoming.settings, ...current.settings },
    },
    summary: {
      mode: 'merge',
      sessionsAdded: sessions.added,
      sessionsUpdated: sessions.updated,
      patientsAdded: patients.added,
      patientsUpdated: patients.updated,
      treatmentTypesAdded: treatmentTypes.added,
      settingsApplied: false,
    },
  };
}

export function replaceAppData(incoming: AppData): { data: AppData; summary: ImportSummary } {
  return {
    data: incoming,
    summary: {
      mode: 'replace',
      sessionsAdded: incoming.sessions.length,
      sessionsUpdated: 0,
      patientsAdded: incoming.patients.length,
      patientsUpdated: 0,
      treatmentTypesAdded: incoming.treatmentTypes.length,
      settingsApplied: true,
    },
  };
}

export function applyImport(
  current: AppData,
  incoming: AppData,
  mode: ImportMode,
): { data: AppData; summary: ImportSummary } {
  return mode === 'merge' ? mergeAppData(current, incoming) : replaceAppData(incoming);
}

export function describeImport(summary: ImportSummary): string {
  if (summary.mode === 'replace') {
    return `Replaced with ${summary.sessionsAdded} sessions and ${summary.patientsAdded} patients.`;
  }
  const parts = [
    `${summary.sessionsAdded} new sessions`,
    `${summary.patientsAdded} new patients`,
  ];
  const changed = summary.sessionsUpdated + summary.patientsUpdated;
  if (changed > 0) parts.push(`${changed} updated from a newer copy`);
  return `Merged: ${parts.join(', ')}.`;
}

/** Counts used by the Settings screen when reporting what is stored. */
export function countRecords(data: AppData): { sessions: number; patients: number } {
  return { sessions: data.sessions.length, patients: data.patients.length };
}

export function emptyData(): AppData {
  return createEmptyData();
}

export type { AppData, Patient, Session };
