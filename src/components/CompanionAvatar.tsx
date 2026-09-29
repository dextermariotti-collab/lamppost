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
    activePose === "cheer" ? "animate-fox-hop" : activePose === "idle" ? "" : "animate-fox-bob";
  const wrapperMotion = activePose === "peek" ? "animate-peek-in" : "";

  const eyes = () => {
    if (c.expression === "calm")
      return (
        <>
          <path
            d="M35 47c2.6-3 7-3 9.6 0"
            stroke="#2c2440"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M55.4 47c2.6-3 7-3 9.6 0"
            stroke="#2c2440"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    if (c.expression === "wink")
      return (
        <>
          <path
            d="M35 48c2.6-3.4 7-3.4 9.6 0"
            stroke="#2c2440"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
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
    if (c.expression === "excited") return <path d="M44 60q6 8 12 0q-6 4-12 0z" fill="#2c2440" />;
    if (c.expression === "calm")
      return <path d="M45 60h10" stroke="#2c2440" strokeWidth="2.6" strokeLinecap="round" />;
    return (
      <path
        d="M44.5 59c2.4 3.6 8.6 3.6 11 0"
        stroke="#2c2440"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
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
    if (species === "bot")
      return <rect x="30" y="36" width="40" height="28" rx="12" fill={p.soft} />;
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
      case "headphones":
        return (
          <>
            <path
              d="M22 48C22 26 33 15 50 15s28 11 28 33"
              fill="none"
              stroke={p.accent}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <rect x="16" y="42" width="11" height="20" rx="5.5" fill={p.accent} />
            <rect x="73" y="42" width="11" height="20" rx="5.5" fill={p.accent} />
          </>
        );
      case "bow":
        return (
          <>
            <path d="M63 21 78 12v19z" fill={p.accent} />
            <path d="M63 21 48 12v19z" fill={p.accent} />
            <circle cx="63" cy="21" r="4.4" fill={p.soft} />
          </>
        );
      case "crown":
        return (
          <>
            <path d="M33 25 37 8l9 10 4-13 4 13 9-10 4 17z" fill="#f5b53d" />
            <rect x="33" y="22" width="34" height="5.5" rx="2.5" fill="#e09b1a" />
            <circle cx="50" cy="9" r="2.4" fill="#fff" />
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
        <g
          className={activePose === "idle" ? "" : "animate-fox-tail"}
          style={{ transformOrigin: "70px 74px" }}
        >
          <path
            d="M68 74c13 5 24-3 24-16 0-7-3-13-9-16 5 10 3 20-6 24-3 1.4-6 2-9 2z"
            fill={p.base}
          />
          <path d="M87 44c4 4 6 10 5 16-1 5-4 9-8 11 6-8 7-19 3-27z" fill={p.soft} />
        </g>

        {/* ears */}
        <g
          className={activePose === "idle" ? "" : "animate-fox-ear"}
          style={{ transformOrigin: "50px 36px" }}
        >
          <path d="M25 38 27 9c7 2 14 7 19 14z" fill={p.base} />
          <path d="M75 38 73 9c-7 2-14 7-19 14z" fill={p.base} />
          <path d="M31 33 32.6 18c4 1.8 7.4 4.6 10 8z" fill={p.soft} />
          <path d="M69 33 67.4 18c-4 1.8-7.4 4.6-10 8z" fill={p.soft} />
        </g>

        {/* head */}
        <ellipse cx="50" cy="52" rx="31" ry="28" fill={p.base} />
        {/* cheek fluff */}
        <path d="M20 47c-5 3-7 9-6 15 3-3 7-5 10-9z" fill={p.base} />
        <path d="M80 47c5 3 7 9 6 15-3-3-7-5-10-9z" fill={p.base} />

        {/* white face mask */}
        <path
          d="M50 33c12 0 21 8 21 18 0 12-9 21-21 21s-21-9-21-21c0-10 9-18 21-18z"
          fill={p.soft}
        />

        {/* nose + mouth */}
        <ellipse cx="50" cy="57" rx="3.6" ry="2.8" fill={dark} />
        {c.expression === "excited" ? (
          <path d="M44.5 61.5q5.5 7.5 11 0q-5.5 3.5-11 0z" fill={dark} />
        ) : (
          <path
            d="M45.5 61.5c2.2 3 6.8 3 9 0"
            stroke={dark}
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* eyes */}
        <g className={blink} style={{ transformOrigin: "50px 46px" }}>
          {c.expression === "calm" ? (
            <>
              <path
                d="M35 46c2.8-3.4 7-3.4 9.8 0"
                stroke={dark}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M55.2 46c2.8-3.4 7-3.4 9.8 0"
                stroke={dark}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : c.expression === "wink" ? (
            <>
              <path
                d="M35 46c2.8-3.4 7-3.4 9.8 0"
                stroke={dark}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="60.2" cy="45.5" r={eyeR} fill={dark} />
              <circle cx="61.9" cy="43.7" r="1.7" fill="#fff" />
            </>
          ) : (
            <>
              <circle cx="39.8" cy="45.5" r={eyeR} fill={dark} />
              <circle cx="41.5" cy="43.7" r="1.7" fill="#fff" />
              <circle cx="60.2" cy="45.5" r={eyeR} fill={dark} />
              <circle cx="61.9" cy="43.7" r="1.7" fill="#fff" />
            </>
          )}
        </g>

        {/* blush */}
        <ellipse cx="33" cy="53" rx="4.6" ry="3" fill={p.accent} opacity="0.4" />
        <ellipse cx="67" cy="53" rx="4.6" ry="3" fill={p.accent} opacity="0.4" />

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
