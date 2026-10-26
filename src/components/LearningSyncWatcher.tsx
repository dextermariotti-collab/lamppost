import { useEffect } from "react";
import { useSessionUser } from "@/lib/companion-store";
import { LEARNING_EVENTS, requestLearningSync, scheduleLearningSync } from "@/lib/learning-sync";

/**
 * Signed in, keeps reviews and skills in step with the account: once when the account is known
 * (which also brings a new device the account's copy), after each change to them, and when the
 * device comes back online (a sync that failed offline would otherwise wait for the next change).
 */
export function LearningSyncWatcher() {
  const { userId } = useSessionUser();
  useEffect(() => {
    if (!userId) return;
    requestLearningSync(userId);
    const changed = () => scheduleLearningSync(userId);
    const online = () => requestLearningSync(userId);
    for (const event of LEARNING_EVENTS) window.addEventListener(event, changed);
    window.addEventListener("online", online);
    return () => {
      for (const event of LEARNING_EVENTS) window.removeEventListener(event, changed);
      window.removeEventListener("online", online);
    };
  }, [userId]);
  return null;
}
