import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore on iOS/Android; localStorage on web (SecureStore has no web implementation).
const isWeb = Platform.OS === 'web';

function webStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webStorage()?.getItem(key) ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
