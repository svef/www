import { describe, expect, it } from 'vitest'
import { isValidKennitala, validateKennitala } from './kennitala'

describe('validateKennitala', () => {
  it('accepts personal kennitölur, with and without hyphen', () => {
    expect(validateKennitala('3002801299')).toEqual({
      valid: true,
      kind: 'person',
      normalized: '3002801299',
    })
    expect(validateKennitala('300280-1299')).toEqual({
      valid: true,
      kind: 'person',
      normalized: '3002801299',
    })
    expect(isValidKennitala('3102921259')).toBe(true)
    expect(isValidKennitala('3104611210')).toBe(true) // 2000s century digit
    expect(isValidKennitala('3104611218')).toBe(true) // 1800s century digit
  })

  it('accepts company kennitölur (day + 40)', () => {
    expect(validateKennitala('7002021279')).toEqual({
      valid: true,
      kind: 'company',
      normalized: '7002021279',
    })
    expect(validateKennitala('710998-1249')).toMatchObject({
      valid: true,
      kind: 'company',
    })
    expect(isValidKennitala('7102031219')).toBe(true)
  })

  it('rejects a wrong check digit', () => {
    expect(validateKennitala('3002801289')).toEqual({ valid: false, reason: 'checksum' })
    expect(validateKennitala('7002021289')).toEqual({ valid: false, reason: 'checksum' })
  })

  it('rejects when the check number would be 10', () => {
    const base = '10101004' // 10 Oct; sum % 11 = 1
    const sum = [3, 2, 7, 6, 5, 4, 3, 2].reduce((a, w, i) => a + w * Number(base[i]), 0)
    expect(11 - (sum % 11)).toBe(10)
    for (let c = 0; c <= 9; c++) expect(isValidKennitala(`${base}${c}9`)).toBe(false)
  })

  it('rejects bad formats', () => {
    for (const bad of [
      '',
      '123',
      '30028012999',
      '300280-12990',
      'abcdefghij',
      '010180--1209',
      '0101801 209',
    ]) {
      expect(validateKennitala(bad)).toEqual({ valid: false, reason: 'format' })
    }
  })

  it('rejects impossible dates and unknown century digits', () => {
    expect(validateKennitala('3201801299')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('0013801299')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('0000801299')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('7201801299')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('3002801291')).toEqual({ valid: false, reason: 'century' })
  })

  it('trims surrounding whitespace', () => {
    expect(isValidKennitala(' 300280-1299 ')).toBe(true)
  })
})
