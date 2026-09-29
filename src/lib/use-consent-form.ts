import { useEffect, useMemo, useState } from "react";
import { ageBandFor, decideAge, type AgeBand, type BirthInput } from "./age-gate";
import { claimFor, type ConsentClaim } from "./consent";

const EMPTY: BirthInput = { year: "", month: "", day: "" };

/**
 * Set when someone's date of birth puts them under the minimum age. It lives only in
 * memory, so it holds while they move around the app and is gone on reload: nothing
 * that came from what they typed is written to storage or sent anywhere.
 */
let blockedThisSession = false;

export function useConsentForm() {
  const [birth, setBirth] = useState<BirthInput>(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [blocked, setBlocked] = useState(blockedThisSession);
  const decision = useMemo(() => decideAge(birth), [birth]);

  useEffect(() => {
    if (decision.kind !== "blocked") return;
    blockedThisSession = true;
    setBlocked(true);
    setBirth(EMPTY);
    setAgreed(false);
    setGuardian(false);
  }, [decision.kind]);

  const band: AgeBand | null = blocked ? null : ageBandFor(decision);
  const ready = band !== null && agreed && (band !== "13-17" || guardian);
  const claim: ConsentClaim | null = ready && band ? claimFor(band, guardian) : null;

  return {
    birth,
    setBirth,
    agreed,
    setAgreed,
    guardian,
    setGuardian,
    decision,
    band,
    blocked,
    ready,
    claim,
  };
}

export type ConsentForm = ReturnType<typeof useConsentForm>;
