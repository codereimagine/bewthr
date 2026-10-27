import { describe, it, expect } from 'vitest'
import { reflowNwsText } from './nws'

// Verbatim from the NWS API (Wind Advisory, NWS Melbourne FL, 2026-10-27): the text is
// hard-wrapped at ~65 columns, so a newline lands mid-sentence.
const DESCRIPTION =
  '* WHAT...Northeast winds 15 to 25 mph with gusts of 35 to 40 mph\nexpected.\n\n' +
  '* WHERE...Inland Indian River, Inland Martin, Inland Northern\nBrevard, Inland Saint Lucie, Inland Southern Brevard, Inland\nVolusia, Okeechobee, Orange, Osceola, and Seminole Counties.\n'
const INSTRUCTION = 'Winds this strong can make driving difficult, especially for high\nprofile vehicles. Use extra caution.'

describe('reflowNwsText', () => {
  it('joins the hard wraps inside a sentence', () => {
    expect(reflowNwsText(INSTRUCTION)).toBe(
      'Winds this strong can make driving difficult, especially for high profile vehicles. Use extra caution.'
    )
  })

  it('keeps the paragraph breaks between the * WHAT / * WHERE sections', () => {
    expect(reflowNwsText(DESCRIPTION)).toBe(
      '* WHAT...Northeast winds 15 to 25 mph with gusts of 35 to 40 mph expected.\n\n' +
      '* WHERE...Inland Indian River, Inland Martin, Inland Northern Brevard, Inland Saint Lucie, Inland Southern Brevard, Inland Volusia, Okeechobee, Orange, Osceola, and Seminole Counties.'
    )
  })

  it('handles Windows line endings and stray spaces around the wraps', () => {
    expect(reflowNwsText('a line  \r\n  continues\r\n\r\nnext')).toBe('a line continues\n\nnext')
  })

  it('returns empty input unchanged', () => {
    expect(reflowNwsText('')).toBe('')
  })
})
