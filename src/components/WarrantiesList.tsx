import React, { useState, useMemo } from 'react';
import { Terminal } from '../types';
import { 
  Search, 
  Calendar, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX, 
  Plus, 
  Trash2, 
  Clock, 
  CalendarRange,
  X,
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useI18n } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import TzdRenameTab from './TzdRenameTab';

interface WarrantiesListProps {
  terminals: Terminal[];
  onUpdateTerminal: (id: string, fields: Partial<Terminal>) => Promise<void>;
  onAddTerminal: (newTerm: { model: string; serialNumber: string; status: any; warrantyEndsAt?: string }) => Promise<void>;
  onDeleteTerminal: (id: string) => Promise<void>;
}

type SortOption = 'date-asc' | 'date-desc' | 'model-asc' | 'serial-asc';
type FilterOption = 'all' | 'expiring-soon' | 'expired' | 'active' | 'none';

export default function WarrantiesList({ 
  terminals, 
  onUpdateTerminal, 
  onAddTerminal, 
  onDeleteTerminal 
}: WarrantiesListProps) {
  const { lang } = useI18n();
  const [subTab, setSubTab] = useState<'warranties' | 'rename'>('warranties');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const uniqueModels = useMemo(() => {
    const models = terminals.map(t => t.model);
    return Array.from(new Set(models)).sort();
  }, [terminals]);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newStatus, setNewStatus] = useState<'На складе' | 'В кабинете' | 'В ремонте'>('На складе');
  const [newWarrantyDate, setNewWarrantyDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Track updating terminal ID to show saving state/animation
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Today's date (relative to 2026-06-23 or system clock)
  const today = useMemo(() => new Date('2026-06-23'), []);

  // Utility to determine warranty status
  const getWarrantyStatus = (warrantyDateStr?: string) => {
    if (!warrantyDateStr) return { type: 'none', label: lang === 'ua' ? 'Не вказано' : 'Не указана', colorClass: 'text-slate-400 bg-slate-800/50 border-slate-700/50' };
    
    const warrantyDate = new Date(warrantyDateStr);
    const timeDiff = warrantyDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return { 
        type: 'expired', 
        label: lang === 'ua' ? 'Закінчилась' : 'Истекла', 
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        daysDiff
      };
    } else if (daysDiff <= 60) {
      return { 
        type: 'expiring-soon', 
        label: lang === 'ua' ? 'Скоро закінчується (< 2 міс)' : 'Истекает скоро (< 2 мес)', 
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold',
        daysDiff
      };
    } else {
      return { 
        type: 'active', 
        label: lang === 'ua' ? 'Активна' : 'Активна', 
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        daysDiff
      };
    }
  };

  // Handle warranty date change
  const handleDateChange = async (terminalId: string, dateVal: string) => {
    setUpdatingId(terminalId);
    try {
      await onUpdateTerminal(terminalId, { warrantyEndsAt: dateVal });
      setSuccessId(terminalId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      console.error('Failed to update warranty date', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Preset quick adder (+1 or +2 years from today)
  const applyPresetYears = async (terminalId: string, years: number) => {
    const targetDate = new Date(today);
    targetDate.setFullYear(targetDate.getFullYear() + years);
    const dateStr = targetDate.toISOString().split('T')[0];
    await handleDateChange(terminalId, dateStr);
  };

  // Handle manual addition
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newModel.trim()) {
      setFormError(lang === 'ua' ? 'Введіть модель ТЗД' : 'Введите модель ТСД');
      return;
    }
    if (!newSerial.trim()) {
      setFormError(lang === 'ua' ? 'Введіть серійний номер' : 'Введите серийный номер');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTerminal({
        model: newModel,
        serialNumber: newSerial,
        status: newStatus,
        warrantyEndsAt: newWarrantyDate || undefined
      });
      // Reset form & close
      setNewModel('');
      setNewSerial('');
      setNewStatus('На складе');
      setNewWarrantyDate('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    try {
      await onDeleteTerminal(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & sort terminals list
  const processedTerminals = useMemo(() => {
    let result = [...terminals];

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        t => t.model.toLowerCase().includes(q) || t.serialNumber.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter !== 'all') {
      result = result.filter((term) => {
        const status = getWarrantyStatus(term.warrantyEndsAt);
        return status.type === filter;
      });
    }

    // Model Filter
    if (selectedModel !== 'all') {
      result = result.filter((term) => term.model === selectedModel);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date-asc') {
        if (!a.warrantyEndsAt) return 1;
        if (!b.warrantyEndsAt) return -1;
        return new Date(a.warrantyEndsAt).getTime() - new Date(b.warrantyEndsAt).getTime();
      } else if (sortBy === 'date-desc') {
        if (!a.warrantyEndsAt) return 1;
        if (!b.warrantyEndsAt) return -1;
        return new Date(b.warrantyEndsAt).getTime() - new Date(a.warrantyEndsAt).getTime();
      } else if (sortBy === 'model-asc') {
        return a.model.localeCompare(b.model);
      } else if (sortBy === 'serial-asc') {
        return a.serialNumber.localeCompare(b.serialNumber);
      }
      return 0;
    });

    return result;
  }, [terminals, searchTerm, filter, sortBy, selectedModel]);

  // Overall counts for badges
  const summaryCounts = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let active = 0;
    let none = 0;

    terminals.forEach((t) => {
      const status = getWarrantyStatus(t.warrantyEndsAt);
      if (status.type === 'expired') expired++;
      else if (status.type === 'expiring-soon') expiringSoon++;
      else if (status.type === 'active') active++;
      else none++;
    });

    return { total: terminals.length, expired, expiringSoon, active, none };
  }, [terminals]);

  return (
    <div className="space-y-6">
      {/* Sub tabs selector */}
      <div className="flex bg-slate-950/40 p-1 rounded-xl border border-slate-800/80 text-xs w-full max-w-md">
        <button
          type="button"
          onClick={() => setSubTab('warranties')}
          className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
            subTab === 'warranties'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'ua' ? 'Реєстр та гарантії' : 'Реестр и гарантии'}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rename')}
          className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
            subTab === 'rename'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'ua' ? 'Перейменування ТЗД' : 'Переименование ТСД'}
        </button>
      </div>

      {subTab === 'warranties' ? (
        <>
          {/* Upper header summary panel */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            {lang === 'ua' ? 'Всього ТЗД' : 'Всего ТСД'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{summaryCounts.total}</span>
            <span className="text-xs text-slate-500 font-medium">шт</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
            <ShieldX className="w-3.5 h-3.5 mr-1" />
            {lang === 'ua' ? 'Гарантія закінчилась' : 'Гарантия истекла'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">{summaryCounts.expired}</span>
            <span className="text-xs text-rose-500 font-medium">шт</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/20 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 animate-pulse" />
            {lang === 'ua' ? 'Істекає (< 2 міс)' : 'Истекает (< 2 мес)'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{summaryCounts.expiringSoon}</span>
            <span className="text-xs text-amber-500 font-medium">шт</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            {lang === 'ua' ? 'Активна гарантія' : 'Активная гарантия'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{summaryCounts.active}</span>
            <span className="text-xs text-emerald-500 font-medium">шт</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl col-span-2 lg:col-span-1 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            {lang === 'ua' ? 'Термін не вказано' : 'Срок не указан'}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-400">{summaryCounts.none}</span>
            <span className="text-xs text-slate-500 font-medium">шт</span>
          </div>
        </div>
      </div>

      {/* Main card panel with controls */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden p-5 space-y-4">
        
        {/* Upper search, filter ribbon and add button */}
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Left search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={lang === 'ua' ? 'Пошук за моделлю чи серійним номером...' : 'Поиск по модели или серийному номеру...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border border-slate-800 bg-slate-950/50 focus:outline-hidden focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 text-white placeholder-slate-500 transition-all"
            />
          </div>

          {/* Right quick filters & Add trigger button */}
          <div className="flex flex-wrap gap-2 items-center">
            
            {/* Filter select pills */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'ua' ? 'Всі' : 'Все'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('expiring-soon')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center ${
                  filter === 'expiring-soon' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                {lang === 'ua' ? 'Увага' : 'Внимание'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('expired')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center ${
                  filter === 'expired' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                {lang === 'ua' ? 'Закінчилась' : 'Истекла'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center ${
                  filter === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                {lang === 'ua' ? 'Активні' : 'Активные'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter('none')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  filter === 'none' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'ua' ? 'Без дат' : 'Без дат'}
              </motion.button>
            </div>

            {/* Model Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                {lang === 'ua' ? 'Модель:' : 'Модель:'}
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-hidden focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">{lang === 'ua' ? 'Всі моделі' : 'Все модели'}</option>
                {uniqueModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Sorting trigger dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                {lang === 'ua' ? 'Сортування:' : 'Сортировка:'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-hidden focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="date-asc">{lang === 'ua' ? 'Термін: Спочатку критичні' : 'Срок: Сначала критичные'}</option>
                <option value="date-desc">{lang === 'ua' ? 'Термін: Спочатку свіжі' : 'Срок: Сначала свежие'}</option>
                <option value="model-asc">{lang === 'ua' ? 'За моделлю (А-Я)' : 'По модели (А-Я)'}</option>
                <option value="serial-asc">{lang === 'ua' ? 'За серійним номером' : 'По серийному номеру'}</option>
              </select>
            </div>

            {/* Manual Add Trigger */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddModalOpen(true)}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ua' ? 'Додати ТЗД' : 'Добавить ТСД'}</span>
            </motion.button>

          </div>
        </div>

        {/* Database records list container */}
        <div className="border border-slate-800/60 rounded-xl bg-slate-950/20 overflow-hidden">
          
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-3">{lang === 'ua' ? 'Модель ТЗД' : 'Модель ТСД'}</div>
            <div className="col-span-2">{lang === 'ua' ? 'Серійний номер' : 'Серийный номер'}</div>
            <div className="col-span-2 text-center">{lang === 'ua' ? 'Статус пристрою' : 'Статус устройства'}</div>
            <div className="col-span-2 text-center">{lang === 'ua' ? 'Стан гарантії' : 'Состояние гарантии'}</div>
            <div className="col-span-3 text-right">{lang === 'ua' ? 'Дата закінчення / Дії' : 'Дата окончания / Действия'}</div>
          </div>

          <div className="divide-y divide-slate-850">
            {processedTerminals.length > 0 ? (
              processedTerminals.map((terminal) => {
                const status = getWarrantyStatus(terminal.warrantyEndsAt);
                const isExpiringSoon = status.type === 'expiring-soon';
                const isExpired = status.type === 'expired';
                const isConfirmingDelete = deleteConfirmId === terminal.id;
                
                // Row Highlight Style specifically for warning status
                let rowBgClass = 'hover:bg-slate-900/30';
                if (isExpiringSoon) rowBgClass = 'bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500';
                if (isExpired) rowBgClass = 'bg-rose-500/5 hover:bg-rose-500/10 border-l-2 border-l-rose-500';

                return (
                  <div 
                    key={terminal.id} 
                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 transition-all duration-200 ${rowBgClass}`}
                  >
                    
                    {/* Model details */}
                    <div className="col-span-1 md:col-span-3 flex items-center space-x-3">
                      <div className={`p-2 rounded-xl bg-slate-900 ${isExpiringSoon ? 'text-amber-400' : isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                        <CalendarRange className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{terminal.model}</h4>
                        <p className="text-[10px] text-slate-500">ID: {terminal.id}</p>
                      </div>
                    </div>

                    {/* Serial Number */}
                    <div className="col-span-1 md:col-span-2 flex items-center space-x-1.5">
                      <span className="text-[10px] md:text-xs font-mono font-bold text-blue-300 bg-blue-950/30 border border-blue-900/30 px-2 py-1 rounded-lg">
                        {terminal.serialNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(terminal.serialNumber);
                          alert(lang === 'ua' ? 'Серійний номер скопійовано!' : 'Серийный номер скопирован!');
                        }}
                        title={lang === 'ua' ? 'Скопіювати' : 'Скопировать'}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    </div>

                    {/* Device Status */}
                    <div className="col-span-1 md:col-span-2 text-left md:text-center">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        terminal.status === 'На складе' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : terminal.status === 'В ремонте'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {terminal.status}
                      </span>
                    </div>

                    {/* Warranty indicator status pill */}
                    <div className="col-span-1 md:col-span-2 text-left md:text-center">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.colorClass}`}>
                        {status.type === 'expired' && <ShieldX className="w-3 h-3 mr-1" />}
                        {status.type === 'expiring-soon' && <ShieldAlert className="w-3 h-3 mr-1 animate-bounce" />}
                        {status.type === 'active' && <ShieldCheck className="w-3 h-3 mr-1" />}
                        {status.type === 'none' && <Clock className="w-3 h-3 mr-1" />}
                        {status.label}
                        {status.daysDiff !== undefined && (
                          <span className="ml-1 text-[9px] opacity-80">
                            ({status.daysDiff > 0 ? `+${status.daysDiff}` : status.daysDiff} дн.)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Date picker inputs + Quick Increments + Actions */}
                    <div className="col-span-1 md:col-span-3 flex flex-wrap gap-2 items-center justify-start md:justify-end">
                      
                      {/* Interactive date selector */}
                      <div className="relative flex items-center gap-1.5">
                        <CustomDatePicker
                          value={terminal.warrantyEndsAt || ''}
                          onChange={(dateStr) => handleDateChange(terminal.id, dateStr)}
                          disabled={updatingId === terminal.id}
                          className={
                            isExpiringSoon 
                              ? 'border-amber-500/50 focus:border-amber-400' 
                              : isExpired 
                              ? 'border-rose-500/50 focus:border-rose-400' 
                              : 'border-slate-800 focus:border-blue-500'
                          }
                        />
                        {updatingId === terminal.id && (
                          <div className="absolute right-9 top-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {successId === terminal.id && (
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs">
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Quick preset increments +1y, +2y */}
                      <div className="flex space-x-1">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => applyPresetYears(terminal.id, 1)}
                          title={lang === 'ua' ? '+1 Рік гарантії' : '+1 Год гарантии'}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-750 border border-slate-800 text-[9px] font-bold text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          +1г
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => applyPresetYears(terminal.id, 2)}
                          title={lang === 'ua' ? '+2 Роки гарантії' : '+2 Года гарантии'}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-750 border border-slate-800 text-[9px] font-bold text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          +2г
                        </motion.button>
                      </div>

                      {/* Delete actions with confirmation */}
                      <div className="relative flex items-center pl-1">
                        <AnimatePresence mode="wait">
                          {isConfirmingDelete ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1 bg-slate-900 border border-rose-500/40 p-1 rounded-lg z-10"
                            >
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDeleteClick(terminal.id)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-[9px] font-bold text-white rounded-md cursor-pointer"
                              >
                                {lang === 'ua' ? 'Так' : 'Да'}
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-400 rounded-md cursor-pointer"
                              >
                                {lang === 'ua' ? 'Ні' : 'Нет'}
                              </motion.button>
                            </motion.div>
                          ) : (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.15, rotate: 5, color: '#f87171' }}
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setDeleteConfirmId(terminal.id)}
                              title={lang === 'ua' ? 'Видалити пристрій' : 'Удалить устройство'}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium">
                  {lang === 'ua' ? 'Пристроїв за вказаними фільтрами не знайдено' : 'Устройств по указанным фильтрам не найдено'}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Helpful informative banner about how tracking works */}
      <div className="bg-blue-500/5 border border-blue-500/15 p-4 rounded-2xl flex items-start gap-3">
        <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-blue-300">
            {lang === 'ua' ? 'Автоматичний контроль та сповіщення' : 'Автоматический контроль и оповещения'}
          </h4>
          <p className="text-slate-400 leading-relaxed">
            {lang === 'ua' 
              ? 'Система автоматично сканує реєстр та підсвічує жовтим кольором ТЗД, гарантійний термін яких спливає найближчі 2 місяці (60 днів). Пристрої з протермінованою гарантією підсвічуються червоним для своєчасної заміни чи сервісного обслуговування.'
              : 'Система автоматически сканирует реестр и подсвечивает желтым цветом ТСД, гарантийный срок которых истекает в ближайшие 2 месяца (60 дней). Устройства с истекшей гарантией подсвечиваются красным для своевременной замены или сервисного обслуживания.'}
          </p>
        </div>
      </div>

      {/* Modern Neon Dialog Modal to Add Terminal Manually */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-black/80 space-y-5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {lang === 'ua' ? 'Новий термінал ТЗД' : 'Новый терминал ТСД'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'ua' ? 'Введіть деталі для додавання до гарантійного реєстру' : 'Введите детали для добавления в гарантийный реестр'}
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                {/* Model name input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'ua' ? 'Модель пристрою' : 'Модель устройства'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="напр., Honeywell EDA51"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 focus:outline-hidden focus:border-blue-500 text-white font-medium"
                  />
                </div>

                {/* Serial Number input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'ua' ? 'Серійний номер' : 'Серийный номер'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    placeholder="напр., EDA51-23091103"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 focus:outline-hidden focus:border-blue-500 text-white font-medium font-mono"
                  />
                </div>

                {/* Device Status Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'ua' ? 'Початковий статус' : 'Начальный статус'}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 focus:outline-hidden focus:border-blue-500 text-white font-medium cursor-pointer"
                  >
                    <option value="На складе">{lang === 'ua' ? 'На складі' : 'На складе'}</option>
                    <option value="В кабинете">{lang === 'ua' ? 'В кабінеті / залі' : 'В кабинете / зале'}</option>
                    <option value="В ремонте">{lang === 'ua' ? 'В ремонті (СЦ)' : 'В ремонте (СЦ)'}</option>
                  </select>
                </div>

                {/* Expiration Date picker */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {lang === 'ua' ? 'Кінцева дата гарантії' : 'Конечная дата гарантии'} <span className="text-slate-500">({lang === 'ua' ? 'опціонально' : 'опционально'})</span>
                  </label>
                  <CustomDatePicker
                    value={newWarrantyDate}
                    onChange={(val) => setNewWarrantyDate(val)}
                    placeholder={lang === 'ua' ? 'дд.мм.рррр (необов\'язково)' : 'дд.мм.гггг (необязательно)'}
                    className="py-2.5 bg-slate-950/60 border-slate-800 focus:border-blue-500"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 font-bold text-xs rounded-xl cursor-pointer text-center"
                  >
                    {lang === 'ua' ? 'Скасувати' : 'Отмена'}
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{lang === 'ua' ? 'Додати' : 'Добавить'}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      ) : (
        <TzdRenameTab />
      )}
    </div>
  );
}
