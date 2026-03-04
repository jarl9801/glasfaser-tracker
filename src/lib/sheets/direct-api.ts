// Acceso directo a Google Sheets via API sin Apps Script
import type { FieldBlowing, FieldSplicing } from '../../types';
import { normalizeDP, extractAddress, fuzzyMatchStreet, mapColorEsToDE, normalizeKA } from '../normalize';
import { db } from '../db';

const API_KEY = 'AIzaSyDummyKey'; // El usuario necesita crear una en Google Cloud
const SHEET_IDS = [
  '1g3-t2_02wSLpg2LPBvRgEFY3EFjYPxZJTfpyoAa--EE',
  '1Ssq_EYReehe8ddOrho1B08CzTocXYr2o7Qlnf73gxcs',
  '1jLQf3brTId_hU2nmU16BapEvTYxYDbJJyR6IV_u7MOc'
];

interface SyncResult {
  success: boolean;
  message: string;
  blowings?: number;
  splicings?: number;
  error?: string;
}

async function fetchSheetData(sheetId: string, range: string): Promise<any[][]> {
  // Usar el Apps Script que sí funciona pero con CORS proxy
  const proxyUrl = `https://script.google.com/macros/s/AKfycbwVEe0luONtxNePl0mlmCw-xbCrfZzP5KV98NOjEzLR8o6aY9Uc8hQeZ1iFvGFnMFp6/exec?sheet=${sheetId}&range=${range}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Failed to fetch');
  return await response.json();
}

export async function syncDirectFromSheets(): Promise<SyncResult> {
  try {
    // Intento 1: Apps Script
    const response = await fetch('https://script.google.com/macros/s/AKfycbwVEe0luONtxNePl0mlmCw-xbCrfZzP5KV98NOjEzLR8o6aY9Uc8hQeZ1iFvGFnMFp6/exec?type=all', {
      method: 'GET',
      mode: 'no-cors', // Intentar sin CORS
    });
    
    return { success: false, message: '', error: 'CORS issue - usando fallback CSV' };
  } catch (e) {
    return { success: false, message: '', error: 'Error de conexión' };
  }
}
