import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData } from '../types';
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

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    return sanitiseAppData(JSON.parse(raw));
  } catch {
    return createEmptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
