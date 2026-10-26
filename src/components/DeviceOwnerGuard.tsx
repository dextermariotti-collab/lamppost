import { useEffect } from "react";
import { useSessionUser } from "@/lib/companion-store";
import { clearDeviceData } from "@/lib/device-data";
import { claimDevice, mayShareDeviceWith } from "@/lib/device-owner";

/**
 * Keeps one account's progress out of another's. When someone signs in on a device whose data
 * belongs to a different account, that data is cleared (it is already on its own account) and the
 * app reloads with the new account's progress. A guest's progress is carried into the account.
 */
export function DeviceOwnerGuard() {
  const { userId } = useSessionUser();
  useEffect(() => {
    if (!userId) return;
    if (mayShareDeviceWith(userId)) {
      claimDevice(userId);
      return;
    }
    clearDeviceData();
    claimDevice(userId);
    window.location.replace("/");
  }, [userId]);
  return null;
}
