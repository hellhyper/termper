import React, { useState, useMemo } from 'react';
import { Instruction } from '../types';
import { Send, Inbox, Edit2, Save, X, BookOpen, AlertCircle, FileText } from 'lucide-react';

interface SCDirectionsHelpProps {
  instructions: Instruction[];
  onAddInstruction: (data: { title: string; content: string; category: string }) => Promise<void>;
  onUpdateInstruction: (id: string, data: { title: string; content: string; category: string }) => Promise<void>;
}

export default function SCDirectionsHelp({
  instructions,
  onAddInstruction,
  onUpdateInstruction,
}: SCDirectionsHelpProps) {
  // We represent the active section: 'send' or 'receive'
  const [activeSection, setActiveSection] = useState<'send' | 'receive' | null>('send');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Title keys to look up in the general instructions database
  const SEND_TITLE = 'Отправка терминала в СЦ';
  const RECEIVE_TITLE = 'Получение терминала от СЦ';

  // Find existing instruction documents
  const sendInstruction = useMemo(() => {
    return instructions.find((i) => i.title === SEND_TITLE);
  }, [instructions]);

  const receiveInstruction = useMemo(() => {
    return instructions.find((i) => i.title === RECEIVE_TITLE);
  }, [instructions]);

  // Determine current display instruction
  const currentInstruction = activeSection === 'send' ? sendInstruction : receiveInstruction;
  const currentTitle = activeSection === 'send' ? SEND_TITLE : RECEIVE_TITLE;

  // Set default placeholder instructions if user hasn't added them yet
  const defaultPlaceholderText = activeSection === 'send'
    ? '### Шаблон инструкции по отправке ТСД в СЦ:\n\n1. Проверьте комплектацию ТСД (аккумулятор, крышка, стилус).\n2. Сделайте детальное фото повреждений или неисправности.\n3. Оформите заявку в системе логистики СЦ.\n4. Распечатайте сопроводительный талон.\n5. Упакуйте ТСД в плотную пупырчатую пленку и коробку.\n\n*Нажмите кнопку «Редактировать» ниже, чтобы полностью заменить этот текст своей инструкцией.*'
    : '### Шаблон инструкции по приему ТСД из СЦ:\n\n1. При получении осмотрите упаковку на предмет внешних повреждений.\n2. Вскройте коробку и сверьте серийный номер ТСД с накладной.\n3. Установите заряженный АКБ и включите устройство.\n4. Протестируйте чтение 1D/2D штрихкодов в демо-приложении.\n5. Измените статус ТСД на «На складе» в системе учета.\n\n*Нажмите кнопку «Редактировать» ниже, чтобы полностью заменить этот текст своей инструкцией.*';

  const displayContent = currentInstruction ? currentInstruction.content : defaultPlaceholderText;

  // Handle Edit initiation
  const handleStartEdit = () => {
    setEditContent(displayContent);
    setIsEditing(true);
    setStatusMsg('');
  };

  // Handle Save
  const handleSave = async () => {
    try {
      setStatusMsg('Сохранение...');
      if (currentInstruction) {
        // If it already exists in the backend database, update it
        await onUpdateInstruction(currentInstruction.id, {
          title: currentTitle,
          content: editContent,
          category: 'СЦ Логистика',
        });
      } else {
        // Otherwise, create a new instruction record
        await onAddInstruction({
          title: currentTitle,
          content: editContent,
          category: 'СЦ Логистика',
        });
      }
      setIsEditing(false);
      setStatusMsg('Успешно сохранено!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      setStatusMsg('Ошибка при сохранении: ' + (err.message || err));
    }
  };

  // Split lines to render formatted lists/headers
  const renderFormattedBody = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2">{trimmed.replace('###', '')}</h4>;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-300 text-xs py-0.5 leading-relaxed font-medium">
            {trimmed.substring(2)}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        return (
          <li key={idx} className="ml-5 list-decimal text-slate-300 text-xs py-1 leading-relaxed font-medium">
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
    <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6 max-w-4xl mx-auto animate-fade-in hover:border-slate-700/50 transition-all duration-300">
      
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-400" />
            База знаний: Логистика с Сервисным Центром
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Здесь вы можете вручную настроить и детально зафиксировать инструкции по работе с СЦ.
          </p>
        </div>
      </div>

      {/* Two Large Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Button 1: Отправка терминала в СЦ */}
        <button
          onClick={() => {
            setActiveSection('send');
            setIsEditing(false);
            setStatusMsg('');
          }}
          className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer group ${
            activeSection === 'send'
              ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3.5 rounded-xl transition-all duration-300 ${
              activeSection === 'send'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'
            }`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className={`block fs-5 font-bold tracking-tight transition-colors ${
                activeSection === 'send' ? 'text-white' : 'text-slate-300'
              }`}>
                Отправка терминала в СЦ
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Инструкции по упаковке и оформлению</span>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full transition-all ${activeSection === 'send' ? 'bg-blue-400 animate-pulse' : 'bg-transparent'}`} />
        </button>

        {/* Button 2: Получение терминала от СЦ */}
        <button
          onClick={() => {
            setActiveSection('receive');
            setIsEditing(false);
            setStatusMsg('');
          }}
          className={`flex items-center justify-between p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer group ${
            activeSection === 'receive'
              ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3.5 rounded-xl transition-all duration-300 ${
              activeSection === 'receive'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700'
            }`}>
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <span className={`block fs-5 font-bold tracking-tight transition-colors ${
                activeSection === 'receive' ? 'text-white' : 'text-slate-300'
              }`}>
                Получение терминала от СЦ
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Инструкции по приемке и дефектовке</span>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full transition-all ${activeSection === 'receive' ? 'bg-blue-400 animate-pulse' : 'bg-transparent'}`} />
        </button>
      </div>

      {/* Active Section Content Visualizer */}
      {activeSection && (
        <div className="bg-slate-950/30 rounded-2xl border border-slate-800/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-blue-400" />
              {currentTitle}
            </span>
            {isEditing ? (
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Режим редактирования</span>
            ) : (
              <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">Синхронизировано c БД</span>
            )}
          </div>

          {isEditing ? (
            /* Editing Content text-area */
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full text-xs font-medium p-4 rounded-xl border border-slate-700 bg-slate-850 text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                placeholder="Напишите пошаговую инструкцию..."
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500">Поддерживает списки (строки начинающиеся с 1. или *) и заголовки (начинающиеся с ###)</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Сохранить в БД
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Reading visual container */
            <div className="space-y-4">
              <div className="p-1 min-h-[140px] space-y-1 fallback-text">
                {renderFormattedBody(displayContent)}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
                <button
                  onClick={handleStartEdit}
                  className="px-4.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white hover:bg-slate-750 hover:border-slate-600 transition flex items-center cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  Редактировать инструкцию
                </button>

                {statusMsg && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    statusMsg.includes('ошибка') ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800 text-blue-300 animate-pulse'
                  }`}>
                    {statusMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Simple Bottom Tip */}
          <div className="bg-blue-500/[0.03] border border-blue-500/10 p-3 rounded-xl flex items-start text-[10px] text-slate-400 leading-normal">
            <AlertCircle className="w-3.5 h-3.5 mr-2 text-blue-500 shrink-0 mt-0.5" />
            <span>
              Каждые изменения сохраняются в файл <b>data.json</b> на сервере и отображаются у всех сотрудников склада в режиме реального времени.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
