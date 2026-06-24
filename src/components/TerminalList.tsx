import React, { useState, useMemo } from 'react';
import { Terminal, TerminalStatus } from '../types';
import { Search, Plus, Trash2, SlidersHorizontal, Monitor, X, ClipboardList, Pencil, FileText } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
interface TerminalListProps {
  terminals: Terminal[];
  onAddTerminal: (data: { model: string; serialNumber: string; status: TerminalStatus }) => Promise<void>;
  onUpdateStatus: (id: string, status: TerminalStatus) => Promise<void>;
  onDeleteTerminal: (id: string) => Promise<void>;
  onSelectTerminal: (terminal: Terminal) => void;
  onUpdateTerminal?: (id: string, fields: Partial<Terminal>) => Promise<void>;
  onNavigateToActs: () => void;
}

export default function TerminalList({
  terminals,
  onAddTerminal,
  onUpdateStatus,
  onDeleteTerminal,
  onSelectTerminal,
  onUpdateTerminal,
  onNavigateToActs,
}: TerminalListProps) {
  const { lang, t } = useI18n();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Все');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showSimpleRepairList, setShowSimpleRepairList] = useState(false);

  // Serial Number editing state
  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [tempSerial, setTempSerial] = useState<string>('');

  const handleSaveSerial = async (id: string, originalSerial: string) => {
    const trimmed = tempSerial.trim();
    if (!trimmed) {
      alert(t('alert_serial_empty') || 'Серийный номер не может быть пустым');
      return;
    }
    if (trimmed === originalSerial) {
      setEditingSerialId(null);
      return;
    }

    // Check duplicates locally (excluding current terminal)
    const duplicate = terminals.some(
      (t) => t.id !== id && t.serialNumber.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert((t('alert_serial_duplicate') || 'Устройство с серийным номером уже зарегистрировано').replace('{sn}', trimmed));
      return;
    }

    try {
      if (onUpdateTerminal) {
        await onUpdateTerminal(id, { serialNumber: trimmed });
      }
      setEditingSerialId(null);
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления серийного номера');
    }
  };

  // Form states
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newStatus, setNewStatus] = useState<TerminalStatus>('На складе');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter terminals
  const filteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      const matchSearch =
        t.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'Все' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [terminals, searchTerm, statusFilter]);

  // Handle addition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newModel.trim() || !newSerial.trim()) {
      setFormError(t('alert_fill_required') || 'Пожалуйста, заполните марку/модель и серийный номер');
      return;
    }

    // check duplicate sn client-side
    const duplicate = terminals.some(
      (t) => t.serialNumber.toLowerCase() === newSerial.trim().toLowerCase()
    );
    if (duplicate) {
      setFormError((t('alert_serial_duplicate') || 'Устройство с серийным номером уже зарегистрировано').replace('{sn}', newSerial.trim()));
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddTerminal({
        model: newModel.trim(),
        serialNumber: newSerial.trim(),
        status: newStatus,
      });

      // Reset form
      setNewModel('');
      setNewSerial('');
      setNewStatus('На складе');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения терминала');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'На складе') return t('status_warehouse');
    if (status === 'В кабинете') return t('status_cabinet');
    if (status === 'В ремонте') return t('status_repair');
    return status;
  };

  const getFilterLabel = (status: string) => {
    if (status === 'Все') return t('filter_all');
    return getStatusLabel(status);
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl hover:border-slate-700/60 transition-all duration-300 animate-fade-in">
      {/* 1. Card Header / Action Panel */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center">
            <Monitor className="w-5 h-5 mr-2 text-blue-400" />
            {t('registry_title')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('registry_found')}: <span className="font-semibold text-blue-400">{filteredTerminals.length}</span> {t('registry_of')} {terminals.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.975 }}
            type="button"
            onClick={onNavigateToActs}
            className="px-4.5 py-2.5 rounded-xl text-xs font-bold tracking-wide shadow-md flex items-center transition-all cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white"
          >
            <FileText className="w-4 h-4 mr-1.5 text-blue-400" />
            {lang === 'ua' ? 'Створити Акт' : 'Создать Акт'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.975 }}
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold tracking-wide shadow-md flex items-center transition-all cursor-pointer ${
              showAddForm
                ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 hover:shadow-lg'
            }`}
          >
            {showAddForm ? (
              <>
                <X className="w-4 h-4 mr-1.5" />
                {t('cancel')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                {t('add_terminal')}
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* 2. Slide Down Add Form */}
      <AnimatePresence initial={false}>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-950/40 border-b border-slate-800/80">
              <form onSubmit={handleSubmit} className="max-w-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
                  {t('new_card_title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('field_model')}</label>
                    <input
                      type="text"
                      placeholder="Honeywell EDA51"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/30 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white"
                    />
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('field_serial')}</label>
                    <input
                      type="text"
                      placeholder="EDA51-23091103"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/30 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono font-medium text-white"
                    />
                  </div>

                  {/* Status Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('field_status')}</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TerminalStatus)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/30 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-white [&>option]:bg-slate-900 [&>option]:text-white"
                    >
                      <option value="На складе">{t('status_warehouse')}</option>
                      <option value="В кабинете">{t('status_cabinet')}</option>
                      <option value="В ремонте">{t('status_repair')}</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <p className="mt-3 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                    {formError}
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {isSubmitting ? t('saving_text') || 'Сохранение...' : t('btn_register')}
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Search and Quick Filters */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/20 hover:bg-slate-800/40 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-200"
          />
        </div>

        {/* Status filtering row */}
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
          <span className="text-xs font-medium text-slate-400 hidden sm:block">{t('filter_show')} </span>
          {['Все', 'На складе', 'В кабинете', 'В ремонте'].map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  if (status !== 'В ремонте') {
                    setShowSimpleRepairList(false);
                  }
                }}
                className={`text-xs px-3.5 py-1.5 rounded-lg shrink-0 font-bold transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-sm'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-850'
                }`}
              >
                {getFilterLabel(status)}
              </button>
            );
          })}
        </div>
      </div>

      {statusFilter === 'В ремонте' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-slate-950/20 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-3 overflow-hidden"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              {lang === 'ua'
                ? 'Вибрані пристрої на ремонті. Доступне формування спрощеного списку.'
                : 'Выбраны устройства в ремонте. Доступно формирование упрощенного списка.'}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setShowSimpleRepairList(!showSimpleRepairList)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all shadow-xs flex items-center cursor-pointer ${
              showSimpleRepairList
                ? 'bg-blue-600 border border-blue-500 text-white shadow-blue-500/10'
                : 'bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            {showSimpleRepairList
              ? (lang === 'ua' ? 'Показати повну таблицю' : 'Показать полную таблицу')
              : (lang === 'ua' ? 'Сформувати просту таблицю' : 'Сформировать простую таблицу')}
          </motion.button>
        </motion.div>
      )}

      {/* 4. Terminals Table */}
      {showSimpleRepairList ? (
        <div className="p-6 bg-slate-950/10 animate-fade-in border-t border-slate-800/40">
          <div className="p-6 bg-slate-900/10 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {lang === 'ua' ? 'Спрощена таблиця ТЗД в ремонті' : 'Упрощенный список ТСД в ремонте'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'ua' ? 'Тільки марка/модель та серійний номер' : 'Только марка/модель и серийный номер'}
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1 rounded-md">
                {lang === 'ua' ? 'Всього: ' : 'Всего: '} {filteredTerminals.length} {lang === 'ua' ? 'шт.' : 'шт.'}
              </div>
            </div>

            <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">{t('table_col_model')}</th>
                    <th className="py-3 px-4">{t('table_col_serial')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredTerminals.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-xs text-slate-500 font-medium">
                        {t('no_terminals_found')}
                      </td>
                    </tr>
                  ) : (
                    filteredTerminals.map((terminal) => (
                      <tr key={terminal.id} className="hover:bg-slate-850/50 transition-all font-medium">
                        <td className="py-3 px-4 text-xs font-semibold text-slate-200">
                          {terminal.model}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-mono text-blue-300 font-bold bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-md">
                            {terminal.serialNumber}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-500 italic text-right">
              {lang === 'ua' 
                ? 'Використовуйте стандартні засоби браузера для копіювання чи друку.' 
                : 'Используйте стандартные средства браузера для копирования или печати.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-4xl">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none select-none">
              <th className="py-4.5 px-6">{t('table_col_model')}</th>
              <th className="py-4.5 px-6">{t('table_col_serial')}</th>
              <th className="py-4.5 px-6">{t('table_col_status')}</th>
              <th className="py-4.5 px-6 text-center">{t('table_col_change_status')}</th>
              <th className="py-4.5 px-6 text-right">{t('table_col_actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTerminals.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 bg-slate-900/10">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-600 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-300">{t('no_terminals_found')}</p>
                    <p className="text-xs text-slate-500">{t('no_terminals_found_subtitle')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTerminals.map((terminal) => {
                // Determine status badge classes
                let statusBadgeCss = '';
                if (terminal.status === 'На складе') {
                  statusBadgeCss = 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
                } else if (terminal.status === 'В кабинете') {
                  statusBadgeCss = 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
                } else {
                  statusBadgeCss = 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
                }

                return (
                  <tr
                    key={terminal.id}
                    className="hover:bg-slate-800/30 group transition-all duration-150 cursor-pointer"
                    onClick={() => onSelectTerminal(terminal)}
                  >
                    {/* Model, with helper text */}
                    <td className="py-4 px-6 border-b border-slate-800/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {terminal.model}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">{t('click_view_history')}</span>
                      </div>
                    </td>

                    {/* Serial Number in Mono */}
                    <td 
                      className="py-4 px-6 border-b border-slate-800/50"
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid opening history view
                      }}
                    >
                      {editingSerialId === terminal.id ? (
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempSerial}
                            onChange={(e) => setTempSerial(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveSerial(terminal.id, terminal.serialNumber);
                              } else if (e.key === 'Escape') {
                                setEditingSerialId(null);
                              }
                            }}
                            className="bg-slate-950 text-white border border-blue-500 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 max-w-[150px] animate-fade-in"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSerial(terminal.id, terminal.serialNumber)}
                            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md text-[10px] font-black px-2 py-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            {t('yes') || 'ОК'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSerialId(null)}
                            className="bg-slate-800 hover:bg-slate-705 text-slate-350 rounded-md text-[10px] font-bold px-2 py-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="group/sn inline-flex items-center space-x-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSerialId(terminal.id);
                            setTempSerial(terminal.serialNumber);
                          }}
                          title={t('click_to_change')}
                        >
                          <span className="font-mono text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/10 px-2.5 py-1 rounded-md group-hover/sn:border-blue-500/40 group-hover/sn:bg-blue-500/20 group-hover/sn:text-blue-200 transition-all flex items-center">
                            {terminal.serialNumber}
                            <Pencil className="w-3 h-3 ml-1.5 text-blue-400/45 group-hover/sn:text-blue-300 transition-colors opacity-0 group-hover/sn:opacity-100 duration-250 shrink-0" />
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6 border-b border-slate-800/50">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${statusBadgeCss}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          terminal.status === 'На складе' ? 'bg-emerald-400' :
                          terminal.status === 'В кабинете' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        {getStatusLabel(terminal.status)}
                      </span>
                    </td>

                    {/* Change Status Fast Quick Controls */}
                    <td
                      className="py-4 px-6 border-b border-slate-800/50 text-center"
                      onClick={(e) => e.stopPropagation()} // Stop bubble, we don't want to drill down to history
                    >
                      <div className="inline-flex rounded-lg border border-slate-800/80 bg-slate-950/40 p-0.5 space-x-0.5 shadow-xs">
                        {(['На складе', 'В кабинете', 'В ремонте'] as TerminalStatus[]).map((st) => {
                          const isCurrent = terminal.status === st;

                          return (
                            <button
                              key={st}
                              type="button"
                              title={getStatusLabel(st)}
                              onClick={() => onUpdateStatus(terminal.id, st)}
                              className={`text-[10px] font-bold px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                                isCurrent
                                  ? st === 'На складе'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold'
                                    : st === 'В кабинете'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-extrabold'
                                  : `text-slate-500 hover:text-white hover:bg-slate-800/40`
                              }`}
                            >
                              {st === 'На складе' ? (lang === 'ua' ? 'Склад' : 'Склад') : st === 'В кабинете' ? (lang === 'ua' ? 'Каб.' : 'Каб.') : (lang === 'ua' ? 'Ремонт' : 'Ремонт')}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Row delete buttons */}
                    <td
                      className="py-4 px-6 border-b border-slate-800/50 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-2">
                        {confirmDeleteId === terminal.id ? (
                          <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl animate-fade-in text-[10px]" onClick={(e) => e.stopPropagation()}>
                            <span className="text-rose-300 font-bold shrink-0">{t('delete_confirm_question')}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteTerminal(terminal.id);
                                setConfirmDeleteId(null);
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-black px-2.5 py-1 transition-colors cursor-pointer"
                            >
                              {t('yes')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-md text-[10px] font-bold px-2.5 py-1 transition-colors cursor-pointer"
                            >
                              {t('no')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onSelectTerminal(terminal)}
                              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                              title={t('open_history_tooltip')}
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(terminal.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                              title={t('delete_card_tooltip')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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
      )}

    </div>
  );
}
