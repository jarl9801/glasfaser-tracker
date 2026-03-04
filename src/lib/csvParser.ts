import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { db } from './db'
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from './normalize'
import type { DistributionPoint, Connection, FieldBlowing, FieldSplicing } from '../types'

type CSVType = 'dp' | 'connection' | 'blowing' | 'blowing_ra' | 'splicing' | 'unknown'

const DP_HEADERS = ['Projekt- nummer', 'Projekt', 'DP', 'Tiefbau Fertig']
const CONNECTION_HEADERS = ['Auftragsnummer', 'Projektnummer', 'DP', 'Straße', 'Hausnummer']
const BLOWING_HEADERS = ['Metros Soplados', 'Color miniducto', 'KA cliente']
const BLOWING_RA_HEADERS = ['Metros Soplados', 'Color miniducto', 'Número de Fibras']
const SPLICING_HEADERS = ['Fusiones', 'Técnico Responsable', 'Registro Fotografico']

function detectCSVType(headers: string[]): CSVType {
  const normalized = headers.map(h => h.trim())
  // Blowing RD has KA cliente column; RA does not
  if (BLOWING_HEADERS.every(h => normalized.includes(h))) return 'blowing'
  // Blowing RA: has Metros Soplados but no KA cliente, no DP, no Calle
  if (BLOWING_RA_HEADERS.every(h => normalized.includes(h)) && !normalized.includes('KA cliente')) return 'blowing_ra'
  if (SPLICING_HEADERS.every(h => normalized.includes(h)) && !normalized.includes('Metros Soplados')) return 'splicing'
  if (CONNECTION_HEADERS.every(h => normalized.includes(h))) return 'connection'
  if (DP_HEADERS.some(h => normalized.includes(h))) return 'dp'
  return 'unknown'
}

function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return semicolons > commas ? ';' : ','
}

export interface ParseResult {
  type: CSVType
  rowCount: number
  projektNummer: number
  projektName: string
  label: string
}

/**
 * Parse and import a file. Supports .csv and .xlsx/.xls
 */
export async function parseAndImportFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') {
    return parseAndImportXLSX(file)
  }
  return parseAndImportCSV(file)
}

async function parseAndImportXLSX(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  if (rows.length === 0) {
    throw new Error('XLSX ist leer (keine Datenzeilen).')
  }

  const headers = Object.keys(rows[0])
  const type = detectCSVType(headers)

  if (type === 'unknown') {
    throw new Error('Unbekanntes XLSX-Format.')
  }

  return processRows(rows, headers, type)
}

async function parseAndImportCSV(file: File): Promise<ParseResult> {
  const text = await file.text()
  const firstLine = text.split('\n')[0]
  const delimiter = detectDelimiter(firstLine)

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      delimiter,
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = results.meta.fields || []
          const type = detectCSVType(headers)

          if (type === 'unknown') {
            reject(new Error('Unbekanntes CSV-Format. Erwartet DP-, Anschluss-, Soplado- oder Fusiones-Export.'))
            return
          }

          const rows = results.data as Record<string, string>[]
          if (rows.length === 0) {
            reject(new Error('CSV ist leer.'))
            return
          }

          const result = await processRows(rows, headers, type)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      error: (err) => reject(err),
    })
  })
}

async function processRows(
  rows: Record<string, string>[],
  _headers: string[],
  type: CSVType
): Promise<ParseResult> {
  let projektNummer = 0
  let projektName = ''
  let label = ''

  if (type === 'dp' || type === 'connection') {
    projektNummer = parseInt(rows[0]['Projektnummer'] || rows[0]['Projekt- nummer'] || '0')
    projektName = rows[0]['Projekt'] || `Projekt ${projektNummer}`
  } else {
    const codes = new Set(rows.map(r => r['Código de Proyecto'] || ''))
    projektName = Array.from(codes).join(', ')
  }

  if (type === 'dp' || type === 'connection') {
    let project = await db.projects.where('projektNummer').equals(projektNummer).first()
    if (!project) {
      const id = await db.projects.add({ projektNummer, name: projektName, importedAt: new Date() })
      project = await db.projects.get(id)
    } else {
      await db.projects.update(project!.id!, { importedAt: new Date() })
    }
    const projectId = project!.id!

    if (type === 'dp') {
      await importDPs(rows, projectId)
      label = 'Verteilerpunkte (DP)'
    } else {
      await importConnections(rows, projectId)
      label = 'Anschlüsse'
    }
  } else if (type === 'blowing') {
    await importFieldBlowings(rows)
    label = 'Reporte Soplado RD (campo)'
  } else if (type === 'blowing_ra') {
    await importFieldBlowingsRA(rows)
    label = 'Reporte Soplado RA (troncal)'
  } else if (type === 'splicing') {
    await importFieldSplicings(rows)
    label = 'Reporte Fusiones (campo)'
  }

  return { type, rowCount: rows.length, projektNummer, projektName, label }
}

async function importDPs(rows: Record<string, string>[], projectId: number) {
  await db.distributionPoints.where('projectId').equals(projectId).delete()

  const dps: DistributionPoint[] = rows.map((row) => ({
    projectId,
    dp: row['DP'] || '',
    startTiefbau: row['Start Tiefbau'] || '',
    endeTiefbau: row['Ende Tiefbau'] || '',
    tiefbauFertig: row['Tiefbau Fertig (1= Fertig, 0=Nicht Fertig)'] === '1',
    kabelsorte: row['Kabelsorte'] || '',
    einblasen: (row['Einblasen AP - DP (Gereed = Fertig)'] || '').trim(),
    spleissenAP: (row['Spleißen AP (Gereed = Fertig)'] || '').trim(),
    spleisseDPBereit: (row['Spleiße DP bereit'] || '').trim(),
  }))

  await db.distributionPoints.bulkAdd(dps)
}

async function importConnections(rows: Record<string, string>[], projectId: number) {
  await db.connections.where('projectId').equals(projectId).delete()

  const connections: Connection[] = rows.map((row) => ({
    projectId,
    auftragsnummer: row['Auftragsnummer'] || '',
    dp: row['DP'] || '',
    strasse: row['Straße'] || row['Strasse'] || '',
    hausnummer: row['Hausnummer'] || '',
    hausnummernzusatz: row['Hausnummernzusatz'] || '',
    unit: parseInt(row['Unit'] || '0') || 0,
    cableId: row['Cable ID (From TRI)'] || '',
    grundNA: row['GrundNA'] || '',
    anschlussstatus: parseInt(row['ANSCHLUSSSTATUS'] || '0') || 0,
    farbeRohre: row['Farbe Rohre'] || '',
    datumHausanschluss: row['Datum Hausanschluss'] || '',
    status: (row['Status'] || '').trim(),
    trenchIPFiber: parseInt(row['Trench-IP-fiber'] || '0') || 0,
    trenchTVFiber: parseInt(row['Trench-TV-fiber'] || '0') || 0,
    hasTVFiber: parseInt(row['HAS-TV-fiber'] || '0') || 0,
  }))

  await db.connections.bulkAdd(connections)
}

async function importFieldBlowings(rows: Record<string, string>[]) {
  const connections = await db.connections.toArray()
  const knownStreets = [...new Set(connections.map(c => c.strasse))].filter(Boolean)

  await db.fieldBlowings.clear()

  const blowings: FieldBlowing[] = rows.map((row) => {
    const dpRaw = row['DP'] || ''
    const project = row['Código de Proyecto'] || ''
    const dp = normalizeDP(dpRaw, project)
    const calleRaw = row['Calle'] || ''
    const { street, hausnummer, zusatz } = extractAddress(calleRaw)
    const colorRaw = row['Color miniducto'] || ''

    let calleNormalized = street
    let matchConfidence = 0
    if (knownStreets.length > 0 && street) {
      const result = fuzzyMatchStreet(street, knownStreets)
      if (result.confidence >= 60) {
        calleNormalized = result.match
        matchConfidence = result.confidence
      } else {
        matchConfidence = result.confidence
      }
    }

    return {
      timestamp: row['Timestamp'] || '',
      codigoProyecto: project,
      dp,
      dpRaw,
      calle: calleRaw,
      calleNormalized,
      hausnummer: hausnummer + (zusatz ? zusatz.toUpperCase() : ''),
      kaCliente: normalizeKA(row['KA cliente'] || ''),
      tecnico: row['Técnico Responsable'] || '',
      fechaInicio: row['Fecha de Inicio'] || '',
      fechaFin: row['Fecha de Finalización'] || '',
      metrosSoplados: parseFloat(row['Metros Soplados'] || '0') || 0,
      colorMiniducto: colorRaw,
      colorNormalized: mapColorEsToDE(colorRaw),
      incidencias: row['Incidencias (si las hubo)'] || '',
      fotos: row['Fotos del Trabajo'] || '',
      numeroFibras: parseInt(row['Número de Fibras'] || '0') || 0,
      certificado: (row['Certificado'] || '').toUpperCase() === 'TRUE',
      matchConfidence,
    }
  })

  await db.fieldBlowings.bulkAdd(blowings)
}

// Soplado RA (44/96/144/288 fibers) - trunk blowing, no DP/Calle/KA
async function importFieldBlowingsRA(rows: Record<string, string>[]) {
  // Store as field blowings with type indicator (no DP, no street)
  const existing = await db.fieldBlowings.toArray()
  // Keep RD blowings, only clear RA ones (those without a DP)
  const rdIds = existing.filter(b => b.dp).map(b => b.id!).filter(Boolean)

  // Delete only RA entries (those without DP)
  const raIds = existing.filter(b => !b.dp && !b.kaCliente).map(b => b.id!).filter(Boolean)
  if (raIds.length > 0) await db.fieldBlowings.bulkDelete(raIds)

  const blowings: FieldBlowing[] = rows.map((row) => {
    const colorRaw = row['Color miniducto'] || ''
    return {
      timestamp: row['Timestamp'] || '',
      codigoProyecto: row['Código de Proyecto'] || '',
      dp: '',
      dpRaw: 'TRONCAL',
      calle: 'Troncal (RA)',
      calleNormalized: 'Troncal (RA)',
      hausnummer: '',
      kaCliente: '',
      tecnico: row['Técnico Responsable'] || '',
      fechaInicio: row['Fecha de Inicio'] || '',
      fechaFin: row['Fecha de Finalización'] || '',
      metrosSoplados: parseFloat(row['Metros Soplados'] || '0') || 0,
      colorMiniducto: colorRaw,
      colorNormalized: mapColorEsToDE(colorRaw),
      incidencias: row['Incidencias (si las hubo)'] || '',
      fotos: row['Fotos del Trabajo'] || '',
      numeroFibras: parseInt(row['Número de Fibras'] || '0') || 0,
      certificado: (row['Certificado'] || '').toUpperCase() === 'TRUE',
      matchConfidence: 0,
    }
  })

  await db.fieldBlowings.bulkAdd(blowings)
}

async function importFieldSplicings(rows: Record<string, string>[]) {
  await db.fieldSplicings.clear()

  const splicings: FieldSplicing[] = rows.map((row) => {
    const dpRaw = row['DP'] || ''
    const project = row['Código de Proyecto'] || ''
    const dp = normalizeDP(dpRaw, project)

    return {
      timestamp: row['Timestamp'] || '',
      codigoProyecto: project,
      dp,
      dpRaw,
      tecnico: row['Técnico Responsable'] || '',
      fechaInicio: row['Fecha de Inicio'] || '',
      fechaFin: row['Fecha de Finalización'] || '',
      fusiones: parseInt(row['Fusiones'] || '0') || 0,
      incidencias: row['Incidencias (si las hubo)'] || '',
      fotos: row['Fotos del Trabajo'] || '',
      registroFotografico: row['Registro Fotografico'] || '',
    }
  })

  await db.fieldSplicings.bulkAdd(splicings)
}
