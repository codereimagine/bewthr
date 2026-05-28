// Single full-stage flash element. CSS owns timing — no JS animation
// loop. The bewthr-lightning keyframe in atmosphere.css runs on an 8s
// cycle: primary flash at 1% (~80ms), smaller secondary at 5% (~400ms
// after primary), then ~7s of dark. Photosensitivity-safe: never
// approaches 3 Hz. Rendered only when isStorm AND animation mode
// === 'on' AND settings.lightning === 'on' — gating lives in
// Atmosphere.tsx's decide() so this component just renders.
export function LightningEffect() {
  return <div className="lightning" aria-hidden="true" />
}
