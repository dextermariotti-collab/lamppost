import { listAchievements } from "./achievements.functions";
import { dayKey } from "./days";

/**
 * The account's badges (what friends see) are awarded by the server, from the numbers it holds;
 * the device only asks it to look. It asks once after the first sync of each page load for an
 * account, and otherwise once the syncs have been quiet for this long, so a run of answers asks
 * once. A check that fails is dropped: the next one after a sync covers it.
 */
export const BADGE_CHECK_DELAY_MS = 30_000;

let account: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
/** Accounts already checked straight after their first sync this page load. */
const checkedOnLoad = new Set<string>();

function check() {
  void listAchievements({ data: { today: dayKey() } }).catch(() => undefined);
}

/** Stops a check that is waiting to run (this device's data was cleared, say). */
export function cancelBadgeCheck() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

/** Who is signed in, as the progress store sees it. Signing out or switching drops a waiting check. */
export function setBadgeAccount(userId: string | null) {
  if (userId === account) return;
  account = userId;
  cancelBadgeCheck();
}

/** Called by the progress store after the server accepted one of its syncs for `userId`. */
export function scheduleBadgeCheck(userId: string) {
  if (userId !== account) return;
  cancelBadgeCheck();
  if (!checkedOnLoad.has(userId)) {
    checkedOnLoad.add(userId);
    check();
    return;
  }
  timer = setTimeout(() => {
    timer = null;
    if (account === userId) check();
  }, BADGE_CHECK_DELAY_MS);
}
