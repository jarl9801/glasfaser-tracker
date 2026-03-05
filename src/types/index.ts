export interface Project {
  id?: number
  projektNummer: number
  name: string
  importedAt: Date
}

export interface DistributionPoint {
  id?: number
  projectId: number
  dp: string
  startTiefbau: string
  endeTiefbau: string
  tiefbauFertig: boolean
  kabelsorte: string
  einblasen: string
  spleissenAP: string
  spleisseDPBereit: string
}

export interface Connection {
  id?: number
  projectId: number
  auftragsnummer: string
  dp: string
  strasse: string
  hausnummer: string
  hausnummernzusatz: string
  unit: number
  cableId: string
  grundNA: string
  anschlussstatus: number
  farbeRohre: string
  datumHausanschluss: string
  status: ConnectionStatus
  trenchIPFiber: number
  trenchTVFiber: number
  hasTVFiber: number
}

// Field report: blowing (Soplado RD - 6/12/24 fibers)
export interface FieldBlowing {
  id?: number
  timestamp: string
  codigoProyecto: string
  dp: string              // normalized to QFF-001-DPxxx
  dpRaw: string           // original from form
  calle: string           // street + house number as entered by technician
  calleNormalized: string // matched to client data street name
  hausnummer: string      // extracted house number
  kaCliente: string
  tecnico: string
  fechaInicio: string
  fechaFin: string
  metrosSoplados: number
  colorMiniducto: string
  colorNormalized: string // mapped to German color
  incidencias: string
  fotos: string
  numeroFibras: number
  certificado: boolean
  // matching
  matchedConnectionId?: number
  matchConfidence: number // 0-100
}

// Field report: splicing (Fusiones DP)
export interface FieldSplicing {
  id?: number
  timestamp: string
  codigoProyecto: string
  dp: string              // normalized
  dpRaw: string
  tecnico: string
  fechaInicio: string
  fechaFin: string
  fusiones: number
  incidencias: string
  fotos: string
  registroFotografico: string
}

export type ConnectionStatus =
  | 'Arbeitsvorbereitung'
  | 'Tiefbau'
  | 'Einblasen'
  | 'Spleiße'
  | 'Hausbegehung'
  | 'Hausanschluss'
  | 'Montage'
  | 'Abliefern'
  | string

export type ViewName = 'dashboard' | 'dps' | 'connections' | 'fieldwork' | 'control' | 'import' | 'discrepancies' | 'coverage'

export const STATUS_COLORS: Record<string, string> = {
  Arbeitsvorbereitung: '#9ca3af',
  Tiefbau: '#f97316',
  Einblasen: '#3b82f6',
  'Spleiße': '#8b5cf6',
  'Spleiße ': '#8b5cf6',
  Hausbegehung: '#eab308',
  Hausanschluss: '#06b6d4',
  Montage: '#84cc16',
  Abliefern: '#22c55e',
}

export const STATUS_ORDER: string[] = [
  'Arbeitsvorbereitung',
  'Tiefbau',
  'Einblasen',
  'Spleiße',
  'Hausbegehung',
  'Hausanschluss',
  'Montage',
  'Abliefern',
]

// Color mapping: Spanish (technician input) → German (client system)
export const COLOR_MAP_ES_DE: Record<string, string> = {
  rojo: 'Rot',
  verde: 'Grün',
  azul: 'Blau',
  amarillo: 'Gelb',
  gris: 'Grau',
  marron: 'Braun',
  violeta: 'Violett',
  turquesa: 'Türkis',
  negro: 'Schwarz',
  naranja: 'Orange',
  rosa: 'Rosa',
  blanco: 'Weiß',
  'option 5': 'Weiß',
}
