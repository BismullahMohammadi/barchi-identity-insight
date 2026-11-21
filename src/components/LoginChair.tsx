export function LoginChair() {
  return (
    <div className="relative mx-auto h-36 w-full overflow-hidden rounded-2xl bg-[#e2efea] sm:h-48 md:h-full md:min-h-80">
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
    </div>
  );
}
