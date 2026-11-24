import { describe, expect, it } from 'vitest'
import { isValidKennitala, validateKennitala } from './kennitala'

describe('validateKennitala', () => {
  it('accepts personal kennitölur, with and without hyphen', () => {
    expect(validateKennitala('0101801209')).toEqual({
      valid: true,
      kind: 'person',
      normalized: '0101801209',
    })
    expect(validateKennitala('010180-1209')).toEqual({
      valid: true,
      kind: 'person',
      normalized: '0101801209',
    })
    expect(isValidKennitala('1203921239')).toBe(true)
    expect(isValidKennitala('1505611240')).toBe(true) // 2000s century digit
    expect(isValidKennitala('1505611248')).toBe(true) // 1800s century digit
  })

  it('accepts company kennitölur (day + 40)', () => {
    expect(validateKennitala('4110021289')).toEqual({
      valid: true,
      kind: 'company',
      normalized: '4110021289',
    })
    expect(validateKennitala('650698-1269')).toMatchObject({
      valid: true,
      kind: 'company',
    })
    expect(isValidKennitala('4710031239')).toBe(true)
  })

  it('rejects a wrong check digit', () => {
    expect(validateKennitala('0101801219')).toEqual({ valid: false, reason: 'checksum' })
    expect(validateKennitala('4110021299')).toEqual({ valid: false, reason: 'checksum' })
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
      '01018012099',
      '010180-12090',
      'abcdefghij',
      '010180--1209',
      '0101801 209',
    ]) {
      expect(validateKennitala(bad)).toEqual({ valid: false, reason: 'format' })
    }
  })

  it('rejects impossible dates and unknown century digits', () => {
    expect(validateKennitala('3201801209')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('0013801209')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('0000801209')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('7201801209')).toEqual({ valid: false, reason: 'date' })
    expect(validateKennitala('0101801201')).toEqual({ valid: false, reason: 'century' })
  })

  it('trims surrounding whitespace', () => {
    expect(isValidKennitala(' 010180-1209 ')).toBe(true)
  })
})
