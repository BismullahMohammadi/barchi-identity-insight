import type { CSSProperties } from "react";

export function RotatingTazkira({ className = "w-20 sm:w-28" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`tazkira-display no-print ${className}`}>
      <span className="tazkira-card">
        <img className="tazkira-face" src="/artwork/tazkira-front.webp" alt="" decoding="async" />
        <img
          className="tazkira-face tazkira-back"
          src="/artwork/tazkira-back.webp"
          alt=""
          decoding="async"
        />
      </span>
    </span>
  );
}

// Visible outlines in the original 1280-by-655 photograph, from back to front.
type Point = [number, number];
const notes: [Point, Point, Point, Point][] = [
  [
    [9, 240],
    [115, 176],
    [344, 611],
    [287, 646],
  ],
  [
    [110, 166],
    [237, 99],
    [398, 581],
    [342, 611],
  ],
  [
    [231, 99],
    [365, 49],
    [462, 556],
    [398, 581],
  ],
  [
    [361, 54],
    [496, 29],
    [535, 540],
    [462, 557],
  ],
  [
    [492, 22],
    [637, 12],
    [613, 533],
    [535, 541],
  ],
  [
    [636, 9],
    [770, 21],
    [675, 536],
    [611, 534],
  ],
  [
    [768, 20],
    [917, 48],
    [741, 545],
    [674, 536],
  ],
  [
    [914, 41],
    [1060, 100],
    [806, 565],
    [740, 546],
  ],
  [
    [1053, 96],
    [1273, 212],
    [1000, 651],
    [802, 565],
  ],
];

export function AfghaniBanknotes({ className = "w-24 sm:w-32" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`note-fan no-print ${className}`}>
      {notes.map((outline, i) => {
        const [x, y] = outline[3];
        const [topX, topY] = outline[0];
        const tilt = (Math.atan2(topX - x, y - topY) * 180) / Math.PI;
        const style = {
          clipPath:
            "polygon(" + outline.map(([px, py]) => `${px / 12.8}% ${py / 6.55}%`).join(",") + ")",
          transformOrigin: `${x / 12.8}% ${y / 6.55}%`,
          "--turn": `${28 - tilt}deg`,
          "--dx": `${(520 - x) / 12.8}%`,
          "--dy": `${(550 - y) / 6.55}%`,
        } as CSSProperties;
        return <span key={i} className="note-layer" style={style} />;
      })}
    </span>
  );
}

const details: Record<string, [string, string]> = {
  control: ["back", "11% 43%"],
  services: ["front", "50% 4%"],
  "archive-scan": ["back", "65% 96%"],
  distribution: ["front", "90% 70%"],
};

export function TazkiraDetail({ slug }: { slug: string }) {
  const detail = details[slug];
  if (!detail) return null;
  return (
    <span
      aria-hidden="true"
      className="tazkira-detail no-print"
      style={{
        backgroundImage: `url(/artwork/tazkira-${detail[0]}.webp)`,
        backgroundPosition: detail[1],
      }}
    />
  );
}
