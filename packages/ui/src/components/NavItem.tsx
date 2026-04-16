import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  label: string;
  path: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  path,
  icon: Icon,
  isActive,
  onClick,
  className,
}: NavItemProps) => (
  <Link
    to={path}
    onClick={onClick}
    className={cn(
      'flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all duration-200 group',
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
      className,
    )}
  >
    <div className="flex items-center gap-3">
      <Icon
        size={18}
        className={cn(isActive ? 'text-white' : 'group-hover:scale-110 transition-transform')}
      />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
  </Link>
);
