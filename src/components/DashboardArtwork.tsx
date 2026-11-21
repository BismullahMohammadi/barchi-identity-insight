import { useState } from "react";

// The Wikimedia files are composite photographs. Both faces reuse one download.
const cardPhoto =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Afghan_National_Identity_Card_Sample.jpg/500px-Afghan_National_Identity_Card_Sample.jpg";
const notePhoto =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/1000_Afghani_banknote_of_Afghanistan_back_and_front.jpg/330px-1000_Afghani_banknote_of_Afghanistan_back_and_front.jpg";

export function RotatingTazkira({ className = "w-16 sm:w-24" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span aria-hidden="true" className={`tazkira-display no-print ${className}`}>
      <span className="tazkira-card">
        {["front", "back"].map((face) => (
          <span key={face} className={`tazkira-face tazkira-${face}`}>
            <img
              src={cardPhoto}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
            />
          </span>
        ))}
      </span>
    </span>
  );
}

export function AfghaniNote({ className = "w-20 sm:w-28" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span aria-hidden="true" className={`afghani-note no-print ${className}`}>
      <img
        src={notePhoto}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
