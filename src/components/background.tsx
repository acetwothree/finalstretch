/**
 * Static ambient layer — painted once, zero runtime cost. No animation and no
 * CSS blur filter (both were causing scroll/interaction jank on lower-end GPUs).
 */
export function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-obsidian"
      style={{
        backgroundImage:
          "radial-gradient(55rem 38rem at 12% -12%, rgba(139,92,246,0.15), transparent 62%), radial-gradient(48rem 40rem at 112% 114%, rgba(99,102,241,0.11), transparent 60%)",
        // isolate on its own compositor layer so scrolling content above it
        // (and the masked grid below) never triggers a full-viewport repaint
        transform: "translateZ(0)",
      }}
    >
      <div className="absolute inset-0 bg-grid opacity-50" />
    </div>
  );
}
