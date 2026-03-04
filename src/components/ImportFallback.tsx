import { Upload, FileText } from 'lucide-react';

export function ImportFallback() {
  return (
    <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
      <div className="flex items-start gap-3">
        <Upload size={20} className="text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Sincronización con Sheets temporalmente no disponible
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Puedes seguir usando la app importando archivos CSV manualmente desde el menú Import.
          </p>
          <a 
            href="#/import" 
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-800 hover:text-amber-900"
          >
            <FileText size={12} />
            Ir a Importar CSV
          </a>
        </div>
      </div>
    </div>
  );
}
