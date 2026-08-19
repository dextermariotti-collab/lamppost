import { normalizeCompanion, paletteById, presetById, type Companion } from "@/lib/companions";

export type CompanionPose = "idle" | "happy" | "cheer" | "peek";

/**
 * Code-drawn companion. Every visual choice is derived from the saved
 * Companion shape, so previews update instantly as options change.
 *
 * The fox has bespoke art (snout, cheek fluff, curled tail) plus its own idle
 * life: breathing bob, periodic blink, tail sway and an ear twitch. `pose`
 * chooses the behaviour so screens never hardcode animation classes.
 */
export function CompanionAvatar({
  companion,
  size = 96,
  className,
  animate = false,
  pose,
}: {
  companion: { [K in keyof Companion]?: string | null | undefined } | null | undefined;
  size?: number;
  className?: string;
  animate?: boolean;
  pose?: CompanionPose;
}) {
  const c = normalizeCompanion(companion);
  const preset = presetById(c.preset);
  const p = paletteById(c.palette);
  const species = preset.species;
  const activePose: CompanionPose = pose ?? (animate ? "happy" : "idle");

  const bodyMotion =
    activePose === "cheer"
      ? "animate-fox-hop"
      : activePose === "idle"
        ? ""
        : "animate-fox-bob";
  const wrapperMotion = activePose === "peek" ? "animate-peek-in" : "";

  const eyes = () => {
    if (c.expression === "calm")
      return (
        <>
          <path d="M35 47c2.6-3 7-3 9.6 0" stroke="#2c2440" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M55.4 47c2.6-3 7-3 9.6 0" stroke="#2c2440" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      );
    if (c.expression === "wink")
      return (
        <>
          <path d="M35 48c2.6-3.4 7-3.4 9.6 0" stroke="#2c2440" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="60" cy="47" r="4.4" fill="#2c2440" />
          <circle cx="61.6" cy="45.4" r="1.5" fill="#fff" />
        </>
      );
    const r = c.expression === "excited" ? 5.4 : 4.4;
    return (
      <>
        <circle cx="39.5" cy="47" r={r} fill="#2c2440" />
        <circle cx="41.2" cy="45.2" r="1.6" fill="#fff" />
        <circle cx="60.5" cy="47" r={r} fill="#2c2440" />
        <circle cx="62.2" cy="45.2" r="1.6" fill="#fff" />
      </>
    );
  };

  const mouth = () => {
    if (c.expression === "excited")
      return <path d="M44 60q6 8 12 0q-6 4-12 0z" fill="#2c2440" />;
    if (c.expression === "calm")
      return <path d="M45 60h10" stroke="#2c2440" strokeWidth="2.6" strokeLinecap="round" />;
    return (
      <path d="M44.5 59c2.4 3.6 8.6 3.6 11 0" stroke="#2c2440" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    );
  };

  const ears = () => {
    switch (species) {
      case "cat":
        return (
          <>
            <path d="M26 28 30 12l14 9z" fill={p.base} />
            <path d="M74 28 70 12 56 21z" fill={p.base} />
            <path d="M31 25 33 18l6 4z" fill={p.soft} />
            <path d="M69 25 67 18l-6 4z" fill={p.soft} />
          </>
        );
      case "bear":
        return (
          <>
            <circle cx="27" cy="24" r="11" fill={p.base} />
            <circle cx="73" cy="24" r="11" fill={p.base} />
            <circle cx="27" cy="24" r="5.5" fill={p.soft} />
            <circle cx="73" cy="24" r="5.5" fill={p.soft} />
          </>
        );
      case "bunny":
        return (
          <>
            <ellipse cx="38" cy="16" rx="7" ry="17" fill={p.base} />
            <ellipse cx="62" cy="16" rx="7" ry="17" fill={p.base} />
            <ellipse cx="38" cy="17" rx="3.2" ry="11" fill={p.soft} />
            <ellipse cx="62" cy="17" rx="3.2" ry="11" fill={p.soft} />
          </>
        );
      case "owl":
        return (
          <>
            <path d="M28 26 34 12l10 10z" fill={p.base} />
            <path d="M72 26 66 12 56 22z" fill={p.base} />
          </>
        );
      case "bot":
        return (
          <>
            <rect x="48.4" y="10" width="3.2" height="14" rx="1.6" fill={p.base} />
            <circle cx="50" cy="9" r="5" fill={p.accent} />
            <rect x="18" y="42" width="7" height="16" rx="3.5" fill={p.base} />
            <rect x="75" y="42" width="7" height="16" rx="3.5" fill={p.base} />
          </>
        );
      default:
        return null;
    }
  };

  const face = () => {
    if (species === "owl")
      return (
        <>
          <ellipse cx="39.5" cy="47" rx="12" ry="12" fill={p.soft} />
          <ellipse cx="60.5" cy="47" rx="12" ry="12" fill={p.soft} />
          <path d="M50 55 44.5 62h11z" fill={p.accent} />
        </>
      );
    if (species === "bot") return <rect x="30" y="36" width="40" height="28" rx="12" fill={p.soft} />;
    return <ellipse cx="50" cy="58" rx="16" ry="12" fill={p.soft} />;
  };

  const accessory = () => {
    switch (c.accessory) {
      case "hat":
        return (
          <>
            <rect x="30" y="24" width="40" height="5" rx="2.5" fill={p.accent} />
            <path d="M37 24c0-8 4-13 13-13s13 5 13 13z" fill={p.accent} />
            <circle cx="50" cy="9" r="3.4" fill={p.soft} />
          </>
        );
      case "glasses":
        return (
          <>
            <circle cx="39.5" cy="47" r="9" fill="none" stroke={p.accent} strokeWidth="3" />
            <circle cx="60.5" cy="47" r="9" fill="none" stroke={p.accent} strokeWidth="3" />
            <path d="M48.5 47h3" stroke={p.accent} strokeWidth="3" strokeLinecap="round" />
          </>
        );
      case "scarf":
        return (
          <>
            <rect x="30" y="74" width="40" height="10" rx="5" fill={p.accent} />
            <rect x="58" y="76" width="9" height="17" rx="4.5" fill={p.accent} />
          </>
        );
      default:
        return null;
    }
  };

  /** Bespoke fox: rounder head, snout, cheek fluff, highlighted eyes, curled tail. */
  const fox = () => {
    const dark = "#2c2440";
    const blink = activePose === "idle" ? "" : "animate-fox-blink";
    const wide = c.expression === "excited";
    const eyeR = wide ? 5 : 4.3;

    return (
      <>
        {/* tail, behind the body */}
        <g className={activePose === "idle" ? "" : "animate-fox-tail"} style={{ transformOrigin: "74px 74px" }}>
          <path
            d="M74 76c14 2 20-8 18-18-1.6 8-8 11-13 9 6-5 7-13 3-18 1 9-5 14-11 15z"
            fill={p.base}
          />
          <path d="M88 60c3 4 4 10 1 14-2 2-5 3-8 3 5-4 7-11 7-17z" fill={p.soft} />
        </g>

        {/* ears */}
        <g className={activePose === "idle" ? "" : "animate-fox-ear"} style={{ transformOrigin: "50px 34px" }}>
          <path d="M23 32 29 7c6 2 12 6 17 12z" fill={p.base} />
          <path d="M77 32 71 7c-6 2-12 6-17 12z" fill={p.base} />
          <path d="M30 27 32.6 15c3.4 1.6 6.4 4 8.6 6.8z" fill={p.soft} />
          <path d="M70 27 67.4 15c-3.4 1.6-6.4 4-8.6 6.8z" fill={p.soft} />
        </g>

        {/* head + cheek fluff */}
        <path
          d="M50 20c18 0 32 12 32 27 0 17-14 28-32 28S18 64 18 47c0-15 14-27 32-27z"
          fill={p.base}
        />
        <path d="M18 50c-4 4-5 9-4 13 3-2 6-4 8-8z" fill={p.base} />
        <path d="M82 50c4 4 5 9 4 13-3-2-6-4-8-8z" fill={p.base} />

        {/* muzzle */}
        <path d="M50 44c11 0 18 6 18 13s-8 12-18 12-18-5-18-12 7-13 18-13z" fill={p.soft} />
        <ellipse cx="50" cy="55.5" rx="3.6" ry="2.8" fill={dark} />
        <path d="M46.5 62c2 2.6 5 2.6 7 0" stroke={dark} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {c.expression === "excited" && <path d="M46 62q4 6 8 0q-4 3-8 0z" fill={dark} />}

        {/* brow patch */}
        <path d="M36 30c9-4 19-4 28 0-9-1-19-1-28 0z" fill={p.soft} opacity="0.7" />

        {/* eyes */}
        <g className={blink} style={{ transformOrigin: "50px 44px" }}>
          {c.expression === "calm" ? (
            <>
              <path d="M33 44c3-3.4 7.6-3.4 10.6 0" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M56.4 44c3-3.4 7.6-3.4 10.6 0" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : c.expression === "wink" ? (
            <>
              <path d="M33 44c3-3.4 7.6-3.4 10.6 0" stroke={dark} strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="61.5" cy="43" r={eyeR} fill={dark} />
              <circle cx="63.2" cy="41.2" r="1.6" fill="#fff" />
            </>
          ) : (
            <>
              <circle cx="38.5" cy="43" r={eyeR} fill={dark} />
              <circle cx="40.2" cy="41.2" r="1.7" fill="#fff" />
              <circle cx="61.5" cy="43" r={eyeR} fill={dark} />
              <circle cx="63.2" cy="41.2" r="1.7" fill="#fff" />
            </>
          )}
        </g>

        {/* blush */}
        <ellipse cx="29" cy="52" rx="5" ry="3.4" fill={p.accent} opacity="0.35" />
        <ellipse cx="71" cy="52" rx="5" ry="3.4" fill={p.accent} opacity="0.35" />
        {accessory()}
      </>
    );
  };

  return (
    <span className={`inline-block ${wrapperMotion} ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${preset.name}, your learning companion`}
        className={bodyMotion}
        style={{ overflow: "visible" }}
      >
        {species === "fox" ? (
          fox()
        ) : (
          <>
            {ears()}
            <ellipse cx="50" cy="52" rx="32" ry="31" fill={p.base} />
            {face()}
            {eyes()}
            {species !== "owl" && mouth()}
            {species !== "owl" && species !== "bot" && (
              <ellipse cx="50" cy="54.5" rx="3.4" ry="2.6" fill="#2c2440" />
            )}
            <ellipse cx="32" cy="60" rx="5" ry="3.6" fill={p.accent} opacity="0.3" />
            <ellipse cx="68" cy="60" rx="5" ry="3.6" fill={p.accent} opacity="0.3" />
            {accessory()}
          </>
        )}
      </svg>
    </span>
  );
}
