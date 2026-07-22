import React, { useState, useMemo } from 'react';
import { HoursBankEntry, HoursBankAgentSummary } from '../types';
import { 
  Clock, 
  Search, 
  FileText, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HoursBankViewProps {
  hoursBankData: HoursBankEntry[];
  productionData?: any[]; // To help link supervisors if needed
}

export const HoursBankView: React.FC<HoursBankViewProps> = ({ hoursBankData, productionData = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);

  // Helper to map agent names to their supervisors
  const agentSupervisorMap = useMemo(() => {
    const map: Record<string, string> = {};
    productionData.forEach(d => {
      if (d.Agente && d.Supervisor) {
        map[d.Agente.trim()] = d.Supervisor.trim();
      }
    });
    return map;
  }, [productionData]);

  // Aggregate all hours bank data by Agent
  const agentSummaries = useMemo((): HoursBankAgentSummary[] => {
    const summaries: Record<string, {
      Nome: string;
      TotalTrabalhadas: number;
      TotalCompensadas: number;
      Entries: HoursBankEntry[];
    }> = {};

    hoursBankData.forEach(entry => {
      const name = entry.Nome.trim();
      if (!name) return;

      if (!summaries[name]) {
        summaries[name] = {
          Nome: name,
          TotalTrabalhadas: 0,
          TotalCompensadas: 0,
          Entries: []
        };
      }

      summaries[name].Entries.push(entry);

      if (entry.Tipo === 'Horas Trab.') {
        summaries[name].TotalTrabalhadas += entry.Hora;
      } else if (entry.Tipo === 'Horas Compen.') {
        summaries[name].TotalCompensadas += entry.Hora;
      }
    });

    return Object.values(summaries).map(s => {
      // Sort entries by date in ascending order
      const sortedEntries = [...s.Entries].sort((a, b) => {
        return a.DataISO.localeCompare(b.DataISO);
      });

      return {
        Nome: s.Nome,
        Supervisor: agentSupervisorMap[s.Nome] || 'Não Cadastrado',
        TotalTrabalhadas: s.TotalTrabalhadas,
        TotalCompensadas: s.TotalCompensadas,
        SaldoHoras: s.TotalTrabalhadas - s.TotalCompensadas,
        Entries: sortedEntries
      };
    }).sort((a, b) => a.Nome.localeCompare(b.Nome));
  }, [hoursBankData, agentSupervisorMap]);

  // Filter agent summaries based on search
  const filteredSummaries = useMemo(() => {
    return agentSummaries.filter(summary => 
      summary.Nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.Supervisor.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agentSummaries, searchQuery]);

  // Find currently selected agent details
  const selectedAgentDetails = useMemo(() => {
    if (!selectedAgentName) return null;
    return agentSummaries.find(s => s.Nome === selectedAgentName) || null;
  }, [agentSummaries, selectedAgentName]);

  // Formatting hours helper (e.g. 12.28 -> "12h 17m")
  const formatHoursFriendly = (hoursNum: number): string => {
    const sign = hoursNum < 0 ? '-' : '';
    const absHours = Math.abs(hoursNum);
    const wholeHours = Math.floor(absHours);
    const minutes = Math.round((absHours - wholeHours) * 60);
    
    if (minutes === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${minutes}m`;
  };

  // Format hours as exact time string HH:MM
  const formatHoursHHMM = (hoursNum: number): string => {
    const sign = hoursNum < 0 ? '-' : '';
    const absHours = Math.abs(hoursNum);
    const wholeHours = Math.floor(absHours);
    const minutes = Math.round((absHours - wholeHours) * 60);
    return `${sign}${String(wholeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Export current agent's Hours Bank to PDF
  const handleExportAgentPDF = (summary: HoursBankAgentSummary) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    // Header Band (Slate-950)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('EXTRATO DO BANCO DE HORAS', 14, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`ProdAnalytics - Sistema de Produtividade Epidemiológica`, 14, 25);
    doc.text(`Relatório Individual Gerado em: ${today}`, 14, 30);
    doc.text(`Supervisor Responsável: ${summary.Supervisor}`, 14, 35);

    // Agent name big bold below header
    let currentY = 52;
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Agente: ${summary.Nome}`, 14, currentY);
    currentY += 8;

    // Summary Metrics Cards as a grid table
    const summaryTableData = [
      [
        'Total de Horas Trabalhadas (+)',
        'Total de Horas Compensadas (-)',
        'Saldo de Horas Restantes'
      ],
      [
        `${formatHoursFriendly(summary.TotalTrabalhadas)} (${summary.TotalTrabalhadas.toFixed(2)}h)`,
        `${formatHoursFriendly(summary.TotalCompensadas)} (${summary.TotalCompensadas.toFixed(2)}h)`,
        `${formatHoursFriendly(summary.SaldoHoras)} (${summary.SaldoHoras.toFixed(2)}h)`
      ]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [summaryTableData[0]],
      body: [summaryTableData[1]],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [241, 245, 249], fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        2: { textColor: summary.SaldoHoras >= 0 ? [22, 163, 74] : [220, 38, 38] } // Green or Red
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Detailed Entries list
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Lançamentos e Histórico Cronológico', 14, currentY);
    currentY += 6;

    const tableRows = summary.Entries.map((e, index) => [
      index + 1,
      e.Data,
      e.Tipo === 'Horas Trab.' ? 'Horas Trabalhadas (+)' : 'Compensação / Folga (-)',
      e.HoraFormatted || `${e.Hora.toFixed(2)}h`,
      e.Descricao || '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Data', 'Tipo', 'Duração', 'Descrição / Observação']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, // Indigo-ish Blue
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 50 },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { fontStyle: 'italic' }
      },
      didParseCell: (data) => {
        // Highlight columns
        if (data.column.index === 2 && data.cell.section === 'body') {
          if (data.cell.text[0].includes('Trabalhadas')) {
            data.cell.styles.textColor = [22, 163, 74];
          } else {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      }
    });

    doc.save(`Banco_Horas_${summary.Nome.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Header back button if an agent is selected */}
      {selectedAgentDetails ? (
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <button 
            onClick={() => setSelectedAgentName(null)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold text-xs"
          >
            <ArrowLeft size={16} />
            <span>Voltar para Geral</span>
          </button>
          
          <button
            onClick={() => handleExportAgentPDF(selectedAgentDetails)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider shadow active:scale-[0.98]"
          >
            <Download size={12} />
            <span>Exportar PDF</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Clock className="text-indigo-400 animate-pulse" size={18} />
              Banco de Horas Extras
            </h3>
            <span className="text-[10px] font-bold bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
              {agentSummaries.length} Agentes
            </span>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input 
              type="text"
              placeholder="Buscar agente ou supervisor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
            />
          </div>
        </div>
      )}

      {/* 2. MAIN CONTENTS PANEL */}
      {selectedAgentDetails ? (
        // DETAIL VIEW: EXTRACT OF SELECTED AGENT
        <div className="space-y-5">
          {/* Agent Information Header Block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                <User size={24} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-100">{selectedAgentDetails.Nome}</h4>
                <p className="text-[11px] text-slate-400">Supervisor: <span className="font-semibold text-slate-300">{selectedAgentDetails.Supervisor}</span></p>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Trabalhado</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <TrendingUp size={11} />
                  {formatHoursFriendly(selectedAgentDetails.TotalTrabalhadas)}
                </span>
              </div>
              
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Compensado</span>
                <span className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1">
                  <TrendingDown size={11} />
                  {formatHoursFriendly(selectedAgentDetails.TotalCompensadas)}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-center space-y-0.5">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Restante</span>
                <span className={`text-xs font-black flex items-center justify-center gap-0.5 ${selectedAgentDetails.SaldoHoras >= 0 ? 'text-green-400' : 'text-rose-500'}`}>
                  {selectedAgentDetails.SaldoHoras >= 0 ? '+' : ''}
                  {formatHoursFriendly(selectedAgentDetails.SaldoHoras)}
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Table List */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Calendar size={13} className="text-indigo-400" />
              Lançamentos Ordenados por Data
            </h5>

            <div className="space-y-3">
              {selectedAgentDetails.Entries.map((entry, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-900/60 border border-slate-850 hover:border-slate-800 p-3.5 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                      {entry.Data}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                      entry.Tipo === 'Horas Trab.' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      {entry.Tipo === 'Horas Trab.' ? 'Trabalhado (+)' : 'Compensado (-)'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-850/60">
                    <p className="text-[11px] text-slate-300 font-medium">
                      {entry.Descricao || <span className="text-slate-600 italic">Sem descrição</span>}
                    </p>
                    <span className={`text-xs font-black ${
                      entry.Tipo === 'Horas Trab.' ? 'text-emerald-400' : 'text-amber-500'
                    }`}>
                      {entry.Tipo === 'Horas Trab.' ? '+' : '-'}
                      {entry.HoraFormatted || `${entry.Hora.toFixed(1)}h`}
                    </span>
                  </div>
                </div>
              ))}

              {selectedAgentDetails.Entries.length === 0 && (
                <div className="text-center p-8 bg-slate-900 border border-slate-850 rounded-xl space-y-2">
                  <AlertCircle size={24} className="text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Nenhum lançamento registrado para este agente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // OVERVIEW LIST: SUMMARIES OF ALL AGENTS
        <div className="space-y-3.5 overflow-hidden">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
            Clique em um agente para extrato e PDF
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {filteredSummaries.map((agent, index) => (
              <div
                key={index}
                onClick={() => setSelectedAgentName(agent.Nome)}
                className="bg-slate-900/60 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className="space-y-1 shrink truncate max-w-[70%]">
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                    {agent.Nome}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <span>Sup: {agent.Supervisor}</span>
                    <span>•</span>
                    <span className="text-slate-400">{agent.Entries.length} lancs</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <span className={`text-xs font-black block ${agent.SaldoHoras >= 0 ? 'text-green-400' : 'text-rose-500'}`}>
                    {agent.SaldoHoras >= 0 ? '+' : ''}
                    {formatHoursHHMM(agent.SaldoHoras)}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-tight">
                    {formatHoursFriendly(agent.SaldoHoras)} saldo
                  </span>
                </div>
              </div>
            ))}

            {filteredSummaries.length === 0 && (
              <div className="text-center p-8 bg-slate-900 border border-slate-850 rounded-xl space-y-2">
                <Search size={24} className="text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Nenhum agente localizado.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
