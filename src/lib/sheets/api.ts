import type { FieldBlowing, FieldSplicing } from '../../types';
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from '../normalize';
import { db } from '../db';

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
  rawError?: string;
}

async function syncFromSingleUrl(url: string, _name: string): Promise<{ 
  blowings: FieldBlowing[], 
  splicings: FieldSplicing[], 
  blowingsRA: FieldBlowing[],
  error?: string 
}> {
  try {
    // Validar URL
    if (!url.includes('script.google.com')) {
      throw new Error('URL inválida - debe ser un Google Apps Script');
    }

    const response = await fetch(`${url}?type=all`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Intentar parsear como JSON
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('Respuesta no es JSON:', text.substring(0, 200));
      throw new Error('La respuesta no es JSON válido. ¿El Apps Script está deployado como Web App?');
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido del servidor');
    }

    const connections = await db.connections.toArray();
    const knownStreets = [...new Set(connections.map(c => c.strasse))].filter(Boolean);

    const blowings: FieldBlowing[] = [];
    const splicings: FieldSplicing[] = [];
    const blowingsRA: FieldBlowing[] = [];

    // Procesar Soplado RD
    if (result.data.blowing && Array.isArray(result.data.blowing)) {
      result.data.blowing.forEach((row: any) => {
        if (!row) return;
        const dpRaw = row.dp || '';
        const project = row.código_de_proyecto || row.codigo_proyecto || row.project || '';
        const dp = normalizeDP(dpRaw, project);
        const calleRaw = row.calle || row.street || '';
        const { street, hausnummer, zusatz } = extractAddress(calleRaw);
        const colorRaw = row.color_miniducto || row.color || '';

        let calleNormalized = street;
        let matchConfidence = 0;
        if (knownStreets.length > 0 && street) {
          const matchResult = fuzzyMatchStreet(street, knownStreets);
          calleNormalized = matchResult.match;
          matchConfidence = matchResult.confidence;
        }

        blowings.push({
          timestamp: String(row.timestamp || ''),
          codigoProyecto: String(project),
          dp,
          dpRaw: String(dpRaw),
          calle: String(calleRaw),
          calleNormalized,
          hausnummer: hausnummer + (zusatz ? zusatz.toUpperCase() : ''),
          kaCliente: normalizeKA(String(row.ka_cliente || row.ka || '')),
          tecnico: String(row.técnico_responsable || row.tecnico || ''),
          fechaInicio: String(row.fecha_de_inicio || row.fecha_inicio || ''),
          fechaFin: String(row.fecha_de_finalización || row.fecha_fin || ''),
          metrosSoplados: parseFloat(row.metros_soplados || row.metros || '0') || 0,
          colorMiniducto: String(colorRaw),
          colorNormalized: mapColorEsToDE(colorRaw),
          incidencias: String(row.incidencias_si_las_hubo || row.incidencias || ''),
          fotos: String(row.fotos_del_trabajo || row.fotos || ''),
          numeroFibras: parseInt(row.número_de_fibras || row.fibras || '0') || 0,
          certificado: String(row.certificado || '').toUpperCase() === 'TRUE',
          matchConfidence,
        });
      });
    }

    // Procesar Soplado RA
    if (result.data.blowingRA && Array.isArray(result.data.blowingRA)) {
      result.data.blowingRA.forEach((row: any) => {
        if (!row) return;
        const colorRaw = row.color_miniducto || row.color || '';
        blowingsRA.push({
          timestamp: String(row.timestamp || ''),
          codigoProyecto: String(row.código_de_proyecto || row.codigo_proyecto || ''),
          dp: '',
          dpRaw: 'TRONCAL',
          calle: 'Troncal (RA)',
          calleNormalized: 'Troncal (RA)',
          hausnummer: '',
          kaCliente: '',
          tecnico: String(row.técnico_responsable || row.tecnico || ''),
          fechaInicio: String(row.fecha_de_inicio || row.fecha_inicio || ''),
          fechaFin: String(row.fecha_de_finalización || row.fecha_fin || ''),
          metrosSoplados: parseFloat(row.metros_soplados || row.metros || '0') || 0,
          colorMiniducto: String(colorRaw),
          colorNormalized: mapColorEsToDE(colorRaw),
          incidencias: String(row.incidencias_si_las_hubo || row.incidencias || ''),
          fotos: String(row.fotos_del_trabajo || row.fotos || ''),
          numeroFibras: parseInt(row.número_de_fibras || row.fibras || '0') || 0,
          certificado: String(row.certificado || '').toUpperCase() === 'TRUE',
          matchConfidence: 0,
        });
      });
    }

    // Procesar Fusiones
    if (result.data.splicing && Array.isArray(result.data.splicing)) {
      result.data.splicing.forEach((row: any) => {
        if (!row) return;
        const dpRaw = row.dp || '';
        const project = row.código_de_proyecto || row.codigo_proyecto || '';
        const dp = normalizeDP(dpRaw, project);

        splicings.push({
          timestamp: String(row.timestamp || ''),
          codigoProyecto: String(project),
          dp,
          dpRaw: String(dpRaw),
          tecnico: String(row.técnico_responsable || row.tecnico || ''),
          fechaInicio: String(row.fecha_de_inicio || row.fecha_inicio || ''),
          fechaFin: String(row.fecha_de_finalización || row.fecha_fin || ''),
          fusiones: parseInt(row.fusiones || '0') || 0,
          incidencias: String(row.incidencias_si_las_hubo || row.incidencias || ''),
          fotos: String(row.fotos_del_trabajo || row.fotos || ''),
          registroFotografico: String(row.registro_fotografico || ''),
        });
      });
    }

    return { blowings, splicings, blowingsRA };

  } catch (error) {
    console.error('Error en syncFromSingleUrl:', error);
    return { 
      blowings: [], 
      splicings: [], 
      blowingsRA: [], 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
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
  let hasErrors = false;

  for (const sheetConfig of activeUrls) {
    const result = await syncFromSingleUrl(sheetConfig.url, sheetConfig.name);
    
    if (result.error) {
      details.push(`${sheetConfig.name}: ❌ ${result.error}`);
      hasErrors = true;
    } else {
      allBlowings.push(...result.blowings);
      allSplicings.push(...result.splicings);
      allBlowingsRA.push(...result.blowingsRA);
      const total = result.blowings.length + result.blowingsRA.length;
      details.push(`${sheetConfig.name}: ✅ ${total} soplados, ${result.splicings.length} fusiones`);
    }
  }

  if (hasErrors && allBlowings.length === 0 && allSplicings.length === 0) {
    return {
      success: false,
      message: '',
      error: 'No se pudieron sincronizar los datos. Revisa la configuración.',
      details,
    };
  }

  // Guardar en IndexedDB
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
      details: [...details, `DB Error: ${dbError}`],
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

// Función de utilidad para probar la URL
export async function testSheetUrl(url: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.includes('script.google.com')) {
      return { success: false, message: 'URL inválida - debe ser un Google Apps Script' };
    }

    const response = await fetch(`${url}?type=all`, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const text = await response.text();
    
    try {
      const result = JSON.parse(text);
      if (result.success) {
        return { success: true, message: `OK - ${result.sources || 1} fuente(s) conectada(s)` };
      } else {
        return { success: false, message: result.error || 'Error del servidor' };
      }
    } catch (e) {
      return { success: false, message: 'La respuesta no es JSON válido' };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Error de conexión'
    };
  }
}
