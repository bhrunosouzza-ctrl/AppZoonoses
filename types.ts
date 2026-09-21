
export interface GoalSettings {
    trabalhados: number;
    diariaMin: number;
    diariaMax: number;
    eficienciaMin: number;
  }
  
  export interface ProductionData {
    ID?: string;
    Digitador?: string;
    Supervisor: string;
    Agente: string;
    Ciclo: string;
    Semana?: string | number;
    Setor?: string;
    Mes: string;
    Bairro: string;
    Atividade: string; // Added Atividade
    DataISO: string;
    Data: string | number; // Raw data
    Total_T: number;
    Fechado: number;
    Recusa: number;
    Resgate: number;
    Im_Trat: number;
    Dep_Elim: number;
    Larvicida: number;
    // Deposit Types
    A1: number; A2: number; B: number; C: number; D1: number; D2: number; E: number;
    // Property Types
    R: number; Comercio: number; Tb: number; PE: number; O: number;
    Pendencias: string;
    Observacao: string;
    [key: string]: any;
  }
  
  export interface FilterState {
    supervisor: string;
    agente: string;
    ciclo: string;
    mes: string;
    ano: string; // Added Year filter
    atividade: string; // Added Atividade filter
  }

  export interface AttendanceMetrics {
    atestados: number;
    declaracoes: number;
    consultas: number;
    compensacoes: number;
    faltas: number;
  }
  
  export interface AgentMetric {
    name: string;
    Supervisor: string;
    Trabalhados: number;
    Fechados: number;
    Recusas: number;
    Resgates: number; // Added Resgates
    Im_Trat: number;
    Dias: Set<string>;
    MediaDiaria?: string;
    StatusMeta?: boolean;
    attendance: AttendanceMetrics; // Added attendance breakdown per agent
  }
  
  export interface SupervisorMetric {
    name: string;
    Trabalhados: number;
    Agentes: Set<string>;
    MediaPorAgente?: string;
  }
  
  export interface NeighborhoodMetric {
    name: string;
    target: number;
    visited: number;
    coverage: number;
    propertyTypes: {
        R: number;
        Comercio: number;
        Tb: number;
        PE: number;
        O: number;
    };
  }
  
  export interface DashboardAnalytics {
    totalTrabalhados: number;
    totalFechados: number;
    totalRecusas: number;
    totalResgates: number;
    totalImTrat: number;
    totalDepElim: number;
    totalLarvicida: number;
    depositos: Record<string, number>;
    imoveis: Record<string, number>;
    mediaDiaria: string;
    percTrabalhados: number;
    percPerda: number;
    rankingAgentes: AgentMetric[];
    rankingSupervisores: SupervisorMetric[];
    neighborhoods: NeighborhoodMetric[];
    chartDepositos: { name: string; value: number }[];
    chartImoveis: { name: string; value: number }[];
    attendance: AttendanceMetrics; // Added global attendance metrics
  }
  
  export interface HoursBankEntry {
    Nome: string;
    Data: string;
    DataISO: string;
    Hora: number;
    HoraFormatted: string;
    Tipo: 'Horas Trab.' | 'Horas Compen.';
    Descricao: string;
  }

  export interface HoursBankAgentSummary {
    Nome: string;
    Supervisor: string;
    TotalTrabalhadas: number;
    TotalCompensadas: number;
    SaldoHoras: number;
    Entries: HoursBankEntry[];
  }

