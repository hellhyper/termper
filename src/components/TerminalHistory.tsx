import React, { useState, useMemo } from 'react';
import { Terminal, HistoryEntry } from '../types';
import { ChevronLeft, Plus, Calendar, ShieldAlert, ArrowUpDown, Trash2, Edit2, Check, X, Tag } from 'lucide-react';

interface TerminalHistoryProps {
  terminal: Terminal;
  history: HistoryEntry[];
  onBack: () => void;
  onAddHistory: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateHistory: (id: string, fields: Partial<HistoryEntry>) => Promise<void>;
  onDeleteHistory: (id: string) => Promise<void>;
}

type SortField = 'dateToIT' | 'dateToSC' | 'dateFromRepair' | 'dateToWarehouse';
type SortOrder = 'asc' | 'desc';

export default function TerminalHistory({
  terminal,
  history,
  onBack,
  onAddHistory,
  onUpdateHistory,
  onDeleteHistory,
}: TerminalHistoryProps) {
  // Filter history entries linked to this specific terminal
  const terminalHistory = useMemo(() => {
    return history.filter((h) => h.terminalId === terminal.id);
  }, [history, terminal.id]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('dateToIT');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New log form states
  const [model, setModel] = useState(terminal.model);
  const [serialNumber, setSerialNumber] = useState(terminal.serialNumber);
  const [malfunction, setMalfunction] = useState('');
  const [dateToIT, setDateToIT] = useState(new Date().toISOString().split('T')[0]);
  const [dateToSC, setDateToSC] = useState('');
  const [repairedBy, setRepairedBy] = useState('');
  const [dateFromRepair, setDateFromRepair] = useState('');
  const [dateToWarehouse, setDateToWarehouse] = useState('');
  const [rc, setRc] = useState('РЦ Ногинск');
  const [zno, setZno] = useState('');

  // Editing buffer
  const [editBuffer, setEditBuffer] = useState<Partial<HistoryEntry>>({});

  // Sorting logic handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort history entries based on select state
  const sortedHistory = useMemo(() => {
    return [...terminalHistory].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      
      if (!valA && valB) return sortOrder === 'asc' ? 1 : -1;
      if (valA && !valB) return sortOrder === 'asc' ? -1 : 1;
      if (!valA && !valB) return 0;

      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [terminalHistory, sortField, sortOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddHistory({
        terminalId: terminal.id,
        model,
        serialNumber,
        malfunction,
        dateToIT,
        dateToSC,
        repairedBy,
        dateFromRepair,
        dateToWarehouse,
        rc,
        zno,
      });

      // Clear non-static inputs
      setMalfunction('');
      setDateToIT(new Date().toISOString().split('T')[0]);
      setDateToSC('');
      setRepairedBy('');
      setDateFromRepair('');
      setDateToWarehouse('');
      setZno('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding history log:', err);
    }
  };

  const startEditing = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditBuffer({ ...entry });
  };

  const saveEditing = async (id: string) => {
    try {
      await onUpdateHistory(id, editBuffer);
      setEditingId(null);
      setEditBuffer({});
    } catch (err) {
      console.error('Error updating history log:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and Terminal context card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-800 border border-slate-705 text-white hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="Назад Реестр"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-md">
                S/N: {terminal.serialNumber}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                terminal.status === 'На складе' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                terminal.status === 'В кабинете' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}>
                {terminal.status}
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-1">{terminal.model}</h2>
          </div>
        </div>

        <button
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
              Закрыть форму
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Добавить запись движения/ремонта
            </>
          )}
        </button>
      </div>

      {/* Manual Add Row Form */}
      {showAddForm && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-lg animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center border-b border-slate-800 pb-3">
              <Plus className="w-4 h-4 mr-1.5 text-blue-400" />
              Внести запись о перемещении или ремонте
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Марка и Модель</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/30 font-semibold text-white focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Серийный Номер ТСД</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/30 font-mono text-white focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Номер ЗНО / Номер Заявки</label>
                <input
                  type="text"
                  placeholder="ЗНО-49581"
                  value={zno}
                  onChange={(e) => setZno(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/30 placeholder-slate-500 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Логистический узел (РЦ)</label>
                <input
                  type="text"
                  placeholder="РЦ Ногинск"
                  value={rc}
                  onChange={(e) => setRc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/30 placeholder-slate-500 text-white focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Зафиксированная неисправность</label>
                <input
                  type="text"
                  placeholder="Не заряжается, разбит порт USB, разбит экран..."
                  value={malfunction}
                  onChange={(e) => setMalfunction(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800/30 placeholder-slate-500 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Кем выполняется ремонт / СЦ</label>
                <input
                  type="text"
                  placeholder="Сервисный партнер 'Мобайл' или 'ИТ-отдел'"
                  value={repairedBy}
                  onChange={(e) => setRepairedBy(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800/30 placeholder-slate-500 text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Передача в ИТ (Дата)</label>
                <input
                  type="date"
                  value={dateToIT}
                  onChange={(e) => setDateToIT(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 font-medium text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-300 mb-1">Отправка в СЦ (Дата)</label>
                <input
                  type="date"
                  value={dateToSC}
                  onChange={(e) => setDateToSC(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 font-medium text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-300 mb-1">Прием из ремонта (Дата)</label>
                <input
                  type="date"
                  value={dateFromRepair}
                  onChange={(e) => setDateFromRepair(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 font-medium text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1">Дата возврата на склад</label>
                <input
                  type="date"
                  value={dateToWarehouse}
                  onChange={(e) => setDateToWarehouse(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 font-medium text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Внести запись в реестр
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Log Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg hover:border-slate-700/60 transition-all duration-300">
        <div className="p-5 border-b border-slate-800/60 bg-slate-950/25 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1.5 text-blue-400" />
              Хронологический архив движения ТСД
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Всего зафиксировано ремонтных/движенческих логов: {sortedHistory.length}</p>
          </div>

          {/* Quick Date-Sorting Panel Info */}
          <div className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide flex items-center">
            сортировка по: {
              sortField === 'dateToIT' ? 'Передача IT' :
              sortField === 'dateToSC' ? 'Отправка СЦ' :
              sortField === 'dateFromRepair' ? 'Возврат СЦ' : 'Возврат Склад'
            } ({sortOrder === 'asc' ? 'Возраст.' : 'Убыв.'})
          </div>
        </div>

        {/* Date sorters toggle triggers row */}
        <div className="p-3.5 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Быстрая сортировка по датам:
          </span>
          {[
            { field: 'dateToIT', label: 'Дата IT' },
            { field: 'dateToSC', label: 'Дата в СЦ' },
            { field: 'dateFromRepair', label: 'Прием с рем.' },
            { field: 'dateToWarehouse', label: 'Склад' },
          ].map((item) => {
            const isSel = sortField === item.field;
            return (
              <button
                key={item.field}
                type="button"
                onClick={() => handleSort(item.field as SortField)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center cursor-pointer ${
                  isSel
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/30 shadow-xs'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-850'
                }`}
              >
                {item.label}
                {isSel && (
                  <span className="ml-1 text-[10px] font-mono">
                    {sortOrder === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-5xl">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none select-none">
                <th className="py-4 px-4">Модель / S/N</th>
                <th className="py-4 px-4 text-emerald-400 bg-emerald-500/5">Дата IT</th>
                <th className="py-4 px-4 text-rose-400 bg-rose-500/5">Дата в СЦ</th>
                <th className="py-4 px-4">Исполнитель СЦ</th>
                <th className="py-4 px-4 text-blue-400 bg-blue-500/5">Получен с рем.</th>
                <th className="py-4 px-4 text-emerald-400 bg-emerald-500/5">На Склад</th>
                <th className="py-4 px-3">РЦ / ЗНО</th>
                <th className="py-4 px-4">Комментарий / Неисправность</th>
                <th className="py-4 px-4 text-right">Редакт.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              {sortedHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    История перемещений ТСД пока отсутствует. Заполните форму выше, чтобы зафиксировать первый лог движения!
                  </td>
                </tr>
              ) : (
                sortedHistory.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Model / S/N */}
                      <td className="py-3 px-4 font-sans">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editBuffer.model || ''}
                              onChange={(e) => setEditBuffer({ ...editBuffer, model: e.target.value })}
                              className="w-full p-1 border border-slate-750 bg-slate-800 text-white rounded-md font-semibold text-xs focus:outline-hidden"
                            />
                            <input
                              type="text"
                              value={editBuffer.serialNumber || ''}
                              onChange={(e) => setEditBuffer({ ...editBuffer, serialNumber: e.target.value })}
                              className="w-full p-1 border border-slate-750 bg-slate-800 text-white rounded-md font-mono text-[10px] focus:outline-hidden"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{item.model}</span>
                            <span className="font-mono text-[10px] text-slate-500 mt-0.5">{item.serialNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* Date To IT */}
                      <td className="py-3 px-4 bg-emerald-500/[0.02]">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editBuffer.dateToIT || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, dateToIT: e.target.value })}
                            className="p-1 border border-slate-700 rounded-md text-xs bg-slate-800 text-white focus:outline-hidden"
                          />
                        ) : (
                          <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.dateToIT ? new Date(item.dateToIT).toLocaleDateString() : '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* Date To SC */}
                      <td className="py-3 px-4 bg-rose-500/[0.02]">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editBuffer.dateToSC || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, dateToSC: e.target.value })}
                            className="p-1 border border-slate-700 rounded-md text-xs bg-slate-800 text-white focus:outline-hidden"
                          />
                        ) : (
                          <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.dateToSC ? new Date(item.dateToSC).toLocaleDateString() : '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* Repaired By */}
                      <td className="py-3 px-4 max-w-[150px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editBuffer.repairedBy || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, repairedBy: e.target.value })}
                            className="w-full p-1 border border-slate-700 bg-slate-800 text-white rounded-md text-xs focus:outline-hidden"
                          />
                        ) : (
                          <span className="text-slate-300 font-medium break-words block">{item.repairedBy || '—'}</span>
                        )}
                      </td>

                      {/* Date From Repair */}
                      <td className="py-3 px-4 bg-blue-500/[0.02]">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editBuffer.dateFromRepair || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, dateFromRepair: e.target.value })}
                            className="p-1 border border-slate-700 rounded-md text-xs bg-slate-800 text-white focus:outline-hidden"
                          />
                        ) : (
                          <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.dateFromRepair ? new Date(item.dateFromRepair).toLocaleDateString() : '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* Date To Warehouse */}
                      <td className="py-3 px-4 bg-emerald-500/[0.02]">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editBuffer.dateToWarehouse || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, dateToWarehouse: e.target.value })}
                            className="p-1 border border-slate-700 rounded-md text-xs bg-slate-800 text-white focus:outline-hidden"
                          />
                        ) : (
                          <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.dateToWarehouse ? new Date(item.dateToWarehouse).toLocaleDateString() : '—'}</span>
                          </div>
                        )}
                      </td>

                      {/* RC / ZNO */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editBuffer.rc || ''}
                              placeholder="РЦ"
                              onChange={(e) => setEditBuffer({ ...editBuffer, rc: e.target.value })}
                              className="w-full p-1 border border-slate-700 bg-slate-800 text-white rounded-md text-xs focus:outline-hidden"
                            />
                            <input
                              type="text"
                              value={editBuffer.zno || ''}
                              placeholder="ЗНО"
                              onChange={(e) => setEditBuffer({ ...editBuffer, zno: e.target.value })}
                              className="w-full p-1 border border-slate-700 bg-slate-800 text-white rounded-md font-mono text-[10px] focus:outline-hidden"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-slate-300 font-semibold">{item.rc || '—'}</span>
                            {item.zno && (
                              <span className="inline-flex items-center font-mono text-[9px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm mt-0.5 w-max">
                                <Tag className="w-2.5 h-2.5 mr-0.5 text-blue-400" />
                                {item.zno}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Malfunction */}
                      <td className="py-3 px-4 max-w-sm">
                        {isEditing ? (
                          <textarea
                            value={editBuffer.malfunction || ''}
                            onChange={(e) => setEditBuffer({ ...editBuffer, malfunction: e.target.value })}
                            className="w-full p-1 border border-slate-700 bg-slate-800 text-white rounded-md text-xs min-h-[50px] focus:outline-hidden"
                          />
                        ) : (
                          <div className="space-y-1">
                            <span className="text-slate-400 font-medium block break-words leading-relaxed">
                              {item.malfunction || '—'}
                            </span>
                            {item.userLogin && (
                              <div className="text-[9px] font-mono text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded-sm w-max">
                                Выполнил: <span className="underline">{item.userLogin}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5 animate-pulse">
                            <button
                              onClick={() => saveEditing(item.id)}
                              className="p-1 px-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-md text-emerald-300 transition-all cursor-pointer"
                              title="Сохранить"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditBuffer({});
                              }}
                              className="p-1 px-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-md transition-all cursor-pointer"
                              title="Отмена"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-white rounded-md transition-all cursor-pointer"
                              title="Редактировать лог"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Вы действительно хотите безвозвратно удалить эту запись движения?')) {
                                  onDeleteHistory(item.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-md transition-all cursor-pointer"
                              title="Удалить запись"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
