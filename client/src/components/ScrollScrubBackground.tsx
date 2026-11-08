import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const POSTER_URL = "/manus-storage/khaleesi-scroll-poster_0e2d640e.webp";
const SCRUB_VIDEO_URL = "/manus-storage/khaleesi-scroll-scrub_e1623447.mp4";
const POSTER_HOLD_SECONDS = 0.45;
const SEEK_THRESHOLD_SECONDS = 1 / 24;

type FitMode = "contain" | "cover";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawVideoToCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement, fit: FitMode) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return;

  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  // The blurred cover needs less resolution than the central, undistorted frame.
  const pixelRatio = fit === "cover"
    ? Math.min(window.devicePixelRatio || 1, 1)
    : Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  const scale = fit === "cover"
    ? Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight)
    : Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  context.drawImage(video, (bounds.width - drawWidth) / 2, (bounds.height - drawHeight) / 2, drawWidth, drawHeight);
}

/** Public-site artwork background. One paused video source drives both the full-screen fill and the intact frame. */
export function ScrollScrubBackground() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video || reduceMotion) return;

    let animationFrame = 0;

    const drawCurrentFrame = () => {
      const ambientCanvas = ambientCanvasRef.current;
      const frameCanvas = frameCanvasRef.current;
      if (!ambientCanvas || !frameCanvas) return;
      drawVideoToCanvas(video, ambientCanvas, "cover");
      drawVideoToCanvas(video, frameCanvas, "contain");
      if (root.dataset.scrubbing === "true") root.dataset.frameReady = "true";
    };

    const updateFrame = () => {
      animationFrame = 0;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const progress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
      const isMoving = progress > 0.0001;
      root.dataset.scrubbing = isMoving ? "true" : "false";

      if (!isMoving) {
        root.dataset.frameReady = "false";
        video.pause();
        return;
      }
      if (video.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(video.duration)) return;

      const movingDuration = Math.max(0, video.duration - POSTER_HOLD_SECONDS);
      const target = Math.min(
        POSTER_HOLD_SECONDS + progress * movingDuration,
        Math.max(0, video.duration - SEEK_THRESHOLD_SECONDS),
      );
      if (Math.abs(video.currentTime - target) >= SEEK_THRESHOLD_SECONDS) {
        video.currentTime = target;
      } else {
        drawCurrentFrame();
      }
      video.pause();
    };

    const queueFrameUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateFrame);
    };
    const handleSeeked = () => {
      if (root.dataset.scrubbing === "true") drawCurrentFrame();
    };
    const handleResize = () => {
      drawCurrentFrame();
      queueFrameUpdate();
    };
    const handlePlay = () => video.pause();

    video.pause();
    window.addEventListener("scroll", queueFrameUpdate, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    video.addEventListener("loadedmetadata", queueFrameUpdate);
    video.addEventListener("loadeddata", queueFrameUpdate);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("play", handlePlay);

    return () => {
      window.removeEventListener("scroll", queueFrameUpdate);
      window.removeEventListener("resize", handleResize);
      video.removeEventListener("loadedmetadata", queueFrameUpdate);
      video.removeEventListener("loadeddata", queueFrameUpdate);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("play", handlePlay);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      video.pause();
    };
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="scroll-scrub-background" data-scrubbing="false" data-frame-ready="false" aria-hidden="true">
      <div className="scroll-scrub-background__ambient">
        <img className="scroll-scrub-background__ambient-poster" src={POSTER_URL} alt="" draggable={false} />
        {!reduceMotion && <canvas ref={ambientCanvasRef} className="scroll-scrub-background__ambient-canvas" />}
      </div>
      <img className="scroll-scrub-background__poster" src={POSTER_URL} alt="" draggable={false} />
      {!reduceMotion && (
        <>
          <canvas ref={frameCanvasRef} className="scroll-scrub-background__frame-canvas" />
          <video
            ref={videoRef}
            className="scroll-scrub-background__source-video"
            src={SCRUB_VIDEO_URL}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            aria-hidden="true"
            disablePictureInPicture
          />
        </>
      )}
      <div className="scroll-scrub-background__veil" />
    </div>
  );
}
