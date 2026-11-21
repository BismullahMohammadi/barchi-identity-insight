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

export function AfghaniBanknotes({ className = "w-24 sm:w-32" }: { className?: string }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      src="/artwork/afghani-banknotes.webp"
      width="400"
      height="205"
      decoding="async"
      className={`no-print pointer-events-none block h-auto rounded-md ${className}`}
    />
  );
}
