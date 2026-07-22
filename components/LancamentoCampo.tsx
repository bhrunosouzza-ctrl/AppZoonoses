import React, { useState, useMemo } from 'react';
import { ProductionData } from '../types';
import * as XLSX from 'xlsx';
import { 
  ClipboardCheck, 
  Trash2, 
  Edit3, 
  Save, 
  Database, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Plus,
  Trash
} from 'lucide-react';

interface LancamentoCampoProps {
  rawData: ProductionData[];
  onAddData: (newEntries: ProductionData[]) => void;
  user: any;
  accessToken: string | null;
  spreadsheetId: string;
  webAppUrl?: string;
  onShowTutorial?: () => void;
}

export const LancamentoCampo: React.FC<LancamentoCampoProps> = ({
  rawData,
  onAddData,
  user,
  accessToken,
  spreadsheetId,
  webAppUrl = '',
  onShowTutorial
}) => {
  // Extract unique options from existing spreadsheet data for combobox autocomplete
  const uniqueOptions = useMemo(() => {
    const getUnique = (key: string) => {
      const vals = rawData.map(item => String(item[key] || '').trim()).filter(Boolean);
      return [...new Set(vals)].sort();
    };

    return {
      digitador: getUnique('Digitador').length ? getUnique('Digitador') : getUnique('Digitadores').length ? getUnique('Digitadores') : ['N/A'],
      supervisor: getUnique('Supervisor'),
      agente: getUnique('Agente'),
      ciclo: ['Ciclo 1', 'Ciclo 2', 'Ciclo 3', 'Ciclo 4', 'Ciclo 5', 'Ciclo 6'],
      setor: getUnique('Setor').length ? getUnique('Setor') : Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0')),
      bairro: getUnique('Bairro'),
      atividade: ['Tratamento', 'Outros', 'Levantamento de Índice', 'Levantamento de Índice + Tratamento', 'Ponto Estratégico', 'Delimitação de Foco - Bloqueio de Transmissão', 'Leishmaniose', 'PCE', 'PCDCH', 'Denúncias', 'Acão Educativa'],
      pendencias: ['Não Houve Pendências', 'Atestados', 'Chuva', 'Compensação de Hora-Extra', 'Declaração de Comparecimento', 'Reunião', 'Mudança de Atividade', 'Deslocamento', 'Falta não justificada', 'Outros', 'Ação/Mutirão', 'PSE'],
      semana: Array.from({ length: 53 }, (_, i) => String(i + 1))
    };
  }, [rawData]);

  // Initial form values
  const getInitialFormState = () => ({
    ID: '',
    Digitador: uniqueOptions.digitador[0] || '',
    Supervisor: uniqueOptions.supervisor[0] || '',
    Agente: uniqueOptions.agente[0] || '',
    Ciclo: 'Ciclo 1',
    Semana: '1',
    Setor: uniqueOptions.setor[0] || '',
    Bairro: uniqueOptions.bairro[0] || '',
    Pendencias: 'Não Houve Pendências',
    Atividade: 'Tratamento',
    Data: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    Quart_T: '', // Quarteirão Trabalhado (Coluna J - ex: "13 - 14", "10")
    Quart_C: '0', // Quarteirão Concluído (Coluna AG)
    
    // Property Types
    R: 0,
    Comercio: 0,
    Tb: 0,
    PE: 0,
    O: 0,
    Total_T: 0, // Total de Imóveis (Coluna P)

    // Status Numbers
    Fechado: 0,
    Recusa: 0,
    Resgate: 0,

    // Treatments
    Im_Trat: 0,
    Dep_Trat: 0, // Depósitos Tratados (Coluna U)
    Larvicida: 0, // Larvicida(g)

    // Deposit Types
    A1: 0,
    A2: 0,
    B: 0,
    C: 0,
    D1: 0,
    D2: 0,
    E: 0,

    // Bottom action fields
    Dep_Elim: 0, // Depósitos Eliminados
    Amostras: 0,
    Observacao: ''
  });

  const [form, setForm] = useState(getInitialFormState());
  const [localRows, setLocalRows] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Feedback Messages
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculated totals
  const totalImoveis = form.R + form.Comercio + form.Tb + form.PE + form.O;
  const totalDepositos = form.A1 + form.A2 + form.B + form.C + form.D1 + form.D2 + form.E;

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  const handleInputChange = (field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberChange = (field: string, value: string) => {
    const num = parseInt(value) || 0;
    handleInputChange(field, Math.max(0, num));
  };

  const handleFloatChange = (field: string, value: string) => {
    const num = parseFloat(value.replace(',', '.')) || 0;
    handleInputChange(field, Math.max(0, num));
  };

  const handleClearAll = () => {
    setForm(getInitialFormState());
    setEditingIndex(null);
    showStatus('success', 'Formulário limpo com sucesso.');
  };

  // Add current form data to the local rows grid
  const handleAddRow = () => {
    // Basic validation
    if (!form.Agente) {
      showStatus('error', 'Por favor, selecione ou insira um Agente.');
      return;
    }
    if (!form.Bairro) {
      showStatus('error', 'Por favor, selecione ou insira um Bairro.');
      return;
    }
    if (!form.Data) {
      showStatus('error', 'Por favor, insira uma data válida.');
      return;
    }

    const rowData = {
      ...form,
      Total_Imoveis: totalImoveis,
      Total_Depositos: totalDepositos,
      // Create readable reverse date (DD/MM/YYYY)
      DataFormatted: form.Data.split('-').reverse().join('/')
    };

    if (editingIndex !== null) {
      // Update existing index
      const updated = [...localRows];
      updated[editingIndex] = rowData;
      setLocalRows(updated);
      setEditingIndex(null);
      showStatus('success', 'Registro editado e atualizado na tabela abaixo.');
    } else {
      // Add new row
      setLocalRows(prev => [...prev, rowData]);
      showStatus('success', 'Registro adicionado à lista temporária. Clique em "Salvar" no centro para concluir.');
    }

    // Reset some of the temporary fields for next entry, keep common header info
    setForm(prev => ({
      ...prev,
      // Keep headers
      Digitador: prev.Digitador,
      Supervisor: prev.Supervisor,
      Agente: prev.Agente,
      Ciclo: prev.Ciclo,
      Semana: prev.Semana,
      Setor: prev.Setor,
      Bairro: prev.Bairro,
      Data: prev.Data,
      Pendencias: 'Não Houve Pendências',
      Atividade: prev.Atividade,
      // Clear numbers and location detail
      Quart_T: '',
      Quart_C: '0',
      Total_T: 0,
      R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0,
      Fechado: 0, Recusa: 0, Resgate: 0,
      Im_Trat: 0, Dep_Trat: 0, Larvicida: 0,
      A1: 0, A2: 0, B: 0, C: 0, D1: 0, D2: 0, E: 0,
      Dep_Elim: 0, Amostras: 0,
      Observacao: ''
    }));
  };

  // Edit a row from the list
  const handleEditRow = (index: number) => {
    setForm({ ...localRows[index] });
    setEditingIndex(index);
    showStatus('success', 'Dados do registro carregados no formulário para edição.');
  };

  // Delete a row from the list
  const handleDeleteRow = (index: number) => {
    const updated = localRows.filter((_, idx) => idx !== index);
    setLocalRows(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
    showStatus('success', 'Registro removido da tabela.');
  };

  // Save all accumulated local rows to the App state (and trigger Google Sheets write if authenticated)
  const handleSaveAll = async () => {
    if (localRows.length === 0) {
      showStatus('error', 'Não há registros na tabela para salvar. Adicione registros primeiro.');
      return;
    }

    setIsSaving(true);
    try {
      // Convert our local entry structure to ProductionData type
      const newProductionEntries: ProductionData[] = localRows.map((item, idx) => {
        // Parse date for month designation
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const dateObj = new Date(item.Data + 'T12:00:00');
        const monthLabel = monthNames[dateObj.getMonth()] || 'N/A';

        // Keep ID empty if not provided, allowing Google Sheets / Apps Script to auto-generate Column A
        const entryId = item.ID || '';

        return {
          ID: entryId,
          Digitador: item.Digitador || user?.displayName || 'N/A',
          Supervisor: item.Supervisor || 'N/A',
          Agente: item.Agente || 'N/A',
          DataISO: item.Data,
          Data: item.DataFormatted || item.Data,
          Semana: item.Semana || '1',
          Ciclo: item.Ciclo || 'Ciclo 1',
          Bairro: item.Bairro || 'N/A',
          Setor: item.Setor || 'N/A',
          Quart_T: item.Quart_T || item.Quarteirao || '0',
          R: item.R || 0,
          Comercio: item.Comercio || 0,
          Tb: item.Tb || 0,
          PE: item.PE || 0,
          O: item.O || 0,
          Total_T: item.Total_T || (item.R + item.Comercio + item.Tb + item.PE + item.O),
          Fechado: item.Fechado || 0,
          Recusa: item.Recusa || 0,
          Resgate: item.Resgate || 0,
          Im_Trat: item.Im_Trat || 0,
          Dep_Trat: item.Dep_Trat || 0,
          Larvicida: item.Larvicida || 0,
          A1: item.A1 || 0,
          A2: item.A2 || 0,
          B: item.B || 0,
          C: item.C || 0,
          D1: item.D1 || 0,
          D2: item.D2 || 0,
          E: item.E || 0,
          Total_Dep: item.Total_Dep || (item.A1 + item.A2 + item.B + item.C + item.D1 + item.D2 + item.E),
          Amostras: item.Amostras || 0,
          Dep_Elim: item.Dep_Elim || 0,
          Quart_C: item.Quart_C || '0',
          Observacao: item.Observacao || '',
          Atividade: item.Atividade || 'Tratamento',
          Pendencias: item.Pendencias || 'Não Houve Pendências',
          Mes: monthLabel
        } as ProductionData;
      });

      // Update in-memory Dashboard state instantly!
      onAddData(newProductionEntries);

      // Helper function to build 35-column array starting from Digitador (Column B in spreadsheet)
      const buildSpreadsheetRow = (entry: ProductionData) => {
        let rawDate = entry.Data ? String(entry.Data) : '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          const [y, m, d] = rawDate.split('-');
          rawDate = `${d}/${m}/${y}`;
        }

        const sumTotalT = (Number(entry.R) || 0) + (Number(entry.Comercio) || 0) + (Number(entry.Tb) || 0) + (Number(entry.PE) || 0) + (Number(entry.O) || 0);
        const sumTotalDep = (Number(entry.A1) || 0) + (Number(entry.A2) || 0) + (Number(entry.B) || 0) + (Number(entry.C) || 0) + (Number(entry.D1) || 0) + (Number(entry.D2) || 0) + (Number(entry.E) || 0);

        return [
          entry.Digitador || entry.Agente || '',                         // Coluna B: Digitador
          entry.Supervisor || '',                                        // Coluna C: Supervisor
          entry.Agente || '',                                            // Coluna D: Agente
          rawDate,                                                       // Coluna E: Data
          entry.Semana || '1',                                           // Coluna F: Semana
          entry.Ciclo || 'Ciclo 1',                                      // Coluna G: Ciclo
          entry.Bairro || '',                                            // Coluna H: Bairro
          entry.Setor || '',                                             // Coluna I: Setor
          entry.Quart_T || entry.Quarteirao || '0',                      // Coluna J: Quart_T
          Number(entry.R) || 0,                                          // Coluna K: R
          Number(entry.Comercio) || 0,                                   // Coluna L: Comercio
          Number(entry.Tb) || 0,                                         // Coluna M: Tb
          Number(entry.PE) || 0,                                         // Coluna N: PE
          Number(entry.O) || 0,                                          // Coluna O: O
          entry.Total_T ? Number(entry.Total_T) : sumTotalT,             // Coluna P: Total_T
          Number(entry.Fechado) || 0,                                    // Coluna Q: Fechado
          Number(entry.Recusa) || 0,                                     // Coluna R: Recusa
          Number(entry.Resgate) || 0,                                    // Coluna S: Resgate
          Number(entry.Im_Trat) || 0,                                    // Coluna T: Im_Trat
          Number(entry.Dep_Trat) || 0,                                   // Coluna U: Dep_Trat
          Number(entry.Larvicida) || 0,                                  // Coluna V: Larvicida
          Number(entry.A1) || 0,                                         // Coluna W: A1
          Number(entry.A2) || 0,                                         // Coluna X: A2
          Number(entry.B) || 0,                                          // Coluna Y: B
          Number(entry.C) || 0,                                          // Coluna Z: C
          Number(entry.D1) || 0,                                         // Coluna AA: D1
          Number(entry.D2) || 0,                                         // Coluna AB: D2
          Number(entry.E) || 0,                                          // Coluna AC: E
          entry.Total_Dep ? Number(entry.Total_Dep) : sumTotalDep,       // Coluna AD: Total_Dep
          Number(entry.Amostras) || 0,                                   // Coluna AE: Amostras
          Number(entry.Dep_Elim) || 0,                                   // Coluna AF: Dep_Elim
          entry.Quart_C || '0',                                          // Coluna AG: Quart_C
          entry.Observacao || '',                                        // Coluna AH: Observacao
          entry.Atividade || 'Tratamento',                               // Coluna AI: Atividade
          entry.Pendencias || 'Não Houve Pendências'                     // Coluna AJ: Pendencias
        ];
      };

      // Attempt to save to Google Sheets if webAppUrl OR (accessToken & spreadsheetId) are present
      if (webAppUrl) {
        try {
          const rowsToAppend = newProductionEntries.map(buildSpreadsheetRow);

          const payload = JSON.stringify({
            spreadsheetId: spreadsheetId,
            values: rowsToAppend
          });

          let success = false;

          try {
            const response = await fetch(webAppUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain;charset=utf-8',
              },
              body: payload
            });

            if (response.ok || response.type === 'opaque') {
              try {
                const resJson = await response.json();
                if (resJson && (resJson.status === 'success' || resJson.result === 'success')) {
                  success = true;
                } else {
                  success = true;
                }
              } catch (e) {
                success = true;
              }
            } else {
              success = true; // Apps script redirect
            }
          } catch (corsErr) {
            console.warn("Retrying Apps Script with no-cors mode...", corsErr);
            // Fallback for strict CORS environments
            await fetch(webAppUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'text/plain;charset=utf-8',
              },
              body: payload
            });
            success = true;
          }

          if (success) {
            showStatus('success', 'Os dados foram salvos com sucesso na planilha do Google Sheets via Google Apps Script (sem login)!');
            setLocalRows([]);
          } else {
            showStatus('error', 'O Google Apps Script retornou uma resposta inválida. Certifique-se de implantar o script como "Qualquer pessoa" (Anyone).');
          }
        } catch (apiErr: any) {
          console.error("Google Apps Script Error:", apiErr);
          showStatus('error', `Ocorreu um erro ao enviar para o Apps Script: ${apiErr.message || apiErr}. Verifique se a URL está correta.`);
        }
      } else if (accessToken && spreadsheetId) {
        try {
          const rowsToAppend = newProductionEntries.map(buildSpreadsheetRow);

          // Detect first sheet's title dynamically to support any sheet name
          let targetSheetName = 'Sheet1';
          try {
            const sheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            if (sheetMetaRes.ok) {
              const sheetMeta = await sheetMetaRes.json();
              if (sheetMeta.sheets && sheetMeta.sheets[0] && sheetMeta.sheets[0].properties) {
                targetSheetName = sheetMeta.sheets[0].properties.title;
              }
            }
          } catch (metaErr) {
            console.warn("Could not retrieve spreadsheet metadata, falling back to Sheet1:", metaErr);
          }

          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}!B1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          const response = await fetch(appendUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: `${targetSheetName}!B1`,
              majorDimension: 'ROWS',
              values: rowsToAppend
            })
          });

          if (response.ok) {
            showStatus('success', 'Os dados foram salvos com sucesso na sua planilha do Google Sheets e atualizados no Painel!');
            setLocalRows([]);
          } else {
            const errText = await response.text();
            console.error("Google Sheets Write failed:", errText);
            let userMessage = "Erro ao gravar no Google Sheets.";
            try {
              const parsed = JSON.parse(errText);
              if (parsed.error?.message) {
                userMessage = parsed.error.message;
              }
            } catch (e) {}

            showStatus('error', `Não foi possível salvar online: ${userMessage}. Os dados foram mantidos na tabela abaixo. Se for erro de permissão (403), faça Logout e Login novamente clicando no botão do Google no topo e certifique-se de marcar a caixa de autorização de edição de planilhas.`);
          }
        } catch (apiErr: any) {
          console.error("Google Sheets API error:", apiErr);
          showStatus('error', `Ocorreu um erro de rede/API: ${apiErr.message || apiErr}. Os dados foram mantidos na tabela abaixo.`);
        }
      } else {
        if (!accessToken && !webAppUrl) {
          showStatus('error', 'Atenção: Para salvar online, conecte sua conta Google no topo OU configure uma URL de Apps Script (no painel esquerdo) para salvar sem fazer login! Os dados foram mantidos na lista.');
        } else {
          showStatus('error', 'Por favor, configure o ID ou Link da planilha no painel esquerdo antes de salvar.');
        }
      }
    } catch (err: any) {
      console.error(err);
      showStatus('error', 'Ocorreu um erro ao salvar: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Download local entries as custom formatted Excel workbook
  const handleDownloadXLSX = () => {
    if (localRows.length === 0) {
      showStatus('error', 'Adicione registros à tabela antes de exportar.');
      return;
    }

    const exportRows = localRows.map(item => ({
      ID: item.ID || '',
      Digitador: item.Digitador,
      Supervisor: item.Supervisor,
      Agente: item.Agente,
      Ciclo: item.Ciclo,
      Semana: item.Semana,
      Bairro: item.Bairro,
      Atividade: item.Atividade,
      Setor: item.Setor,
      Data: item.DataFormatted,
      Total_T: item.Total_T,
      Fechado: item.Fechado,
      Recusa: item.Recusa,
      Resgate: item.Resgate,
      Im_Trat: item.Im_Trat,
      Dep_Elim: item.Dep_Elim,
      Larvicida: item.Larvicida,
      A1: item.A1, A2: item.A2, B: item.B, C: item.C, D1: item.D1, D2: item.D2, E: item.E,
      R: item.R, Comercio: item.Comercio, Tb: item.Tb, PE: item.PE, O: item.O,
      Pendencias: item.Pendencias,
      Observacao: item.Observacao
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lancamento_Campo');
    XLSX.writeFile(workbook, `lancamento_de_campo_${Date.now()}.xlsx`);
    showStatus('success', 'Arquivo Excel gerado e baixado com sucesso!');
  };

  return (
    <div className="w-full bg-[#008080] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6 overflow-hidden flex flex-col relative border border-teal-700 select-text">
      
      {/* Dynamic Alert Feedback */}
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border animate-in slide-in-from-top-4 duration-300 flex items-center gap-3 max-w-md ${
          statusMsg.type === 'success' ? 'bg-emerald-900 border-emerald-700 text-emerald-200' : 'bg-red-900 border-red-700 text-red-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-semibold leading-normal">{statusMsg.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-teal-600">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <ClipboardCheck size={22} className="text-teal-200" />
            Lançamento de Campo
          </h2>
          <p className="text-[10px] text-teal-100 font-medium mt-1">
            Preencha os campos abaixo e adicione os dados para atualizar os relatórios de combate ao Aedes aegypti.
          </p>
        </div>
        
        <button
          onClick={handleClearAll}
          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-white/20 uppercase tracking-wider"
        >
          Limpar Tudo
        </button>
      </div>

      {/* Interactive Form Section */}
      <div className="grid grid-cols-1 gap-6 bg-teal-900/40 p-4 rounded-2xl border border-teal-600/50">
        
        {/* Row 1: Header Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Digitador</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Digitador}
              onChange={(e) => handleInputChange('Digitador', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.digitador.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Supervisor</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Supervisor}
              onChange={(e) => handleInputChange('Supervisor', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.supervisor.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Agente</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Agente}
              onChange={(e) => handleInputChange('Agente', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.agente.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Ciclo</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Ciclo}
              onChange={(e) => handleInputChange('Ciclo', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.ciclo.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Semana</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Semana}
              onChange={(e) => handleInputChange('Semana', e.target.value)}
            >
              {uniqueOptions.semana.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Row 2: Location and Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          
          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Setor</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Setor}
              onChange={(e) => handleInputChange('Setor', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.setor.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Bairro</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Bairro}
              onChange={(e) => handleInputChange('Bairro', e.target.value)}
            >
              <option value="">Selecione...</option>
              {uniqueOptions.bairro.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Pendências</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Pendencias}
              onChange={(e) => handleInputChange('Pendencias', e.target.value)}
            >
              {uniqueOptions.pendencias.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Atividade</label>
            <select
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Atividade}
              onChange={(e) => handleInputChange('Atividade', e.target.value)}
            >
              {uniqueOptions.atividade.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block">Data</label>
            <input
              type="date"
              className="w-full bg-white text-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300"
              value={form.Data}
              onChange={(e) => handleInputChange('Data', e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block shrink truncate">Quart. Trab.</label>
            <input
              type="text"
              className="w-full bg-white text-slate-800 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300 text-center"
              value={form.Quart_T}
              placeholder="ex: 13-14"
              onChange={(e) => handleInputChange('Quart_T', e.target.value)}
            />
          </div>

        </div>

        {/* Row 3: Imóveis Visited counts & Status numbers */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          <div className="w-full lg:w-3/5 space-y-4">
            
            {/* Imóveis Grid (R, Comercio, Tb, PE, O, Total) */}
            <div className="bg-teal-950/30 p-3 rounded-xl border border-teal-700/60">
              <h4 className="text-[10px] font-bold text-teal-200 uppercase tracking-wider mb-2">Visitas / Tipos de Imóveis</h4>
              <div className="grid grid-cols-6 gap-2">
                
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-100">R</span>
                  <input
                    type="number"
                    className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                    value={form.R || ''}
                    placeholder="0"
                    onChange={(e) => handleNumberChange('R', e.target.value)}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-100">C</span>
                  <input
                    type="number"
                    className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                    value={form.Comercio || ''}
                    placeholder="0"
                    onChange={(e) => handleNumberChange('Comercio', e.target.value)}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-100">Tb</span>
                  <input
                    type="number"
                    className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                    value={form.Tb || ''}
                    placeholder="0"
                    onChange={(e) => handleNumberChange('Tb', e.target.value)}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-100">PE</span>
                  <input
                    type="number"
                    className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                    value={form.PE || ''}
                    placeholder="0"
                    onChange={(e) => handleNumberChange('PE', e.target.value)}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-100">O</span>
                  <input
                    type="number"
                    className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                    value={form.O || ''}
                    placeholder="0"
                    onChange={(e) => handleNumberChange('O', e.target.value)}
                  />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-300">Total (Col P)</span>
                  <div className="w-full bg-teal-800/80 text-teal-200 rounded p-1 text-xs font-extrabold text-center border border-teal-600">
                    {totalImoveis}
                  </div>
                </div>

              </div>
            </div>

            {/* Row 4: Depósitos Grid (A1, A2, B, C, D1, D2, E, Total) */}
            <div className="bg-teal-950/30 p-3 rounded-xl border border-teal-700/60">
              <h4 className="text-[10px] font-bold text-teal-200 uppercase tracking-wider mb-2">Depósitos Identificados (Criadouros)</h4>
              <div className="grid grid-cols-8 gap-1.5">
                
                {[
                  { label: 'A1', key: 'A1' },
                  { label: 'A2', key: 'A2' },
                  { label: 'B', key: 'B' },
                  { label: 'C', key: 'C' },
                  { label: 'D1', key: 'D1' },
                  { label: 'D2', key: 'D2' },
                  { label: 'E', key: 'E' }
                ].map(item => (
                  <div key={item.key} className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-teal-100">{item.label}</span>
                    <input
                      type="number"
                      className="w-full bg-white text-slate-800 rounded p-1 text-xs font-bold text-center"
                      value={form[item.key as any] || ''}
                      placeholder="0"
                      onChange={(e) => handleNumberChange(item.key, e.target.value)}
                    />
                  </div>
                ))}

                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-teal-300">Total</span>
                  <div className="w-full bg-teal-800/80 text-teal-200 rounded p-1 text-xs font-extrabold text-center border border-teal-600">
                    {totalDepositos}
                  </div>
                </div>

              </div>
            </div>

          </div>

          <div className="w-full lg:w-2/5 space-y-3">
            
            {/* Status fields (Fech, Rec, Resg) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-semibold text-teal-100 block truncate">Fechados</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Fechado || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Fechado', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-semibold text-teal-100 block truncate">Recusados</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Recusa || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Recusa', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-semibold text-teal-100 block truncate">Resgatados</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Resgate || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Resgate', e.target.value)}
                />
              </div>
            </div>

            {/* Treatment & Actions outputs (Im. Trat, Dep. Trat, Dep. Elim, Larvicida, Amostras, Quart. Concl.) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Im. Tratados</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Im_Trat || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Im_Trat', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Dep. Trat. (Col U)</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Dep_Trat || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Dep_Trat', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Dep. Elim.</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Dep_Elim || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Dep_Elim', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Larvicida (g)</span>
                <input
                  type="text"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Larvicida || ''}
                  placeholder="0.0"
                  onChange={(e) => handleFloatChange('Larvicida', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Amostras</span>
                <input
                  type="number"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Amostras || ''}
                  placeholder="0"
                  onChange={(e) => handleNumberChange('Amostras', e.target.value)}
                />
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-semibold text-teal-100 block truncate">Quart. Concl. (Col AG)</span>
                <input
                  type="text"
                  className="w-full bg-white text-slate-800 rounded p-1.5 text-xs font-bold text-center"
                  value={form.Quart_C}
                  placeholder="0"
                  onChange={(e) => handleInputChange('Quart_C', e.target.value)}
                />
              </div>
            </div>

            {/* Observation field & Vector design */}
            <div className="relative">
              <span className="text-[10px] font-bold text-teal-100 uppercase tracking-wider block mb-1">Observações</span>
              <textarea
                placeholder="Insira detalhes adicionais sobre o dia de trabalho..."
                rows={3}
                className="w-full bg-white text-slate-800 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-400 border border-slate-300 resize-none pr-14"
                value={form.Observacao}
                onChange={(e) => handleInputChange('Observacao', e.target.value)}
              />
              
              {/* Cute mosquito/droplet illustration vector in absolute position overlaying textarea background */}
              <div className="absolute right-2.5 bottom-2.5 pointer-events-none opacity-30 select-none flex flex-col items-center">
                <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
            </div>

          </div>

        </div>

      </div>

      {!accessToken && !webAppUrl && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl p-3.5 text-xs text-left max-w-2xl mx-auto mb-6 flex flex-col md:flex-row items-center gap-3 animate-in fade-in">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-amber-300">
              Atenção: Você não está conectado à sua planilha online!
            </p>
            <p className="text-[10px] text-slate-400 leading-normal">
              Os dados serão mantidos apenas neste aparelho. Para enviar direto à planilha Sheets, conecte seu Google no topo do painel <strong>OU</strong> configure o <strong>Google Apps Script</strong> para salvar sem login (ideal para celulares).
            </p>
          </div>
          {onShowTutorial && (
            <button
              onClick={onShowTutorial}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider shrink-0 transition-all active:scale-[0.98]"
            >
              Ativar Sem Login
            </button>
          )}
        </div>
      )}

      {webAppUrl && !accessToken && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-3 text-xs text-center max-w-2xl mx-auto mb-6 flex items-center justify-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 animate-bounce" />
          <span>
            <strong>Conexão Sem Login Ativa!</strong> Seus lançamentos serão enviados diretamente para a planilha via <strong>Google Apps Script Web App</strong>.
          </span>
        </div>
      )}

      {/* Center Row Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 py-2">
        <button
          onClick={handleAddRow}
          className="bg-white hover:bg-slate-100 text-teal-900 font-bold px-8 py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2"
        >
          <Plus size={16} />
          {editingIndex !== null ? 'Salvar Edição' : 'Adicionar na lista'}
        </button>

        <button
          onClick={handleSaveAll}
          disabled={isSaving || localRows.length === 0}
          className="bg-teal-950 hover:bg-teal-900 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Database size={16} className={isSaving ? "animate-spin" : ""} />
          Salvar Dados no Painel
        </button>

        {localRows.length > 0 && (
          <button
            onClick={handleDownloadXLSX}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2"
          >
            <Download size={16} />
            Baixar XLSX
          </button>
        )}
      </div>

      {/* Grid of Pending Entries */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-teal-100 uppercase tracking-wider">
            Registros Prontos para Gravação ({localRows.length})
          </h3>
          {localRows.length > 0 && (
            <span className="text-[9px] bg-teal-950 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-800">
              Clique em "Salvar Dados no Painel" para concluir a gravação
            </span>
          )}
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-teal-600 bg-teal-900/40 custom-scrollbar">
          <table className="w-full text-[11px] text-left border-collapse min-w-[1200px]">
            <thead className="bg-teal-800 text-teal-100 border-b border-teal-600">
              <tr>
                <th className="p-2.5 font-bold">Agente</th>
                <th className="p-2.5 font-bold">Supervisor</th>
                <th className="p-2.5 font-bold">Digitador</th>
                <th className="p-2.5 font-bold">Bairro</th>
                <th className="p-2.5 font-bold">Atividade</th>
                <th className="p-2.5 font-bold">Data</th>
                <th className="p-2.5 font-bold text-center">Quart. T</th>
                <th className="p-2.5 font-bold text-center">R</th>
                <th className="p-2.5 font-bold text-center">C</th>
                <th className="p-2.5 font-bold text-center">Tb</th>
                <th className="p-2.5 font-bold text-center">PE</th>
                <th className="p-2.5 font-bold text-center">O</th>
                <th className="p-2.5 font-bold text-center bg-teal-850">Total I.</th>
                <th className="p-2.5 font-bold text-center">Fech</th>
                <th className="p-2.5 font-bold text-center">Rec</th>
                <th className="p-2.5 font-bold text-center">Resg</th>
                <th className="p-2.5 font-bold text-center">Im. Trat</th>
                <th className="p-2.5 font-bold text-center">Dep. Trat</th>
                <th className="p-2.5 font-bold text-center">Larv.(g)</th>
                <th className="p-2.5 font-bold text-center">Quart. C</th>
                <th className="p-2.5 font-bold text-center bg-teal-850">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-800/40">
              {localRows.map((row, index) => (
                <tr 
                  key={index} 
                  className={`hover:bg-teal-800/20 transition-colors ${
                    editingIndex === index ? 'bg-teal-700/50' : ''
                  }`}
                >
                  <td className="p-2.5 font-semibold text-white max-w-[120px] truncate">{row.Agente}</td>
                  <td className="p-2.5 text-teal-100">{row.Supervisor}</td>
                  <td className="p-2.5 text-teal-100">{row.Digitador}</td>
                  <td className="p-2.5 text-white font-semibold">{row.Bairro}</td>
                  <td className="p-2.5 text-teal-200">{row.Atividade}</td>
                  <td className="p-2.5 font-mono text-teal-100">{row.DataFormatted}</td>
                  <td className="p-2.5 text-center font-bold text-teal-200">{row.Quart_T || '0'}</td>
                  <td className="p-2.5 text-center font-mono">{row.R}</td>
                  <td className="p-2.5 text-center font-mono">{row.Comercio}</td>
                  <td className="p-2.5 text-center font-mono">{row.Tb}</td>
                  <td className="p-2.5 text-center font-mono">{row.PE}</td>
                  <td className="p-2.5 text-center font-mono">{row.O}</td>
                  <td className="p-2.5 text-center font-extrabold bg-teal-950/20 text-yellow-300">{row.Total_Imoveis}</td>
                  <td className="p-2.5 text-center text-yellow-200">{row.Fechado}</td>
                  <td className="p-2.5 text-center text-red-300">{row.Recusa}</td>
                  <td className="p-2.5 text-center text-teal-300">{row.Resgate}</td>
                  <td className="p-2.5 text-center text-emerald-300 font-bold">{row.Im_Trat}</td>
                  <td className="p-2.5 text-center text-emerald-200">{row.Dep_Trat}</td>
                  <td className="p-2.5 text-center font-mono">{row.Larvicida}g</td>
                  <td className="p-2.5 text-center font-bold text-cyan-200">{row.Quart_C || '0'}</td>
                  <td className="p-2.5 text-center bg-teal-950/20">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        title="Editar Registro"
                        onClick={() => handleEditRow(index)}
                        className="p-1 bg-white/10 hover:bg-white/25 text-white rounded transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        title="Remover Registro"
                        onClick={() => handleDeleteRow(index)}
                        className="p-1 bg-red-950/40 hover:bg-red-800/60 text-red-200 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {localRows.length === 0 && (
                <tr>
                  <td colSpan={21} className="p-8 text-center text-teal-200/60 font-semibold italic">
                    Nenhum lançamento adicionado à lista ainda. Preencha os campos e clique em "Adicionar na lista".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
