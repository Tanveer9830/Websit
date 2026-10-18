"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05060f",
          color: "#eef1ff",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 20px",
              borderRadius: 18,
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            }}
          />
          <h1 style={{ fontSize: 28, margin: "0 0 10px" }}>Top Cloud hit turbulence.</h1>
          <p style={{ color: "#a3add2", fontSize: 14, lineHeight: 1.7 }}>
            A critical error interrupted the page. Your applications and account data are safe.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 22px",
              borderRadius: 12,
              border: 0,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            }}
          >
            Reload the page
          </button>
        </div>
      </body>
    </html>
  );
}
