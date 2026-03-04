import Papa from 'papaparse';
import type { FieldBlowing, FieldSplicing } from '../../types';
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from '../normalize';
import { db } from '../db';

// Google Sheets CSV export URLs
// Format: https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}

const SHEETS_CONFIG = [
  {
    id: '1g3-t2_02wSLpg2LPBvRgEFY3EFjYPxZJTfpyoAa--EE',
    name: 'Reporte 1',
    blowing: 'Soplado RD',
    blowingRA: 'Soplado RA', 
    splicing: 'Fusiones DP'
  },
  {
    id: '1Ssq_EYReehe8ddOrho1B08CzTocXYr2o7Qlnf73gxcs',
    name: 'Reporte 2',
    blowing: 'Soplado RD',
    blowingRA: 'Soplado RA',
    splicing: 'Fusiones DP'
  },
  {
    id: '1jLQf3brTId_hU2nmU16BapEvTYxYDbJJyR6IV_u7MOc',
    name: 'Reporte 3',
    blowing: 'Soplado RD',
    blowingRA: 'Soplado RA',
    splicing: 'Fusiones DP'
  }
];

function getCsvUrl(sheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

async function fetchCsv(sheetId: string, sheetName: string): Promise<any[]> {
  const url = getCsvUrl(sheetId, sheetName);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${sheetName}`);
  }
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err)
    });
  });
}

export interface SyncResult {
  success: boolean;
  message: string;
  blowings?: number;
  splicings?: number;
  error?: string;
  details?: string[];
}

export async function syncFromGoogleSheets(): Promise<SyncResult> {
  const connections = await db.connections.toArray();
  const knownStreets = [...new Set(connections.map(c => c.strasse))].filter(Boolean);
  
  const allBlowings: FieldBlowing[] = [];
  const allSplicings: FieldSplicing[] = [];
  const allBlowingsRA: FieldBlowing[] = [];
  const details: string[] = [];

  for (const config of SHEETS_CONFIG) {
    try {
      // Fetch all three sheets for this config
      const [blowingData, blowingRAData, splicingData] = await Promise.all([
        fetchCsv(config.id, config.blowing).catch(() => []),
        fetchCsv(config.id, config.blowingRA).catch(() => []),
        fetchCsv(config.id, config.splicing).catch(() => [])
      ]);

      // Process blowing data
      blowingData.forEach((row: any) => {
        const dpRaw = row['DP'] || '';
        const project = row['Código de Proyecto'] || '';
        const dp = normalizeDP(dpRaw, project);
        const calleRaw = row['Calle'] || '';
        const { street, hausnummer, zusatz } = extractAddress(calleRaw);
        const colorRaw = row['Color miniducto'] || '';

        let calleNormalized = street;
        let matchConfidence = 0;
        if (knownStreets.length > 0 && street) {
          const matchResult = fuzzyMatchStreet(street, knownStreets);
          calleNormalized = matchResult.match;
          matchConfidence = matchResult.confidence;
        }

        allBlowings.push({
          timestamp: String(row['Timestamp'] || ''),
          codigoProyecto: String(project),
          dp,
          dpRaw: String(dpRaw),
          calle: String(calleRaw),
          calleNormalized,
          hausnummer: hausnummer + (zusatz ? zusatz.toUpperCase() : ''),
          kaCliente: normalizeKA(String(row['KA cliente'] || '')),
          tecnico: String(row['Técnico Responsable'] || ''),
          fechaInicio: String(row['Fecha de Inicio'] || ''),
          fechaFin: String(row['Fecha de Finalización'] || ''),
          metrosSoplados: parseFloat(row['Metros Soplados'] || '0') || 0,
          colorMiniducto: String(colorRaw),
          colorNormalized: mapColorEsToDE(colorRaw),
          incidencias: String(row['Incidencias (si las hubo)'] || ''),
          fotos: String(row['Fotos del Trabajo'] || ''),
          numeroFibras: parseInt(row['Número de Fibras'] || '0') || 0,
          certificado: String(row['Certificado'] || '').toUpperCase() === 'TRUE',
          matchConfidence,
        });
      });

      // Process blowing RA data
      blowingRAData.forEach((row: any) => {
        const colorRaw = row['Color miniducto'] || '';
        allBlowingsRA.push({
          timestamp: String(row['Timestamp'] || ''),
          codigoProyecto: String(row['Código de Proyecto'] || ''),
          dp: '',
          dpRaw: 'TRONCAL',
          calle: 'Troncal (RA)',
          calleNormalized: 'Troncal (RA)',
          hausnummer: '',
          kaCliente: '',
          tecnico: String(row['Técnico Responsable'] || ''),
          fechaInicio: String(row['Fecha de Inicio'] || ''),
          fechaFin: String(row['Fecha de Finalización'] || ''),
          metrosSoplados: parseFloat(row['Metros Soplados'] || '0') || 0,
          colorMiniducto: String(colorRaw),
          colorNormalized: mapColorEsToDE(colorRaw),
          incidencias: String(row['Incidencias (si las hubo)'] || ''),
          fotos: String(row['Fotos del Trabajo'] || ''),
          numeroFibras: parseInt(row['Número de Fibras'] || '0') || 0,
          certificado: String(row['Certificado'] || '').toUpperCase() === 'TRUE',
          matchConfidence: 0,
        });
      });

      // Process splicing data
      splicingData.forEach((row: any) => {
        const dpRaw = row['DP'] || '';
        const project = row['Código de Proyecto'] || '';
        const dp = normalizeDP(dpRaw, project);

        allSplicings.push({
          timestamp: String(row['Timestamp'] || ''),
          codigoProyecto: String(project),
          dp,
          dpRaw: String(dpRaw),
          tecnico: String(row['Técnico Responsable'] || ''),
          fechaInicio: String(row['Fecha de Inicio'] || ''),
          fechaFin: String(row['Fecha de Finalización'] || ''),
          fusiones: parseInt(row['Fusiones'] || '0') || 0,
          incidencias: String(row['Incidencias (si las hubo)'] || ''),
          fotos: String(row['Fotos del Trabajo'] || ''),
          registroFotografico: String(row['Registro Fotografico'] || ''),
        });
      });

      const totalBlowing = blowingData.length + blowingRAData.length;
      details.push(`${config.name}: ${totalBlowing} soplados, ${splicingData.length} fusiones`);

    } catch (error) {
      details.push(`${config.name}: Error - ${error instanceof Error ? error.message : 'desconocido'}`);
    }
  }

  // Save to IndexedDB
  try {
    await db.fieldBlowings.clear();
    await db.fieldSplicings.clear();
    
    if (allBlowings.length > 0 || allBlowingsRA.length > 0) {
      await db.fieldBlowings.bulkAdd([...allBlowings, ...allBlowingsRA]);
    }
    
    if (allSplicings.length > 0) {
      await db.fieldSplicings.bulkAdd(allSplicings);
    }
  } catch (dbError) {
    return {
      success: false,
      message: '',
      error: 'Error guardando en base de datos local',
      details
    };
  }

  const totalBlowings = allBlowings.length + allBlowingsRA.length;
  
  return {
    success: true,
    message: `Sincronizado: ${totalBlowings} soplados, ${allSplicings.length} fusiones`,
    blowings: totalBlowings,
    splicings: allSplicings.length,
    details,
  };
}
