import { fetch as expoFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { API_URL, getAuthToken } from '@/api/client';
import { ApiError, NETWORK_MESSAGE } from '@/api/errors';

/**
 * Downloads an authenticated API file and hands it to the system share sheet (save to Files, send to an app).
 * On the web the browser downloads it instead.
 */
export async function downloadAndShare(path: string, filename: string, mimeType: string): Promise<void> {
  const headers = { Authorization: `Bearer ${getAuthToken() ?? ''}` };

  if (Platform.OS === 'web') {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { headers });
    } catch {
      throw new ApiError(0, NETWORK_MESSAGE);
    }
    if (!res.ok) throw await failure(res);
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }
  if (!res.ok) throw await failure(res);

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  await file.write(await res.bytes());

  if (!(await Sharing.isAvailableAsync())) throw new ApiError(0, 'Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

async function failure(res: { status: number; json(): Promise<unknown> }): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return new ApiError(res.status, body?.error ?? 'Something went wrong. Try again.');
}
