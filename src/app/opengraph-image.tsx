import { ImageResponse } from "next/og";

export const alt = "Certificate Exam Pro: AWS certification practice exams with detailed explanations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card rendered at build time with the brand mark and tagline.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #0b0a1a 0%, #1c1648 60%, #3b1a6b 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 64 64">
            <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4338CA" /><stop offset="1" stopColor="#A21CAF" /></linearGradient></defs>
            <path d="M32 3.5l24.7 14.25v28.5L32 60.5 7.3 46.25v-28.5z" fill="url(#h)" />
            <path d="M20 45l12-9.5L44 45" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 36l12-9.5L44 36" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 27l12-9.5L44 27" fill="none" stroke="#34D399" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 52, fontWeight: 800 }}>
            Certificate Exam
            <span style={{ fontSize: 26, padding: "6px 14px", borderRadius: 10, background: "linear-gradient(135deg, #4F46E5, #9333EA)" }}>PRO</span>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>Pass the AWS exam by understanding every answer.</div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#c9c6ee" }}>500 exam-style questions · detailed explanations · 10 free</div>
      </div>
    ),
    size,
  );
}
