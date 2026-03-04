// @ts-ignore
import type { FieldBlowing, FieldSplicing } from '../types';
import { db } from './db';

export interface BlowingDiscrepancy {
  type: 'blowing';
  dp: string;
  calle: string;
  hausnummer: string;
  kaCliente: string;
  tecnico: string;
  metrosSoplados: number;
  colorMiniducto: string;
  fechaInicio: string;
  issue: 'no_en_cliente' | 'estado_no_coincide' | 'datos_diferentes';
  details: string;
}

export interface SplicingDiscrepancy {
  type: 'splicing';
  dp: string;
  tecnico: string;
  fusiones: number;
  fechaInicio: string;
  issue: 'no_en_cliente' | 'cliente_no_reporta_fusiones' | 'estado_no_coincide';
  details: string;
}

export interface DPDiscrepancy {
  type: 'dp_status';
  dp: string;
  fieldStatus: string;
  clientStatus: string;
  issue: 'sopleisse_no_coincide' | 'einblasen_no_coincide';
  details: string;
}

export interface DiscrepancyResult {
  blowingDiscrepancies: BlowingDiscrepancy[];
  splicingDiscrepancies: SplicingDiscrepancy[];
  dpDiscrepancies: DPDiscrepancy[];
  stats: {
    totalFieldBlowings: number;
    totalFieldSplicings: number;
    unmatchedBlowings: number;
    unmatchedSplicings: number;
    discrepancyRate: number;
  };
}

export async function analyzeDiscrepancies(): Promise<DiscrepancyResult> {
  const [blowings, splicings, connections, dps] = await Promise.all([
    db.fieldBlowings.toArray(),
    db.fieldSplicings.toArray(),
    db.connections.toArray(),
    db.distributionPoints.toArray()
  ]);

  const blowingDiscrepancies: BlowingDiscrepancy[] = [];
  const splicingDiscrepancies: SplicingDiscrepancy[] = [];
  const dpDiscrepancies: DPDiscrepancy[] = [];

  // Analizar Soplado RD (no troncal) vs Conexiones del cliente
  const rdBlowings = blowings.filter(b => b.dp && b.dp !== ''); // Excluir troncales
  
  for (const blowing of rdBlowings) {
    // Buscar conexión correspondiente en datos del cliente
    const connection = connections.find(c => {
      const dpMatch = c.dp === blowing.dp;
      const streetMatch = c.strasse.toLowerCase() === blowing.calleNormalized.toLowerCase() ||
                         c.strasse.toLowerCase().includes(blowing.calleNormalized.toLowerCase()) ||
                         blowing.calleNormalized.toLowerCase().includes(c.strasse.toLowerCase());
      const numberMatch = c.hausnummer === blowing.hausnummer;
      return dpMatch && (streetMatch || numberMatch);
    });

    if (!connection) {
      // No se encontró en datos del cliente
      blowingDiscrepancies.push({
        type: 'blowing',
        dp: blowing.dp,
        calle: blowing.calle,
        hausnummer: blowing.hausnummer,
        kaCliente: blowing.kaCliente,
        tecnico: blowing.tecnico,
        metrosSoplados: blowing.metrosSoplados,
        colorMiniducto: blowing.colorMiniducto,
        fechaInicio: blowing.fechaInicio,
        issue: 'no_en_cliente',
        details: `Técnico reportó soplado en ${blowing.calle} ${blowing.hausnummer} (KA: ${blowing.kaCliente}) pero no existe en datos del cliente`
      });
    } else {
      // Verificar si el estado coincide
      // Si el técnico hizo el soplado, el estado debería ser al menos "Einblasen" o posterior
      const earlyStatuses = ['Arbeitsvorbereitung', 'Tiefbau'];
      if (earlyStatuses.includes(connection.status)) {
        blowingDiscrepancies.push({
          type: 'blowing',
          dp: blowing.dp,
          calle: blowing.calle,
          hausnummer: blowing.hausnummer,
          kaCliente: blowing.kaCliente,
          tecnico: blowing.tecnico,
          metrosSoplados: blowing.metrosSoplados,
          colorMiniducto: blowing.colorMiniducto,
          fechaInicio: blowing.fechaInicio,
          issue: 'estado_no_coincide',
          details: `Técnico reportó soplado (${blowing.metrosSoplados}m) pero cliente marca estado como "${connection.status}"`
        });
      }
    }
  }

  // Analizar Fusiones vs DPs del cliente
  for (const splicing of splicings) {
    const dp = dps.find(d => d.dp === splicing.dp);
    
    if (!dp) {
      splicingDiscrepancies.push({
        type: 'splicing',
        dp: splicing.dp,
        tecnico: splicing.tecnico,
        fusiones: splicing.fusiones,
        fechaInicio: splicing.fechaInicio,
        issue: 'no_en_cliente',
        details: `Técnico reportó fusiones en ${splicing.dp} pero el DP no existe en datos del cliente`
      });
    } else {
      // Verificar si el cliente tiene marcado Spleißen
      const spleisseDone = dp.spleissenAP === 'GEREED' || dp.spleisseDPBereit === 'GEREED';
      if (!spleisseDone) {
        splicingDiscrepancies.push({
          type: 'splicing',
          dp: splicing.dp,
          tecnico: splicing.tecnico,
          fusiones: splicing.fusiones,
          fechaInicio: splicing.fechaInicio,
          issue: 'cliente_no_reporta_fusiones',
          details: `Técnico reportó ${splicing.fusiones} fusiones pero cliente no marca Spleiße como GEREED`
        });
      }
    }
  }

  // Analizar DPs con inconsistencias de estado
  for (const dp of dps) {
    // Buscar si hay fusiones reportadas para este DP
    const hasSplicing = splicings.some(s => s.dp === dp.dp);
    const clientSpleisseDone = dp.spleissenAP === 'GEREED' || dp.spleisseDPBereit === 'GEREED';
    
    if (hasSplicing && !clientSpleisseDone) {
      dpDiscrepancies.push({
        type: 'dp_status',
        dp: dp.dp,
        fieldStatus: 'Spleiße completado (reportado por técnico)',
        clientStatus: `${dp.spleissenAP} / ${dp.spleisseDPBereit}`,
        issue: 'sopleisse_no_coincide',
        details: `Hay fusiones reportadas por técnico pero el cliente no marca Spleiße como GEREED`
      });
    }

    // Verificar soplado
    const hasBlowing = blowings.some(b => b.dp === dp.dp && b.metrosSoplados > 0);
    const clientEinblasenDone = dp.einblasen === 'GEREED';
    
    if (hasBlowing && !clientEinblasenDone) {
      dpDiscrepancies.push({
        type: 'dp_status',
        dp: dp.dp,
        fieldStatus: 'Einblasen completado (reportado por técnico)',
        clientStatus: dp.einblasen,
        issue: 'einblasen_no_coincide',
        details: `Hay soplado reportado por técnico pero el cliente no marca Einblasen como GEREED`
      });
    }
  }

  const totalFieldWork = rdBlowings.length + splicings.length;
  const totalDiscrepancies = blowingDiscrepancies.length + splicingDiscrepancies.length + dpDiscrepancies.length;

  return {
    blowingDiscrepancies,
    splicingDiscrepancies,
    dpDiscrepancies,
    stats: {
      totalFieldBlowings: rdBlowings.length,
      totalFieldSplicings: splicings.length,
      unmatchedBlowings: blowingDiscrepancies.filter(d => d.issue === 'no_en_cliente').length,
      unmatchedSplicings: splicingDiscrepancies.filter(d => d.issue === 'no_en_cliente').length,
      discrepancyRate: totalFieldWork > 0 ? Math.round((totalDiscrepancies / totalFieldWork) * 100) : 0
    }
  };
}
