import { useState, useMemo } from 'react';
import { Terminal, HistoryEntry } from '../types';
import { useI18n } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { 
  BarChart2, 
  TrendingUp, 
  ShieldCheck, 
  Monitor, 
  AlertTriangle, 
  Activity, 
  Building2, 
  Wrench, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  Filter,
  ArrowRightLeft
} from 'lucide-react';

interface DetailedStatsProps {
  terminals: Terminal[];
  history: HistoryEntry[];
}

export default function DetailedStats({ terminals, history }: DetailedStatsProps) {
  const { lang, t } = useI18n();

  // Selected filters
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [timePeriod, setTimePeriod] = useState<'all' | '6m' | '30d'>('all');

  const activeTerminals = useMemo(() => terminals.filter(t => !t.isDeleted), [terminals]);

  // Unique models list
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    activeTerminals.forEach(t => {
      if (t.model) set.add(t.model.trim());
    });
    return ['All', ...Array.from(set)];
  }, [activeTerminals]);

  // Filtered terminals and history based on selected filters
  const filteredTerminals = useMemo(() => {
    return activeTerminals.filter(t => {
      if (selectedModel !== 'All' && t.model.trim() !== selectedModel) return false;
      return true;
    });
  }, [activeTerminals, selectedModel]);

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (selectedModel !== 'All' && h.model.trim() !== selectedModel) return false;
      
      if (timePeriod === '30d') {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        return new Date(h.createdAt) >= dateLimit;
      }
      if (timePeriod === '6m') {
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - 6);
        return new Date(h.createdAt) >= dateLimit;
      }
      return true;
    });
  }, [history, selectedModel, timePeriod]);

  // Calculated stats
  const totalCount = filteredTerminals.length;
  const inWarehouse = filteredTerminals.filter(t => t.status === 'На складе').length;
  const inOffice = filteredTerminals.filter(t => t.status === 'В кабинете').length;
  const inRepair = filteredTerminals.filter(t => t.status === 'В ремонте').length;

  const totalMovements = filteredHistory.length;

  // Malfunctions Frequency
  const malfunctionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHistory.forEach(h => {
      if (!h.malfunction) return;
      const clean = h.malfunction.trim();
      // Group similar minor issues
      let category = clean;
      if (clean.toLowerCase().includes('інсталл') || clean.toLowerCase().includes('інстал') || clean.toLowerCase().includes('установка пз') || clean.toLowerCase().includes('настройка')) {
        category = lang === 'ua' ? 'Інсталяція ПЗ / Налаштування' : 'Инсталляция ПО / Настройка';
      } else if (clean.toLowerCase().includes('не вмикається') || clean.toLowerCase().includes('не включается')) {
        category = lang === 'ua' ? 'Не вмикається' : 'Не включается';
      } else if (clean.toLowerCase().includes('сканер') || clean.toLowerCase().includes('кнопка')) {
        category = lang === 'ua' ? 'Проблема зі сканером / кнопкою' : 'Проблема со сканером / кнопкой';
      } else if (clean.toLowerCase().includes('сенсор') || clean.toLowerCase().includes('екран') || clean.toLowerCase().includes('скло') || clean.toLowerCase().includes('экран')) {
        category = lang === 'ua' ? 'Пошкодження екрану / тачскріну' : 'Повреждение экрана / тачскрина';
      } else if (clean.toLowerCase().includes('робочий') || clean.toLowerCase().includes('робочий')) {
        category = lang === 'ua' ? 'Переміщення робочого обладнання' : 'Перемещение рабочего оборудования';
      } else if (clean.toLowerCase().includes('новий')) {
        category = lang === 'ua' ? 'Новий пристрій' : 'Новое устройство';
      }
      counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredHistory, lang]);

  // Distribution Center (RC) stats
  const rcStats = useMemo(() => {
    const counts: Record<string, { count: number; latest: string }> = {};
    filteredHistory.forEach(h => {
      const rcName = h.rc?.trim() || (lang === 'ua' ? 'Перемога' : 'Победа');
      if (!counts[rcName]) {
        counts[rcName] = { count: 0, latest: h.createdAt };
      }
      counts[rcName].count += 1;
      if (new Date(h.createdAt) > new Date(counts[rcName].latest)) {
        counts[rcName].latest = h.createdAt;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, count: data.count, latest: data.latest }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredHistory, lang]);

  // Repair company/service center performance stats
  const repairStats = useMemo(() => {
    const counts: Record<string, { total: number; resolved: number }> = {};
    filteredHistory.forEach(h => {
      // If sent to SC or repaired
      if (h.dateToSC || h.repairedBy) {
        const repairer = h.repairedBy?.trim() || 'Zebra SC';
        if (!counts[repairer]) {
          counts[repairer] = { total: 0, resolved: 0 };
        }
        counts[repairer].total += 1;
        if (h.dateFromRepair || h.dateToWarehouse) {
          counts[repairer].resolved += 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ 
        name, 
        total: data.total, 
        resolved: data.resolved,
        rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredHistory]);

  // Monthly activity trend
  const monthlyActivityData = useMemo(() => {
    const months: Record<string, { warehouse: number; repair: number; total: number }> = {};
    filteredHistory.forEach(h => {
      if (!h.createdAt) return;
      const date = new Date(h.createdAt);
      if (isNaN(date.getTime())) return;
      
      const key = date.toLocaleString(lang === 'ua' ? 'uk-UA' : 'ru-RU', { month: 'short', year: '2-digit' });
      if (!months[key]) {
        months[key] = { warehouse: 0, repair: 0, total: 0 };
      }
      months[key].total += 1;
      if (h.dateToWarehouse) {
        months[key].warehouse += 1;
      }
      if (h.dateToSC || h.dateToIT) {
        months[key].repair += 1;
      }
    });

    return Object.entries(months)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-8); // Show last 8 active months
  }, [filteredHistory, lang]);

  // Insights card logic
  const insights = useMemo(() => {
    const items = [];
    
    // Insight 1: Most active model
    const modelCounts: Record<string, number> = {};
    activeTerminals.forEach(t => {
      modelCounts[t.model] = (modelCounts[t.model] || 0) + 1;
    });
    const topModel = Object.entries(modelCounts).sort((a,b)=>b[1]-a[1])[0];
    if (topModel) {
      items.push({
        title: lang === 'ua' ? 'Домінуюче обладнання' : 'Доминирующее оборудование',
        desc: lang === 'ua' 
          ? `Модель ${topModel[0]} є найпоширенішою (${topModel[1]} шт., це ${Math.round((topModel[1]/terminals.length)*100)}% від усього реєстру).`
          : `Модель ${topModel[0]} является самой распространенной (${topModel[1]} шт., это ${Math.round((topModel[1]/terminals.length)*100)}% от всего реестра).`,
        type: 'info'
      });
    }

    // Insight 2: Repair backlog ratio
    const repairRatio = totalCount > 0 ? Math.round((inRepair / totalCount) * 100) : 0;
    if (repairRatio > 15) {
      items.push({
        title: lang === 'ua' ? 'Навантаження на ремонт' : 'Нагрузка на ремонт',
        desc: lang === 'ua'
          ? `Високий відсоток обладнання в ремонті (${repairRatio}%). Рекомендується прискорити перевірку в сервісному центрі.`
          : `Высокий процент оборудования в ремонте (${repairRatio}%). Рекомендуется ускорить проверку в сервисном центре.`,
        type: 'warning'
      });
    } else {
      items.push({
        title: lang === 'ua' ? 'Стабільність парку' : 'Стабильность парка',
        desc: lang === 'ua'
          ? `Лише ${repairRatio}% терміналів зараз надіслані на ремонт. Це відмінний показник працездатності!`
          : `Всего ${repairRatio}% терминалов сейчас отправлены на ремонт. Это отличный показатель работоспособности!`,
        type: 'success'
      });
    }

    // Insight 3: Most active DC
    if (rcStats.length > 0) {
      items.push({
        title: lang === 'ua' ? 'Ключовий логістичний вузол' : 'Ключевой логистический узел',
        desc: lang === 'ua'
          ? `Розподільчий центр "${rcStats[0].name}" є лідером за кількістю отриманих пристроїв (${rcStats[0].count} записів про переміщення).`
          : `Распределительный центр "${rcStats[0].name}" лидирует по количеству принятых устройств (${rcStats[0].count} записей о перемещениях).`,
        type: 'info'
      });
    }

    return items;
  }, [activeTerminals, inRepair, totalCount, rcStats, lang, terminals]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Dashboard Filters bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'ua' ? 'Глибока Аналітика Системи' : 'Глубокая Аналитика Системы'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {lang === 'ua' ? 'Розумні звіти та динамічний аналіз логістики терміналів' : 'Умные отчеты и динамический анализ логистики терминалов'}
            </p>
          </div>
        </div>

        {/* Dynamic Filters UI */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Model Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/60">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 mr-1">{lang === 'ua' ? 'Модель:' : 'Модель:'}</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 cursor-pointer outline-hidden"
            >
              {uniqueModels.map(m => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {m === 'All' ? (lang === 'ua' ? 'Всі моделі' : 'Все модели') : m}
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            {(['all', '6m', '30d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setTimePeriod(p)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timePeriod === p 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {p === 'all' && (lang === 'ua' ? 'За весь час' : 'Все время')}
                {p === '6m' && (lang === 'ua' ? '6 місяців' : '6 месяцев')}
                {p === '30d' && (lang === 'ua' ? '30 днів' : '30 дней')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top level metrics matching the grid design in the photo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ua' ? 'Охоплення пристроїв' : 'Охвачено устройств'}
            </span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalCount}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">100%</span>
              <span>{lang === 'ua' ? 'активних у системі' : 'активно в системе'}</span>
            </p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </div>

        {/* Metric 2: In Warehouse */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ua' ? 'Готові на складі' : 'Готовы на складе'}
            </span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {inWarehouse}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-emerald-500 font-extrabold">
                {totalCount > 0 ? Math.round((inWarehouse / totalCount) * 100) : 0}%
              </span>
              <span>{lang === 'ua' ? 'запас у резерві' : 'запас в резерве'}</span>
            </p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </div>

        {/* Metric 3: In Cabinet */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ua' ? 'Видано в кабінети' : 'Выданы в кабинеты'}
            </span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {inOffice}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-amber-500 font-extrabold">
                {totalCount > 0 ? Math.round((inOffice / totalCount) * 100) : 0}%
              </span>
              <span>{lang === 'ua' ? 'в експлуатації' : 'в эксплуатации'}</span>
            </p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </div>

        {/* Metric 4: In Repair */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/50 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ua' ? 'Наразі в ремонті' : 'Сейчас в ремонте'}
            </span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {inRepair}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span className={`${inRepair > 15 ? 'text-rose-500' : 'text-emerald-500'} font-extrabold`}>
                {totalCount > 0 ? Math.round((inRepair / totalCount) * 100) : 0}%
              </span>
              <span>{lang === 'ua' ? 'від парку пристроїв' : 'от парка устройств'}</span>
            </p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </div>
      </div>

      {/* 3. Detailed Graphs and charts - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart A: Dynamic Month-by-Month Activity curve matching the photo */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {lang === 'ua' ? 'Хронологія логістичних операцій' : 'Хронология логистических операций'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {lang === 'ua' ? 'Динаміка' : 'Динамика'}
              </span>
            </div>

            {monthlyActivityData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                <Clock className="w-10 h-10 stroke-1 mb-2 animate-pulse" />
                <span className="text-xs">{lang === 'ua' ? 'Немає даних для побудови графіку' : 'Нет данных для построения графика'}</span>
              </div>
            ) : (
              <div>
                {/* SVG Bezier Curves Plotting */}
                <div className="relative w-full h-52 mt-4">
                  {/* Background grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-100 dark:border-slate-800/40 w-full h-0" />
                    <div className="border-b border-slate-100 dark:border-slate-800/40 w-full h-0" />
                    <div className="border-b border-slate-100 dark:border-slate-800/40 w-full h-0" />
                    <div className="border-b border-slate-100 dark:border-slate-800/40 w-full h-0" />
                  </div>

                  <svg className="w-full h-full overflow-visible z-10 relative" viewBox="0 0 500 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curve-gradient-warehouse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="curve-gradient-repair" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const dataCount = monthlyActivityData.length;
                      const maxVal = Math.max(...monthlyActivityData.map(d => Math.max(d.warehouse, d.repair, d.total, 4)));
                      
                      // Calculate point positions
                      const pointsWarehouse = monthlyActivityData.map((d, idx) => {
                        const x = (idx / (dataCount - 1)) * 500;
                        const y = 180 - (d.warehouse / maxVal) * 150 - 15;
                        return { x, y };
                      });

                      const pointsRepair = monthlyActivityData.map((d, idx) => {
                        const x = (idx / (dataCount - 1)) * 500;
                        const y = 180 - (d.repair / maxVal) * 150 - 15;
                        return { x, y };
                      });

                      // Construct cubic bezier path
                      const makePath = (pts: {x:number, y:number}[]) => {
                        if (pts.length === 0) return '';
                        let path = `M ${pts[0].x} ${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                          const cpX1 = pts[i].x + (pts[i+1].x - pts[i].x) / 2;
                          const cpY1 = pts[i].y;
                          const cpX2 = pts[i].x + (pts[i+1].x - pts[i].x) / 2;
                          const cpY2 = pts[i+1].y;
                          path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pts[i+1].x} ${pts[i+1].y}`;
                        }
                        return path;
                      };

                      const pWarehouse = makePath(pointsWarehouse);
                      const pRepair = makePath(pointsRepair);

                      // Closed paths for gradients
                      const areaWarehouse = pWarehouse ? `${pWarehouse} L ${pointsWarehouse[pointsWarehouse.length-1].x} 180 L ${pointsWarehouse[0].x} 180 Z` : '';
                      const areaRepair = pRepair ? `${pRepair} L ${pointsRepair[pointsRepair.length-1].x} 180 L ${pointsRepair[0].x} 180 Z` : '';

                      return (
                        <>
                          {/* Warehouse gradient area */}
                          {areaWarehouse && <path d={areaWarehouse} fill="url(#curve-gradient-warehouse)" />}
                          {/* Repair gradient area */}
                          {areaRepair && <path d={areaRepair} fill="url(#curve-gradient-repair)" />}

                          {/* Curves lines */}
                          {pWarehouse && (
                            <path
                              d={pWarehouse}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              className="animate-fade-in"
                            />
                          )}
                          {pRepair && (
                            <path
                              d={pRepair}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              className="animate-fade-in opacity-80"
                            />
                          )}

                          {/* Dots */}
                          {pointsWarehouse.map((pt, idx) => (
                            <g key={`w-dot-${idx}`} className="group/dot cursor-pointer">
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-all duration-200 hover:scale-150" />
                              <circle cx={pt.x} cy={pt.y} r="10" fill="#10b981" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />
                            </g>
                          ))}

                          {pointsRepair.map((pt, idx) => (
                            <g key={`r-dot-${idx}`} className="group/dot cursor-pointer">
                              <circle cx={pt.x} cy={pt.y} r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" className="transition-all duration-200 hover:scale-150" />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 px-1 font-mono">
                  {monthlyActivityData.map((d, idx) => (
                    <span key={idx}>{d.month}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legend and totals description matching the style of the card in the photo */}
          <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4">
            <div className="flex space-x-5">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500 font-semibold">
                  {lang === 'ua' ? 'Передача на склад' : 'Передача на склад'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-1.5 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-500 font-semibold">
                  {lang === 'ua' ? 'Надіслано в ремонт / IT' : 'Отправлено в ремонт / IT'}
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-400">
              {lang === 'ua' ? `Всього операцій за вибіркою: ` : `Всего операций по выборке: `}
              <span className="font-extrabold text-slate-800 dark:text-white font-mono">{totalMovements}</span>
            </div>
          </div>
        </div>

        {/* Chart B: Common Malfunctions (Fault frequencies) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {lang === 'ua' ? 'Популярні несправності' : 'Частые неисправности'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">{lang === 'ua' ? 'Топ-5 причин' : 'Топ-5 причин'}</span>
            </div>

            {malfunctionStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                {lang === 'ua' ? 'Немає зафіксованих несправностей' : 'Нет зафиксированных неисправностей'}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {malfunctionStats.map((item, idx) => {
                  const maxCount = malfunctionStats[0]?.count || 1;
                  const percent = Math.round((item.count / maxCount) * 100);
                  const colors = [
                    'bg-rose-500',
                    'bg-amber-500',
                    'bg-blue-500',
                    'bg-emerald-500',
                    'bg-purple-500',
                  ];
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {item.count} <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          className={`h-full rounded-full ${colors[idx % colors.length]}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-4 leading-relaxed pt-3 border-t border-slate-100 dark:border-slate-800/40">
            {lang === 'ua' 
              ? '* Статистика сформована на базі історичних записів у кошику та реєстрі.'
              : '* Статистика сформирована на базе исторических записей в корзине и реестре.'}
          </div>
        </div>

      </div>

      {/* 4. Distribution Centers and Service Centers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DC (RC) Logistics activity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {lang === 'ua' ? 'Активність за Розподільчими Центрами (РЦ)' : 'Активность по Распределительным Центрам (РЦ)'}
              </span>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-slate-400" />
          </div>

          {rcStats.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              {lang === 'ua' ? 'Дані про РЦ відсутні' : 'Данные о РЦ отсутствуют'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rcStats.map((rc, idx) => {
                const latestDate = new Date(rc.latest);
                return (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[130px] truncate" title={rc.name}>
                        {rc.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        {rc.count} {lang === 'ua' ? 'оп.' : 'оп.'}
                      </span>
                    </div>

                    <div className="mt-3.5 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{lang === 'ua' ? 'Останній запис:' : 'Последняя запись:'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {isNaN(latestDate.getTime()) ? '—' : latestDate.toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Repair resolving rate / SC stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {lang === 'ua' ? 'Ефективність Сервісних Центрів' : 'Эффективность Сервисных Центров'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">{lang === 'ua' ? 'Закриття ремонтів' : 'Закрытие ремонтов'}</span>
          </div>

          {repairStats.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              {lang === 'ua' ? 'Немає інформації про сервісні центри' : 'Нет информации о сервисных центрах'}
            </div>
          ) : (
            <div className="space-y-4">
              {repairStats.map((sc, idx) => {
                return (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[150px]">
                          {sc.name === 'Zebra SC' ? (lang === 'ua' ? 'Авторизований Zebra SC' : 'Авторизованный Zebra SC') : sc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {lang === 'ua' ? `Всього ремонтів: ${sc.total} (${sc.resolved} виконано)` : `Всего ремонтов: ${sc.total} (${sc.resolved} выполнено)`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-800 dark:text-white block font-mono">
                        {sc.rate}%
                      </span>
                      <span className="text-[9px] font-extrabold uppercase text-emerald-500 tracking-wider">
                        {lang === 'ua' ? 'Успішність' : 'Успешность'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 5. System Insights & Suggestions cards */}
      <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/10 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-500/20 p-6 rounded-[28px] shadow-sm">
        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3.5 flex items-center gap-1.5">
          <Activity className="w-4 h-4 animate-pulse" />
          {lang === 'ua' ? 'Розумні Поради та Спостереження' : 'Умные Советы и Наблюдения'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins, idx) => {
            return (
              <div 
                key={idx} 
                className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/10 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {ins.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {ins.desc}
                  </p>
                </div>
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                  <span className="text-[9px] font-bold text-emerald-500 hover:underline flex items-center cursor-pointer gap-0.5">
                    {lang === 'ua' ? 'Застосувати фільтр' : 'Применить фильтр'}
                    <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
