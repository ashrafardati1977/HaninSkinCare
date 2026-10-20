import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { AppData } from '../types';
import { applyDiff, loadAll } from './database';
import { diffData, isEmptyDiff } from './diff';
import { createEmptyData, sanitiseAppData, STORAGE_KEY } from './schema';

export {
  buildDefaultTreatmentTypes,
  createEmptyData,
  DEFAULT_SETTINGS,
  isValidPatient,
  isValidSession,
  isValidTreatmentType,
  sanitiseAppData,
  STORAGE_KEY,
} from './schema';

/**
 * The last data written to storage. Diffing against it means an edit only writes
 * the rows that actually changed instead of the whole dataset.
 *
 * A module-level value is enough because `DataProvider` is the only writer and it
 * serialises its saves.
 */
let lastPersisted: AppData | null = null;

/** Web keeps the AsyncStorage path: expo-sqlite needs a WASM/worker setup there. */
const useSqlite = Platform.OS !== 'web';

export async function loadData(): Promise<AppData> {
  if (!useSqlite) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      lastPersisted = raw ? sanitiseAppData(JSON.parse(raw)) : createEmptyData();
    } catch {
      lastPersisted = createEmptyData();
    }
    return lastPersisted;
  }

  try {
    const data = await loadAll();
    lastPersisted = data;
    return data;
  } catch {
    // A corrupt or unreadable database must not stop the app from opening.
    lastPersisted = null;
    return createEmptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  if (!useSqlite) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    lastPersisted = data;
    return;
  }

  if (!lastPersisted) {
    // Nothing loaded yet, so there is no baseline to diff against.
    await applyDiff(diffData(createEmptyData(), data));
    lastPersisted = data;
    return;
  }

  const diff = diffData(lastPersisted, data);
  if (isEmptyDiff(diff)) return;

  await applyDiff(diff);
  lastPersisted = data;
}

export async function clearData(): Promise<void> {
  lastPersisted = null;
  if (!useSqlite) {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
