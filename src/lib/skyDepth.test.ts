import { describe, it, expect } from 'vitest'
import { project, FACE, FOV, horizonFor, DEPTH, parallax, clampOffset, easeTilt, TILT_TAU_MS, NEUTRAL_TAU_MS } from './skyDepth'

// Verbatim copy of the pre-refactor LiveSky project (Imagined parity reference).
function oldProject(az: number, alt: number, W: number, H: number, face = 180) {
  const d = ((az - face + 540) % 360) - 180
  return { x: W / 2 + (d / (360 / 2)) * (W / 2), y: H - (alt / 90) * H, vis: Math.abs(d) < 360 / 2 }
}

describe('project', () => {
  it('exports the moved constants', () => {
    expect(FACE).toBe(180)
    expect(FOV).toBe(360)
  })
  it('no horizon = today: alt 0 at the bottom, 90 at the top', () => {
    expect(project(180, 0, 400, 800).y).toBe(800)
    expect(project(180, 90, 400, 800).y).toBe(0)
  })
  it('horizon lifts alt 0 to horizonY, 90 stays at the top', () => {
    expect(project(180, 0, 400, 800, 180, 600).y).toBe(600)
    expect(project(180, 90, 400, 800, 180, 600).y).toBe(0)
    expect(project(180, 45, 400, 800, 180, 600).y).toBe(300)
  })
  it('x and vis are the same with or without a horizon', () => {
    expect(project(90, 20, 400, 800, 180, 600).x).toBe(project(90, 20, 400, 800).x)
    expect(project(90, 20, 400, 800, 180, 600).vis).toBe(project(90, 20, 400, 800).vis)
  })
  it('matches the old LiveSky project for a deterministic sweep (Imagined parity)', () => {
    for (let az = -20; az <= 380; az += 7) {
      for (let alt = -10; alt <= 90; alt += 5) {
        for (const face of [0, 180]) {
          expect(project(az, alt, 390, 844, face)).toEqual(oldProject(az, alt, 390, 844, face))
        }
      }
    }
  })
})

describe('horizonFor', () => {
  it('lifts above the scrubber', () => expect(horizonFor(700, 844, 1)).toBe(644))
  it('never above 45% of the screen (landscape / tiny screens)', () => expect(horizonFor(120, 390, 1)).toBeCloseTo(175.5))
  it('never below the screen', () => expect(horizonFor(2000, 844, 1)).toBe(844))
  it('scales by DPR', () => expect(horizonFor(700, 844, 3)).toBe(1932))
})

describe('depth layers', () => {
  it('depth runs far → near', () => {
    expect(DEPTH.stars).toBeLessThan(DEPTH.body)
    expect(DEPTH.body).toBeLessThan(DEPTH.clouds)
    expect(DEPTH.clouds).toBeLessThanOrEqual(DEPTH.precip)
  })
  it('nearer layers move more for the same tilt', () => {
    expect(Math.abs(parallax(DEPTH.clouds, 1, 0, 1).dx)).toBeGreaterThan(Math.abs(parallax(DEPTH.body, 1, 0, 1).dx))
  })
  it('zero tilt = zero offset', () => expect(parallax(DEPTH.clouds, 0, 0, 2)).toEqual({ dx: 0, dy: 0 }))
  it('the moon stays within a few % of its true spot at full tilt + drift (|ax| ≤ 1.9, 390px phone)', () => {
    expect(Math.abs(parallax(DEPTH.body, 1.9, 0, 1).dx)).toBeLessThanOrEqual(390 * 0.06)
  })
  it('clampOffset keeps the moon whole at the side edges', () => {
    expect(clampOffset(390, 40, 36, 400)).toBe(364)
    expect(clampOffset(10, -40, 36, 400)).toBe(36)
  })
})

describe('easeTilt', () => {
  it('exports the time constants', () => {
    expect(TILT_TAU_MS).toBe(160)
    expect(NEUTRAL_TAU_MS).toBe(4000)
  })
  it('is frame-rate independent', () => {
    let a = 0; for (let k = 0; k < 6; k++) a = easeTilt(a, 1, 1000 / 60, 160)     // 100ms at 60Hz
    let b = 0; for (let k = 0; k < 12; k++) b = easeTilt(b, 1, 1000 / 120, 160)   // 100ms at 120Hz
    expect(a).toBeCloseTo(b, 6)
  })
  it('never overshoots, never steps', () => {
    expect(easeTilt(0, 1, 16.7, 160)).toBeGreaterThan(0)
    expect(easeTilt(0, 1, 16.7, 160)).toBeLessThan(0.2)
    expect(easeTilt(0, 1, 1e6, 160)).toBeCloseTo(1)
  })
})
