"use client";

import { useRef, useEffect } from "react";

interface VideoLoopPreviewProps {
  videoUrl?: string | null;
  posterImage?: string | null;
  durationSeconds?: number;
  className?: string;
}

export function VideoLoopPreview({
  videoUrl,
  posterImage,
  durationSeconds = 5,
  className = "",
}: VideoLoopPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may be restricted by browser until user gesture
      });
    }

    const onTimeUpdate = () => {
      if (video.currentTime >= durationSeconds) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoUrl, durationSeconds]);

  if (!videoUrl) {
    return (
      <span
        className="pt-bg-cover"
        style={
          {
            backgroundImage: `url("${posterImage ?? ""}")`,
            position: "absolute",
            top: 0,
            right: 0,
          } as React.CSSProperties
        }
      />
    );
  }

  return (
    <>
      <span
        className="pt-bg-cover"
        style={
          {
            backgroundImage: `url("${posterImage ?? ""}")`,
            position: "absolute",
            top: 0,
            right: 0,
          } as React.CSSProperties
        }
      />
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterImage ?? undefined}
        muted
        playsInline
        autoPlay
        preload="metadata"
        className={`pt-video-loop-element ${className}`}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
      />
    </>
  );
}
