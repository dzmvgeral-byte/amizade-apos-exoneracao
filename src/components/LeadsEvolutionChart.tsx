import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Lead } from '../data/leadsData';

interface LeadsEvolutionChartProps {
  leads: Lead[];
}

type TimeRange = '7d' | '14d' | '30d';
type ChartType = 'area' | 'bar';

interface DailyDataPoint {
  date: string;
  fullDate: string;
  dayOfWeek: string;
  novosLeads: number;
  vendasConcluidas: number;
  alertasFisico: number;
  faturamentoKz: number;
}

export const LeadsEvolutionChart: React.FC<LeadsEvolutionChartProps> = ({ leads }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('14d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [activeMetric, setActiveMetric] = useState<'all' | 'leads' | 'sales' | 'physical'>('all');

  // Days count from selected range
  const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

  // Aggregate daily data from leads
  const chartData = useMemo(() => {
    const daysMap = new Map<string, DailyDataPoint>();
    const now = new Date();

    // Baseline historical distribution curves for smooth timeline visualization
    // Anchored to Angola launch timeline
    const baselineWeights = [
      0.8, 1.2, 1.0, 1.5, 2.1, 1.8, 2.4, 2.8, 3.2, 2.9, 3.8, 4.2, 4.0, 4.8,
      3.5, 4.1, 5.0, 4.6, 5.5, 5.2, 6.0, 5.8, 6.5, 7.2, 6.8, 7.5, 8.1, 8.9, 9.4, 10.2
    ];

    // Initialize all days in range ending at today
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const dayOfWeek = dayNames[d.getDay()];
      const formattedDate = `${day} ${monthNames[d.getMonth()]}`;
      const fullDate = `${dayOfWeek}, ${day} de ${monthNames[d.getMonth()]} de ${year}`;

      // Initialize with zero base for 100% real leads tracking
      const baseSeed = 0;
      const baseSales = 0;
      const basePhysical = 0;

      daysMap.set(dateKey, {
        date: formattedDate,
        fullDate,
        dayOfWeek,
        novosLeads: baseSeed,
        vendasConcluidas: baseSales,
        alertasFisico: basePhysical,
        faturamentoKz: 0,
      });
    }

    // Overlay real leads from app state
    leads.forEach((lead) => {
      const leadDate = new Date(lead.timestamp || Date.now());
      const year = leadDate.getFullYear();
      const month = String(leadDate.getMonth() + 1).padStart(2, '0');
      const day = String(leadDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (daysMap.has(dateKey)) {
        const item = daysMap.get(dateKey)!;
        item.novosLeads += 1;
        if (lead.status === 'pago' || lead.status === 'concluido') {
          item.vendasConcluidas += 1;
          item.faturamentoKz += lead.amountKz || 8500;
        }
        if (lead.wantsPhysicalAlert) {
          item.alertasFisico += 1;
        }
      } else {
        // If today or within range boundary, increment today's entry
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (daysMap.has(todayKey)) {
          const todayItem = daysMap.get(todayKey)!;
          todayItem.novosLeads += 1;
          if (lead.status === 'pago' || lead.status === 'concluido') {
            todayItem.vendasConcluidas += 1;
            todayItem.faturamentoKz += lead.amountKz || 8500;
          }
          if (lead.wantsPhysicalAlert) {
            todayItem.alertasFisico += 1;
          }
        }
      }
    });

    return Array.from(daysMap.values());
  }, [leads, daysCount]);

  // Statistics summaries
  const totalLeadsPeriod = useMemo(() => chartData.reduce((acc, d) => acc + d.novosLeads, 0), [chartData]);
  const totalSalesPeriod = useMemo(() => chartData.reduce((acc, d) => acc + d.vendasConcluidas, 0), [chartData]);
  const totalAlertsPeriod = useMemo(() => chartData.reduce((acc, d) => acc + d.alertasFisico, 0), [chartData]);
  const dailyAverage = (totalLeadsPeriod / daysCount).toFixed(1);
  const peakDay = useMemo(() => {
    return chartData.reduce((max, d) => (d.novosLeads > max.novosLeads ? d : max), chartData[0] || { date: '-', novosLeads: 0 });
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </span>
            <h3 className="font-serif-editorial text-lg sm:text-xl font-bold text-slate-900">
              Evolução Diária de Novos Leads & Vendas
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Acompanhe o volume diário de registos no formulário, pedidos concluídos e pedidos de aviso para o livro físico.
          </p>
        </div>

        {/* Range & View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                chartType === 'area' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Área Suave"
            >
              <span className="material-symbols-outlined text-[15px]">area_chart</span>
              <span className="hidden md:inline">Área</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Barras Diárias"
            >
              <span className="material-symbols-outlined text-[15px]">bar_chart</span>
              <span className="hidden md:inline">Barras</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '7d' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '14d' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 dias
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeRange === '30d' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 dias
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveMetric(activeMetric === 'leads' ? 'all' : 'leads')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeMetric === 'leads' ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-800">Novos Leads</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
            {totalLeadsPeriod}
          </span>
          <span className="text-[11px] text-slate-500">Média: ~{dailyAverage}/dia</span>
        </div>

        <div 
          onClick={() => setActiveMetric(activeMetric === 'sales' ? 'all' : 'sales')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeMetric === 'sales' ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/30' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-800">Vendas / Pagos</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 block mt-1">
            {totalSalesPeriod}
          </span>
          <span className="text-[11px] text-slate-500">Conversão: {totalLeadsPeriod > 0 ? Math.round((totalSalesPeriod / totalLeadsPeriod) * 100) : 0}%</span>
        </div>

        <div 
          onClick={() => setActiveMetric(activeMetric === 'physical' ? 'all' : 'physical')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeMetric === 'physical' ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/30' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-blue-800">Alertas Físico</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
          <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
            {totalAlertsPeriod}
          </span>
          <span className="text-[11px] text-slate-500">Avisos WhatsApp</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Pico de Procura</span>
            <span className="material-symbols-outlined text-amber-600 text-[16px]">local_fire_department</span>
          </div>
          <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 block mt-1">
            {peakDay.novosLeads} <span className="text-xs font-normal text-slate-500">leads</span>
          </span>
          <span className="text-[11px] text-slate-500 truncate block">{peakDay.date}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D97706" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '8px' }}
              />

              {(activeMetric === 'all' || activeMetric === 'leads') && (
                <Area
                  type="monotone"
                  dataKey="novosLeads"
                  name="Novos Leads Registados"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#D97706' }}
                />
              )}

              {(activeMetric === 'all' || activeMetric === 'sales') && (
                <Area
                  type="monotone"
                  dataKey="vendasConcluidas"
                  name="Vendas Concluídas (Pagos)"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2, fill: '#059669' }}
                />
              )}

              {(activeMetric === 'all' || activeMetric === 'physical') && (
                <Area
                  type="monotone"
                  dataKey="alertasFisico"
                  name="Alertas Livro Físico"
                  stroke="#2563EB"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorAlerts)"
                  activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2, fill: '#2563EB' }}
                />
              )}
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '8px' }}
              />

              {(activeMetric === 'all' || activeMetric === 'leads') && (
                <Bar
                  dataKey="novosLeads"
                  name="Novos Leads Registados"
                  fill="#D97706"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}

              {(activeMetric === 'all' || activeMetric === 'sales') && (
                <Bar
                  dataKey="vendasConcluidas"
                  name="Vendas Concluídas (Pagos)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}

              {(activeMetric === 'all' || activeMetric === 'physical') && (
                <Bar
                  dataKey="alertasFisico"
                  name="Alertas Livro Físico"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          Dados consolidados com a infraestrutura oficial de registos DZMV / Editora Sábhia.
        </span>
        <span className="font-semibold text-slate-700">
          Período analisado: Últimos {daysCount} dias
        </span>
      </div>
    </div>
  );
};

// Custom Tooltip component for recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DailyDataPoint;
    return (
      <div className="bg-[#0B0F19] text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-2 min-w-[200px]">
        <div className="border-b border-slate-800 pb-1.5">
          <span className="font-bold text-amber-400 block">{data.fullDate}</span>
          <span className="text-[10px] text-slate-400">Atividade diária registada</span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Novos Leads:
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm">{data.novosLeads}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Vendas Concluídas:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{data.vendasConcluidas}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Alertas Livro Físico:
            </span>
            <span className="font-mono font-bold text-blue-300 text-sm">{data.alertasFisico}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">Volume Diário:</span>
            <span className="font-mono font-bold text-white text-xs">
              Kz {data.faturamentoKz.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
