import { del, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/**
 * zustand/persist 用の IndexedDB アダプタ。
 * サムネイル (data URL) を持つので localStorage の 5MB 制限では足りず、IndexedDB を使う。
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export const STORAGE_KEY = "storyline-store-v1";
