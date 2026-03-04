import type { FieldBlowing, FieldSplicing } from '../../types';
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from '../normalize';
import { db } from '../db';

const APPS_SCRIPT_URL = localStorage.getItem('GAS_URL') || '';

export interface SheetsConfig {
  url: string;
}

export function setSheetsConfig(url: string) {
  localStorage.setItem('GAS_URL', url);
}

export function getSheetsConfig(): string {
  return localStorage.getItem('GAS_URL') || '';
}

export interface SyncResult {
  success: boolean;
  message: string;
  blowings?: number;
  splicings?: number;
  error?: string;
}

export async function syncFromSheets(): Promise<SyncResult> {
  const url = getSheetsConfig();
  
  if (!url) {
    return { success: false, message: '', error: 'URL no configurada' };
  }

  try {
    const response = await fetch(`${url}?type=all`);
    const result = await response.json();
    
    if (!result.success) {
      return { success: false, message: '', error: result.error };
    }

    const connections = await db.connections.toArray();
    const knownStreets = [...new Set(connections.map(c => c.strasse))].filter(Boolean);

    let blowingsCount = 0;
    let splicingsCount = 0;

    // Procesar Soplado RD
    if (result.data.blowing) {
      const blowings: FieldBlowing[] = result.data.blowing.map((row: any) => {
        const dpRaw = row.dp || '';
        const project = row.código_de_proyecto || '';
        const dp = normalizeDP(dpRaw, project);
        const calleRaw = row.calle || '';
        const { street, hausnummer, zusatz } = extractAddress(calleRaw);
        const colorRaw = row.color_miniducto || '';

        let calleNormalized = street;
        let matchConfidence = 0;
        if (knownStreets.length > 0 && street) {
          const result = fuzzyMatchStreet(street, knownStreets);
          calleNormalized = result.match;
          matchConfidence = result.confidence;
        }

        return {
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
        };
      });

      await db.fieldBlowings.clear();
      await db.fieldBlowings.bulkAdd(blowings);
      blowingsCount = blowings.length;
    }

    // Procesar Soplado RA
    if (result.data.blowingRA) {
      const blowingsRA: FieldBlowing[] = result.data.blowingRA.map((row: any) => {
        const colorRaw = row.color_miniducto || '';
        return {
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
        };
      });

      await db.fieldBlowings.bulkAdd(blowingsRA);
      blowingsCount += blowingsRA.length;
    }

    // Procesar Fusiones
    if (result.data.splicing) {
      const splicings: FieldSplicing[] = result.data.splicing.map((row: any) => {
        const dpRaw = row.dp || '';
        const project = row.código_de_proyecto || '';
        const dp = normalizeDP(dpRaw, project);

        return {
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
        };
      });

      await db.fieldSplicings.clear();
      await db.fieldSplicings.bulkAdd(splicings);
      splicingsCount = splicings.length;
    }

    return {
      success: true,
      message: `Sincronizado: ${blowingsCount} soplados, ${splicingsCount} fusiones`,
      blowings: blowingsCount,
      splicings: splicingsCount,
    };

  } catch (error) {
    return {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
