import { Edit, Trash2, Save, X, Plus, Loader2, UploadCloud, DownloadCloud } from 'lucide-react';

type ButtonKey = 'edit' | 'delete' | 'save' | 'cancel' | 'add' | 'import' | 'export' | 'close';

const loadingIcon = <Loader2 size={18} className="animate-spin" />;

interface ButtonProps {
  buttonConfig: ButtonKey;
  onClick?: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

type ButtonConfig = {
  label: string;
  className: string;
  icon: React.ReactNode;
};

const BUTTON_CONFIG: Record<ButtonKey, ButtonConfig> = {
  edit: {
    label: 'Editar',
    className: 'flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors',
    icon: <Edit size={16} />,
  },
  delete: {
    label: 'Eliminar',
    className: 'flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors',
    icon: <Trash2 size={16} />,
  },
  save: {
    label: 'Guardar Cambios',
    className: 'flex items-center gap-2 px-6 py-2 bg-gb-primary text-white rounded-xl font-bold text-sm hover:bg-gb-primary/90 transition-colors',
    icon: <Save size={16} />,
  },
  cancel: {
    label: 'Cerrar',
    className: 'px-5 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors',
    icon: null,
  },
  add: {
    label: 'Agregar',
    className: 'flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gb-primary/90 transition-all shadow-lg',
    icon: <Plus size={18} />,
  },
  import: {
    label: 'Importar Base de Datos',
    className: 'flex items-center gap-2 bg-white text-gb-secondary border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all shadow-sm',
    icon: <UploadCloud size={18} className="text-gb-primary" />,
  },
  export: {
    label: 'Exportar Base de Datos',
    className: 'flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-200 transition-all shadow-sm',
    icon: <DownloadCloud size={18} className="text-gb-primary" />,
  },
  close: {
    label: '',
    className: 'text-slate-400 hover:text-slate-600 transition-colors',
    icon: <X size={20} />,
  },
};

export function Button({ buttonConfig, onClick, loading, label, className = '' }: ButtonProps) {
    const config = BUTTON_CONFIG[buttonConfig];
    const icon = loading ? loadingIcon : config.icon;

    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`${config.className} ${className} disabled:opacity-60`}
      >
        {icon}
        {label ?? config.label}
      </button>
    );
}