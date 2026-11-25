"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Volume2 } from "lucide-react";

interface ArticleVideoPlayerProps {
  src: string;
  poster?: string;
  loopDuration?: number;
}

export function ArticleVideoPlayer({
  src,
  poster,
  loopDuration = 5,
}: ArticleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlayingFull, setIsPlayingFull] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isPlayingFull) return;

    video.muted = true;
    video.defaultMuted = true;
    const p = video.play();
    if (p !== undefined) {
      p.catch(() => {});
    }

    const onTimeUpdate = () => {
      if (!isPlayingFull && video.currentTime >= loopDuration) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [isPlayingFull, loopDuration]);

  const handleStartFull = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlayingFull(true);
    video.currentTime = 0;
    video.muted = false;
    video.controls = true;
    video.play().catch(() => {});
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#000",
        margin: "24px 0",
        overflow: "hidden",
        borderRadius: "8px",
      }}
      className="group"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={isPlayingFull}
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        onClick={!isPlayingFull ? handleStartFull : undefined}
      />
      {!isPlayingFull && (
        <button
          type="button"
          onClick={handleStartFull}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.25)",
            border: "none",
            cursor: "pointer",
            zIndex: 2,
            color: "#fff",
          }}
          aria-label="پخش کامل ویدیو با صدا"
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              transition: "transform 0.2s",
            }}
          >
            <Play style={{ width: "28px", height: "28px", fill: "#fff", color: "#fff", marginLeft: "3px" }} />
          </div>
          <span
            style={{
              marginTop: "12px",
              padding: "4px 12px",
              background: "rgba(0, 0, 0, 0.75)",
              borderRadius: "16px",
              fontSize: "12px",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Volume2 style={{ width: "14px", height: "14px" }} />
            برای پخش با صدا کلیک کنید
          </span>
        </button>
      )}
    </div>
  );
}
