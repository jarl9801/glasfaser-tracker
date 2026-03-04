import { useState, useEffect } from 'react';
import { RefreshCw, Cloud, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { syncFromGoogleSheets } from '../lib/sheets/csv-export';
import { useAppStore } from '../store/appStore';

export function SheetsSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<string[] | null>(null);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    const last = localStorage.getItem('LAST_SYNC');
    if (last) setLastSync(last);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncDetails(null);
    const result = await syncFromGoogleSheets();
    setSyncing(false);

    if (result.success) {
      const now = new Date().toLocaleString();
      localStorage.setItem('LAST_SYNC', now);
      setLastSync(now);
      setSyncDetails(result.details || null);
      showToast(result.message, 'success');
    } else {
      setSyncDetails(result.details || null);
      showToast(result.error || 'Error al sincronizar', 'error');
    }
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Cloud size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sincronización con Google Sheets</h3>
            <div className="flex items-center gap-2">
              {lastSync ? (
                <p className="text-xs text-gray-500">Última: {lastSync}</p>
              ) : (
                <p className="text-xs text-gray-500">Aún no sincronizado</p>
              )}
              <span className="text-xs px-2 py-0.5 bg-blue-100 rounded-full text-blue-600">
                3 fuentes
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark disabled:opacity-50"
        >
          {syncing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Actualizar datos
            </>
          )}
        </button>
      </div>

      {syncDetails && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Detalles:</h4>
          <div className="space-y-1">
            {syncDetails.map((detail, i) => (
              <p key={i} className={`text-xs ${detail.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {detail.includes('Error') ? '❌' : '✅'} {detail}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-blue-50 p-3 border border-blue-100">
        <p className="text-xs text-blue-700">
          Conectado a 3 hojas de Google Sheets. Los datos se leen directamente via CSV export.
        </p>
      </div>
    </div>
  );
}
