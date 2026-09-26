export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="cep-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4338CA" />
          <stop offset="1" stopColor="#A21CAF" />
        </linearGradient>
      </defs>
      <path d="M32 3.5l24.7 14.25v28.5L32 60.5 7.3 46.25v-28.5z" fill="url(#cep-hex)" />
      <path d="M20 45l12-9.5L44 45" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 36l12-9.5L44 36" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 27l12-9.5L44 27" fill="none" stroke="#34D399" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-[1.05rem] font-extrabold tracking-tight text-ink">Certificate Exam</span>
      <span className="rounded-md bg-gradient-to-br from-[#4F46E5] to-[#9333EA] px-1.5 py-0.5 text-[0.65rem] font-extrabold tracking-[0.08em] text-white">PRO</span>
    </span>
  );
}
