import { useState } from 'react';
import { Terminal } from '../types';
import { ShieldCheck, Monitor, AlertTriangle, TrendingUp, PieChart } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

interface StatsDashboardProps {
  terminals: Terminal[];
}

export default function StatsDashboard({ terminals }: StatsDashboardProps) {
  const { lang, t } = useI18n();

  const activeTerminals = terminals.filter((t) => !t.isDeleted);
  const total = activeTerminals.length;
  const inWarehouse = activeTerminals.filter((t) => t.status === 'На складе').length;
  const inOffice = activeTerminals.filter((t) => t.status === 'В кабинете').length;
  const inRepair = activeTerminals.filter((t) => t.status === 'В ремонте').length;
  const tc520Count = activeTerminals.filter((t) => t.model.replace(/С/g, 'C').replace(/с/g, 'c').toLowerCase().includes('tc520')).length;

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Math for dynamic SVG Donut Chart
  // Radius r = 50, Circumference = 2 * Math.PI * 50 = 314.159
  const r = 50;
  const circ = 2 * Math.PI * r;

  const segments = [
    { label: t('stats_warehouse_title'), value: inWarehouse, color: '#10b981', hoverColor: '#34d399', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400', stroke: 'stroke-emerald-500' },
    { label: t('stats_cabinet_title'), value: inOffice, color: '#f59e0b', hoverColor: '#fbbf24', bgClass: 'bg-amber-500', textClass: 'text-amber-400', stroke: 'stroke-amber-500' },
    { label: t('stats_repair_title'), value: inRepair, color: '#ef4444', hoverColor: '#f87171', bgClass: 'bg-rose-500', textClass: 'text-rose-400', stroke: 'stroke-rose-500' },
  ].filter(s => total > 0 ? s.value > 0 : true); // keep placeholder if 0

  let currentOffset = 0;

  const getShortLabel = (label: string) => {
    if (label === t('stats_warehouse_title')) return lang === 'ua' ? 'Склад' : 'Склад';
    if (label === t('stats_cabinet_title')) return lang === 'ua' ? 'Каб.' : 'Каб.';
    if (label === t('stats_repair_title')) return lang === 'ua' ? 'Ремонт' : 'Ремонт';
    return t('total');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Quick Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Total Terminals Card */}
        <div className="col-span-2 sm:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">{t('stats_total_title')}</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{total}</span>
            <span className="text-xs text-slate-500 block mt-1">{t('stats_total_subtitle')}</span>
          </div>
        </div>

        {/* TC520 Model Card */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">{lang === 'ua' ? 'Модель TC520' : 'Модель TC520'}</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 font-mono text-[10px] font-bold">
              TC520
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{tc520Count}</span>
            <span className="text-xs text-slate-500 block mt-1">{lang === 'ua' ? 'пристроїв цієї моделі' : 'устройств этой модели'}</span>
          </div>
        </div>

        {/* In Warehouse Card */}
        <div className="col-span-1 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">{t('stats_warehouse_title')}</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{inWarehouse}</span>
            <span className="text-xs text-emerald-400 font-medium block mt-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              {total > 0 ? Math.round((inWarehouse / total) * 100) : 0}% {t('stats_warehouse_subtitle')}
            </span>
          </div>
        </div>

        {/* In Cabinet Card */}
        <div className="col-span-1 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">{t('stats_cabinet_title')}</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{inOffice}</span>
            <span className="text-xs text-amber-400 font-medium block mt-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
              {total > 0 ? Math.round((inOffice / total) * 100) : 0}% {t('stats_cabinet_subtitle')}
            </span>
          </div>
        </div>

        {/* In Repair Card */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">{t('stats_repair_title')}</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{inRepair}</span>
            <span className="text-xs text-rose-400 font-medium block mt-1 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-pulse"></span>
              {total > 0 ? Math.round((inRepair / total) * 100) : 0}% {t('stats_repair_subtitle')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Custom Interactive SVG Donut Chart */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all duration-300 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
          <span className="text-sm font-bold text-white flex items-center">
            <PieChart className="w-4 h-4 mr-1.5 text-blue-400 animate-spin-slow" />
            {t('stats_distribution')}
          </span>
          <span className="text-[11px] font-mono text-slate-500 uppercase">{t('stats_diagram')}</span>
        </div>

        {total === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500">
            <svg className="w-16 h-16 stroke-1 text-slate-800 mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
            </svg>
            <span className="text-xs">Нет данных для графиков</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-around space-y-4 sm:space-y-0 sm:space-x-4">
            
            {/* Donut Circle Container */}
            <div className="relative w-36 h-36 flex items-center justify-center group">
              {/* Dynamic Aura Glow corresponding to active segment */}
              <div 
                className={`absolute inset-4 rounded-full blur-xl opacity-20 transition-all duration-500 ${
                  hoveredSegment === t('stats_warehouse_title') ? 'bg-emerald-500 opacity-30 shadow-[0_0_24px_rgba(16,185,129,0.4)]' :
                  hoveredSegment === t('stats_cabinet_title') ? 'bg-amber-500 opacity-30 shadow-[0_0_24px_rgba(245,158,11,0.4)]' :
                  hoveredSegment === t('stats_repair_title') ? 'bg-rose-500 opacity-30 shadow-[0_0_24px_rgba(244,63,94,0.4)]' : 
                  'bg-blue-500/20 opacity-15'
                }`} 
              />

              <svg className="w-full h-full transform -rotate-90 z-10 animate-fade-in" viewBox="0 0 120 120">
                {/* SVG Definitions for Gradients */}
                <defs>
                  <linearGradient id="grad-warehouse" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="grad-office" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="grad-repair" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#be123c" />
                  </linearGradient>
                </defs>

                {/* Thin outer subtle guiding ring for extra technical craftsmanship */}
                <circle
                  cx="60"
                  cy="60"
                  r={r + 8}
                  fill="transparent"
                  stroke="#334155"
                  strokeWidth="0.75"
                  strokeDasharray="4 3"
                  className="opacity-45"
                />

                {/* Background base gutter circle representing total track */}
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="10"
                />

                {/* Data Arcs with Linear Gradients */}
                {(() => {
                  let accumulatedOffset = 0;
                  const activeSegmentsCount = segments.length;
                  return segments.map((segment) => {
                    const percentage = (segment.value / total) * 100;
                    const hasMultiple = activeSegmentsCount > 1;
                    const strokeLength = hasMultiple 
                      ? ((segment.value / total) * circ) - 5
                      : (segment.value / total) * circ;
                    const strokeOffset = -accumulatedOffset;
                    accumulatedOffset += (segment.value / total) * circ;

                    const isHovered = hoveredSegment === segment.label;
                    
                    // Map display values to our precise custom linear gradients
                    let gradientUrl = segment.color;
                    if (segment.label === t('stats_warehouse_title')) gradientUrl = 'url(#grad-warehouse)';
                    else if (segment.label === t('stats_cabinet_title')) gradientUrl = 'url(#grad-office)';
                    else if (segment.label === t('stats_repair_title')) gradientUrl = 'url(#grad-repair)';

                    return (
                      <circle
                        key={segment.label}
                        cx="60"
                        cy="60"
                        r={r}
                        fill="transparent"
                        stroke={gradientUrl}
                        strokeWidth={isHovered ? 12 : 8}
                        strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-350 cursor-pointer"
                        onMouseEnter={() => setHoveredSegment(segment.label)}
                        onMouseLeave={() => setHoveredSegment(null)}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Center interactive text badge */}
              <div className="absolute text-center flex flex-col pointer-events-none z-20 bg-slate-950/80 border border-slate-800/80 w-20 h-20 rounded-full justify-center items-center backdrop-blur-md shadow-inner select-none transition-transform duration-300 group-hover:scale-105">
                <span className="text-2xl font-black text-white tracking-tight leading-none">
                  {hoveredSegment 
                    ? segments.find(s => s.label === hoveredSegment)?.value 
                    : total}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1 leading-none text-center max-w-[70px] truncate">
                  {hoveredSegment ? getShortLabel(hoveredSegment) : t('total')}
                </span>
              </div>
            </div>

            {/* Visual Legend */}
            <div className="flex flex-col space-y-2.5 w-full sm:w-auto animate-fade-in">
              {segments.map((segment) => {
                const isHovered = hoveredSegment === segment.label;
                return (
                  <div
                    key={segment.label}
                    className={`flex items-center justify-between sm:justify-start space-x-3 p-1.5 px-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isHovered 
                        ? 'bg-slate-800 border-slate-700/80 shadow-md shadow-black/10 scale-102' 
                        : 'border-transparent hover:bg-slate-800/45 hover:border-slate-850'
                    }`}
                    onMouseEnter={() => setHoveredSegment(segment.label)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-3 h-3 rounded-full ${segment.bgClass} shadow-xs ring-2 ring-slate-950/50`} />
                      <span className={`text-xs font-bold transition-colors ${isHovered ? 'text-white' : 'text-slate-350 hover:text-slate-200'}`}>
                        {segment.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 ml-4">
                      <span className="text-xs font-mono font-black text-white">{segment.value}</span>
                      <span className="text-[10px] text-slate-500 font-bold">({Math.round((segment.value / total) * 100)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
