import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import type { AppData } from '../types';
import { backupFileStamp, parseBackup, serialiseBackup } from './backup';

export interface ExportResult {
  /** File name written, for reporting back to the user. */
  fileName: string;
  shared: boolean;
}

function backupFileName(): string {
  return `hanin-skincare-backup-${backupFileStamp()}.json`;
}

/**
 * Writes a backup into the app cache and hands it to the system share sheet, so
 * the user can save it to Drive, email it, or send it to another device.
 */
export async function exportBackup(data: AppData): Promise<ExportResult> {
  const fileName = backupFileName();
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(serialiseBackup(data));

  if (Platform.OS === 'web') {
    return { fileName, shared: false };
  }

  if (!(await Sharing.isAvailableAsync())) {
    return { fileName, shared: false };
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Hanin Skincare backup',
    UTI: 'public.json',
  });
  return { fileName, shared: true };
}

export interface PickedBackup {
  data: AppData;
  fileName: string;
}

/**
 * Opens the system file picker and reads the chosen backup. Returns null when the
 * user cancels.
 */
export async function pickBackupFile(): Promise<PickedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const file = new File(asset.uri);
  if (!file.exists) {
    throw new Error('That file could not be opened.');
  }

  const text = await file.text();
  return { data: parseBackup(text), fileName: asset.name ?? 'backup.json' };
}
