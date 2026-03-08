import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

async function nativeSet(key: string, value: string) {
  await SecureStoragePlugin.set({ key, value });
}

async function nativeGet(key: string) {
  const result = await SecureStoragePlugin.get({ key });
  return result.value ?? null;
}

async function nativeRemove(key: string) {
  await SecureStoragePlugin.remove({ key });
}

function shouldUseNativeSecureStorage() {
  return Capacitor.isNativePlatform();
}

export async function secureSet(key: string, value: string) {
  if (shouldUseNativeSecureStorage()) {
    try {
      await nativeSet(key, value);
      return;
    } catch (error) {
      console.warn('SecureStoragePlugin.set failed, falling back to Preferences.', error);
    }
  }
  await Preferences.set({ key, value });
}

export async function secureGet(key: string): Promise<string | null> {
  if (shouldUseNativeSecureStorage()) {
    try {
      return await nativeGet(key);
    } catch (error) {
      console.warn('SecureStoragePlugin.get failed, falling back to Preferences.', error);
    }
  }
  const result = await Preferences.get({ key });
  return result.value ?? null;
}

export async function secureRemove(key: string) {
  if (shouldUseNativeSecureStorage()) {
    try {
      await nativeRemove(key);
      return;
    } catch (error) {
      console.warn('SecureStoragePlugin.remove failed, falling back to Preferences.', error);
    }
  }
  await Preferences.remove({ key });
}
