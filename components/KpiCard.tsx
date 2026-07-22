import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'slate' | 'teal';
}

const colorStyles = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500' },
  slate: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500' },
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, sub, icon: Icon, color }) => {
  const styles = colorStyles[color];
  
  return (
    <div className={`bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-5 border-l-4 ${styles.border} transition-all hover:shadow-md hover:bg-slate-800/80`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1">{value}</h3>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
        <div className={`p-2 rounded-lg ${styles.bg} ${styles.text}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};