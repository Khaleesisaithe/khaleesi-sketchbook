export function SketchMark({ className = "" }: { className?: string }) {
  return (
    <span className={`sketch-mark ${className}`} aria-hidden="true">
      <span>✳</span>
    </span>
  );
}
