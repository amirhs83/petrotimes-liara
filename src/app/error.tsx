"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px 20px",
        background: "#ffffff",
        fontFamily: "var(--font-iransans), Tahoma, Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#161616", margin: "0 0 10px" }}>
        خطایی رخ داد
      </h1>
      <p style={{ fontSize: 15, color: "#7a7a7a", margin: "0 0 28px" }}>
        در بارگذاری این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            background: "#000",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 26px",
            borderRadius: 2,
            border: "none",
            cursor: "pointer",
          }}
        >
          تلاش مجدد
        </button>
        <a
          href="/"
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            color: "#161616",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 26px",
            borderRadius: 2,
            textDecoration: "none",
          }}
        >
          صفحه اصلی
        </a>
      </div>
    </main>
  );
}
