/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Hospital, 
  Calendar, 
  FileText,
  TableProperties,
  Settings
} from 'lucide-react';
import PAUMShield from './PAUMShield';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
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
    <div className="w-60 bg-gb-secondary h-screen text-white flex flex-col fixed left-0 top-0 z-50 overflow-y-auto">
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <button
          onClick={() => onViewChange('dashboard')}
          className="w-full text-left rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white p-1.5 shrink-0 shadow-sm">
              <PAUMShield className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gb-accent">BUAP</p>
              <h2 className="text-sm font-black leading-tight text-white">PAUM</h2>
              <p className="text-[10px] leading-tight text-white/65 mt-1">
                Profesional Asociado en Urgencias Médicas
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="py-6 px-5">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded transition-all duration-200 text-sm font-medium ${
                currentView === item.id 
                  ? 'bg-gb-primary text-white' 
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-5 border-t border-white/10">
        <button className="flex items-center gap-3 p-2 text-white/50 hover:text-white transition-colors text-xs w-full font-bold uppercase tracking-wider">
          <Settings size={16} />
          <span>Configuración</span>
        </button>
      </div>
    </div>
  );
}

