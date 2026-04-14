import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface NavGroupProps {
  id: string;
  label: string;
  icon: any;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export const NavGroup: React.FC<NavGroupProps> = ({ id, label, icon: Icon, isOpen, onToggle, children }) => (
  <div className="space-y-1">
    <button 
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] hover:text-slate-300 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Icon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        {label}
      </div>
      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
    {isOpen && (
      <div className="space-y-1 px-2 animate-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);
