// Provides a safe Storage implementation for embedded/sandboxed contexts
// where `window.localStorage` can throw (e.g. some Notion-style iframes).

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  } as Storage;
}

function canUseStorage(getStorage: () => Storage) {
  try {
    const storage = getStorage();
    const k = "__storage_test__";
    storage.setItem(k, "1");
    storage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function ensureEmbedSafeStorage() {
  if (typeof window === "undefined") return;

  // localStorage
  if (!canUseStorage(() => window.localStorage)) {
    const memory = createMemoryStorage();
    try {
      Object.defineProperty(window, "localStorage", {
        value: memory,
        configurable: true,
      });
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).localStorage = memory;
      } catch {
        // If we can't patch it, the runtime environment simply doesn't allow storage.
      }
    }
  }

  // sessionStorage (not used by auth right now, but helps other libs)
  if (!canUseStorage(() => window.sessionStorage)) {
    const memory = createMemoryStorage();
    try {
      Object.defineProperty(window, "sessionStorage", {
        value: memory,
        configurable: true,
      });
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).sessionStorage = memory;
      } catch {
        // noop
      }
    }
  }
}
