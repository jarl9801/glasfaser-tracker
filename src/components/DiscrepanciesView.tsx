import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, FileWarning, Home, Zap, Activity } from 'lucide-react';
import { analyzeDiscrepancies, type DiscrepancyResult } from '../lib/discrepancyAnalyzer';
import { useAppStore } from '../store/appStore';

export function DiscrepanciesView() {
  const [result, setResult] = useState<DiscrepancyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'blowing' | 'splicing' | 'dp'>('all');
  const showToast = useAppStore((s) => s.showToast);

  const analyze = async () => {
    setLoading(true);
    try {
      const data = await analyzeDiscrepancies();
      setResult(data);
      showToast(`Analisis completo: ${data.blowingDiscrepancies.length + data.splicingDiscrepancies.length + data.dpDiscrepancies.length} discrepancias`, 
        data.stats.discrepancyRate > 0 ? 'error' : 'success');
    } catch (e) {
      showToast('Error al analizar discrepancias', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    analyze();
  }, []);

  if (!result) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-navy" />
      </div>
    );
  }

  const totalDiscrepancies = result.blowingDiscrepancies.length + 
                            result.splicingDiscrepancies.length + 
                            result.dpDiscrepancies.length;

  const filteredData = {
    blowing: filter === 'all' || filter === 'blowing' ? result.blowingDiscrepancies : [],
    splicing: filter === 'all' || filter === 'splicing' ? result.splicingDiscrepancies : [],
    dp: filter === 'all' || filter === 'dp' ? result.dpDiscrepancies : []
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Discrepancias</h2>
          <p className="text-sm text-gray-500">Comparacion entre datos del campo y datos del cliente</p>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-red-500" />
            <span className="text-sm text-gray-600">Tasa de discrepancia</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{result.stats.discrepancyRate}%</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-blue-500" />
            <span className="text-sm text-gray-600">Soplados sin match</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{result.stats.unmatchedBlowings}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Home size={20} className="text-purple-500" />
            <span className="text-sm text-gray-600">Fusiones sin match</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{result.stats.unmatchedSplicings}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <FileWarning size={20} className="text-orange-500" />
            <span className="text-sm text-gray-600">Total discrepancias</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalDiscrepancies}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todas', count: totalDiscrepancies },
          { key: 'blowing', label: 'Soplado', count: result.blowingDiscrepancies.length },
          { key: 'splicing', label: 'Fusiones', count: result.splicingDiscrepancies.length },
          { key: 'dp', label: 'DPs', count: result.dpDiscrepancies.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-navy text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              filter === f.key ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredData.blowing.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Zap size={18} />
                Discrepancias en Soplado
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredData.blowing.map((d, i) => (
                <div key={i} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-navy">{d.dp}</span>
                        <span className="text-sm text-gray-700">{d.calle} {d.hausnummer}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          {d.kaCliente}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{d.details}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>Tecnico: {d.tecnico}</span>
                        <span>{d.metrosSoplados}m</span>
                        <span>{d.colorMiniducto}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredData.splicing.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Home size={18} />
                Discrepancias en Fusiones
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredData.splicing.map((d, i) => (
                <div key={i} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-purple-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-navy">{d.dp}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          {d.fusiones} fusiones
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{d.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredData.dp.length > 0 && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
              <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                <FileWarning size={18} />
                Discrepancias en Estado de DPs
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredData.dp.map((d, i) => (
                <div key={i} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-navy">{d.dp}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{d.details}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-green-50 p-2 rounded">
                          <span className="text-green-700 font-medium">Campo:</span>
                          {d.fieldStatus}
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <span className="text-red-700 font-medium">Cliente:</span>
                          {d.clientStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalDiscrepancies === 0 && (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-green-50 border border-green-100">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-900">Sin discrepancias!</h3>
            <p className="text-sm text-green-700 mt-1">
              Los datos del campo coinciden con los datos del cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
