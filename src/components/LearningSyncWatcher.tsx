import { useEffect } from "react";
import { useSessionUser } from "@/lib/companion-store";
import { LEARNING_EVENTS, requestLearningSync, scheduleLearningSync } from "@/lib/learning-sync";

/**
 * Signed in, keeps reviews and skills in step with the account: once when the account is known
 * (which also brings a new device the account's copy), then after each change to them.
 */
export function LearningSyncWatcher() {
  const { userId } = useSessionUser();
  useEffect(() => {
    if (!userId) return;
    requestLearningSync(userId);
    const changed = () => scheduleLearningSync(userId);
    for (const event of LEARNING_EVENTS) window.addEventListener(event, changed);
    return () => {
      for (const event of LEARNING_EVENTS) window.removeEventListener(event, changed);
    };
  }, [userId]);
  return null;
}
