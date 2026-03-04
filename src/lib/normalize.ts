import { COLOR_MAP_ES_DE } from '../types'

/**
 * Normalize DP strings to the canonical format: QFF-001-DPxxx
 * Handles: "DP-055", "DP052", "DP-09", "DP06", "DP-7" → "QFF-001-DP055", etc.
 */
export function normalizeDP(raw: string, projectCode = 'QFF-001'): string {
  const cleaned = raw.replace(/\s+/g, '').toUpperCase()
  const match = cleaned.match(/DP-?0*(\d+)/)
  if (!match) return ''
  const num = match[1].padStart(3, '0')
  return `${projectCode}-DP${num}`
}

/**
 * Extract POP code from a DP string.
 * "QFF-001-DP006" → "QFF-001"
 * "QFF-002-DP024" → "QFF-002"
 */
export function extractPOP(dp: string): string {
  const match = dp.match(/^(QFF-\d+)/)
  return match ? match[1] : ''
}

/**
 * Extract street name and house number from a combined field.
 * "Egerländer Straße 16" → { street: "Egerländer Straße", hausnummer: "16", zusatz: "" }
 * "Ringstraße 23a" → { street: "Ringstraße", hausnummer: "23", zusatz: "a" }
 * "An der Fuchsenhütte 26 A" → { street: "An der Fuchsenhütte", hausnummer: "26", zusatz: "A" }
 */
export function extractAddress(raw: string): { street: string; hausnummer: string; zusatz: string } {
  const trimmed = raw.trim()
  // Match house number (and optional suffix) at end of string
  const match = trimmed.match(/^(.+?)\s+(\d+)\s*([a-zA-Z]?)$/)
  if (!match) return { street: trimmed, hausnummer: '', zusatz: '' }
  return {
    street: match[1].trim(),
    hausnummer: match[2],
    zusatz: match[3] || '',
  }
}

/**
 * Normalize a street name for comparison:
 * - lowercase, trim, normalize unicode
 * - remove common suffixes like "straße"/"strasse"
 * - normalize umlauts: ü→ue, ö→oe, ä→ae, ß→ss
 */
export function normalizeStreet(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacritics
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/\s+/g, ' ')
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Find the best matching street from a list of known streets.
 * Returns { match, confidence } where confidence is 0-100.
 */
export function fuzzyMatchStreet(
  input: string,
  knownStreets: string[]
): { match: string; confidence: number } {
  const normInput = normalizeStreet(input)

  let bestMatch = ''
  let bestScore = 0

  for (const known of knownStreets) {
    const normKnown = normalizeStreet(known)

    // Exact match after normalization
    if (normInput === normKnown) {
      return { match: known, confidence: 100 }
    }

    // One contains the other
    if (normInput.includes(normKnown) || normKnown.includes(normInput)) {
      const longer = Math.max(normInput.length, normKnown.length)
      const shorter = Math.min(normInput.length, normKnown.length)
      const score = Math.round((shorter / longer) * 95)
      if (score > bestScore) {
        bestScore = score
        bestMatch = known
      }
      continue
    }

    // Levenshtein distance
    const dist = levenshtein(normInput, normKnown)
    const maxLen = Math.max(normInput.length, normKnown.length)
    const score = Math.round(((maxLen - dist) / maxLen) * 100)
    if (score > bestScore) {
      bestScore = score
      bestMatch = known
    }
  }

  return { match: bestMatch, confidence: bestScore }
}

/**
 * Map Spanish color name to German color name.
 * "Azul" → "Blau", "Violeta" → "Violett", etc.
 */
export function mapColorEsToDE(colorEs: string): string {
  const key = colorEs.trim().toLowerCase().replace(/\s*raya\s*/i, '')
  return COLOR_MAP_ES_DE[key] || colorEs
}

/**
 * Normalize KA client identifier.
 * "KA28" → "KA28", "KA028" → "KA28", "KA01" → "KA01", "KA011" → "KA11"
 * Remove leading zeros but keep at least 2 digits.
 */
export function normalizeKA(raw: string): string {
  const match = raw.trim().toUpperCase().match(/KA-?0*(\d+)/)
  if (!match) return raw.trim()
  const num = match[1].padStart(2, '0')
  return `KA${num}`
}
