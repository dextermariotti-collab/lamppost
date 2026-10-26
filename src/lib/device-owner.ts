/**
 * Which account this device's data belongs to. Signing out keeps the data (it is still that
 * person's, and comes back when they sign in again), so on a shared device the next person to sign
 * in could otherwise have someone else's lessons, reviews and answers merged into their account.
 * Every sync asks `mayShareDeviceWith` first; `DeviceOwnerGuard` claims the device for whoever
 * signs in, or clears it first when the data is someone else's.
 */

const KEY = "lamppost-device-owner-v1";

function deviceOwner(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function claimDevice(userId: string) {
  try {
    window.localStorage.setItem(KEY, userId);
  } catch {
    /* storage blocked: nothing is kept on the device to mix up either */
  }
}

/**
 * Whether the device's data may be merged with `userId`'s account: it is theirs, or nobody's yet
 * (what a guest did, carried into the account they sign in to).
 */
export function mayShareDeviceWith(userId: string): boolean {
  const owner = deviceOwner();
  return owner === null || owner === userId;
}
