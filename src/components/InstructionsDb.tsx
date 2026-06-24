import React, { useState, useMemo } from 'react';
import { Instruction } from '../types';
import { BookOpen, Search, Plus, Trash2, Tag, Calendar, FileText, ChevronDown, ChevronUp, AlertCircle, X } from 'lucide-react';

interface InstructionsDbProps {
  instructions: Instruction[];
  onAddInstruction: (data: { title: string; content: string; category: string }) => Promise<void>;
  onDeleteInstruction: (id: string) => Promise<void>;
}

export default function InstructionsDb({
  instructions,
  onAddInstruction,
  onDeleteInstruction,
}: InstructionsDbProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Все');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>('i1'); // Expand first default
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Настройка ТСД');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exclude 'Шаги Настройки' category
  const nonSetupInstructions = useMemo(() => {
    return instructions.filter((i) => i.category !== 'Шаги Настройки');
  }, [instructions]);

  // List categories dynamically from non-setup instructions
  const categories = useMemo(() => {
    const list = new Set(nonSetupInstructions.map((i) => i.category));
    return ['Все', ...Array.from(list)];
  }, [nonSetupInstructions]);

  // Filter list from non-setup instructions
  const filteredInstructions = useMemo(() => {
    return nonSetupInstructions.filter((i) => {
      const matchSearch =
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'Все' || i.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [nonSetupInstructions, searchTerm, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !content.trim()) {
      setFormError('Пожалуйста, введите название инструкции и текст руководства');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddInstruction({
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
      });

      // Clear
      setTitle('');
      setContent('');
      setCategory('Настройка ТСД');
      setShowAddForm(false);
    } catch (err) {
      setFormError('Ошибка при сохранении инструкции');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple formatter to parse raw lines/markdown-like syntax into clean paragraphs or list items
  const renderFormattedBody = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-xs font-bold text-white mt-4 mb-2">{trimmed.replace('###', '')}</h4>;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 text-xs py-0.5 font-medium leading-relaxed">
            {trimmed.substring(2)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-slate-300 text-xs py-1 font-medium leading-relaxed">
            {trimmed.substring(trimmed.indexOf('.') + 1).trim()}
          </li>
        );
      }
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-xs text-slate-400 leading-relaxed py-0.5 font-medium">{trimmed}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar controls for searching and categories */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800/85 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Поиск инструкций
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Введите заголовок..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-705 bg-slate-800/20 text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories Panel */}
        <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800/85 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Категории баз
          </span>
          <div className="flex flex-col space-y-1.5">
            {categories.map((cat) => {
              const isSel = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-3 py-2.5 rounded-lg text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSel
                      ? 'bg-blue-600/25 text-blue-300 border-l-4 border-blue-500'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {isSel && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4 mr-1.5" />
              Отмена
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Создать Инструкцию
            </>
          )}
        </button>
      </div>

      {/* Main expanded/added guides section */}
      <div className="lg:col-span-3 space-y-4">
        {/* Creator panel */}
        {showAddForm && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-lg animate-fade-in">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-blue-400" strokeWidth={2.4} />
              Разметка новой инструкции / руководства
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Заголовок инструкции</label>
                  <input
                    type="text"
                    placeholder="Например: Сброс настроек Honeywell EDA50K на дефолт"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-800/30 text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Категория / Метка</label>
                  <input
                    type="text"
                    placeholder="например: Настройка ТСД"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-800/30 text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Текст инструкции (Поддерживает форматирование списков)
                </label>
                <textarea
                  placeholder="### Описание ремонта:&#13;1. Открыть защелку батарейного отсека ТСД.&#13;2. Зажать верхнюю клавишу сброса.&#13;* Совет: Используйте списки для пошагового контроля..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 border border-slate-700 bg-slate-800/30 text-white text-xs min-h-[180px] font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {formError && (
                <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-550 p-2.5 rounded-lg">
                  {formError}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Сохранение...' : 'Опубликовать руководство'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Guides view accordions */}
        <div className="space-y-3">
          {filteredInstructions.length === 0 ? (
            <div className="bg-slate-900/60 p-12 text-center text-slate-500 rounded-2xl border border-slate-800">
              <BookOpen className="w-10 h-10 mx-auto text-slate-700 mb-2.5 animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">Инструкции не найдены</p>
              <p className="text-xs mt-1">Опубликуйте первое руководство или сбросьте фильтры в сайдбаре</p>
            </div>
          ) : (
            filteredInstructions.map((inst) => {
              const isExpanded = expandedId === inst.id;
              return (
                <div
                  key={inst.id}
                  className={`bg-slate-900/60 rounded-2xl border transition-all duration-250 ${
                    isExpanded 
                      ? 'border-blue-500 shadow-md shadow-blue-500/5 bg-slate-900/80 ring-1 ring-blue-500/20' 
                      : 'border-slate-800/85 hover:border-slate-700 shadow-sm'
                  }`}
                >
                  {/* Clickable upper summary bar */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none font-sans"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isExpanded ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {inst.title}
                        </h4>
                        <div className="flex items-center space-x-2.5 mt-1 text-[10px] text-slate-500 font-bold">
                          <span className="inline-flex items-center text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                            <Tag className="w-2.5 h-2.5 mr-1 text-blue-400" />
                            {inst.category}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {new Date(inst.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {confirmDeleteId === inst.id ? (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-xl animate-fade-in"
                        >
                          <span className="text-[10px] text-rose-300 font-bold">Удалить?</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onDeleteInstruction(inst.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[9px] font-black px-1.5 py-0.5 transition-colors cursor-pointer"
                          >
                            Да
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[9px] font-bold px-1.5 py-0.5 transition-colors cursor-pointer"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(inst.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Убавить руководство"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="text-slate-500 p-1 bg-slate-800 rounded-lg">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Body details */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800/60 bg-slate-950/20 animate-fade-in font-sans">
                      <div className="space-y-1">
                        {renderFormattedBody(inst.content)}
                      </div>

                      <div className="mt-5 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-[10px] text-amber-300 font-medium flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
                        Инструкция добавлена сотрудниками склада РЦ. Соблюдайте требования безопасности при калибровке и разборке!
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
