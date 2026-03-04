import { useState, useEffect } from 'react';
import { RefreshCw, Settings, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { syncFromSheets, getSheetsConfig, setSheetsConfig } from '../lib/sheets/api';
import { useAppStore } from '../store/appStore';

export function SheetsSync() {
  const [url, setUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    const saved = getSheetsConfig();
    if (saved) setUrl(saved);
    const last = localStorage.getItem('LAST_SYNC');
    if (last) setLastSync(last);
  }, []);

  const handleSaveConfig = () => {
    setSheetsConfig(url);
    setShowConfig(false);
    showToast('URL guardada');
  };

  const handleSync = async () => {
    if (!url) {
      setShowConfig(true);
      return;
    }

    setSyncing(true);
    const result = await syncFromSheets();
    setSyncing(false);

    if (result.success) {
      const now = new Date().toLocaleString();
      localStorage.setItem('LAST_SYNC', now);
      setLastSync(now);
      showToast(result.message, 'success');
    } else {
      showToast(result.error || 'Error al sincronizar', 'error');
    }
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Database size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sincronización con Sheets</h3>
            {lastSync ? (
              <p className="text-xs text-gray-500">Última sincronización: {lastSync}</p>
            ) : (
              <p className="text-xs text-gray-500">Aún no sincronizado</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Settings size={16} />
            Configurar
          </button>

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
                Actualizar
              </>
            )}
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <p className="mb-2 text-sm font-medium text-blue-800">
              Configurar Google Apps Script
            </p>
            <ol className="mb-4 list-decimal pl-5 text-sm text-blue-700 space-y-1">
              <li>Abre tu Google Sheet</li>
              <li>Extensions → Apps Script</li>
              <li>Pega el código del archivo que te daré</li>
              <li>Deploy → New deployment → Web app</li>
              <li>Copia la URL y pégala aquí</li>
            </ol>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button
              onClick={handleSaveConfig}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              <CheckCircle size={16} />
              Guardar
            </button>
          </div>

          {!url && (
            <p className="mt-2 flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle size={14} />
              Primero configura la URL del Apps Script
            </p>
          )}
        </div>
      )}
    </div>
  );
}
