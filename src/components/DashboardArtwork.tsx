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

// Adjacent wedges share their edges and hinge below the fan. Folding only rotates them.
const topEdges = [-1100, 198, 320, 460, 590, 707, 843, 970, 1100, 2450];
const hinge = { x: 50, y: 210 };
const foldAngles = [27, 19, 13, 8, 2, -3, -9, -15, -24];

export function AfghaniBanknotes({ className = "w-24 sm:w-32" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`note-fan no-print ${className}`}
      style={{ transformOrigin: `${hinge.x}% ${hinge.y}%` }}
    >
      {foldAngles.map((angle, index) => (
        <span
          key={angle}
          className="note-layer"
          style={
            {
              clipPath: `polygon(${topEdges[index]! / 12.8}% 0, ${topEdges[index + 1]! / 12.8}% 0, ${hinge.x}% ${hinge.y}%)`,
              "--fold-angle": `${angle}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
