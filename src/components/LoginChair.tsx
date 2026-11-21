export function LoginChair() {
  return (
    <div
      className="login-chair-scene relative mx-auto h-36 w-full overflow-hidden rounded-2xl bg-[#e2efea] sm:h-48 md:h-full md:min-h-80"
      tabIndex={0}
      role="img"
      aria-label="دفتري چرخکي څوکۍ، د موس په نږدې کېدو یو کس پرې کښېني"
    >
      <video
        aria-label="دفتري چرخکي څوکۍ"
        className="absolute inset-0 h-full w-full object-contain"
        src="/login-chair.mp4"
        poster="/login-chair.webp"
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
      />
      <span className="chair-visitor" aria-hidden="true">
        <span className="visitor-head" />
        <span className="visitor-body" />
        <span className="visitor-arm visitor-arm-left" />
        <span className="visitor-arm visitor-arm-right" />
        <span className="visitor-leg visitor-leg-left" />
        <span className="visitor-leg visitor-leg-right" />
      </span>
    </div>
  );
}
