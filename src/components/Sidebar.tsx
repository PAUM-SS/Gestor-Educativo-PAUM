import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Hospital, 
  Calendar, 
  FileText,
  TableProperties,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import PAUMShield from './PAUMShield';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentView, onViewChange, collapsed, onToggle }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio PAUM', icon: LayoutDashboard },
    { id: 'curriculum', label: 'Plan de Estudios', icon: BookOpen },
    { id: 'faculty', label: 'Cuerpo Docente', icon: Users },
    { id: 'students', label: 'Cohortes Estudiantiles', icon: Users },
    { id: 'clinical-fields', label: 'Sedes Clínicas', icon: Hospital },
    { id: 'scheduling', label: 'Programación Académica', icon: TableProperties },
    { id: 'calendar', label: 'Calendario BUAP', icon: Calendar },
    { id: 'minutes', label: 'Minutas y Alertas', icon: FileText },
  ];

  return (
    <div className={`${collapsed ? 'w-20' : 'w-60'} bg-gb-secondary h-screen text-white flex flex-col fixed left-0 top-0 z-50 overflow-y-auto transition-all duration-300`}> 
      <div className={`px-5 pt-5 pb-4 border-b border-white/10 `}>
        <button
          onClick={() => onViewChange('dashboard')}
          className={`
            w-full ${!collapsed ? 'rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-colors text-left' : ''}
          `}
          aria-label="Ir al inicio"
        >
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-14 h-14 rounded-full bg-white p-1.5 shrink-0 shadow-sm">
              <PAUMShield className="w-full h-full" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gb-accent">BUAP</p>
                <h2 className="text-sm font-black leading-tight text-white">PAUM</h2>
                <p className="text-[10px] leading-tight text-white/65 mt-1">
                  Profesional Asociado en Urgencias Médicas
                </p>
              </div>
            )}
          </div>
        </button>
      </div>

      <div className="py-6 px-5">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} py-4 px-1 rounded transition-all duration-200 text-sm font-medium ${
                currentView === item.id 
                  ? 'bg-gb-primary text-white' 
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-5 border-t border-white/10 space-y-3">
        <button 
          className={`
            flex items-center gap-3 p-2 text-white/50 hover:text-white transition-colors text-xs w-full font-bold uppercase tracking-wider ${collapsed ? 'justify-center' : ''}
          `}
        >
          <Settings size={18} />
          {!collapsed && <span>Configuración</span>}
        </button>
        <button
          onClick={onToggle}
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 p-2 text-white/70 hover:text-white transition-colors text-xs w-full font-bold uppercase tracking-wider rounded-lg bg-white/5`}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <span className="inline-flex items-center gap-2">
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && 'Colapsar'}
          </span>
        </button>
      </div>
    </div>
  );
}

