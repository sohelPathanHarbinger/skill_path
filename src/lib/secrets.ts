// API keys, encrypted on this device. They are sealed with AES-GCM using a key that
// is created once per browser and stored in IndexedDB as non-extractable: the app
// can use it to encrypt and decrypt, but no script can read the key itself or copy
// it anywhere else. Decrypted API keys are only ever held in memory.
import { deleteSecret, getSecret, putSecret } from "./storage";

const DEVICE_KEY = "device-key";
const API_KEYS = "api-keys";

let deviceKeyPromise: Promise<CryptoKey> | null = null;

function deviceKey(): Promise<CryptoKey> {
  deviceKeyPromise ??= (async () => {
    const existing = await getSecret(DEVICE_KEY);
    if (existing instanceof CryptoKey) return existing;
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await putSecret(DEVICE_KEY, key);
    return key;
  })();
  return deviceKeyPromise;
}

function isKeyMap(value: unknown): value is Record<string, string> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Object.values(value as Record<string, unknown>).every((v) => typeof v === "string")
  );
}

/**
 * The saved API keys, by provider id. Throws when this browser can't keep them
 * securely (no IndexedDB, or no Web Crypto outside HTTPS/localhost).
 */
export async function loadApiKeys(): Promise<Record<string, string>> {
  const key = await deviceKey();
  const sealed = await getSecret(API_KEYS);
  if (!sealed || sealed instanceof CryptoKey) return {};
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.iv }, key, sealed.data);
    const keys: unknown = JSON.parse(new TextDecoder().decode(plain));
    return isKeyMap(keys) ? keys : {};
  } catch {
    // Sealed with a device key that no longer exists: the learner enters their keys again.
    return {};
  }
}

/** Encrypts and saves the API keys, replacing any saved before. An empty map deletes them. */
export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  if (Object.keys(keys).length === 0) return deleteSecret(API_KEYS);
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(keys)));
  await putSecret(API_KEYS, { iv, data });
}
