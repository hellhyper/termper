import React, { useState, useMemo } from 'react';
import { Terminal, HistoryEntry, TerminalStatus } from '../types';
import { 
  Search, 
  Calendar, 
  ShieldAlert, 
  ArrowUpDown, 
  ClipboardList, 
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  Hourglass,
  Tag
} from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

interface RecentMovementsProps {
  terminals: Terminal[];
  history: HistoryEntry[];
  onSelectTerminal: (terminal: Terminal) => void;
  onSelectTab: (tab: 'terminals' | 'instructions' | 'help' | 'setup') => void;
}

type SortField = 'createdAt' | 'dateToIT' | 'dateToSC' | 'dateFromRepair' | 'dateToWarehouse';
type SortOrder = 'asc' | 'desc';

export default function RecentMovements({
  terminals,
  history,
  onSelectTerminal,
  onSelectTab,
}: RecentMovementsProps) {
  const { lang, t } = useI18n();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'it' | 'sc' | 'done'>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Key system stats computed from history across all terminals
  const stats = useMemo(() => {
    const totalLogs = history.length;
    
    // Terminals currently under active IT diagnostics (sent to IT but not yet in SC or warehouse)
    const inIT = history.filter(h => h.dateToIT && !h.dateToSC && !h.dateFromRepair && !h.dateToWarehouse).length;
    
    // Terminals currently external at the Service Center (sent to SC but not received back yet)
    const inSC = history.filter(h => h.dateToSC && !h.dateFromRepair && !h.dateToWarehouse).length;
    
    // Terminals successfully repaired and returned to warehouse
    const totalRepairedAndReturned = history.filter(h => h.dateFromRepair && h.dateToWarehouse).length;

    return {
      totalLogs,
      inIT,
      inSC,
      totalRepairedAndReturned
    };
  }, [history]);

  // Handle active sorting field changes
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter history log entries
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // 1. Text Search across terminal models, serial numbers, malfunctions, and repair owners
      const matchesSearch = 
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.malfunction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.repairedBy && item.repairedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.rc && item.rc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.zno && item.zno.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Operations category filters
      if (typeFilter === 'it') {
        // Under active IT evaluation or current diagnostics
        return !!item.dateToIT && !item.dateFromRepair;
      }
      if (typeFilter === 'sc') {
        // Actively at Service Center
        return !!item.dateToSC && !item.dateFromRepair;
      }
      if (typeFilter === 'done') {
        // Repaired or returned back to warehouse
        return !!item.dateToWarehouse || !!item.dateFromRepair;
      }

      return true;
    });
  }, [history, searchTerm, typeFilter]);

  // Sort filtered history
  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      // Fallback to createdAt if specific date field is empty
      if (!valA && sortField !== 'createdAt') valA = a.createdAt || '';
      if (!valB && sortField !== 'createdAt') valB = b.createdAt || '';

      if (!valA && valB) return sortOrder === 'asc' ? 1 : -1;
      if (valA && !valB) return sortOrder === 'asc' ? -1 : 1;
      if (!valA && !valB) return 0;

      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
  }, [filteredHistory, sortField, sortOrder]);

  // Find linked terminal to navigate to its details directly
  const handleNavigateToTerminal = (serialNum: string) => {
    const match = terminals.find(
      t => t.serialNumber.toLowerCase() === serialNum.trim().toLowerCase()
    );
    if (match) {
      onSelectTerminal(match);
    } else {
      // Prompt user or handle gracefully
      alert((t('terminal_missing_error') || 'Терминал отсутствует в текущем активном реестре').replace('{sn}', serialNum));
    }
  };

  const getSortFieldLabel = (field: SortField) => {
    if (field === 'createdAt') return t('sort_creation');
    if (field === 'dateToIT') return t('sort_to_it');
    if (field === 'dateToSC') return t('sort_to_sc');
    if (field === 'dateFromRepair') return t('sort_from_repair');
    return t('sort_to_warehouse');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Visual Hub Banner Card */}
      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('monitoring_movement')}</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {t('monitoring_title')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('monitoring_desc')}
            </p>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 text-right max-w-xs shrink-0 self-start md:self-auto">
            <span className="block text-[10px] font-bold uppercase text-blue-400 tracking-wider">{t('monitoring_ops')}</span>
            <span className="block text-xl font-black text-white mt-1 font-mono leading-none">
              {stats.totalLogs} <span className="text-xs text-slate-500 font-normal">{t('monitoring_records')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Embedded statistics layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/70 p-4 flex items-center space-x-4 hover:border-slate-700 transition-all duration-300">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('stats_in_it')}</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">
              {stats.inIT} <span className="text-xs font-medium text-slate-500">ТСД</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/70 p-4 flex items-center space-x-4 hover:border-slate-700 transition-all duration-300">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('stats_in_sc')}</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">
              {stats.inSC} <span className="text-xs font-medium text-slate-500">шт.</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/70 p-4 flex items-center space-x-4 hover:border-slate-700 transition-all duration-300">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('stats_returned')}</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">
              {stats.totalRepairedAndReturned} <span className="text-xs font-medium text-slate-500">{t('monitoring_records')}</span>
            </span>
          </div>
        </div>

      </div>

      {/* Filters and search panel bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search input field */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t('search_movement_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-200 placeholder-slate-500 rounded-xl focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/15 transition-all text-ellipsis"
          />
        </div>

        {/* Categories Tab Swappers */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/50 rounded-xl border border-slate-800/40 w-full md:w-auto overflow-x-auto shrink-0">
          {[
            { id: 'all', label: t('filter_all_records') },
            { id: 'it', label: t('filter_in_it') },
            { id: 'sc', label: t('filter_in_sc') },
            { id: 'done', label: t('filter_done') },
          ].map((tab) => {
            const isSel = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as any)}
                className={`text-[11px] px-3.5 py-2 font-bold rounded-lg cursor-pointer tracking-wide transition-all ${
                  isSel
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/25 shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Sorting panel header */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/25 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-300 animate-pulse" />
              {t('tab_movements')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('records_showing')}: {sortedHistory.length} {t('registry_of')} {history.length}</p>
          </div>
          
          <div className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700/80 font-bold px-3 py-1 rounded-lg uppercase tracking-wider flex items-center shrink-0">
            {t('sorting_label')}: {getSortFieldLabel(sortField)} ({sortOrder === 'asc' ? `▲ ${t('asc')}` : `▼ ${t('desc')}`})
          </div>
        </div>

        {/* Mini Quick Sorter Selector Grid */}
        <div className="p-3 bg-slate-900/30 border-b border-slate-800/60 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold text-slate-400 mr-2 flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-500" />
            {t('sorting_control')}
          </span>
          {[
            { field: 'createdAt', label: t('sort_createdAt_lbl') },
            { field: 'dateToIT', label: t('sort_it_lbl') },
            { field: 'dateToSC', label: t('sort_sc_lbl') },
            { field: 'dateFromRepair', label: t('sort_repair_lbl') },
            { field: 'dateToWarehouse', label: t('sort_warehouse_lbl') },
          ].map((item) => {
            const isSel = sortField === item.field;
            return (
              <button
                key={item.field}
                type="button"
                onClick={() => handleSort(item.field as SortField)}
                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border tracking-wider transition-all flex items-center cursor-pointer ${
                  isSel
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/35 shadow-xs'
                    : 'bg-slate-800/40 border-slate-750 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
                {isSel && (
                  <span className="ml-1 font-mono">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Database List / Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-5xl">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none select-none">
                <th className="py-4 px-4 font-black">{t('col_model')}</th>
                <th className="py-4 px-4 text-amber-400 bg-amber-500/5 font-black">{t('col_to_it')}</th>
                <th className="py-4 px-4 text-rose-400 bg-rose-500/5 font-black">{t('col_to_sc')}</th>
                <th className="py-4 px-4 font-black text-slate-300">{t('col_repairer')}</th>
                <th className="py-4 px-4 text-blue-400 bg-blue-500/5 font-black">{t('col_repaired')}</th>
                <th className="py-4 px-4 text-emerald-400 bg-emerald-500/5 font-black">{t('col_warehouse')}</th>
                <th className="py-4 px-4 font-black text-slate-400">{t('col_rc_zno')}</th>
                <th className="py-4 px-4 font-black text-slate-300">{t('col_fault')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              {sortedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <ClipboardList className="w-10 h-10 mx-auto text-slate-600 mb-3 opacity-40 animate-pulse" />
                    {t('no_movements_found')}
                  </td>
                </tr>
              ) : (
                sortedHistory.map((item) => {
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-800/20 transition-colors group/row"
                    >
                      {/* Model & Interactive Serial Number linking back */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleNavigateToTerminal(item.serialNumber)}
                            className="text-left font-bold text-white group-hover/row:text-blue-300 hover:underline transition-colors focus:outline-hidden cursor-pointer"
                            title={t('click_view_history')}
                          >
                            {item.model}
                          </button>
                          
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[9px] text-slate-500">S/N:</span>
                            <span 
                              type="button"
                              onClick={() => handleNavigateToTerminal(item.serialNumber)}
                              className="font-mono text-[10px] text-blue-400/80 bg-blue-500/5 hover:bg-blue-500/20 hover:text-blue-300 px-1.5 py-0.5 rounded-full cursor-pointer transition-all border border-blue-500/10"
                              title={t('click_view_history')}
                            >
                              {item.serialNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date sent to IT department */}
                      <td className="py-3 px-4 bg-amber-500/[0.01]">
                        {item.dateToIT ? (
                          <div className="flex items-center space-x-1 text-slate-200 font-bold">
                            <Calendar className="w-3 h-3 text-amber-500/60 shrink-0" />
                            <span>{new Date(item.dateToIT).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold font-mono">{t('no_value')}</span>
                        )}
                      </td>

                      {/* Date sent to Service Centre */}
                      <td className="py-3 px-4 bg-rose-500/[0.01]">
                        {item.dateToSC ? (
                          <div className="flex items-center space-x-1 text-slate-200 font-bold">
                            <Calendar className="w-3 h-3 text-rose-500/60 shrink-0" />
                            <span>{new Date(item.dateToSC).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold font-mono">{t('no_value')}</span>
                        )}
                      </td>

                      {/* Serviced By / Repaired By */}
                      <td className="py-3 px-4 font-semibold text-slate-350">
                        {item.repairedBy ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-white max-w-[120px] truncate block" title={item.repairedBy}>
                              {item.repairedBy}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Returned from repair date */}
                      <td className="py-3 px-4 bg-blue-500/[0.01]">
                        {item.dateFromRepair ? (
                          <div className="flex items-center space-x-1 text-slate-200 font-bold">
                            <Calendar className="w-3 h-3 text-blue-500/60 shrink-0" />
                            <span>{new Date(item.dateFromRepair).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold font-mono">{t('no_value')}</span>
                        )}
                      </td>

                      {/* Returned to system warehouse */}
                      <td className="py-3 px-4 bg-emerald-500/[0.01]">
                        {item.dateToWarehouse ? (
                          <div className="flex items-center space-x-1 text-slate-200 font-bold">
                            <Calendar className="w-3 h-3 text-emerald-500/60 shrink-0" />
                            <span>{new Date(item.dateToWarehouse).toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold font-mono">{t('no_value')}</span>
                        )}
                      </td>

                      {/* Distribution Hub & Ticket */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-slate-300 font-bold text-[11px] truncate max-w-[110px] block" title={item.rc}>
                            {item.rc || 'РЦ Ногинск'}
                          </span>
                          {item.zno ? (
                            <span className="font-mono text-[9px] text-blue-300 bg-blue-500/10 border border-blue-500/10 px-1.5 py-0.2 rounded-md font-bold self-start animate-fade-in" title="Номер ЗНО">
                              ЗНО: {item.zno}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* Fault / Malfunction Description block */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-slate-200 font-semibold leading-relaxed break-words text-xs py-0.5">
                          {item.malfunction}
                        </div>
                        <div className="flex flex-col space-y-0.5 mt-1 text-[9px] text-slate-500 font-mono font-bold">
                          {item.createdAt && (
                            <div>
                              {lang === 'ua' ? 'Дата запису: ' : 'Дата записи: '}{new Date(item.createdAt).toLocaleString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}
                            </div>
                          )}
                          {item.userLogin && (
                            <div className="text-blue-400">
                              {lang === 'ua' ? 'Виконав: ' : 'Выполнил: '}<span className="underline">{item.userLogin}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom micro indicator */}
        <div className="p-4 bg-slate-950/45 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{t('sync_realtime')}</span>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">{t('sync_db_stable')}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
