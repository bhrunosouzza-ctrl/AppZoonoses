import React from 'react';
import { GoalSettings } from '../types';
import { X } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: GoalSettings;
  setGoals: (goals: GoalSettings) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, goals, setGoals }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-in fade-in duration-200 p-0 sm:p-4">
      {/* Click outside backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>
      
      <div className="relative bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl transition-all animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 pb-10 sm:pb-6">
        {/* Pull handle decoration for mobile view */}
        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-5 sm:hidden" onClick={onClose}></div>

        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-100">Configurar Metas</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={18} />
            </button>
        </div>
        
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Meta Trabalhados (Ciclo)</label>
            <input 
                type="number" 
                value={goals.trabalhados} 
                onChange={(e) => setGoals({...goals, trabalhados: Number(e.target.value)})} 
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-505 outline-none transition-all placeholder-slate-600 text-xs font-medium" 
            />
          </div>
          <div className="flex gap-3">
            <div className="w-1/2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Mín Diária</label>
                <input 
                    type="number" 
                    value={goals.diariaMin} 
                    onChange={(e) => setGoals({...goals, diariaMin: Number(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-505 outline-none transition-all text-xs font-medium" 
                />
            </div>
            <div className="w-1/2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Máx Diária</label>
                <input 
                    type="number" 
                    value={goals.diariaMax} 
                    onChange={(e) => setGoals({...goals, diariaMax: Number(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-505 outline-none transition-all text-xs font-medium" 
                />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Eficiência Mínima (%)</label>
            <input 
                type="number" 
                value={goals.eficienciaMin} 
                onChange={(e) => setGoals({...goals, eficienciaMin: Number(e.target.value)})} 
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-indigo-505 outline-none transition-all text-xs font-medium" 
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="w-1/2 py-3 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-xl font-bold transition-all text-xs">Cancelar</button>
          <button onClick={onClose} className="w-1/2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-950/40 transition-all active:scale-[0.98] text-xs">Salvar</button>
        </div>
      </div>
    </div>
  );
};