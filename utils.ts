
import { ProductionData, DashboardAnalytics, GoalSettings, NeighborhoodMetric, AttendanceMetrics, HoursBankEntry, HoursBankAgentSummary } from './types';
import * as XLSX from 'xlsx';

export const COLORS = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  teal: '#14b8a6',
  yellow: '#eab308',
  slate: '#64748b',
  pink: '#ec4899',
  indigo: '#6366f1'
};

// Dados baseados na imagem fornecida
export const NEIGHBORHOOD_TARGETS: Record<string, number> = {
    'Alegre': 1631,
    'Alphaville': 728,
    'Alvorada I': 606,
    'Alvorada II': 910,
    'Ana Malaquias': 595,
    'Ana Moura': 1657,
    'Ana Rita': 2080,
    'Arataquinha': 95,
    'Bairro dos Vieiras': 503,
    'Bandeirantes': 226,
    'Bela Vista': 759,
    'Bromélias': 1344,
    'Cachoeira Do Vale': 2267,
    'Centro Norte': 1793,
    'Centro Sul': 1158,
    'Coqueiro': 78,
    'Cruzeirinho': 557,
    'Distrito Industrial': 145,
    'Eldorado': 1174,
    'Esplanada': 164,
    'Fazenda Boa Vista': 203,
    'Ferroviarios': 84,
    'Funcionários': 853,
    'Garapa': 170,
    'Jardim Primavera': 291,
    'Jardim Vitória': 236,
    'John Kennedy': 389,
    'João XXIII': 1119,
    'Limoeiro': 966,
    'Macuco': 1466,
    'Nossa Senhora das Graças': 477,
    'Nova Esperança': 282,
    'Novo Horizonte': 862,
    'Novo Tempo': 1733,
    'Olaria': 852,
    'Parque Recanto': 96,
    'Petrópolis': 622,
    'Primavera': 2167,
    'Quitandinha': 901,
    'Recanto do Sossego': 202,
    'Recanto Verde': 2770,
    'Santa Cecília': 662,
    'Santa Maria': 836,
    'Santa Rita': 94,
    'Santa Terezinha': 701,
    'São Cristóvão': 385,
    'São José': 956,
    'Serenata': 429,
    'Timirim': 1214,
    'Timotinho': 498,
    'Vale Verde': 280,
    'Vila dos Técnicos': 242
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  feb: 1, apr: 3, may: 4, aug: 7, sep: 8, oct: 9, dec: 11
};

export const parseExcelDate = (serial: number | string): { mes: string; dataFormatada: string } => {
  let mes = 'Indefinido';
  let dataFormatada = '';

  if (typeof serial === 'number') {
    // Excel date serial conversion with buffer
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000) + 12 * 3600 * 1000);
    const parsedYear = date.getUTCFullYear();
    const parsedMonth = date.getUTCMonth(); // 0-indexed
    const parsedDay = date.getUTCDate();
    
    // Swap day and month because Excel/Google Sheets interpreted the Brazilian format DD/MM/YYYY
    // as US format MM/DD/YYYY for any days 1 to 12.
    const correctMonth = parsedDay - 1; // 0-indexed (using parsedDay)
    const correctDay = parsedMonth + 1; // 1-indexed (using parsedMonth)
    
    const correctDate = new Date(parsedYear, correctMonth, correctDay);
    mes = correctDate.toLocaleString('pt-BR', { month: 'long' });
    dataFormatada = `${parsedYear}-${String(correctMonth + 1).padStart(2, '0')}-${String(correctDay).padStart(2, '0')}`;
  } else if (typeof serial === 'string') {
    const trimmed = serial.trim();
    const ptDateRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/;
    const matchPt = trimmed.match(ptDateRegex);

    if (matchPt) {
        const day = parseInt(matchPt[1], 10);
        const month = parseInt(matchPt[2], 10) - 1;
        let year = parseInt(matchPt[3], 10);
        if (year < 100) {
            year += 2000;
        }
        const date = new Date(year, month, day);
        mes = date.toLocaleString('pt-BR', { month: 'long' });
        dataFormatada = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
        const mmmRegex = /^(\d{1,2})-(\w{3})-(\d{2,4})$/;
        const matchMmm = trimmed.match(mmmRegex);
        if (matchMmm) {
            const day = parseInt(matchMmm[1], 10);
            const mStr = matchMmm[2].toLowerCase();
            const month = MONTH_MAP[mStr];
            if (month !== undefined) {
                let y = parseInt(matchMmm[3], 10);
                const year = y < 100 ? 2000 + y : y;
                const date = new Date(year, month, day);
                mes = date.toLocaleString('pt-BR', { month: 'long' });
                dataFormatada = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        } else {
            try {
                let dateStr = trimmed;
                if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                    dateStr += 'T12:00:00';
                }
                
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    mes = date.toLocaleString('pt-BR', { month: 'long' });
                    dataFormatada = date.toISOString().split('T')[0];
                }
            } catch (e) {
                console.warn("Date parse error", e);
            }
        }
    }
  }

  return { 
    mes: mes.charAt(0).toUpperCase() + mes.slice(1), 
    dataFormatada 
  };
};

export const processDataFile = (file: File): Promise<ProductionData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return reject("No data read");
        
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const processed = data.map((row: any) => {
            const { mes, dataFormatada } = parseExcelDate(row.Data);
            const n = (val: any) => {
              if (typeof val === 'number') return isNaN(val) ? 0 : val;
              if (!val) return 0;
              const parsed = parseFloat(String(val).replace(',', '.'));
              return isNaN(parsed) ? 0 : parsed;
            };

            return {
                ...row,
                Supervisor: row.Supervisor || 'N/A',
                Agente: row.Agente || 'N/A',
                Ciclo: row.Ciclo || 'N/A',
                Mes: mes,
                Bairro: row.Bairro || 'N/A',
                Atividade: row.Atividade || 'N/A', // Read Atividade
                DataISO: dataFormatada,
                Total_T: n(row.Total_T),
                Fechado: n(row.Fechado),
                Recusa: n(row.Recusa),
                Resgate: n(row.Resgate),
                Im_Trat: n(row.Im_Trat),
                Dep_Elim: n(row.Dep_Elim),
                Larvicida: n(row.Larvicida),
                A1: n(row.A1), A2: n(row.A2), B: n(row.B), C: n(row.C), D1: n(row.D1), D2: n(row.D2), E: n(row.E),
                R: n(row.R), Comercio: n(row.Comercio), Tb: n(row.Tb), PE: n(row.PE), O: n(row.O),
                Pendencias: row.Pendencias || 'Sem Pendência',
                Observacao: row.Observacao || ''
            } as ProductionData;
        });
        resolve(processed);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsBinaryString(file);
  });
};

const normalizeHeader = (h: string): string => {
  if (!h) return '';
  return h.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // remove accents
          .trim()
          .toLowerCase();
};

const getHeaderIndices = (headerRow: string[]): Record<string, number> => {
  const indices: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    const norm = normalizeHeader(header);
    if (norm === 'id') indices['ID'] = index;
    else if (norm === 'digitadores' || norm === 'digitador') indices['Digitadores'] = index;
    else if (norm === 'supervisor') indices['Supervisor'] = index;
    else if (norm === 'agente') indices['Agente'] = index;
    else if (norm === 'data') indices['Data'] = index;
    else if (norm === 'semana') indices['Semana'] = index;
    else if (norm === 'ciclo') indices['Ciclo'] = index;
    else if (norm === 'bairro') indices['Bairro'] = index;
    else if (norm === 'setor') indices['Setor'] = index;
    else if (norm === 'quart_t' || norm === 'quart t' || norm === 'quarteirao_t' || norm === 'quarteirao') indices['Quart_T'] = index;
    else if (norm === 'r') indices['R'] = index;
    else if (norm === 'comercio') indices['Comercio'] = index;
    else if (norm === 'tb') indices['Tb'] = index;
    else if (norm === 'pe') indices['PE'] = index;
    else if (norm === 'o') indices['O'] = index;
    else if (norm === 'total_t' || norm === 'total t' || norm === 'total') indices['Total_T'] = index;
    else if (norm === 'fechado') indices['Fechado'] = index;
    else if (norm === 'recusa') indices['Recusa'] = index;
    else if (norm === 'resgate') indices['Resgate'] = index;
    else if (norm === 'im_trat' || norm === 'im trat') indices['Im_Trat'] = index;
    else if (norm === 'dep_trat' || norm === 'dep trat') indices['Dep_Trat'] = index;
    else if (norm === 'larvicida') indices['Larvicida'] = index;
    else if (norm === 'a1') indices['A1'] = index;
    else if (norm === 'a2') indices['A2'] = index;
    else if (norm === 'b') indices['B'] = index;
    else if (norm === 'c') indices['C'] = index;
    else if (norm === 'd1') indices['D1'] = index;
    else if (norm === 'd2') indices['D2'] = index;
    else if (norm === 'e') indices['E'] = index;
    else if (norm === 'total_dep' || norm === 'total dep') indices['Total_Dep'] = index;
    else if (norm === 'amostras') indices['Amostras'] = index;
    else if (norm === 'dep_elim' || norm === 'dep elim') indices['Dep_Elim'] = index;
    else if (norm === 'quart_c' || norm === 'quart c') indices['Quart_C'] = index;
    else if (norm === 'observacao' || norm === 'observacoes') indices['Observacao'] = index;
    else if (norm === 'atividade') indices['Atividade'] = index;
    else if (norm === 'pendencias') indices['Pendencias'] = index;
  });
  return indices;
};

export const processGoogleSheetsRows = (rows: any[][]): ProductionData[] => {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || ''));
  const indices = getHeaderIndices(headers);

  const getIndex = (key: string, fallbackIdx: number): number => {
    return indices[key] !== undefined ? indices[key] : fallbackIdx;
  };

  const dataRows = rows.slice(1);
  return dataRows.map((row) => {
    const getVal = (key: string, fallbackIdx: number) => {
      const idx = getIndex(key, fallbackIdx);
      return row[idx] !== undefined ? row[idx] : '';
    };

    const rawDataField = getVal('Data', 4);
    const { mes, dataFormatada } = parseExcelDate(rawDataField);
    const n = (val: any) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const parsed = parseFloat(String(val).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    const parsedId = getIndex('ID', 0) !== -1 ? String(getVal('ID', 0)).trim() : '';

    return {
      ID: parsedId,
      Digitador: String(getVal('Digitadores', 1) || 'N/A').trim(),
      Supervisor: String(getVal('Supervisor', 2) || 'N/A').trim(),
      Agente: String(getVal('Agente', 3) || 'N/A').trim(),
      DataISO: dataFormatada,
      Data: rawDataField,
      Semana: String(getVal('Semana', 5) || '1').trim(),
      Ciclo: String(getVal('Ciclo', 6) || 'N/A').trim(),
      Bairro: String(getVal('Bairro', 7) || 'N/A').trim(),
      Setor: String(getVal('Setor', 8) || 'N/A').trim(),
      Quart_T: String(getVal('Quart_T', 9) || '0').trim(),
      R: n(getVal('R', 10)),
      Comercio: n(getVal('Comercio', 11)),
      Tb: n(getVal('Tb', 12)),
      PE: n(getVal('PE', 13)),
      O: n(getVal('O', 14)),
      Total_T: n(getVal('Total_T', 15)),
      Fechado: n(getVal('Fechado', 16)),
      Recusa: n(getVal('Recusa', 17)),
      Resgate: n(getVal('Resgate', 18)),
      Im_Trat: n(getVal('Im_Trat', 19)),
      Dep_Trat: n(getVal('Dep_Trat', 20)),
      Larvicida: n(getVal('Larvicida', 21)),
      A1: n(getVal('A1', 22)),
      A2: n(getVal('A2', 23)),
      B: n(getVal('B', 24)),
      C: n(getVal('C', 25)),
      D1: n(getVal('D1', 26)),
      D2: n(getVal('D2', 27)),
      E: n(getVal('E', 28)),
      Total_Dep: n(getVal('Total_Dep', 29)),
      Amostras: n(getVal('Amostras', 30)),
      Dep_Elim: n(getVal('Dep_Elim', 31)),
      Quart_C: String(getVal('Quart_C', 32) || '0').trim(),
      Observacao: String(getVal('Observacao', 33) || '').trim(),
      Atividade: String(getVal('Atividade', 34) || 'N/A').trim(),
      Pendencias: String(getVal('Pendencias', 35) || 'Não Houve Pendências').trim(),
      Mes: mes
    } as ProductionData;
  }).filter(item => item.Agente && item.Agente !== 'N/A' && item.Supervisor && item.Supervisor !== 'N/A');
};

export const calculateAnalytics = (data: ProductionData[], goals: GoalSettings): DashboardAnalytics => {
  const metrics: DashboardAnalytics = {
    totalTrabalhados: 0, totalFechados: 0, totalRecusas: 0, totalResgates: 0,
    totalImTrat: 0, totalDepElim: 0, totalLarvicida: 0,
    depositos: { A1: 0, A2: 0, B: 0, C: 0, D1: 0, D2: 0, E: 0 },
    imoveis: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 },
    mediaDiaria: "0",
    percTrabalhados: 0,
    percPerda: 0,
    rankingAgentes: [],
    rankingSupervisores: [],
    neighborhoods: [],
    chartDepositos: [],
    chartImoveis: [],
    attendance: { atestados: 0, declaracoes: 0, consultas: 0, compensacoes: 0, faltas: 0 }
  };

  const agents: Record<string, any> = {};
  const supervisors: Record<string, any> = {};
  const neighborhoodsData: Record<string, NeighborhoodMetric> = {};
  const uniqueDays = new Set<string>();

  // Initialize neighborhoods from constants
  Object.keys(NEIGHBORHOOD_TARGETS).forEach(name => {
      neighborhoodsData[name] = {
          name,
          target: NEIGHBORHOOD_TARGETS[name],
          visited: 0,
          coverage: 0,
          propertyTypes: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 }
      };
  });

  data.forEach(d => {
    // Only count day if there is production
    if (d.Total_T > 0) {
        uniqueDays.add(d.DataISO + d.Agente);
    }

    metrics.totalTrabalhados += d.Total_T;
    metrics.totalFechados += d.Fechado;
    metrics.totalRecusas += d.Recusa;
    metrics.totalResgates += d.Resgate;
    metrics.totalImTrat += d.Im_Trat;
    metrics.totalDepElim += d.Dep_Elim;
    metrics.totalLarvicida += d.Larvicida;

    ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E'].forEach(k => metrics.depositos[k] = (metrics.depositos[k] || 0) + (d[k] || 0));
    ['R', 'Comercio', 'Tb', 'PE', 'O'].forEach(k => metrics.imoveis[k] = (metrics.imoveis[k] || 0) + (d[k] || 0));

    // Calculate HR Metrics
    const p = (d.Pendencias || '').toLowerCase();
    let isAtestado = false, isDeclaracao = false, isConsulta = false, isCompensacao = false, isFalta = false;

    if (p.includes('atestado')) { metrics.attendance.atestados++; isAtestado = true; }
    else if (p.includes('declaração') || p.includes('declaracao')) { metrics.attendance.declaracoes++; isDeclaracao = true; }
    else if (p.includes('consulta')) { metrics.attendance.consultas++; isConsulta = true; }
    else if (p.includes('compensação') || p.includes('compensacao')) { metrics.attendance.compensacoes++; isCompensacao = true; }
    else if (p.includes('falta')) {
        // If it says "falta" but also "justificada" without "não" or "injustificada", it is justified.
        // Otherwise (plain "falta", "falta não justificada", "falta injustificada"), it counts as a Fault.
        const isJustificada = p.includes('justificada') && !p.includes('não') && !p.includes('nao') && !p.includes('injustificada');
        if (!isJustificada) {
            metrics.attendance.faltas++;
            isFalta = true;
        }
    }

    // Agent Aggregation
    if (!agents[d.Agente]) {
        agents[d.Agente] = {
            name: d.Agente, Supervisor: d.Supervisor,
            Trabalhados: 0, Fechados: 0, Recusas: 0, Resgates: 0, Im_Trat: 0, Dias: new Set(),
            attendance: { atestados: 0, declaracoes: 0, consultas: 0, compensacoes: 0, faltas: 0 }
        };
    }
    agents[d.Agente].Trabalhados += d.Total_T;
    agents[d.Agente].Fechados += d.Fechado;
    agents[d.Agente].Recusas += d.Recusa;
    agents[d.Agente].Resgates += d.Resgate;
    agents[d.Agente].Im_Trat += d.Im_Trat;
    
    // Add per-agent attendance
    if (isAtestado) agents[d.Agente].attendance.atestados++;
    if (isDeclaracao) agents[d.Agente].attendance.declaracoes++;
    if (isConsulta) agents[d.Agente].attendance.consultas++;
    if (isCompensacao) agents[d.Agente].attendance.compensacoes++;
    if (isFalta) agents[d.Agente].attendance.faltas++;

    // Only count day for agent if there is production
    if (d.Total_T > 0) {
        agents[d.Agente].Dias.add(d.DataISO);
    }

    // Supervisor Aggregation
    if (!supervisors[d.Supervisor]) {
        supervisors[d.Supervisor] = { name: d.Supervisor, Trabalhados: 0, Agentes: new Set() };
    }
    supervisors[d.Supervisor].Trabalhados += d.Total_T;
    supervisors[d.Supervisor].Agentes.add(d.Agente);

    // Neighborhood Aggregation
    if ((d.Atividade || '').toLowerCase() !== 'levantamento de índice') {
        let bName = d.Bairro;
        const targetKey = Object.keys(NEIGHBORHOOD_TARGETS).find(k => k.toLowerCase() === bName.toLowerCase());
        
        if (targetKey) {
            neighborhoodsData[targetKey].visited += d.Total_T;
            neighborhoodsData[targetKey].propertyTypes.R += d.R || 0;
            neighborhoodsData[targetKey].propertyTypes.Comercio += d.Comercio || 0;
            neighborhoodsData[targetKey].propertyTypes.Tb += d.Tb || 0;
            neighborhoodsData[targetKey].propertyTypes.PE += d.PE || 0;
            neighborhoodsData[targetKey].propertyTypes.O += d.O || 0;
        } else if (bName !== 'N/A') {
            if (!neighborhoodsData[bName]) {
                 neighborhoodsData[bName] = {
                    name: bName,
                    target: 0,
                    visited: 0,
                    coverage: 0,
                    propertyTypes: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 }
                };
            }
            neighborhoodsData[bName].visited += d.Total_T;
            neighborhoodsData[bName].propertyTypes.R += d.R || 0;
            neighborhoodsData[bName].propertyTypes.Comercio += d.Comercio || 0;
            neighborhoodsData[bName].propertyTypes.Tb += d.Tb || 0;
            neighborhoodsData[bName].propertyTypes.PE += d.PE || 0;
            neighborhoodsData[bName].propertyTypes.O += d.O || 0;
        }
    }
  });

  const diasCount = uniqueDays.size || 1;
  metrics.mediaDiaria = (metrics.totalTrabalhados / diasCount).toFixed(1);

  const totalVisitas = metrics.totalTrabalhados + metrics.totalFechados + metrics.totalRecusas;
  metrics.percTrabalhados = totalVisitas > 0 ? (metrics.totalTrabalhados / totalVisitas * 100) : 0;
  metrics.percPerda = totalVisitas > 0 ? ((metrics.totalFechados + metrics.totalRecusas) / totalVisitas * 100) : 0;

  metrics.rankingAgentes = Object.values(agents).map((a: any) => ({
      ...a,
      MediaDiaria: (a.Trabalhados / (a.Dias.size || 1)).toFixed(1),
      StatusMeta: a.Trabalhados >= goals.trabalhados
  })).sort((a: any, b: any) => b.Trabalhados - a.Trabalhados);

  metrics.rankingSupervisores = Object.values(supervisors).map((s: any) => ({
      ...s,
      MediaPorAgente: (s.Trabalhados / (s.Agentes.size || 1)).toFixed(0)
  })).sort((a: any, b: any) => b.MediaPorAgente - a.MediaPorAgente);

  // Process Neighborhoods
  metrics.neighborhoods = Object.values(neighborhoodsData)
    .map(n => ({
        ...n,
        coverage: n.target > 0 ? (n.visited / n.target) * 100 : 0
    }))
    .sort((a, b) => b.visited - a.visited);

  metrics.chartDepositos = Object.entries(metrics.depositos).map(([key, val]) => ({ name: key, value: val }));
  metrics.chartImoveis = Object.entries(metrics.imoveis).map(([key, val]) => ({ name: key, value: val }));

  return metrics;
};

export const parseCSV = (text: string): string[][] => {
  // Simple delimiter auto-detection
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const lines: string[][] = [];
  let row: string[] = [];
  let col = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          col += '"';
          i++;
        } else {
          insideQuote = false;
        }
      } else {
        col += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === delimiter) {
        row.push(col);
        col = "";
      } else if (char === '\r' || char === '\n') {
        row.push(col);
        col = "";
        lines.push(row);
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        col += char;
      }
    }
  }
  if (col !== "" || row.length > 0) {
    row.push(col);
    lines.push(row);
  }
  // Filter out completely empty lines
  return lines.filter(r => r.some(cell => cell.trim() !== ''));
};

export const fetchPublicGoogleSheet = async (spreadsheetId: string, accessToken?: string | null): Promise<ProductionData[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Erro ao baixar a planilha: ${response.statusText}`);
  }
  const text = await response.text();
  const rows = parseCSV(text);
  return processGoogleSheetsRows(rows);
};

export interface FetchSheetsResult {
  productionData: ProductionData[];
  hoursBankData: HoursBankEntry[];
}

export const fetchPublicGoogleSheetsAllData = async (spreadsheetId: string, accessToken?: string | null): Promise<FetchSheetsResult> => {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Erro ao baixar a planilha: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // 1. Parse Sheet1 (Production Data)
  let productionData: ProductionData[] = [];
  const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
  const ws1 = workbook.Sheets['Sheet1'] || workbook.Sheets[firstSheetName];
  if (ws1) {
    const rows = XLSX.utils.sheet_to_json<any[]>(ws1, { header: 1 });
    productionData = processGoogleSheetsRows(rows);
  }

  // 2. Parse Sheet2 (Hours Bank Data)
  let hoursBankData: HoursBankEntry[] = [];
  const secondSheetName = workbook.SheetNames.find(name => 
    name.toLowerCase() === 'sheet2' || 
    name.toLowerCase().includes('hora') || 
    name.toLowerCase().includes('banco')
  ) || workbook.SheetNames[1];
  
  if (secondSheetName) {
    const ws2 = workbook.Sheets[secondSheetName];
    if (ws2 && ws2['!ref']) {
      const range = XLSX.utils.decode_range(ws2['!ref']);
      if (range && range.s && range.e) {
        const parseHoursValue = (rawVal: any, formattedVal: any): number => {
          if (rawVal === undefined || rawVal === null) return 0;
          if (typeof rawVal === 'number') {
            const hasColon = formattedVal && String(formattedVal).includes(':');
            if (hasColon) return rawVal * 24;
            if (rawVal % 1 !== 0 && Math.abs(rawVal) < 3) return rawVal * 24;
            return rawVal;
          }
          const str = String(formattedVal || rawVal).trim();
          if (!str) return 0;
          if (str.includes(':')) {
            const parts = str.split(':');
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            const sign = str.startsWith('-') || hours < 0 ? -1 : 1;
            return sign * (Math.abs(hours) + minutes / 60 + seconds / 3600);
          }
          const num = parseFloat(str.replace(',', '.'));
          return isNaN(num) ? 0 : num;
        };

        const formatHoursValue = (hoursNum: number): string => {
          const sign = hoursNum < 0 ? '-' : '';
          const absHours = Math.abs(hoursNum);
          const wholeHours = Math.floor(absHours);
          const minutes = Math.round((absHours - wholeHours) * 60);
          if (minutes === 0) return `${sign}${wholeHours}`;
          return `${sign}${wholeHours}:${String(minutes).padStart(2, '0')}`;
        };

        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const cellNome = ws2[XLSX.utils.encode_cell({ r, c: 0 })];
          const cellData = ws2[XLSX.utils.encode_cell({ r, c: 1 })];
          const cellHora = ws2[XLSX.utils.encode_cell({ r, c: 2 })];
          const cellTipo = ws2[XLSX.utils.encode_cell({ r, c: 3 })];
          const cellDesc = ws2[XLSX.utils.encode_cell({ r, c: 4 })];
          
          const nome = cellNome ? String(cellNome.v || '').trim() : '';
          if (nome && nome !== 'Nome') {
            let dateFormatted = '';
            let dateISO = '';
            if (cellData) {
              // 1. Try formatted text (cellData.w) first, which is the most reliable representation of what is shown in Excel
              const formattedStr = cellData.w ? String(cellData.w).trim() : '';
              const ptDateRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/;
              const matchPtFormatted = formattedStr.match(ptDateRegex);

              if (matchPtFormatted) {
                const day = parseInt(matchPtFormatted[1], 10);
                const month = parseInt(matchPtFormatted[2], 10);
                let year = parseInt(matchPtFormatted[3], 10);
                if (year < 100) {
                  year += 2000;
                }
                dateFormatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                dateISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              } else if (typeof cellData.v === 'number') {
                // Excel serial number (swap day and month due to locale inversion for day 1-12)
                const dateObj = new Date(Math.round((cellData.v - 25569) * 86400 * 1000) + 12 * 3600 * 1000);
                const parsedYear = dateObj.getUTCFullYear();
                const parsedMonth = dateObj.getUTCMonth(); // 0-indexed
                const parsedDay = dateObj.getUTCDate();
                
                const correctMonth = parsedDay - 1; // 0-indexed
                const correctDay = parsedMonth + 1; // 1-indexed
                
                dateFormatted = `${String(correctDay).padStart(2, '0')}/${String(correctMonth + 1).padStart(2, '0')}/${parsedYear}`;
                dateISO = `${parsedYear}-${String(correctMonth + 1).padStart(2, '0')}-${String(correctDay).padStart(2, '0')}`;
              } else if (cellData.v && (cellData.v instanceof Date || Object.prototype.toString.call(cellData.v) === '[object Date]')) {
                // Date object
                const dateObj = cellData.v;
                const day = dateObj.getUTCDate();
                const month = dateObj.getUTCMonth() + 1;
                const year = dateObj.getUTCFullYear();
                dateFormatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                dateISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              } else {
                // Fallback to raw string value
                const rawDateStr = String(cellData.v || '').trim();
                const { dataFormatada } = parseExcelDate(rawDateStr);
                dateISO = dataFormatada;
                if (dataFormatada) {
                  const [y, m, d] = dataFormatada.split('-');
                  dateFormatted = `${d}/${m}/${y}`;
                } else {
                  dateFormatted = rawDateStr;
                }
              }
            }
            
            const hoursParsed = cellHora ? parseHoursValue(cellHora.v, cellHora.w) : 0;
            const horaFormatted = cellHora ? (cellHora.w || formatHoursValue(hoursParsed)) : '0';
            const tipoStr = cellTipo ? String(cellTipo.v || '').trim() : '';
            const tipoNormalized = (tipoStr.toLowerCase().includes('compen') || tipoStr.toLowerCase().includes('comp')) 
              ? 'Horas Compen.' 
              : 'Horas Trab.';
              
            const descricao = cellDesc ? String(cellDesc.v || '').trim() : '';
            
            hoursBankData.push({
              Nome: nome,
              Data: dateFormatted,
              DataISO: dateISO,
              Hora: hoursParsed,
              HoraFormatted: horaFormatted,
              Tipo: tipoNormalized as 'Horas Trab.' | 'Horas Compen.',
              Descricao: descricao || '-'
            });
          }
        }
      }
    }
  }

  return {
    productionData,
    hoursBankData
  };
};

export interface GoogleDriveSheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export const fetchUserGoogleSheets = async (accessToken: string): Promise<GoogleDriveSheetFile[]> => {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'+and+trashed=false&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime,webViewLink)&pageSize=40`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    throw new Error(`Erro ao buscar planilhas do Google Drive: ${response.statusText}`);
  }
  const data = await response.json();
  return data.files || [];
};

