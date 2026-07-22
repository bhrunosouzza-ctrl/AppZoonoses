import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardAnalytics, ProductionData, FilterState } from '../types';

export const generatePDFReport = (
    analytics: DashboardAnalytics, 
    pendenciasList: ProductionData[], 
    filters: FilterState,
    filteredData: ProductionData[]
) => {
    // Standard A4 landscape page layout (297mm x 210mm)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const now = new Date();
    const nowStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const width = doc.internal.pageSize.getWidth(); // 297mm
    const height = doc.internal.pageSize.getHeight(); // 210mm
    const printableWidth = width - 28; // 269mm

    // Helper: Format ISO date string into Excel style DD-Mês-YY (e.g., 07-Jan-26 or 03-fev-26)
    const formatDailyDate = (dateISO: string) => {
        if (!dateISO) return '-';
        const months = ['Jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const parts = dateISO.split('-');
        if (parts.length !== 3) return dateISO;
        const year = parts[0].slice(2);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2];
        const monthStr = months[monthIdx] || '';
        return `${day}-${monthStr}-${year}`;
    };

    // Helper: Calculate ISO week starting from Monday
    const getMondayDateOfISOString = (isoStr: string) => {
        if (!isoStr) return '';
        const [year, month, day] = isoStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday...
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    // --- Dynamic Title Text ---
    const isSingleAgent = filters.agente !== 'Todos';
    const titleText = isSingleAgent 
        ? `RELATÓRIO DE PRODUÇÃO DETALHADO DO AGENTE: ${filters.agente.toUpperCase()}`
        : 'RELATÓRIO DE PRODUÇÃO DETALHADO DA EQUIPE';

    // --- Document Setup Hook to run on every page ---
    const setupPageDecorations = (pdfDoc: jsPDF, pageNumber: number) => {
        const w = pdfDoc.internal.pageSize.getWidth();
        const h = pdfDoc.internal.pageSize.getHeight();

        // Thick accent purple line at the top
        pdfDoc.setFillColor(75, 42, 133); // elegant deep purple
        pdfDoc.rect(0, 0, w, 4, 'F');

        // Footer thin grey separator line
        const footerY = h - 15;
        const footerTextY = h - 10;

        pdfDoc.setDrawColor(226, 232, 240); // slate-200
        pdfDoc.setLineWidth(0.2);
        pdfDoc.line(14, footerY, w - 14, footerY);

        // Footer text
        pdfDoc.setFont('helvetica', 'italic');
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(148, 163, 184); // slate-400
        pdfDoc.text('Painel de Endemias - Controle e Produção Detalhada de Atividades', 14, footerTextY);
        pdfDoc.text(`Página ${pageNumber}`, w - 14, footerTextY, { align: 'right' });
    };

    // Apply decorations to Page 1
    setupPageDecorations(doc, 1);

    // --- Header Title & Subtitle ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(titleText, 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Documento gerencial gerado em ${nowStr}`, 14, 20);

    // --- Active Filters Container ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.25);
    doc.rect(14, 24, printableWidth, 17, 'DF');

    // Filter properties
    const cycleVal = filters.ciclo === 'Todos' ? 'Todos' : filters.ciclo;
    const supervisorVal = filters.supervisor === 'Todos' ? 'Todos' : filters.supervisor;
    const agentVal = filters.agente === 'Todos' ? 'Todos' : filters.agente;

    const uniqueBairros = [...new Set(filteredData.map(d => d.Bairro))].filter(Boolean);
    const bairroVal = uniqueBairros.length === 1 ? uniqueBairros[0] : 'Todos';

    const uniqueActivities = [...new Set(filteredData.map(d => d.Atividade))].filter(Boolean);
    const activityVal = uniqueActivities.length === 1 ? uniqueActivities[0] : 'Todos';

    const dates = filteredData.map(d => d.DataISO).filter(Boolean).sort();
    const periodoVal = dates.length > 0 ? `${formatDailyDate(dates[0])} a ${formatDailyDate(dates[dates.length - 1])}` : 'Todos / Todos';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('Filtros Ativos:', 17, 28.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Ciclo: ${cycleVal} | Bairro: ${bairroVal} | Agente: ${agentVal} | Supervisor: ${supervisorVal}`, 17, 33);
    doc.text(`Atividade: ${activityVal} | Período: ${periodoVal}`, 17, 37.5);

    // --- SECTION 1: CONSOLIDADO GERAL DE PRODUÇÃO E EFICIÊNCIA ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('CONSOLIDADO GERAL DE PRODUÇÃO E EFICIÊNCIA', 14, 48);

    // 6 Adjacent Metric Cards
    const cellW = printableWidth / 6;
    const metricsData = [
        { label: 'Trabalhados (T)', value: analytics.totalTrabalhados.toLocaleString() },
        { label: 'Imóveis Fechados', value: analytics.totalFechados.toLocaleString() },
        { label: 'Resgatados', value: analytics.totalResgates.toLocaleString() },
        { label: 'Recusados', value: analytics.totalRecusas.toLocaleString() },
        { label: 'Média Diária', value: analytics.mediaDiaria },
        { label: 'Eficiência', value: `${analytics.percTrabalhados.toFixed(1)}%` }
    ];

    metricsData.forEach((m, i) => {
        const x = 14 + i * cellW;
        // Background and border for metric box
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, 52, cellW, 17, 'DF');

        // Draw label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(m.label, x + cellW / 2, 57, { align: 'center' });

        // Draw value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(m.value, x + cellW / 2, 64.5, { align: 'center' });
    });

    // --- SECTION 2: DETALHAMENTO DE PRODUÇÃO POR SEMANA ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DETALHAMENTO DE PRODUÇÃO POR SEMANA', 14, 76);

    // Group and calculate weekly metrics
    const sortedData = [...filteredData].sort((a, b) => a.DataISO.localeCompare(b.DataISO));
    const weekGroups: Record<string, ProductionData[]> = {};

    sortedData.forEach(d => {
        const keys = Object.keys(d);
        const weekKey = keys.find(k => k.toLowerCase() === 'semana' || k.toLowerCase().includes('semana'));
        let wName = '';
        if (weekKey && d[weekKey]) {
            wName = String(d[weekKey]).trim();
        } else {
            wName = getMondayDateOfISOString(d.DataISO);
        }
        if (!weekGroups[wName]) {
            weekGroups[wName] = [];
        }
        weekGroups[wName].push(d);
    });

    const weekKeys = Object.keys(weekGroups).sort();
    const weeklyRows = weekKeys.map((wKey, index) => {
        const entries = weekGroups[wKey];
        const bairros = [...new Set(entries.map(e => e.Bairro))].filter(Boolean).join(', ');
        const totalTrab = entries.reduce((acc, e) => acc + (e.Total_T || 0), 0);
        const fechados = entries.reduce((acc, e) => acc + (e.Fechado || 0), 0);
        const resgatados = entries.reduce((acc, e) => acc + (e.Resgate || 0), 0);
        const recusados = entries.reduce((acc, e) => acc + (e.Recusa || 0), 0);
        
        // Unique working days in this week
        const uniqueDays = new Set(entries.map(e => e.DataISO)).size;
        const mediaDiaria = uniqueDays > 0 ? (totalTrab / uniqueDays).toFixed(1) : '0.0';
        
        // Efficiency
        const totalEffDenominator = totalTrab + fechados;
        const eficiencia = totalEffDenominator > 0 ? `${((totalTrab / totalEffDenominator) * 100).toFixed(1)}%` : '100.0%';

        const weekLabel = wKey.startsWith('Semana') ? wKey : `Semana ${index + 1}`;

        return [
            weekLabel,
            bairros,
            totalTrab.toLocaleString(),
            fechados.toLocaleString(),
            resgatados.toLocaleString(),
            recusados.toLocaleString(),
            mediaDiaria,
            eficiencia
        ];
    });

    autoTable(doc, {
        startY: 80,
        head: [['Semana', 'Bairros Atendidos', 'Total Trab. (T)', 'Fechados', 'Resgatados', 'Recusados', 'Média Diária', 'Eficiência']],
        body: weeklyRows,
        theme: 'striped',
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, textColor: [31, 41, 55], valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 25, fontStyle: 'bold', halign: 'left' },
            1: { halign: 'left' }, // Auto-expand to fit remaining space in landscape
            2: { halign: 'center', cellWidth: 28 },
            3: { halign: 'center', cellWidth: 22 },
            4: { halign: 'center', cellWidth: 24 },
            5: { halign: 'center', cellWidth: 22 },
            6: { halign: 'center', cellWidth: 24 },
            7: { halign: 'center', cellWidth: 24, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
    });

    // --- SECTION 3: DETALHAMENTO DE PRODUÇÃO DIÁRIA (REGISTROS) ---
    const dailyStartY = (doc as any).lastAutoTable.finalY + 8;
    
    // Header text of Daily section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DETALHAMENTO DE PRODUÇÃO DIÁRIA (REGISTROS)', 14, dailyStartY);

    const isAllAgents = filters.agente === 'Todos';
    const dailyHeaders = isAllAgents 
        ? [['Data', 'Agente', 'Bairro', 'Atividade', 'Total T', 'Fechados', 'Resgates', 'Recusas', 'Pendência', 'Eficiência', 'Observações']]
        : [['Data', 'Bairro', 'Atividade', 'Total T', 'Fechados', 'Resgates', 'Recusas', 'Pendência', 'Eficiência', 'Observações']];

    const dailyRows = sortedData.map(d => {
        const totalT = d.Total_T || 0;
        const fechados = d.Fechado || 0;
        const resg = d.Resgate || 0;
        const rec = d.Recusa || 0;
        
        const totalEffDen = totalT + fechados;
        const efficiency = totalEffDen > 0 ? `${((totalT / totalEffDen) * 100).toFixed(1)}%` : '100.0%';

        const pendenciaText = d.Pendencias || 'Não Houve Pendências';
        const obsText = d.Observacao || '-';

        if (isAllAgents) {
            return [
                formatDailyDate(d.DataISO),
                d.Agente,
                d.Bairro,
                d.Atividade,
                totalT.toLocaleString(),
                fechados.toLocaleString(),
                resg.toLocaleString(),
                rec.toLocaleString(),
                pendenciaText,
                efficiency,
                obsText
            ];
        } else {
            return [
                formatDailyDate(d.DataISO),
                d.Bairro,
                d.Atividade,
                totalT.toLocaleString(),
                fechados.toLocaleString(),
                resg.toLocaleString(),
                rec.toLocaleString(),
                pendenciaText,
                efficiency,
                obsText
            ];
        }
    });

    // Precise widths optimized for landscape layout (Total width printable: 269mm)
    const singleAgentColStyles: any = {
        0: { cellWidth: 18, halign: 'left', fontStyle: 'bold' }, // Data
        1: { cellWidth: 38, halign: 'left' }, // Bairro
        2: { cellWidth: 42, halign: 'left' }, // Atividade
        3: { cellWidth: 16, halign: 'center' }, // Total T
        4: { cellWidth: 18, halign: 'center' }, // Fechados
        5: { cellWidth: 18, halign: 'center' }, // Resgates
        6: { cellWidth: 18, halign: 'center' }, // Recusas
        7: { cellWidth: 38, halign: 'left' }, // Pendência
        8: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Eficiência
        9: { cellWidth: 45, halign: 'left' } // Observações
    };

    const multiAgentColStyles: any = {
        0: { cellWidth: 18, halign: 'left', fontStyle: 'bold' }, // Data
        1: { cellWidth: 36, halign: 'left', fontStyle: 'bold' }, // Agente
        2: { cellWidth: 28, halign: 'left' }, // Bairro
        3: { cellWidth: 34, halign: 'left' }, // Atividade
        4: { cellWidth: 14, halign: 'center' }, // Total T
        5: { cellWidth: 15, halign: 'center' }, // Fechados
        6: { cellWidth: 15, halign: 'center' }, // Resgates
        7: { cellWidth: 17, halign: 'center' }, // Recusas
        8: { cellWidth: 32, halign: 'left' }, // Pendência
        9: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Eficiência
        10: { cellWidth: 42, halign: 'left' } // Observações
    };

    autoTable(doc, {
        startY: dailyStartY + 3,
        head: dailyHeaders,
        body: dailyRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [31, 41, 55], valign: 'middle', overflow: 'linebreak' },
        columnStyles: isAllAgents ? multiAgentColStyles : singleAgentColStyles,
        margin: { left: 14, right: 14, top: 16, bottom: 20 },
        didDrawPage: function(data) {
            // Apply decorations (purple top line, footer) on EVERY dynamically generated page
            setupPageDecorations(doc, data.pageNumber);
            
            // Render specific "DETALHAMENTO DE PRODUÇÃO DIÁRIA (CONTINUAÇÃO)" heading at the top of subsequent pages
            if (data.pageNumber > 1) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text('DETALHAMENTO DE PRODUÇÃO DIÁRIA (CONTINUAÇÃO)', 14, 11);
            }
        }
    });

    // Save PDF
    const fileName = isSingleAgent 
        ? `Relatorio_Producao_${filters.agente.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`
        : `Relatorio_Producao_Equipe_${now.toISOString().split('T')[0]}.pdf`;
        
    doc.save(fileName);
};
