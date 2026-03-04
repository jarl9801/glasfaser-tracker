import type { FieldBlowing, FieldSplicing } from '../../types';
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from '../normalize';
import { db } from '../db';

// Configuración de múltiples Sheets
const STORAGE_KEY = 'GAS_CONFIG';

export interface SheetConfig {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export interface GASConfig {
  urls: SheetConfig[];
}

export function getGASConfig(): GASConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return { urls: [] };
}

export function setGASConfig(config: GASConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function addSheetUrl(name: string, url: string) {
  const config = getGASConfig();
  const id = Date.now().toString();
  config.urls.push({ id, name, url, active: true });
  setGASConfig(config);
  return id;
}

export function removeSheetUrl(id: string) {
  const config = getGASConfig();
  config.urls = config.urls.filter(u => u.id !== id);
  setGASConfig(config);
}

export function toggleSheetUrl(id: string) {
  const config = getGASConfig();
  const url = config.urls.find(u => u.id === id);
  if (url) url.active = !url.active;
  setGASConfig(config);
}

export interface SyncResult {
  success: boolean;
  message: string;
  blowings?: number;
  splicings?: number;
  error?: string;
  details?: string[];
}

async function syncFromSingleUrl(url: string, name: string): Promise<{ blowings: FieldBlowing[], splicings: FieldSplicing[], blowingsRA: FieldBlowing[] }> {
  const response = await fetch(`${url}?type=all`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || `Error en ${name}`);
  }

  const connections = await db.connections.toArray();
  const knownStreets = [...new Set(connections.map(c => c.strasse))].filter(Boolean);

  const blowings: FieldBlowing[] = [];
  const splicings: FieldSplicing[] = [];
  const blowingsRA: FieldBlowing[] = [];

  // Procesar Soplado RD
  if (result.data.blowing) {
    result.data.blowing.forEach((row: any) => {
      const dpRaw = row.dp || '';
      const project = row.código_de_proyecto || '';
      const dp = normalizeDP(dpRaw, project);
      const calleRaw = row.calle || '';
      const { street, hausnummer, zusatz } = extractAddress(calleRaw);
      const colorRaw = row.color_miniducto || '';

      let calleNormalized = street;
      let matchConfidence = 0;
      if (knownStreets.length > 0 && street) {
        const matchResult = fuzzyMatchStreet(street, knownStreets);
        calleNormalized = matchResult.match;
        matchConfidence = matchResult.confidence;
      }

      blowings.push({
        timestamp: row.timestamp || '',
        codigoProyecto: project,
        dp,
        dpRaw,
        calle: calleRaw,
        calleNormalized,
        hausnummer: hausnummer + (zusatz ? zusatz.toUpperCase() : ''),
        kaCliente: normalizeKA(row.ka_cliente || ''),
        tecnico: row.técnico_responsable || '',
        fechaInicio: row.fecha_de_inicio || '',
        fechaFin: row.fecha_de_finalización || '',
        metrosSoplados: parseFloat(row.metros_soplados || '0') || 0,
        colorMiniducto: colorRaw,
        colorNormalized: mapColorEsToDE(colorRaw),
        incidencias: row.incidencias_si_las_hubo || '',
        fotos: row.fotos_del_trabajo || '',
        numeroFibras: parseInt(row.número_de_fibras || '0') || 0,
        certificado: (row.certificado || '').toUpperCase() === 'TRUE',
        matchConfidence,
      });
    });
  }

  // Procesar Soplado RA
  if (result.data.blowingRA) {
    result.data.blowingRA.forEach((row: any) => {
      const colorRaw = row.color_miniducto || '';
      blowingsRA.push({
        timestamp: row.timestamp || '',
        codigoProyecto: row.código_de_proyecto || '',
        dp: '',
        dpRaw: 'TRONCAL',
        calle: 'Troncal (RA)',
        calleNormalized: 'Troncal (RA)',
        hausnummer: '',
        kaCliente: '',
        tecnico: row.técnico_responsable || '',
        fechaInicio: row.fecha_de_inicio || '',
        fechaFin: row.fecha_de_finalización || '',
        metrosSoplados: parseFloat(row.metros_soplados || '0') || 0,
        colorMiniducto: colorRaw,
        colorNormalized: mapColorEsToDE(colorRaw),
        incidencias: row.incidencias_si_las_hubo || '',
        fotos: row.fotos_del_trabajo || '',
        numeroFibras: parseInt(row.número_de_fibras || '0') || 0,
        certificado: (row.certificado || '').toUpperCase() === 'TRUE',
        matchConfidence: 0,
      });
    });
  }

  // Procesar Fusiones
  if (result.data.splicing) {
    result.data.splicing.forEach((row: any) => {
      const dpRaw = row.dp || '';
      const project = row.código_de_proyecto || '';
      const dp = normalizeDP(dpRaw, project);

      splicings.push({
        timestamp: row.timestamp || '',
        codigoProyecto: project,
        dp,
        dpRaw,
        tecnico: row.técnico_responsable || '',
        fechaInicio: row.fecha_de_inicio || '',
        fechaFin: row.fecha_de_finalización || '',
        fusiones: parseInt(row.fusiones || '0') || 0,
        incidencias: row.incidencias_si_las_hubo || '',
        fotos: row.fotos_del_trabajo || '',
        registroFotografico: row.registro_fotografico || '',
      });
    });
  }

  return { blowings, splicings, blowingsRA };
}

export async function syncFromSheets(): Promise<SyncResult> {
  const config = getGASConfig();
  const activeUrls = config.urls.filter(u => u.active);
  
  if (activeUrls.length === 0) {
    return { success: false, message: '', error: 'No hay URLs configuradas' };
  }

  const allBlowings: FieldBlowing[] = [];
  const allSplicings: FieldSplicing[] = [];
  const allBlowingsRA: FieldBlowing[] = [];
  const details: string[] = [];

  try {
    for (const sheetConfig of activeUrls) {
      try {
        const result = await syncFromSingleUrl(sheetConfig.url, sheetConfig.name);
        allBlowings.push(...result.blowings);
        allSplicings.push(...result.splicings);
        allBlowingsRA.push(...result.blowingsRA);
        details.push(`${sheetConfig.name}: ${result.blowings.length} soplados, ${result.splicings.length} fusiones`);
      } catch (err) {
        details.push(`${sheetConfig.name}: Error - ${err instanceof Error ? err.message : 'desconocido'}`);
      }
    }

    // Guardar en IndexedDB
    await db.fieldBlowings.clear();
    await db.fieldSplicings.clear();
    
    if (allBlowings.length > 0 || allBlowingsRA.length > 0) {
      await db.fieldBlowings.bulkAdd([...allBlowings, ...allBlowingsRA]);
    }
    
    if (allSplicings.length > 0) {
      await db.fieldSplicings.bulkAdd(allSplicings);
    }

    const totalBlowings = allBlowings.length + allBlowingsRA.length;
    
    return {
      success: true,
      message: `Sincronizado: ${totalBlowings} soplados, ${allSplicings.length} fusiones desde ${activeUrls.length} fuente(s)`,
      blowings: totalBlowings,
      splicings: allSplicings.length,
      details,
    };

  } catch (error) {
    return {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details,
    };
  }
}
