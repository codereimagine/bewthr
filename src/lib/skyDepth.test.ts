import { describe, it, expect } from 'vitest'
import { project, FACE, FOV, horizonFor } from './skyDepth'

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
