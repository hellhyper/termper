import { useState, useMemo } from 'react';
import { Terminal } from '../types';
import { RotateCcw, Trash2, ShieldCheck, AlertCircle, Search, Clock } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface RecentlyDeletedProps {
  terminals: Terminal[];
  onRestoreTerminal: (id: string) => Promise<void>;
  onPurgeTerminal: (id: string) => Promise<void>;
}

export default function RecentlyDeleted({
  terminals,
  onRestoreTerminal,
  onPurgeTerminal,
}: RecentlyDeletedProps) {
  const { lang, t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const deletedTerminals = useMemo(() => {
    return terminals
      .filter((term) => term.isDeleted)
      .filter((term) => {
        const query = searchTerm.toLowerCase();
        return (
          term.model.toLowerCase().includes(query) ||
          term.serialNumber.toLowerCase().includes(query)
        );
      });
  }, [terminals, searchTerm]);

  const handleRestore = async (id: string) => {
    try {
      setIsProcessing(id);
      await onRestoreTerminal(id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePurge = async (id: string) => {
    try {
      setIsProcessing(id);
      await onPurgeTerminal(id);
      setConfirmPurgeId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with summary card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>
              {lang === 'ua' ? 'Нещодавно видалені ТЗД' : 'Недавно удаленные ТСД'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xl">
            {lang === 'ua'
              ? 'Тут зберігаються термінали, які були вилучені з основного реєстру. Ви можете відновити пристрій назад до реєстру або остаточно видалити його з хмари.'
              : 'Здесь хранятся терминалы, которые были удалены из основного реестра. Вы можете восстановить устройство обратно в реестр или окончательно стереть его из облака.'}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-2xl shrink-0 flex items-center space-x-3">
          <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
            <AlertCircle className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'ua' ? 'Всього в кошику' : 'Всего в корзине'}
            </span>
            <span className="text-lg font-black text-white leading-none font-mono">
              {terminals.filter((t) => t.isDeleted).length} {t('pcs')}
            </span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={
              lang === 'ua'
                ? 'Пошук серед видалених ТЗД...'
                : 'Поиск среди удаленных ТСД...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/40 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Deleted Terminals Table */}
      <div className="overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-900/40 backdrop-blur-xs shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/45 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-6">{t('table_col_model')}</th>
              <th className="py-4 px-6">{t('table_col_serial')}</th>
              <th className="py-4 px-6">{lang === 'ua' ? 'Вилучено' : 'Удалено'}</th>
              <th className="py-4 px-6 text-right">{lang === 'ua' ? 'Дії' : 'Действия'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {deletedTerminals.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500 max-w-sm mx-auto space-y-3">
                    <div className="p-4 bg-slate-800/20 rounded-full border border-slate-800/30">
                      <Trash2 className="w-8 h-8 text-slate-600 stroke-1" />
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      {lang === 'ua' ? 'Кошик порожній' : 'Корзина пуста'}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {searchTerm
                        ? (lang === 'ua' ? 'Не знайдено видалених ТЗД за вашим запитом' : 'Не найдено удаленных ТСД по вашему запросу')
                        : (lang === 'ua' ? 'Тут будуть відображатися ТЗД після їх вилучення з реєстру' : 'Здесь будут отображаться ТСД после их удаления из реестра')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              deletedTerminals.map((terminal) => {
                const isConfirming = confirmPurgeId === terminal.id;
                const processing = isProcessing === terminal.id;

                return (
                  <tr
                    key={terminal.id}
                    className="hover:bg-slate-800/15 transition-all duration-150 font-medium text-xs text-slate-300"
                  >
                    {/* Model */}
                    <td className="py-4 px-6 text-white font-semibold">
                      {terminal.model}
                    </td>

                    {/* Serial Number */}
                    <td className="py-4 px-6">
                      <span className="font-mono text-blue-300 font-bold bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded-lg">
                        {terminal.serialNumber}
                      </span>
                    </td>

                    {/* Deletion Date */}
                    <td className="py-4 px-6 text-slate-400">
                      <div className="flex items-center space-x-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {terminal.deletedAt
                            ? new Date(terminal.deletedAt).toLocaleString(
                                lang === 'ua' ? 'uk-UA' : 'ru-RU'
                              )
                            : t('none')}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isConfirming ? (
                          <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl animate-fade-in text-[10px]">
                            <span className="text-rose-300 font-bold shrink-0">
                              {lang === 'ua' ? 'Видалити назавжди?' : 'Стереть навсегда?'}
                            </span>
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handlePurge(terminal.id)}
                              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-md text-[10px] font-black px-2.5 py-1 transition-colors cursor-pointer"
                            >
                              {lang === 'ua' ? 'Так' : 'Да'}
                            </button>
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => setConfirmPurgeId(null)}
                              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-350 rounded-md text-[10px] font-bold px-2.5 py-1 transition-colors cursor-pointer"
                            >
                              {lang === 'ua' ? 'Ні' : 'Нет'}
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Restore Button */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              disabled={processing || isProcessing !== null}
                              onClick={() => handleRestore(terminal.id)}
                              className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center space-x-1"
                              title={lang === 'ua' ? 'Відновити пристрій' : 'Восстановить устройство'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{lang === 'ua' ? 'Відновити' : 'Восстановить'}</span>
                            </motion.button>

                            {/* Purge Button */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              disabled={processing || isProcessing !== null}
                              onClick={() => setConfirmPurgeId(terminal.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                              title={lang === 'ua' ? 'Видалити назавжди' : 'Удалить навсегда'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
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
    </div>
  );
}
