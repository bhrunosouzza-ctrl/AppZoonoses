import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  UploadCloud, BarChart2, Target, Briefcase, Droplet, 
  TrendingUp, Home, Users, AlertTriangle, ClipboardList, PieChart as PieIcon, MapPin, FileText,
  Stethoscope, FileCheck, Clock, UserX, Activity, SlidersHorizontal, ArrowLeft, ChevronRight, CheckCircle, Info, Database, Sparkles, Smartphone, Monitor, ChevronUp, ChevronDown, ClipboardCheck, Award, FileSpreadsheet
} from 'lucide-react';
import { ProductionData, FilterState, GoalSettings, HoursBankEntry } from '../types';
import { processDataFile, calculateAnalytics, COLORS, processGoogleSheetsRows, fetchPublicGoogleSheet, fetchPublicGoogleSheetsAllData, fetchUserGoogleSheets, GoogleDriveSheetFile } from '../utils';
import { KpiCard } from './KpiCard';
import { GoalModal } from './GoalModal';
import { generatePDFReport, generateProductivityAndNeighborhoodsPDFReport } from './ReportGenerator';
import { AgentDetailsModal } from './AgentDetailsModal';
import { HoursBankView } from './HoursBankView';
import { LancamentoCampo } from './LancamentoCampo';
import { initAuth, googleSignIn, logout } from '../firebaseAuth';
import { User } from 'firebase/auth';
// --- Custom Tooltip Components for Mobile ---

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-xl shadow-xl z-50 min-w-[160px] text-xs">
                <div className="border-b border-slate-700 pb-1.5 mb-1.5">
                    <p className="font-bold text-slate-100">{label}</p>
                    {data.Supervisor && (
                        <p className="text-[10px] text-slate-400">Sup: {data.Supervisor}</p>
                    )}
                </div>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}:
                            </span>
                            <span className="font-mono font-bold text-slate-100">
                                {entry.value?.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {payload.length > 1 && (
                        <div className="border-t border-slate-700 mt-1.5 pt-1.5 flex items-center justify-between font-semibold">
                            <span className="text-slate-400">Total:</span>
                            <span className="font-mono text-white">{total.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = (data.payload as any).percent || 0;

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-xl shadow-xl z-50 text-xs">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }}></span>
                    <p className="font-bold text-slate-100">
                        {{ 'R': 'Residencial', 'Tb': 'Terreno Baldio', 'PE': 'Ponto Estratégico', 'O': 'Outros' }[data.name || ''] || data.name}
                    </p>
                </div>
                <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between gap-4">
                        <span>Qtd:</span>
                        <span className="font-mono font-bold text-white">{data.value?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span>Perc:</span>
                        <span className="font-mono font-bold text-blue-400">{(percent * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// --- Mock Demo Data ---
const generateDemoData = (): ProductionData[] => {
  const supervisors = ["Cláudio Silva", "Marcia Souza", "Renato Alencar"];
  const agents = [
    { name: "Carlos Drummond", sup: "Cláudio Silva" },
    { name: "Cecília Meireles", sup: "Cláudio Silva" },
    { name: "Machado Assis", sup: "Marcia Souza" },
    { name: "Clarice Lispector", sup: "Marcia Souza" },
    { name: "Guimarães Rosa", sup: "Renato Alencar" },
    { name: "Manuel Bandeira", sup: "Renato Alencar" }
  ];
  const bairrosList = ["Centro Norte", "Alvorada I", "Primavera", "Centro sul", "Nossa Senhora das Graças", "Limoeiro", "Timirim"];
  const cycles = ["Ciclo 03/2026", "Ciclo 04/2026"];
  const months = ["Junho", "Julho"];
  
  const demoList: ProductionData[] = [];
  
  // Create 45 days of production records
  for (let i = 0; i < 45; i++) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - i);
    const dateISO = dateObj.toISOString().split('T')[0];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    
    agents.forEach(agent => {
      // 10% chance of absence on weekdays
      let pendencia = "Sem Pendência";
      let totalT = 0, fechado = 0, recusa = 0, resgate = 0;
      let imTrat = 0, depElim = 0, larvicida = 0;
      let r = 0, tb = 0, com = 0, pe = 0, o = 0;
      let obs = "";

      if (isWeekend) {
        return; // No work on weekends
      }
      
      const randAbsence = Math.random();
      if (randAbsence < 0.08) {
        const absences = ["Atestado Médico", "Declaração comparecimento", "Consulta Odonto", "Compensação BH"];
        pendencia = absences[Math.floor(randAbsence * absences.length * 12.5)];
        obs = "Ocorrência registrada no RH pelo supervisor.";
      } else if (randAbsence < 0.11) {
        pendencia = "Falta Não Justificada";
        obs = "Agente não compareceu ao serviço, sem justificativa prévia.";
      } else {
        // High quality production day
        totalT = Math.floor(20 + Math.random() * 12); // 20 - 32 visited
        fechado = Math.floor(Math.random() * 4); // 0-3 closed
        recusa = Math.floor(Math.random() * 2); // 0-1 refusal
        resgate = Math.floor(Math.random() * 3); // 0-2 rescue
        
        imTrat = Math.floor(5 + Math.random() * 8); // 5-12 treated
        depElim = Math.floor(Math.random() * 4); 
        larvicida = Math.random() * 15; // larvicida grams

        // Distribute property types visited
        r = Math.floor(totalT * 0.7);
        tb = Math.floor(totalT * 0.15);
        com = Math.floor(totalT * 0.1);
        pe = Math.floor(Math.random() * 2);
        o = totalT - (r + tb + com + pe);
        if (o < 0) o = 0;

        if (Math.random() < 0.15) {
          pendencia = "Chuva forte no período da tarde";
          obs = "Equipe abrigada temporariamente. Retomou atividades logo em seguida.";
        }
      }

      // Random cycle and month
      const cycleIdx = i < 22 ? 0 : 1;
      const demoActivities = ["Tratamento", "Levantamento de Índice", "Ponto Estratégico", "Bloqueio de Transmissão"];
      const demoActivity = demoActivities[(i + agent.name.length) % demoActivities.length];

      demoList.push({
        Supervisor: agent.sup,
        Agente: agent.name,
        Ciclo: cycles[cycleIdx],
        Mes: months[cycleIdx],
        Bairro: bairrosList[Math.floor(Math.random() * bairrosList.length)],
        Atividade: demoActivity,
        DataISO: dateISO,
        Data: dateISO.split('-').reverse().join('/'),
        Total_T: totalT,
        Fechado: fechado,
        Recusa: recusa,
        Resgate: resgate,
        Im_Trat: imTrat,
        Dep_Elim: depElim,
        Larvicida: larvicida,
        A1: Math.floor(Math.random() * 2),
        A2: Math.floor(Math.random() * 3),
        B: Math.floor(Math.random() * 4),
        C: Math.floor(Math.random() * 2),
        D1: Math.floor(Math.random() * 2),
        D2: Math.floor(Math.random() * 1),
        E: Math.floor(Math.random() * 3),
        R: r,
        Comercio: com,
        Tb: tb,
        PE: pe,
        O: o,
        Pendencias: pendencia,
        Observacao: obs
      });
    });
  }

  return demoList;
};


export const Dashboard: React.FC = () => {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    const [rawData, setRawData] = useState<ProductionData[]>([]);
    const [hoursBankData, setHoursBankData] = useState<HoursBankEntry[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Auth states
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [authInitialized, setAuthInitialized] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    // Google Sheets public/private integration states
    const [isFetchingSheets, setIsFetchingSheets] = useState(false);
    const [sheetsError, setSheetsError] = useState<string | null>(null);
    const [spreadsheetId, setSpreadsheetId] = useState("1irlAWm0LeKcG6RJpAb0bzlW2KzoEU1Ke9c4tDf_x_F4");
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    // Google Apps Script no-login web app states
    const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyFhO6MO00U3gcZcgV3sMdh3Emr8mnG4jYLnzQ4JX_rxSBMEQTX1bRUcqo6DKP3h4t95Q/exec";
    const [webAppUrl, setWebAppUrl] = useState<string>(() => {
        return (typeof window !== 'undefined' && localStorage.getItem('google_sheets_web_app_url')) || DEFAULT_WEB_APP_URL;
    });
    const [showScriptTutorial, setShowScriptTutorial] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleWebAppUrlChange = (url: string) => {
        const cleaned = url.trim();
        setWebAppUrl(cleaned);
        if (typeof window !== 'undefined') {
            localStorage.setItem('google_sheets_web_app_url', cleaned);
        }
    };

    // Google Drive sheets selector states
    const [userDriveSheets, setUserDriveSheets] = useState<GoogleDriveSheetFile[]>([]);
    const [isFetchingDrive, setIsFetchingDrive] = useState(false);
    const [driveError, setDriveError] = useState<string | null>(null);

    const loadUserDriveSheets = async (token: string) => {
        setIsFetchingDrive(true);
        setDriveError(null);
        try {
            const files = await fetchUserGoogleSheets(token);
            setUserDriveSheets(files);
        } catch (err: any) {
            console.warn("Soft handled: Error fetching user drive sheets:", err);
            setDriveError(err.message || "Erro ao buscar planilhas do Google Drive.");
        } finally {
            setIsFetchingDrive(false);
        }
    };

    const loadPublicSpreadsheet = async (id: string, token: string | null = accessToken) => {
        setSheetsError(null);
        setIsFetchingSheets(true);
        try {
            const { productionData, hoursBankData: hbData } = await fetchPublicGoogleSheetsAllData(id, token);
            if (productionData.length === 0) {
                throw new Error("Nenhum dado de produção válido encontrado ou processado na planilha.");
            }
            setRawData(productionData);
            setHoursBankData(hbData);
            
            // Set last sync timestamp
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastSyncTime(timeStr);
        } catch (err: any) {
            console.error("Public spreadsheet load error:", err);
            let errMsg = err.message || "Erro ao carregar dados da planilha.";
            if (token) {
                errMsg += " Certifique-se de que sua conta Google atual tem permissão para ler esta planilha.";
            } else {
                errMsg += " Se a planilha for privada, entre com sua conta do Google que tem acesso à ela utilizando o botão de login.";
            }
            setSheetsError(errMsg);
        } finally {
            setIsFetchingSheets(false);
        }
    };

    // Initialize Firebase Auth listener on mount
    useEffect(() => {
        const unsubscribe = initAuth(
            (usr, token) => {
                setUser(usr);
                setAccessToken(token);
                setAuthInitialized(true);
                loadPublicSpreadsheet(spreadsheetId, token);
                loadUserDriveSheets(token);
            },
            () => {
                setUser(null);
                setAccessToken(null);
                setAuthInitialized(true);
                loadPublicSpreadsheet(spreadsheetId, null);
                setUserDriveSheets([]);
            }
        );
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Load spreadsheet when spreadsheet ID changes (only after auth is initialized)
    useEffect(() => {
        if (authInitialized) {
            loadPublicSpreadsheet(spreadsheetId, accessToken);
        }
    }, [spreadsheetId, authInitialized]);

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        setSheetsError(null);
        try {
            const result = await googleSignIn();
            if (result) {
                setUser(result.user);
                setAccessToken(result.accessToken);
                await loadPublicSpreadsheet(spreadsheetId, result.accessToken);
                await loadUserDriveSheets(result.accessToken);
            }
        } catch (error: any) {
            console.error("Sign in failed:", error);
            let userFriendlyMsg = "Falha ao entrar com o Google.";
            if (error.code === 'auth/popup-closed-by-user') {
                userFriendlyMsg = "A janela de login foi fechada antes de concluir o acesso. " + 
                    (isIframe ? "Como o app está sendo exibido dentro de uma janela restrita (iframe), use o botão 'Abrir em Nova Aba' no topo direito da tela para fazer login perfeitamente!" : "Por favor, tente novamente.");
            } else if (error.code === 'auth/popup-blocked') {
                userFriendlyMsg = "O pop-up de login foi bloqueado pelo seu navegador. " +
                    (isIframe ? "Permita pop-ups nas configurações ou simplesmente clique em 'Abrir em Nova Aba' no topo direito para conectar sua conta." : "Por favor, permita pop-ups para este site e tente novamente.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                userFriendlyMsg = "Uma solicitação de login anterior já estava em andamento. Tente novamente.";
            } else {
                userFriendlyMsg += " Detalhes: " + (error.message || error);
            }
            setSheetsError(userFriendlyMsg);
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            setUser(null);
            setAccessToken(null);
            setRawData([]);
            setHoursBankData([]);
            setUserDriveSheets([]);
            setLastSyncTime(null);
            setSheetsError("Você foi desconectado. Faça login para acessar suas planilhas privadas.");
        } catch (error: any) {
            console.error("Logout failed:", error);
        }
    };
    
    // Mobile navigation tabs: 'overview' (Visão Geral), 'quality' (Tratamento/Saúde), 'neighborhoods' (Bairros), 'teams' (Supervisores), 'more' (RH & Pendências), 'hours' (Banco de Horas)
    const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'neighborhoods' | 'teams' | 'more' | 'hours' | 'lançamento'>('overview');
    const [innerManagementTab, setInnerManagementTab] = useState<'hr' | 'issues'>('hr');
    
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    
    // User selected visual format mode (Simulator on right, or clean immersive full screen)
    const [viewMode, setViewMode] = useState<'simulator' | 'full'>('full');
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    // Simulated Clock for status bar
    const [clockString, setClockString] = useState("09:30");

    useEffect(() => {
        // Detect actual mobile screen or viewports
        const checkDevice = () => {
            setIsMobileDevice(window.innerWidth < 768);
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        
        // Timer for virtual clock status bar
        const timer = setInterval(() => {
            const now = new Date();
            const hrs = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            setClockString(`${hrs}:${mins}`);
        }, 1000);

        return () => {
            window.removeEventListener('resize', checkDevice);
            clearInterval(timer);
        };
    }, []);

    const [goals, setGoals] = useState<GoalSettings>({
        trabalhados: 1000,
        diariaMin: 20,
        diariaMax: 25,
        eficienciaMin: 80
    });

    const [filters, setFilters] = useState<FilterState>({
        supervisor: 'Todos',
        agente: 'Todos',
        ciclo: 'Todos',
        mes: 'Todos',
        ano: 'Todos',
        atividade: 'Todos'
    });

    const [localFilters, setLocalFilters] = useState<FilterState>({ ...filters });

    // Synchronize local filter sheet state whenever global filters change
    useEffect(() => {
        setLocalFilters({ ...filters });
    }, [filters]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await processDataFile(file);
            setRawData(data);
        } catch (error) {
            console.error("Error processing file", error);
            alert("Erro ao processar o arquivo. Certifique-se de que é um arquivo Excel ou CSV de produção válido.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDemoData = () => {
        setLoading(true);
        setTimeout(() => {
            setRawData(generateDemoData());
            setLoading(false);
        }, 800);
    };

    // Filter used for the main dashboard display
    const filteredData = useMemo(() => {
        return rawData.filter(item => {
            return (filters.supervisor === 'Todos' || item.Supervisor === filters.supervisor) &&
                   (filters.agente === 'Todos' || item.Agente === filters.agente) &&
                   (filters.ciclo === 'Todos' || item.Ciclo === filters.ciclo) &&
                   (filters.mes === 'Todos' || item.Mes === filters.mes) &&
                   (filters.ano === 'Todos' || item.DataISO.startsWith(filters.ano)) &&
                   (filters.atividade === 'Todos' || !filters.atividade || item.Atividade === filters.atividade);
        });
    }, [rawData, filters]);

    const analytics = useMemo(() => calculateAnalytics(filteredData, goals), [filteredData, goals]);

    // Track expanded neighborhood cards
    const [expandedNeighborhoods, setExpandedNeighborhoods] = useState<Record<string, boolean>>({});

    const toggleNeighborhood = (name: string) => {
        setExpandedNeighborhoods(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    // Data for the Agent Modal - applies all active filters (Ano, Supervisor, Ciclo, Mês, Atividade)
    const selectedAgentData = useMemo(() => {
        if (!selectedAgent) return [];
        return rawData.filter(item => {
            const matchesAgent = item.Agente === selectedAgent;
            const matchesYear = filters.ano === 'Todos' || item.DataISO.startsWith(filters.ano);
            const matchesSupervisor = filters.supervisor === 'Todos' || item.Supervisor === filters.supervisor;
            const matchesCiclo = filters.ciclo === 'Todos' || item.Ciclo === filters.ciclo;
            const matchesMes = filters.mes === 'Todos' || item.Mes === filters.mes;
            const matchesAtividade = filters.atividade === 'Todos' || !filters.atividade || item.Atividade === filters.atividade;
            
            return matchesAgent && matchesYear && matchesSupervisor && matchesCiclo && matchesMes && matchesAtividade;
        });
    }, [rawData, selectedAgent, filters]);

    const options = useMemo(() => {
        const getUnique = (key: string) => [...new Set(rawData.map(item => item[key]).filter(Boolean))];
        const years = [...new Set(rawData.map(d => d.DataISO.split('-')[0]))].sort().reverse();
        
        const monthOrder = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const uniqueActivities = getUnique('Atividade').filter((a: any) => a && a !== 'N/A' && a !== '0');
        const fallbackActivities = ['Tratamento', 'Levantamento de Índice', 'Ponto Estratégico', 'Bloqueio de Transmissão', 'Outros'];
        const finalActivities = uniqueActivities.length > 0 ? uniqueActivities.sort() : fallbackActivities;

        return {
            supervisores: getUnique('Supervisor').sort(),
            agentes: getUnique('Agente').sort(),
            ciclos: getUnique('Ciclo').sort(),
            meses: getUnique('Mes').sort((a: any, b: any) => {
                const idxA = monthOrder.indexOf(a);
                const idxB = monthOrder.indexOf(b);
                const weightA = idxA === -1 ? 999 : idxA;
                const weightB = idxB === -1 ? 999 : idxB;
                return weightA - weightB;
            }),
            anos: years,
            atividades: finalActivities
        };
    }, [rawData]);

    const pendenciasList = useMemo(() => {
        return filteredData.filter(d => 
            d.Pendencias && 
            !d.Pendencias.toLowerCase().includes('não houve') && 
            !d.Pendencias.toLowerCase().includes('sem pendência') &&
            d.Pendencias !== '0'
        );
    }, [filteredData]);

    const hrChartData = useMemo(() => {
        return [
            { name: 'Atestados', value: analytics.attendance.atestados, fill: COLORS.blue },
            { name: 'Declarações', value: analytics.attendance.declaracoes, fill: COLORS.teal },
            { name: 'Consultas', value: analytics.attendance.consultas, fill: COLORS.purple },
            { name: 'Compensações', value: analytics.attendance.compensacoes, fill: COLORS.orange },
            { name: 'Faltas Injust.', value: analytics.attendance.faltas, fill: COLORS.red },
        ].filter(d => d.value > 0);
    }, [analytics]);

    const [showPdfOptionsModal, setShowPdfOptionsModal] = useState<boolean>(false);

    const handleExportDetailedPDF = () => {
        generatePDFReport(analytics, pendenciasList, filters, filteredData);
        setShowPdfOptionsModal(false);
    };

    const handleExportProductivityAndNeighborhoodsPDF = () => {
        generateProductivityAndNeighborhoodsPDFReport(analytics, filters, filteredData, goals);
        setShowPdfOptionsModal(false);
    };

    const handleApplyFilters = () => {
        setFilters({ ...localFilters });
        setIsFilterSheetOpen(false);
    };

    const handleResetFilters = () => {
        const reseted = {
            supervisor: 'Todos',
            agente: 'Todos',
            ciclo: 'Todos',
            mes: 'Todos',
            ano: 'Todos',
            atividade: 'Todos'
        };
        setLocalFilters(reseted);
        setFilters(reseted);
        setIsFilterSheetOpen(false);
    };

    const activeFiltersCount = useMemo(() => {
        return Object.entries(filters).filter(([key, value]) => value !== 'Todos').length;
    }, [filters]);

    const CHART_GRID_COLOR = "#334155";
    const CHART_TEXT_COLOR = "#94a3b8";

    const getCoverageColor = (percent: number) => {
        if (percent >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (percent >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    const getCoverageProgressColor = (percent: number) => {
        if (percent >= 80) return 'bg-gradient-to-r from-green-500 to-emerald-500';
        if (percent >= 60) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        return 'bg-gradient-to-r from-red-500 to-rose-500';
    };

    // Mobile UI Core Content
    const renderMobileAppContent = () => {
        // --- SCREEN A: WELCOME / UPLOAD ---
        if (rawData.length === 0) {
            return (
                <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar">
                    {/* Upper decorative elements */}
                    <div className="pt-8 text-center space-y-6">
                        <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-950/40 relative">
                            <Activity className="text-white animate-pulse" size={40} />
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border border-slate-950"></span>
                            </span>
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold text-white tracking-tight">ProdAnalytics</h2>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto">Sua plataforma móvel de monitoramento epidemiológico e produtividade de vetores.</p>
                        </div>

                        {/* Feature Badges */}
                        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-4 text-left">
                            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                                <Sparkles className="text-blue-400 shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Visão Geral</h4>
                                    <p className="text-[10px] text-slate-500">Métricas e ranking em tempo real.</p>
                                </div>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5">
                                <MapPin className="text-teal-400 shrink-0 mt-0.5" size={16} />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Bairros</h4>
                                    <p className="text-[10px] text-slate-500">Acompanhe a cobertura de metas.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Google Sheets Integration Section */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4 max-w-sm mx-auto w-full shadow-lg">
                        <div className="flex items-center gap-2 text-indigo-400 pb-1 border-b border-slate-800/60">
                            <Database size={18} className="text-emerald-400 animate-pulse" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Planilha Google Sheets</h3>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                                Link ou ID da Planilha do Google
                            </label>
                            <input 
                                type="text"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                value={spreadsheetId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const idMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                                    const newId = idMatch ? idMatch[1] : val.trim();
                                    setSpreadsheetId(newId);
                                }}
                                placeholder="Insira o Link ou ID da Planilha"
                            />
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                                Cole o link da planilha ou o ID. O Google Drive e Sheets foram habilitados para leitura.
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Apps Script URL (Opcional - Sem Login)
                                </label>
                                <button 
                                    onClick={() => setShowScriptTutorial(true)}
                                    className="text-[9px] text-indigo-450 font-bold hover:underline"
                                >
                                    Como salvar sem login?
                                </button>
                            </div>
                            <input 
                                type="text"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-650"
                                value={webAppUrl}
                                onChange={(e) => handleWebAppUrlChange(e.target.value)}
                                placeholder="https://script.google.com/macros/s/.../exec"
                            />
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal">
                                Adicione a URL do Apps Script para salvar seus lançamentos na planilha diretamente do celular sem fazer login.
                            </p>
                        </div>

                        {/* Google Drive Sheet Picker */}
                        {user && (
                            <div className="border-t border-slate-800/60 pt-3">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex justify-between items-center">
                                    <span className="flex items-center gap-1"><Database size={11} className="text-indigo-400" /> Planilhas no seu Drive</span>
                                    {isFetchingDrive && (
                                        <span className="text-[9px] text-indigo-400 font-normal animate-pulse">Buscando...</span>
                                    )}
                                </label>
                                {userDriveSheets.length > 0 ? (
                                    <div className="bg-slate-950 border border-slate-850 rounded-xl divide-y divide-slate-850/60 max-h-40 overflow-y-auto custom-scrollbar">
                                        {userDriveSheets.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => {
                                                    setSpreadsheetId(file.id);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-[11px] flex flex-col hover:bg-indigo-600/10 transition-colors ${
                                                    spreadsheetId === file.id ? 'bg-indigo-600/15 text-indigo-300 font-bold border-l-2 border-indigo-500' : 'text-slate-300'
                                                }`}
                                            >
                                                <span className="truncate w-full font-medium">{file.name}</span>
                                                <span className="text-[9px] text-slate-500 mt-0.5">Modificado: {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-950/40 border border-slate-850/80 rounded-xl p-2.5 text-center text-[10px] text-slate-500 space-y-1">
                                        {isFetchingDrive ? (
                                            <span>Buscando planilhas no Drive...</span>
                                        ) : driveError ? (
                                            <div className="text-left text-[9px] text-slate-400 space-y-1">
                                                <p className="text-amber-400 font-semibold">Nota de permissão ou sandbox:</p>
                                                <p>O navegador pode ter bloqueado a busca automática de arquivos do Drive. Sem problemas! Você pode colar o ID/Link direto no campo acima.</p>
                                            </div>
                                        ) : (
                                            <span>Nenhuma planilha encontrada no seu Google Drive.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2.5">
                            {lastSyncTime && (
                                <div className="bg-slate-950/80 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">Status:</span>
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        Sincronizado ({lastSyncTime})
                                    </span>
                                </div>
                            )}

                            <button 
                                onClick={() => loadPublicSpreadsheet(spreadsheetId)}
                                disabled={isFetchingSheets}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isFetchingSheets ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Buscando dados da planilha...</span>
                                    </>
                                ) : (
                                    <>
                                        <Database size={16} />
                                        <span>Atualizar e Sincronizar Agora</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {sheetsError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-[10px] text-left leading-relaxed flex gap-2">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Erro de Planilha:</p>
                                    <p className="break-all">{sheetsError}</p>
                                </div>
                            </div>
                        )}

                        {/* Google Auth Integration inside welcome screen */}
                        <div className="border-t border-slate-800/60 pt-4 mt-2">
                            {user ? (
                                <div className="space-y-3">
                                    <div className="bg-slate-950/60 border border-slate-850/80 p-3 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-200 truncate max-w-[150px]">{user.displayName || 'Usuário Google'}</p>
                                                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{user.email}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleLogout}
                                            className="text-[10px] text-red-400 hover:text-red-300 font-bold hover:underline"
                                        >
                                            Sair
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-emerald-400 leading-normal text-center">
                                        ✓ Você está autenticado. O app pode agora acessar as planilhas privadas e de organizações permitidas para esta conta Google.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={handleGoogleSignIn}
                                        disabled={isSigningIn}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                        </svg>
                                        <span>{isSigningIn ? 'Conectando...' : 'Conectar Conta Google'}</span>
                                    </button>
                                    <p className="text-[9px] text-slate-500 leading-normal text-center pb-1">
                                        Faça login para salvar seus lançamentos diretamente na planilha Google Sheets.
                                    </p>
                                    {isIframe && (
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-[9px] text-indigo-300 leading-normal text-left flex gap-2">
                                            <Info size={14} className="shrink-0 text-indigo-400 mt-0.5" />
                                            <span>
                                                <strong>Nota para Preview:</strong> O login do Google pode requerer que você clique em <strong>"Abrir em Nova Aba"</strong> (no topo direito do painel) caso o navegador bloqueie os cookies deste frame.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Secondary Fallback Trigger Options */}
                    <div className="space-y-3 pb-8 pt-4 max-w-sm mx-auto w-full">
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-800"></div>
                            <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ou</span>
                            <div className="flex-grow border-t border-slate-800"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="cursor-pointer border border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40 text-slate-300 font-semibold py-3 px-4 rounded-xl text-center shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs">
                                <UploadCloud size={14} className="text-indigo-400" />
                                <span>Arquivo Local</span>
                                <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                            </label>

                            <button 
                                onClick={handleLoadDemoData}
                                className="flex items-center justify-center gap-1.5 border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Database size={14} className="text-indigo-400" />
                                <span>Dados de Teste</span>
                            </button>
                        </div>

                        {(loading || isFetchingSheets) && (
                            <div className="flex justify-center pt-2">
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 py-1.5 px-3.5 rounded-full shadow">
                                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] text-slate-400 font-medium">Processando e estruturando...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // --- DASHBOARD CONTAINER SCREEN ---
        return (
            <div className="flex-1 flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden relative">
                {/* 1. Desktop Left Sidebar - Visible on Desktop/Tablet only */}
                <aside className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 select-none">
                    <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                        {/* Title Section */}
                        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-tight">ProdAnalytics</h2>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Painel de Endemias</p>
                            </div>
                        </div>

                        {/* Navigation Tab Menu */}
                        <nav className="flex flex-col gap-1">
                            {[
                                { id: 'lançamento', label: 'Lançamento de Campo', icon: ClipboardCheck },
                                { id: 'overview', label: 'Resumo Geral', icon: BarChart2 },
                                { id: 'quality', label: 'Saúde e Tratamento', icon: Droplet },
                                { id: 'neighborhoods', label: 'Bairros e Metas', icon: MapPin },
                                { id: 'teams', label: 'Equipes', icon: Users },
                                { id: 'hours', label: 'Banco de Horas', icon: Clock },
                                { id: 'more', label: 'Gestão de Pendências', icon: ClipboardList, count: pendenciasList.length }
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all ${
                                            isActive
                                            ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-bold'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon size={16} />
                                            <span className="text-xs">{tab.label}</span>
                                        </div>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Sync Info in Sidebar */}
                        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                <Database size={14} className="text-emerald-400" />
                                <span>Google Sheets Sinc</span>
                            </div>

                            {user && userDriveSheets.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Selecionar do Drive</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 focus:outline-none"
                                        value={spreadsheetId}
                                        onChange={(e) => setSpreadsheetId(e.target.value)}
                                    >
                                        <option value="" disabled>Selecione uma planilha...</option>
                                        {userDriveSheets.map(file => (
                                            <option key={file.id} value={file.id}>{file.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Planilha ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-300 focus:outline-none"
                                    value={spreadsheetId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const idMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                                        const newId = idMatch ? idMatch[1] : val.trim();
                                        setSpreadsheetId(newId);
                                    }}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Apps Script URL (Sem Login)</label>
                                    <button 
                                        onClick={() => setShowScriptTutorial(true)}
                                        className="text-[8px] text-indigo-400 font-bold hover:underline"
                                    >
                                        Como Criar?
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cole a URL gerada (/exec)"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] text-slate-300 focus:outline-none placeholder:text-slate-650"
                                    value={webAppUrl}
                                    onChange={(e) => handleWebAppUrlChange(e.target.value)}
                                />
                            </div>
                            {lastSyncTime && (
                                <p className="text-[9px] text-slate-500">Última sinc: {lastSyncTime}</p>
                            )}
                            <button
                                onClick={() => loadPublicSpreadsheet(spreadsheetId)}
                                disabled={isFetchingSheets}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                <Database size={12} className={isFetchingSheets ? "animate-spin" : ""} />
                                <span>Sincronizar</span>
                            </button>
                        </div>
                    </div>

                    {/* Left Sidebar Footer Toggles */}
                    <div className="p-4 border-t border-slate-800 space-y-2">
                        <button
                            onClick={() => setViewMode('simulator')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Smartphone size={12} />
                            <span>Modo Celular</span>
                        </button>
                    </div>
                </aside>

                {/* 2. Main Area (Right Side) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
                    {/* Simulated In-App Top Bar */}
                    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                            {/* Mobile menu trigger */}
                            <div className="md:hidden p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white shadow">
                                <Activity size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white tracking-tight leading-none md:hidden">ProdAnalytics</h2>
                                <h2 className="text-sm font-bold text-white tracking-tight leading-none hidden md:block">
                                    {{
                                        lançamento: 'Lançamento de Dados de Campo',
                                        overview: 'Visão Geral do Painel',
                                        quality: 'Qualidade do Tratamento',
                                        neighborhoods: 'Monitoramento de Bairros',
                                        teams: 'Equipes de Supervisão',
                                        hours: 'Banco de Horas Extra',
                                        more: 'Pendências e Notificações'
                                    }[activeTab] || 'Dashboard'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-medium mt-1 shrink truncate max-w-[120px] md:max-w-xs">
                                    {activeFiltersCount > 0 ? `${activeFiltersCount} Filtro(s) ativo(s)` : 'Todos os dados da planilha'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={() => loadPublicSpreadsheet(spreadsheetId)}
                                disabled={isFetchingSheets}
                                className="md:hidden p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750 disabled:opacity-50"
                                title="Sincronizar dados"
                            >
                                <Database size={14} className={isFetchingSheets ? "animate-spin text-emerald-400" : "text-emerald-400"} />
                            </button>

                            <button 
                                onClick={() => setIsFilterSheetOpen(true)}
                                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                    activeFiltersCount > 0 
                                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 shadow-sm' 
                                    : 'bg-slate-800 text-slate-300 border-slate-700/60'
                                }`}
                            >
                                <SlidersHorizontal size={14} />
                                <span className="hidden xs:inline">Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <span className="h-4 w-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-black">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                            
                            <button 
                                onClick={() => setShowGoalModal(true)}
                                className="p-2 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white flex items-center gap-1"
                                title="Definir Metas"
                            >
                                <Target size={14} />
                                <span className="hidden sm:inline text-xs font-semibold">Definir Metas</span>
                            </button>

                            <button 
                                onClick={() => setShowPdfOptionsModal(true)}
                                className="p-2 bg-slate-800 border border-slate-700/60 rounded-lg text-emerald-400 hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                                title="Opções de Relatório PDF"
                            >
                                <FileText size={14} />
                                <span className="hidden sm:inline text-xs font-semibold">Relatório PDF</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>

                            {/* Google Auth in Header */}
                            {user ? (
                                <div className="flex items-center gap-2 bg-slate-850 border border-slate-750 px-2.5 py-1.5 rounded-xl animate-in fade-in">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || ''} className="w-5 h-5 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                                            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div className="hidden lg:block text-left leading-none max-w-[120px]">
                                        <p className="text-[10px] font-bold text-slate-200 truncate">{user.displayName || 'Usuário'}</p>
                                        <p className="text-[8px] text-slate-500 truncate mt-0.5">{user.email}</p>
                                    </div>
                                    <button 
                                        onClick={handleLogout}
                                        className="text-[10px] text-red-400 hover:text-red-300 font-bold ml-1"
                                        title="Sair da Conta Google"
                                    >
                                        Sair
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isSigningIn}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-sm animate-in fade-in"
                                >
                                    <svg className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                    </svg>
                                    <span className="hidden xs:inline">{isSigningIn ? 'Conectando...' : 'Conectar Google'}</span>
                                </button>
                            )}
                        </div>
                    </header>

                {/* Filter chip shortcuts bar (horizontal scroll) */}
                {activeFiltersCount > 0 && (
                    <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-1.5 shrink-0 flex items-center gap-2 overflow-x-auto text-[10px] custom-scrollbar">
                        <span className="text-slate-500 shrink-0 font-medium">Filtros:</span>
                        {Object.entries(filters).map(([key, value]) => {
                            if (value === 'Todos') return null;
                            const filterLabel = {
                                supervisor: 'Sup',
                                agente: 'Ag',
                                ciclo: 'Cicl',
                                mes: 'Mês',
                                ano: 'Ano',
                                atividade: 'Ativ'
                            }[key] || key;
                            return (
                                <div key={key} className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full shrink-0">
                                    <span className="text-[9px] text-indigo-400 font-bold uppercase">{filterLabel}:</span>
                                    <span>{value}</span>
                                    <button 
                                        className="text-slate-500 hover:text-white shrink-0 font-bold ml-0.5 text-[11px]" 
                                        onClick={() => setFilters({ ...filters, [key]: 'Todos' })}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                        <button 
                            className="text-indigo-400 font-semibold shrink-0 underline"
                            onClick={handleResetFilters}
                        >
                            Limpar todos
                        </button>
                    </div>
                )}

                {/* Core Scrollable Screen Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-24 md:pb-6">

                    {/* --- TAB VIEW 0: LANÇAMENTO DE CAMPO --- */}
                    {activeTab === 'lançamento' && (
                        <div className="animate-in fade-in duration-300">
                            <LancamentoCampo 
                                rawData={rawData} 
                                onAddData={(newEntries) => {
                                    setRawData(prev => [...newEntries, ...prev]);
                                }} 
                                user={user}
                                accessToken={accessToken}
                                spreadsheetId={spreadsheetId}
                                webAppUrl={webAppUrl}
                                onShowTutorial={() => setShowScriptTutorial(true)}
                            />
                        </div>
                    )}

                    {/* --- TAB VIEW 1: OVERVIEW --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* KPI Metrics List (Optimized 2-Column Grid on Mobile, 4-Column Grid on Desktop) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                                    <div className="flex justify-between items-start mb-1 text-slate-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Trabalhados</span>
                                        <Briefcase size={14} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-100">{analytics.totalTrabalhados.toLocaleString()}</h3>
                                    <p className="text-[9px] text-slate-500 mt-0.5 shrink truncate">Meta: {(analytics.rankingAgentes.length * goals.trabalhados).toLocaleString()}</p>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                                    <div className="flex justify-between items-start mb-1 text-slate-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Média Diária</span>
                                        <TrendingUp size={14} className="text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-100">{analytics.mediaDiaria}</h3>
                                    <p className="text-[9px] text-slate-500 mt-0.5 shrink truncate">Alvo: {goals.diariaMin}-{goals.diariaMax}</p>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                                    <div className="flex justify-between items-start mb-1 text-slate-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Eficiência</span>
                                        <PieIcon size={14} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-100">{analytics.percTrabalhados.toFixed(1)}%</h3>
                                    <p className="text-[9px] text-slate-500 mt-0.5 shrink truncate">Perda: {analytics.percPerda.toFixed(1)}%</p>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                                    <div className="flex justify-between items-start mb-1 text-slate-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Imóveis Fechados</span>
                                        <Home size={14} className="text-yellow-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-100">{analytics.totalFechados.toLocaleString()}</h3>
                                    <p className="text-[9px] text-slate-500 mt-0.5 shrink truncate">Recusas: {analytics.totalRecusas.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Two-Column Layout on Desktop for List & Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Perfomer List */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                                            <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5"><Users size={14} className="text-blue-400"/> Ranking Produtividade</h3>
                                            <span className="text-[9px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">Agentes</span>
                                        </div>
                                        <div className="p-2 space-y-1 divide-y divide-slate-800/40 max-h-[420px] overflow-y-auto custom-scrollbar">
                                            {analytics.rankingAgentes.map((agent, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setSelectedAgent(agent.name)}
                                                    className="flex flex-col p-2.5 hover:bg-slate-800/40 rounded-lg transition-all border border-transparent cursor-pointer"
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                                idx === 0 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                                                                idx === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20' : 
                                                                idx === 2 ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20' : 
                                                                'bg-slate-800 text-slate-500 border border-slate-700/80'
                                                            }`}>
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-200 tracking-tight truncate max-w-[140px]">{agent.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold font-mono ${agent.StatusMeta ? 'text-green-400' : 'text-slate-400'}`}>
                                                                {agent.Trabalhados}
                                                            </span>
                                                            <ChevronRight size={14} className="text-slate-600" />
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                                                        <div className={`h-full rounded-full ${agent.StatusMeta ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, (agent.Trabalhados / goals.trabalhados) * 100)}%`}}></div>
                                                    </div>
                                                    <div className="flex justify-between mt-1 text-[9px] text-slate-500">
                                                        <span>Diária: {agent.MediaDiaria}/dia</span>
                                                        <span>Recusas/Fech: {agent.Recusas}/{agent.Fechados}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Lost visits Chart */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-xs mb-4">Métricas de Perda (Top 10 Agentes)</h3>
                                        <div className="w-full h-80 text-xs text-slate-400">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.rankingAgentes.slice(0, 10)} margin={{top: 5, right: 0, left: -25, bottom: 5}} barSize={10}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                                    <XAxis dataKey="name" tick={{fontSize: 9, fill: CHART_TEXT_COLOR}} interval={0} angle={-35} textAnchor="end" height={55} />
                                                    <YAxis tick={{fontSize: 9, fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                                    <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#1e293b'}} />
                                                    <Bar dataKey="Trabalhados" stackId="a" fill={COLORS.blue} />
                                                    <Bar dataKey="Fechados" stackId="a" fill={COLORS.yellow} />
                                                    <Bar dataKey="Recusas" stackId="a" fill={COLORS.red} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- TAB VIEW 2: QUALITY / SAÚDE --- */}
                    {activeTab === 'quality' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Responsive KPI grid: 3-Column on Desktop */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Imóveis Tratados</p>
                                        <h3 className="text-xl font-extrabold text-teal-400 mt-1">{analytics.totalImTrat.toLocaleString()}</h3>
                                        <p className="text-[9px] text-slate-500 mt-0.5">Ações corretivas focais realizadas</p>
                                    </div>
                                    <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                                        <Droplet size={18} />
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Depósitos Eliminados</p>
                                        <h3 className="text-xl font-extrabold text-red-400 mt-1">{analytics.totalDepElim.toLocaleString()}</h3>
                                        <p className="text-[9px] text-slate-500 mt-0.5">Controle mecânico de criadouros</p>
                                    </div>
                                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                                        <Target size={18} />
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Uso Larvicida (g)</p>
                                        <h3 className="text-xl font-extrabold text-purple-400 mt-1">{analytics.totalLarvicida.toFixed(1)}g</h3>
                                        <p className="text-[9px] text-slate-500 mt-0.5">Inseticidas e químicos aplicados</p>
                                    </div>
                                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                                        <ClipboardList size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Responsive double-column grid for charts on desktop */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Deposits chart */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-xs mb-4">Tipos de Depósitos Identificados</h3>
                                        <div className="w-full h-64 text-xs">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.chartDepositos} margin={{left: -25}}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                                    <XAxis dataKey="name" tick={{fill: CHART_TEXT_COLOR, fontSize: 10}} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{fill: CHART_TEXT_COLOR, fontSize: 10}} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{fill: '#1e293b'}} content={<CustomBarTooltip />} />
                                                    <Bar dataKey="value" fill={COLORS.orange} radius={[2,2,0,0]} name="Qtd" barSize={15} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Property Division list */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-xs mb-4">Tipos de Imóveis</h3>
                                        <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                                            {analytics.chartImoveis.map((item, idx) => (
                                                <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/60 bg-slate-950/40">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: Object.values(COLORS)[idx % Object.values(COLORS).length]}}></div>
                                                        <span className="text-xs font-semibold text-slate-200">
                                                            {{ 'R': 'Residencial', 'Tb': 'Terreno Baldio', 'PE': 'Ponto Estratégico', 'O': 'Outros' }[item.name] || item.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                                        {item.value.toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- TAB VIEW 3: NEIGHBORHOODS --- */}
                    {activeTab === 'neighborhoods' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Header action bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                                <div className="flex items-center gap-3.5 text-[10px] font-semibold flex-wrap">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Cobertura:</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> ≥80% Concluído</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> 60-79% Em Andamento</span>
                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> &lt;60% Baixa</span>
                                </div>
                                <button 
                                    onClick={handleExportProductivityAndNeighborhoodsPDF}
                                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm active:scale-95"
                                    title="Baixar Relatório de Ranking & Bairros em PDF"
                                >
                                    <FileText size={13} />
                                    <span>PDF Bairros & Ranking</span>
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-500 mt-1 italic font-medium">Toque nos bairros para ver o detalhamento de imóveis visitados.</p>

                            {/* Neighborhood cards feed */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {analytics.neighborhoods.map((b, idx) => {
                                    const isExpanded = !!expandedNeighborhoods[b.name];
                                    return (
                                        <div 
                                            key={idx} 
                                            className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm transition-all duration-200"
                                        >
                                            {/* Primary header of neighborhood */}
                                            <div 
                                                onClick={() => toggleNeighborhood(b.name)}
                                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 active:bg-slate-800/40"
                                            >
                                                <div className="space-y-1 select-none pr-2 max-w-[180px]">
                                                    <h4 className="text-xs font-bold text-slate-200 truncate leading-tight">{b.name}</h4>
                                                    <p className="text-[10px] text-slate-500 font-medium font-mono">
                                                        Visitados: <span className="text-slate-300 font-bold">{b.visited}</span> / {b.target > 0 ? b.target : '-'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCoverageColor(b.coverage)}`}>
                                                        {b.coverage.toFixed(1)}%
                                                    </span>
                                                    {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                                </div>
                                            </div>

                                            {/* Expandable progress slider bar */}
                                            <div className="px-3.5 pb-3">
                                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${getCoverageProgressColor(b.coverage)}`} style={{width: `${Math.min(100, b.coverage)}%`}}></div>
                                                </div>
                                            </div>

                                            {/* Expanded Detailed properties info */}
                                            {isExpanded && (
                                                <div className="bg-slate-950/60 border-t border-slate-800/60 p-3.5 space-y-2 text-[11px] animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex justify-between items-center font-bold text-[10px] text-slate-500 uppercase tracking-wide border-b border-slate-800 pb-1 mb-1.5">
                                                        <span>Categoria de Imóvel</span>
                                                        <span>Visitados</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                                        <div className="flex justify-between text-slate-300">
                                                            <span>Residencial (R):</span>
                                                            <span className="font-bold font-mono text-slate-400">{b.propertyTypes.R}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-300">
                                                            <span>Terreno Baldio (TB):</span>
                                                            <span className="font-bold font-mono text-slate-400">{b.propertyTypes.Tb}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-300">
                                                            <span>Comercial (Com):</span>
                                                            <span className="font-bold font-mono text-slate-400">{b.propertyTypes.Comercio}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-300">
                                                            <span>Ponto Estrat. (PE):</span>
                                                            <span className="font-bold font-mono text-slate-400">{b.propertyTypes.PE}</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-300 col-span-2 pt-1 border-t border-slate-800/30">
                                                            <span>Outros tipos (O):</span>
                                                            <span className="font-bold font-mono text-slate-400">{b.propertyTypes.O}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {analytics.neighborhoods.length === 0 && (
                                    <div className="text-center p-8 text-slate-500 text-xs">Nenhum bairro registrado.</div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* --- TAB VIEW 4: TEAMS --- */}
                    {activeTab === 'teams' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Header action bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-200">Equipes & Ranking de Produtividade</h3>
                                    <p className="text-[10px] text-slate-400">Desempenho por supervisor e classificação individual de metas</p>
                                </div>
                                <button 
                                    onClick={handleExportProductivityAndNeighborhoodsPDF}
                                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm active:scale-95"
                                    title="Baixar Relatório de Ranking & Bairros em PDF"
                                >
                                    <Award size={13} />
                                    <span>Baixar PDF Ranking & Bairros</span>
                                </button>
                            </div>

                            {/* Responsive 2-column layout for supervisor charts & lists */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Supervisor Productivity metrics list */}
                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-200 text-xs mb-4">Supervisores: Média Visitas por Agente</h3>
                                        <div className="w-full h-72 text-xs">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.rankingSupervisores} margin={{left: -25}}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                                    <XAxis dataKey="name" tick={{fill: CHART_TEXT_COLOR, fontSize: 10}} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{fill: CHART_TEXT_COLOR, fontSize: 10}} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{fill: '#1e293b'}} content={<CustomBarTooltip />} />
                                                    <Bar dataKey="MediaPorAgente" radius={[4,4,0,0]} name="Média por Agente" barSize={34}>
                                                        {analytics.rankingSupervisores.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.name === filters.supervisor ? COLORS.orange : COLORS.purple} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Numerical Supervisor Roster */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="p-4 border-b border-slate-800 bg-slate-800/10">
                                            <h4 className="text-xs font-bold text-slate-200">Rendimento de Equipes</h4>
                                        </div>
                                        <div className="p-2.5 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {analytics.rankingSupervisores.map((row, idx) => (
                                                <div key={idx} className="bg-slate-950/40 border border-slate-800/55 p-3 rounded-xl flex justify-between items-center">
                                                    <div className="space-y-0.5">
                                                        <h5 className="text-xs font-bold text-slate-200">{row.name}</h5>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            Agentes Ativos: <span className="font-bold text-slate-400">{row.Agentes.size || row.Agentes.length}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block leading-tight">Média / Agente</span>
                                                        <span className="font-mono text-sm font-black text-indigo-400">{row.MediaPorAgente} vis.</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- TAB VIEW 5: MORE / MANAGEMENT --- */}
                    {activeTab === 'more' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Inner Screen navigation switcher (tab panel slider) */}
                            <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0">
                                <button 
                                    onClick={() => setInnerManagementTab('hr')}
                                    className={`w-1/2 text-center py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        innerManagementTab === 'hr' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Activity size={14} />
                                    Recursos Humanos
                                </button>
                                <button 
                                    onClick={() => setInnerManagementTab('issues')}
                                    className={`w-1/2 text-center py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
                                        innerManagementTab === 'issues' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <AlertTriangle size={14} />
                                    Pendências
                                    {pendenciasList.length > 0 && (
                                        <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-rose-500 border border-slate-950"></span>
                                    )}
                                </button>
                            </div>

                            {/* INNER SCREEN SUB CONTENT */}
                            {innerManagementTab === 'hr' ? (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    {/* Attendance mini-cards */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Atestados Médicos</span>
                                            <h4 className="text-base font-bold text-blue-400 mt-1">{analytics.attendance.atestados}</h4>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Faltas Injustificadas</span>
                                            <h4 className="text-base font-bold text-red-400 mt-1">{analytics.attendance.faltas}</h4>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Consultas Med.</span>
                                            <h4 className="text-base font-bold text-purple-400 mt-1">{analytics.attendance.consultas}</h4>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Declarações</span>
                                            <h4 className="text-base font-bold text-teal-400 mt-1">{analytics.attendance.declaracoes}</h4>
                                        </div>
                                    </div>

                                    {/* Absences Distribution Pie Chart */}
                                    {hrChartData.length > 0 ? (
                                        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shrink-0">
                                            <h4 className="text-xs font-bold text-slate-200 mb-4 text-center">Tipos de Justificativa</h4>
                                            <div className="w-full h-44 flex items-center justify-center relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={hrChartData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none">
                                                            {hrChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                {/* Legend in line */}
                                            </div>
                                            <div className="flex flex-wrap gap-2.5 justify-center text-[10px] text-slate-400 border-t border-slate-800/50 pt-2.5">
                                                {hrChartData.map((lbl, idx) => (
                                                    <span key={idx} className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full inline-block" style={{backgroundColor: lbl.fill}}></span>
                                                        {lbl.name}: {lbl.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 bg-slate-900/40 border border-slate-800 rounded-xl font-medium text-slate-500 text-xs">Sem ocorrências de absenteísmo registradas.</div>
                                    )}

                                    {/* Absences List table conversion on Mobile */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-3.5 border-b border-slate-800 bg-slate-850/20">
                                            <h4 className="text-xs font-bold text-slate-200">Incidentes por Agente</h4>
                                        </div>
                                        <div className="p-1 divide-y divide-slate-800/60 max-h-56 overflow-y-auto custom-scrollbar">
                                            {analytics.rankingAgentes
                                                .filter(a => (a.attendance.atestados + a.attendance.faltas + a.attendance.declaracoes + a.attendance.consultas + a.attendance.compensacoes) > 0)
                                                .map((agent, index) => {
                                                    const tot = agent.attendance.atestados + agent.attendance.faltas + agent.attendance.declaracoes + agent.attendance.consultas + agent.attendance.compensacoes;
                                                    return (
                                                        <div key={index} className="flex justify-between items-center p-2.5 text-xs text-slate-300">
                                                            <span className="font-semibold text-slate-200 truncate pr-4 max-w-[150px]">{agent.name}</span>
                                                            <div className="flex items-center gap-1 font-mono shrink-0">
                                                                {agent.attendance.atestados > 0 && <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-bold">A: {agent.attendance.atestados}</span>}
                                                                {agent.attendance.faltas > 0 && <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[9px] font-bold">F: {agent.attendance.faltas}</span>}
                                                                {tot > (agent.attendance.atestados + agent.attendance.faltas) && (
                                                                     <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">Outros: {tot - (agent.attendance.atestados + agent.attendance.faltas)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3.5 animate-in fade-in duration-200">
                                    {/* Pendências Timeline layout */}
                                    <div className="flex justify-between items-center text-xs text-slate-400 font-bold px-1">
                                        <span>Alertas Críticos</span>
                                        <span className="bg-red-950 text-red-400 border border-red-900/50 px-2 py-0.5 rounded-full text-[10px]">{pendenciasList.length} registros</span>
                                    </div>

                                    <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar">
                                        {pendenciasList.map((row, index) => (
                                            <div 
                                                key={index} 
                                                className="bg-slate-900 border border-red-900/20 hover:border-red-900/40 p-4 rounded-xl space-y-2 border-l-4 border-l-red-500 shadow-sm"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                                        {row.DataISO.split('-').reverse().join('/')}
                                                    </span>
                                                    <span className="bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-red-500/20 shrink truncate">
                                                        {row.Pendencias}
                                                    </span>
                                                </div>

                                                <div className="space-y-0.5">
                                                    <h4 className="text-xs font-bold text-slate-200">{row.Agente}</h4>
                                                    <p className="text-[10px] text-slate-500 font-semibold">Supervisor: {row.Supervisor}</p>
                                                </div>

                                                {row.Observacao && (
                                                    <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 italic font-medium">
                                                        "{row.Observacao}"
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        {pendenciasList.length === 0 && (
                                            <div className="text-center p-8 bg-slate-900/40 border border-slate-850 rounded-xl font-medium text-slate-500 text-xs text-center">Nenhuma pendência crítica ou atraso observado.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- TAB VIEW 6: HOURS BANK --- */}
                    {activeTab === 'hours' && (
                        <HoursBankView hoursBankData={hoursBankData} productionData={rawData} />
                    )}

                </div>

                {/* Simulated Fixed Native iOS/Android Bottom Navigation Bar - Hidden on desktop sidebar */}
                <footer className="md:hidden absolute bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex justify-around items-center z-20">
                    {[
                        { id: 'lançamento', label: 'Lançar', icon: ClipboardCheck },
                        { id: 'overview', label: 'Resumo', icon: BarChart2 },
                        { id: 'quality', label: 'Saúde', icon: Droplet },
                        { id: 'neighborhoods', label: 'Locais', icon: MapPin },
                        { id: 'teams', label: 'Equipes', icon: Users },
                        { id: 'hours', label: 'B. Horas', icon: Clock },
                        { id: 'more', label: 'Gestão', icon: ClipboardList, count: pendenciasList.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative ${
                                activeTab === tab.id 
                                ? 'text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <tab.icon size={18} className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110 drop-shadow-md' : 'scale-100'}`} />
                            <span className="text-[9px] font-bold mt-1 tracking-tight leading-none">{tab.label}</span>
                            
                            {/* Pulse dot badge on "Gestão" if list has notices */}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="absolute top-1.5 right-4 h-2 w-2 rounded-full bg-rose-500 border border-slate-900 animate-pulse"></span>
                            )}
                        </button>
                    ))}
                </footer>

                </div> {/* Closing tag for right-side container */}
            </div>
        );
    };

    // --- MAIN RENDER LOGIC WITH CONDITIONAL WORKSPACE SIMULATOR ---
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 select-none antialiased">
            
            {/* Conditional Desktop Layout with immersive presentation simulator */}
            {!isMobileDevice && viewMode === 'simulator' ? (
                // 💻 DESKTOP SMARTPHONE SIMULATOR VIEW (With gorgeous blurred background glassmorphism dashboard)
                <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
                    {/* Abstract blurred organic forms behind the phone */}
                    <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-emerald-600/5 rounded-full filter blur-3xl animate-pulse delay-500"></div>
                    
                    {/* Top control banner wrapper */}
                    <div className="mb-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-4 py-2 text-xs font-semibold rounded-full flex items-center gap-6 z-10 shadow-lg text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Smartphone size={14} className="text-indigo-400" />
                            <span>Celular Simulado (iPhone / Android)</span>
                        </div>
                        <div className="h-4 w-px bg-slate-800"></div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setViewMode('simulator')}
                                className={`px-2 py-0.5 rounded flex items-center gap-1 ${viewMode === 'simulator' ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'}`}
                            >
                                <Smartphone size={10} /> Simulator
                            </button>
                            <button 
                                onClick={() => setViewMode('full')}
                                className={`px-2 py-0.5 rounded flex items-center gap-1 ${viewMode === 'full' ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'}`}
                            >
                                <Monitor size={10} /> Fullscreen Mobile
                            </button>
                        </div>
                    </div>

                    {/* PHYSICAL BEZEL-LESS CELL PHONE SHELL FRAME (Fully functional interface) */}
                    <div className="relative w-[380px] h-[780px] bg-slate-900 border-[10px] border-slate-800/90 rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden ring-4 ring-slate-800/40 ring-offset-4 ring-offset-slate-950 z-10 transition-transform duration-300">
                        
                        {/* Interactive dynamic screen notch at the top */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full flex items-center justify-around px-2 z-30 ring-1 ring-slate-800/20">
                            {/* Lens Dot */}
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-2 ring-slate-800"></span>
                            {/* Speaker lines */}
                            <span className="w-8 h-1 bg-slate-900 rounded-full"></span>
                        </div>

                        {/* Interactive simulated locks / physical volume button notches outside the screen */}
                        <div className="absolute top-24 -left-[14px] w-[4px] h-12 bg-slate-700 rounded-r-md"></div>
                        <div className="absolute top-40 -left-[14px] w-[4px] h-12 bg-slate-700 rounded-r-md"></div>
                        <div className="absolute top-32 -right-[14px] w-[4px] h-14 bg-slate-700 rounded-l-md"></div>

                        {/* HIGH-FIDELITY MOBILE STATUS BAR */}
                        <div className="bg-slate-950 font-sans tracking-wide text-[11px] text-slate-300 font-bold h-9 pt-2.5 px-6 flex items-center justify-between shrink-0 select-none z-20">
                            {/* Clock simulated */}
                            <div className="text-slate-100 font-medium text-[10px]">{clockString}</div>
                            {/* Cellular battery/wifi icons */}
                            <div className="flex items-center gap-1.5 text-slate-300">
                                {/* Carrier bar icons */}
                                <div className="flex items-end gap-0.5 h-2 w-3.5">
                                    <span className="w-0.5 h-1 bg-indigo-400 rounded-full"></span>
                                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full"></span>
                                    <span className="w-0.5 h-2 bg-indigo-400 rounded-full"></span>
                                    <span className="w-0.5 h-[9px] bg-indigo-400 rounded-full"></span>
                                </div>
                                <span className="text-[10px] tracking-tight">5G</span>
                                {/* Wi-Fi */}
                                <div className="flex h-2.5 w-3 items-center justify-center relative">
                                    <span className="absolute border font-black text-[7px] text-indigo-400">⚡</span>
                                </div>
                                {/* Battery container */}
                                <div className="w-5 h-2.5 border border-slate-500 rounded p-[1px] flex items-center shrink-0">
                                    <div className="bg-emerald-500 h-full w-[85%] rounded"></div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive app interface inside */}
                        {renderMobileAppContent()}

                        {/* Home indicator bar (slide bar simulated) */}
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700/60 rounded-full z-30 pointer-events-none"></div>
                    </div>
                </div>
            ) : (
                // 📱 MOBILE EMBEDDING / FULL IMMERSIVE VIEWPORT (Automatically activates on real phone screens)
                <div className="min-h-screen w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-600">
                    {/* Simulated sticky top band on desktop full-screen to allow reverting */}
                    {!isMobileDevice && (
                        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md text-slate-400 shrink-0">
                            <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-indigo-400" /> Modo Imersivo Móvel</span>
                            <button 
                                onClick={() => setViewMode('simulator')}
                                className="bg-indigo-600 font-bold text-white text-[10px] uppercase tracking-wide px-3 py-1 rounded hover:bg-indigo-500"
                            >
                                Ativar Simulador Celular
                            </button>
                        </div>
                    )}
                    
                    {/* Complete app element */}
                    {renderMobileAppContent()}
                </div>
            )}


            {/* --- GOAL CONFIG SHEET MODAL --- */}
            <GoalModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} goals={goals} setGoals={setGoals} />
            
            {/* --- AGENT DETAILS SHEET PANEL (DYNAMIC OVERLAY) --- */}
            <AgentDetailsModal 
                isOpen={!!selectedAgent} 
                onClose={() => setSelectedAgent(null)} 
                agentName={selectedAgent || ''} 
                data={selectedAgentData}
                filters={filters}
                goals={goals}
            />


            {/* --- FLOATING BOTTOM FILTER SHEET --- */}
            {isFilterSheetOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsFilterSheetOpen(false)}
                    />
                    
                    {/* Glass Bottom Sheet container */}
                    <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-slate-900 border-t border-slate-800 rounded-t-[30px] shadow-2xl z-50 flex flex-col transition-transform duration-300 animate-in slide-in-from-bottom duration-300">
                        {/* Sheet puller handle decoration */}
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto my-3 cursor-pointer" onClick={() => setIsFilterSheetOpen(false)}></div>
                        
                        {/* Sheet Header */}
                        <div className="px-6 pb-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/40">
                            <div>
                                <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                                    <SlidersHorizontal size={16} className="text-indigo-400" />
                                    Filtros Móveis
                                </h3>
                                <p className="text-[11px] text-slate-400">Refine os relatórios e cobertura de metas</p>
                            </div>
                            <button 
                                onClick={handleResetFilters}
                                className="text-xs text-indigo-400 font-bold hover:text-indigo-300 active:underline"
                            >
                                Redefinir
                            </button>
                        </div>

                        {/* Sheet selectors - scrollable vertically */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                            {/* Year selectivity */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ano de Atuação</label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.ano}
                                    onChange={(e) => setLocalFilters({...localFilters, ano: e.target.value})}
                                >
                                    <option value="Todos">Todos os Anos</option>
                                    {options.anos?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Supervisor selects */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supervisor</label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.supervisor}
                                    onChange={(e) => setLocalFilters({...localFilters, supervisor: e.target.value})}
                                >
                                    <option value="Todos">Todos os Supervisores</option>
                                    {options.supervisores?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Agente dropdown */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Agente de Campo</label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.agente}
                                    onChange={(e) => setLocalFilters({...localFilters, agente: e.target.value})}
                                >
                                    <option value="Todos">Todos os Agentes</option>
                                    {options.agentes?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Ciclo selectors */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ciclo do Programa</label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.ciclo}
                                    onChange={(e) => setLocalFilters({...localFilters, ciclo: e.target.value})}
                                >
                                    <option value="Todos">Todos os Ciclos</option>
                                    {options.ciclos?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mês Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mês de Referência</label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.mes}
                                    onChange={(e) => setLocalFilters({...localFilters, mes: e.target.value})}
                                >
                                    <option value="Todos">Todos os Meses</option>
                                    {options.meses?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Atividade de Campo Selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Activity size={13} className="text-emerald-400" />
                                    Atividade de Campo
                                </label>
                                <select 
                                    className="w-full bg-slate-955 border border-slate-800 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer bg-slate-950 font-medium text-xs"
                                    value={localFilters.atividade}
                                    onChange={(e) => setLocalFilters({...localFilters, atividade: e.target.value})}
                                >
                                    <option value="Todos">Todas as Atividades</option>
                                    {options.atividades?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3 pb-8 shrink-0">
                            <button 
                                onClick={() => setIsFilterSheetOpen(false)}
                                className="w-2/5 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleApplyFilters}
                                className="w-3/5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs shadow-lg shadow-indigo-950/40 transition-all active:scale-[0.98]"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Google Apps Script Tutorial Modal */}
            {showScriptTutorial && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={16} className="text-yellow-400" />
                                Salvar na Planilha sem Login
                            </h3>
                            <button 
                                onClick={() => setShowScriptTutorial(false)}
                                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 hover:bg-slate-700 h-8 w-8 rounded-full flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-slate-300 text-xs leading-relaxed">
                            <p>
                                O Google Apps Script permite criar um intermediário ("Web App") privado e seguro que grava os dados na sua planilha diretamente, sem que nenhum usuário precise fazer login com o Google no navegador. Isso resolve os problemas de permissão e bloqueios em celulares e janelas restritas (iframes).
                            </p>

                            <div className="space-y-3">
                                <h4 className="font-bold text-indigo-400">Passo a Passo de Configuração:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1">
                                    <li>Abra a sua planilha no <strong>Google Sheets</strong>.</li>
                                    <li>No menu superior, acesse <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.</li>
                                    <li>Apague todo o código que estiver na tela e <strong>cole o código abaixo</strong>:</li>
                                </ol>
                            </div>

                            <div className="relative">
                                <pre className="bg-slate-950 p-4 rounded-2xl overflow-x-auto text-[11px] text-slate-350 font-mono select-all border border-slate-800/80 max-h-48 custom-scrollbar">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var values = data.values;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(data.spreadsheetId);
      } catch(err) {}
    }
    var sheet = ss.getSheets()[0];
    for (var i = 0; i < values.length; i++) {
      var nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 2, 1, values[i].length).setValues([values[i]]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                                </pre>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var values = data.values;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(data.spreadsheetId);
      } catch(err) {}
    }
    var sheet = ss.getSheets()[0];
    for (var i = 0; i < values.length; i++) {
      var nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 2, 1, values[i].length).setValues([values[i]]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-2.5 rounded-lg text-[10px] min-w-[100px] text-center"
                                >
                                    {copied ? "Copiado!" : "Copiar Código"}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1" start={4}>
                                    <li>Clique no ícone de <strong>Salvar</strong> (disquete) no Apps Script.</li>
                                    <li>Clique no botão azul <strong>Implantar</strong> (ou Deploy) &gt; <strong>Nova implantação</strong>.</li>
                                    <li>Clique na engrenagem ao lado de "Selecione o tipo" e escolha <strong>App da Web</strong>.</li>
                                    <li>Em <strong>Executar como</strong>, selecione <strong>"Eu (sua-conta@gmail.com)"</strong>.</li>
                                    <li>Em <strong>Quem pode acessar</strong>, selecione <strong>"Qualquer pessoa"</strong> (crucial para o envio sem login).</li>
                                    <li>Clique em <strong>Implantar</strong> e forneça as permissões ("Autorizar acesso") se o Google solicitar.</li>
                                    <li>Copie a <strong>URL do App da Web</strong> gerada (ela termina com <code className="text-indigo-300">/exec</code>).</li>
                                </ol>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Insira a URL gerada abaixo para salvar neste aplicativo:
                                </label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-slate-250 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                                    value={webAppUrl}
                                    onChange={(e) => handleWebAppUrlChange(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowScriptTutorial(false)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-2xl text-xs shadow-lg shadow-indigo-950/40"
                            >
                                Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Report Options Modal */}
            {showPdfOptionsModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Exportar Relatório PDF</h3>
                                    <p className="text-[11px] text-slate-400">Selecione o modelo gerencial para download</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPdfOptionsModal(false)}
                                className="text-slate-400 hover:text-white font-bold text-xs bg-slate-800 hover:bg-slate-750 h-7 w-7 rounded-full flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body - Options */}
                        <div className="p-6 space-y-3.5">
                            {/* Option 1: Ranking & Bairros */}
                            <div 
                                onClick={handleExportProductivityAndNeighborhoodsPDF}
                                className="group border border-emerald-500/30 hover:border-emerald-500/80 bg-emerald-950/15 hover:bg-emerald-950/35 p-4 rounded-2xl cursor-pointer transition-all flex items-start gap-3.5 shadow-sm"
                            >
                                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                                    <Award size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                                            Ranking de Produtividade & Bairros
                                        </h4>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            Novo
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                        Classificação de desempenho individual dos agentes e supervisores com metas, mais o monitoramento completo da cobertura e tipos de imóveis por bairro.
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                        <span>Baixar este Relatório</span>
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Produção Detalhada */}
                            <div 
                                onClick={handleExportDetailedPDF}
                                className="group border border-slate-800 hover:border-indigo-500/80 bg-slate-850/60 hover:bg-slate-850 p-4 rounded-2xl cursor-pointer transition-all flex items-start gap-3.5 shadow-sm"
                            >
                                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                        Relatório Detalhado de Produção
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                        Relatório completo com indicadores gerais, produção semanal por dia útil e listagem detalhada de registros de campo com pendências e faltas.
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-400">
                                        <span>Baixar este Relatório</span>
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                                {activeFiltersCount > 0 
                                    ? `Aplicando ${activeFiltersCount} filtro(s) ativo(s)` 
                                    : 'Aplicando a todos os dados'}
                            </span>
                            <button 
                                onClick={() => setShowPdfOptionsModal(false)}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
