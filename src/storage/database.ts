/**
 * Web build of the database layer.
 *
 * Metro resolves `expo-sqlite`'s worker import statically, so importing the
 * package breaks the web bundle even behind a runtime guard. Metro picks
 * `database.native.ts` on Android and iOS and this file on web, which keeps
 * `expo-sqlite` out of the web module graph.
 *
 * Web stores data with AsyncStorage, so `persistence.ts` never calls these.
 */

import type { AppData } from '../types';
import type { DataDiff } from './diff';

const UNAVAILABLE = 'SQLite is not available on web; use AsyncStorage.';

export async function loadAll(): Promise<AppData> {
  throw new Error(UNAVAILABLE);
}

export async function applyDiff(_diff: DataDiff): Promise<void> {
  throw new Error(UNAVAILABLE);
}

export async function countRows(): Promise<{ sessions: number; patients: number }> {
  throw new Error(UNAVAILABLE);
}
