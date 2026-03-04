import { useState, useEffect } from 'react';
import { RefreshCw, Settings, CheckCircle, AlertCircle, Database, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { syncFromSheets, getGASConfig, setGASConfig, addSheetUrl, removeSheetUrl, toggleSheetUrl, type SheetConfig } from '../lib/sheets/api';
import { useAppStore } from '../store/appStore';

export function SheetsSync() {
  const [config, setConfig] = useState({ urls: [] as SheetConfig[] });
  const [showConfig, setShowConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [syncDetails, setSyncDetails] = useState<string[] | null>(null);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    setConfig(getGASConfig());
    const last = localStorage.getItem('LAST_SYNC');
    if (last) setLastSync(last);
  }, []);

  const handleAddUrl = () => {
    if (!newUrl || !newName) {
      showToast('Nombre y URL son requeridos', 'error');
      return;
    }
    addSheetUrl(newName, newUrl);
    setConfig(getGASConfig());
    setNewUrl('');
    setNewName('');
    showToast('URL agregada');
  };

  const handleRemove = (id: string) => {
    removeSheetUrl(id);
    setConfig(getGASConfig());
    showToast('URL eliminada');
  };

  const handleToggle = (id: string) => {
    toggleSheetUrl(id);
    setConfig(getGASConfig());
  };

  const handleSync = async () => {
    const activeUrls = config.urls.filter(u => u.active);
    if (activeUrls.length === 0) {
      setShowConfig(true);
      showToast('Configura al menos una URL', 'error');
      return;
    }

    setSyncing(true);
    setSyncDetails(null);
    const result = await syncFromSheets();
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

  const activeCount = config.urls.filter(u => u.active).length;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Database size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sincronización con Sheets</h3>
            <div className="flex items-center gap-2">
              {lastSync ? (
                <p className="text-xs text-gray-500">Última: {lastSync}</p>
              ) : (
                <p className="text-xs text-gray-500">Aún no sincronizado</p>
              )}
              {config.urls.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {activeCount}/{config.urls.length} fuentes
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Settings size={16} />
            {config.urls.length > 0 ? 'Editar' : 'Configurar'}
          </button>

          <button
            onClick={handleSync}
            disabled={syncing || activeCount === 0}
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

      {syncDetails && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Detalles de sincronización:</h4>
          <div className="space-y-1">
            {syncDetails.map((detail, i) => (
              <p key={i} className={`text-xs ${detail.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {detail}
              </p>
            ))}
          </div>
        </div>
      )}

      {showConfig && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 mb-4">
            <p className="mb-2 text-sm font-medium text-blue-800">
              Configurar Google Apps Script
            </p>
            <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
              <li>Abre tu Google Sheet</li>
              <li>Extensions → Apps Script</li>
              <li>Pega el código del archivo <code>google-apps-script-multi.gs</code></li>
              <li>Deploy → New deployment → Web app</li>
              <li>Copia la URL y agrégala aquí</li>
            </ol>
          </div>

          {/* Lista de URLs configuradas */}
          {config.urls.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Fuentes configuradas:</h4>
              {config.urls.map((sheet) => (
                <div key={sheet.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <button
                    onClick={() => handleToggle(sheet.id)}
                    className="text-gray-600 hover:text-gray-800"
                    title={sheet.active ? 'Desactivar' : 'Activar'}
                  >
                    {sheet.active ? (
                      <ToggleRight size={20} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={20} className="text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sheet.name}</p>
                    <p className="text-xs text-gray-500 truncate">{sheet.url.substring(0, 50)}...</p>
                  </div>
                  
                  <a
                    href={sheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Abrir URL"
                  >
                    <ExternalLink size={14} />
                  </a>
                  
                  <button
                    onClick={() => handleRemove(sheet.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agregar nueva URL */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Agregar nueva fuente:</h4>
            <input
              type="text"
              placeholder="Nombre (ej: Proyecto QFF-001)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button
              onClick={handleAddUrl}
              disabled={!newUrl || !newName}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              <Plus size={16} />
              Agregar fuente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
