import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/** Lets the person pick a CSV file and returns its text, or null if they cancelled. */
export async function pickCsvText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (Platform.OS === 'web') return (await asset.file?.text()) ?? null;
  return new File(asset.uri).text();
}
