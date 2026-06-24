import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileDown, Search, Check, Loader2, Calendar, User, FileText, Printer } from 'lucide-react';
import { Terminal } from '../types';
import { useI18n } from '../context/LanguageContext';
import { jsPDF } from 'jspdf';

interface ActGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminals: Terminal[];
  isFullPage?: boolean;
}

type ActType = 'vtp_warehouse' | 'vtp_sc' | 'rc_rc';

export default function ActGeneratorModal({ isOpen, onClose, terminals, isFullPage = false }: ActGeneratorModalProps) {
  const { lang, t } = useI18n();

  // Selected Act type
  const [selectedType, setSelectedType] = useState<ActType>('vtp_warehouse');
  
  // Date and location parameters
  const [dispatchDate, setDispatchDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  });

  // Sender and Recipient information (Ukraine based as in the image sample)
  const [sender, setSender] = useState('РЦ Перемога (каб 41)');
  const [recipient, setRecipient] = useState('РЦ Перемога (Склад)');
  const [targetRC, setTargetRC] = useState('Київ'); // For RC - RC
  
  // Signatures fields
  const [senderPosition, setSenderPosition] = useState('Інженер тех.підтримки РЦ Перемога');
  const [senderName, setSenderName] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('Завідувач складу');
  const [recipientName, setRecipientName] = useState('');

  // Selected Terminals
  const [selectedTerminalIds, setSelectedTerminalIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fontLoadingError, setFontLoadingError] = useState<string | null>(null);

  // Sync recipient default based on selected type
  useEffect(() => {
    if (selectedType === 'vtp_warehouse') {
      setRecipient('РЦ Перемога (Склад)');
      setRecipientPosition('Завідувач складу');
    } else if (selectedType === 'vtp_sc') {
      setRecipient('РЦ Перемога (Сервісний центр)');
      setRecipientPosition('Представник сервісного центру');
    } else {
      setRecipient(`РЦ ${targetRC}`);
      setRecipientPosition('Комірник РЦ отримувача');
    }
  }, [selectedType, targetRC]);

  if (!isOpen) return null;

  // Filter terminals for multi-select
  const filteredTerminals = terminals.filter(term => {
    const query = searchQuery.toLowerCase();
    return (
      term.model.toLowerCase().includes(query) ||
      term.serialNumber.toLowerCase().includes(query) ||
      term.status.toLowerCase().includes(query)
    );
  });

  const toggleTerminalSelection = (id: string) => {
    setSelectedTerminalIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const getActTitle = () => {
    if (selectedType === 'vtp_warehouse') return lang === 'ua' ? 'Переміщення ВТП – СКЛАД' : 'Перемещение ВТП – СКЛАД';
    if (selectedType === 'vtp_sc') return lang === 'ua' ? 'Переміщення ВТП – СЦ' : 'Перемещение ВТП – СЦ';
    return lang === 'ua' ? 'Переміщення РЦ – РЦ' : 'Перемещение РЦ – РЦ';
  };

  // Convert Date from YYYY-MM-DD to DD.MM.YYYY
  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to convert array buffer to base64 for jsPDF custom font loading
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (selectedTerminalIds.length === 0) {
      alert(lang === 'ua' ? 'Будь ласка, виберіть хоча б один термінал!' : 'Пожалуйста, выберите хотя бы один терминал!');
      return;
    }

    setIsGenerating(true);
    setFontLoadingError(null);

    try {
      // 1. Fetch Roboto-Regular and Roboto-Bold for Cyrillic support from jsDelivr CDN
      const [regularRes, boldRes] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/fonts/Roboto/Roboto-Regular.ttf'),
        fetch('https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/fonts/Roboto/Roboto-Bold.ttf')
      ]);

      if (!regularRes.ok || !boldRes.ok) {
        throw new Error(lang === 'ua' 
          ? 'Помилка завантаження шрифтів сервера. Будь ласка, спробуйте альтернативний спосіб "Друкувати через браузер"' 
          : 'Ошибка загрузки шрифтов сервера. Пожалуйста, воспользуйтесь альтернативным способом "Печать через браузер"'
        );
      }

      const [regularBuffer, boldBuffer] = await Promise.all([
        regularRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ]);

      const regularBase64 = arrayBufferToBase64(regularBuffer);
      const boldBase64 = arrayBufferToBase64(boldBuffer);

      // Create JS PDF document
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Register virtual file system fonts
      doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
      doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      
      // Set registered font
      doc.setFont('Roboto');

      // Coordinate systems mapping (A4 is 210 x 297 mm)
      // Print Margin defaults: 15mm left/right, 15mm top/bottom
      const margin = 15;
      const contentWidth = 180; // 210 - 2 * 15
      let cy = 20; // current Y cursor coordinate

      // 1. Doc Title "АКТ"
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(22);
      doc.text('АКТ', 105, cy, { align: 'center' });
      cy += 8;

      // "на переміщення товаро-матеріальних цінностей"
      doc.setFontSize(13);
      doc.setFont('Roboto', 'normal');
      doc.text('на переміщення товаро-матеріальних цінностей', 105, cy, { align: 'center' });
      cy += 12;

      // 2. Metadata properties table
      // Let's draw an elegant key-value grid matching user's photo exactly
      // Left coordinate: 15, Width: 180. Key col width: 45, Value col width: 135
      const tableX = margin;
      const keyWidth = 45;
      const valueWidth = 135;
      const rowHeight = 8;

      // Borders and cell styling
      const metadataRows = [
        { label: 'Дата відправки', val: formatDateString(dispatchDate) },
        { label: 'Відправник', val: sender },
        { label: 'Отримувач', val: selectedType === 'rc_rc' ? `РЦ ${targetRC}` : recipient }
      ];

      doc.setDrawColor('#ccd3e0');
      doc.setLineWidth(0.3);

      metadataRows.forEach(row => {
        // Draw Outer Cell box
        doc.rect(tableX, cy, contentWidth, rowHeight);
        // Draw middle divider column
        doc.line(tableX + keyWidth, cy, tableX + keyWidth, cy + rowHeight);

        // Fill Label
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(10);
        doc.setTextColor('#1e293b');
        doc.text(row.label, tableX + 3, cy + 5.5);

        // Fill Value
        doc.setFont('Roboto', 'normal');
        doc.setTextColor('#334155');
        doc.text(row.val, tableX + keyWidth + 4, cy + 5.5);

        cy += rowHeight;
      });

      cy += 10;

      // 3. Equipment itemized section header
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(11);
      doc.setTextColor('#0f172a');
      doc.text('Перелік техніки що відправляється:', 105, cy, { align: 'center' });
      cy += 8;

      // 4. Equipment list A4 Table (With dark green header background exactly like in user image!)
      const col1Width = 20; // No.
      const col2Width = 80; // Model
      const col3Width = 80; // S/N
      const headerHeight = 9;
      const itemRowHeight = 8;

      // Dark green header fill
      doc.setFillColor('#2e7d32'); // Professional green `#2e7d32` or `#1b5e20`
      doc.rect(tableX, cy, contentWidth, headerHeight, 'F');

      // Draw vertical lines in header & text
      doc.setDrawColor('#ffffff');
      doc.setLineWidth(0.4);
      // inside dividers
      doc.line(tableX + col1Width, cy, tableX + col1Width, cy + headerHeight);
      doc.line(tableX + col1Width + col2Width, cy, tableX + col1Width + col2Width, cy + headerHeight);

      // Header labels text (White & Bold)
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor('#ffffff');
      doc.text('К-сть', tableX + col1Width / 2, cy + 6, { align: 'center' });
      doc.text('№ моделі', tableX + col1Width + col2Width / 2, cy + 6, { align: 'center' });
      doc.text('S\\№ пристрою', tableX + col1Width + col2Width + col3Width / 2, cy + 6, { align: 'center' });

      cy += headerHeight;

      // Reset draw color for rows
      doc.setDrawColor('#334155'); // Dark borders just like image
      doc.setLineWidth(0.3);
      doc.setTextColor('#000000'); // Clean black print text

      // Draw rows
      selectedTerminalIds.forEach((id, index) => {
        const terminal = terminals.find(t => t.id === id);
        if (!terminal) return;

        // Row background alternating or pure white
        doc.setFillColor(index % 2 === 0 ? '#fafafa' : '#ffffff');
        doc.rect(tableX, cy, contentWidth, itemRowHeight, 'F');
        doc.rect(tableX, cy, contentWidth, itemRowHeight, 'D');

        // Draw vertical table line dividers
        doc.line(tableX + col1Width, cy, tableX + col1Width, cy + itemRowHeight);
        doc.line(tableX + col1Width + col2Width, cy, tableX + col1Width + col2Width, cy + itemRowHeight);

        // Cell texts insertion
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor('#1e293b');
        doc.text((index + 1).toString(), tableX + col1Width / 2, cy + 5.5, { align: 'center' });

        doc.setFont('Roboto', 'normal');
        doc.setTextColor('#1e293b');
        doc.text(terminal.model, tableX + col1Width + 3, cy + 5.5);

        doc.setFont('Roboto', 'normal');
        doc.text(terminal.serialNumber, tableX + col1Width + col2Width + 3, cy + 5.5);

        cy += itemRowHeight;
      });

      cy += 14;

      // 5. Final Signatures section - 2 Blocks just like user image
      // Page Boundary Check safely
      if (cy > 230) {
        doc.addPage();
        cy = 20;
      }

      // 1) Signature 1: Responsible for transferring (Відправник)
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor('#0f172a');
      doc.text('Підпис відповідального за переміщення ТМЦ', tableX, cy);
      cy += 5;

      doc.setLineWidth(0.4);
      doc.setDrawColor('#000000');
      
      // Fields baseline guides
      const sigLineY = cy + 5;
      // Pos line, Sig line, Name line
      doc.line(tableX, sigLineY, tableX + 55, sigLineY);
      doc.line(tableX + 60, sigLineY, tableX + 115, sigLineY);
      doc.line(tableX + 120, sigLineY, tableX + contentWidth, sigLineY);

      // Value text inside guides
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor('#1e293b');
      doc.text(senderPosition, tableX, sigLineY - 1, { maxWidth: 53 });
      doc.text(senderName || '(Не вказано)', tableX + 120, sigLineY - 1);

      // Bottom sub-labels instructions
      doc.setFontSize(7.5);
      doc.setTextColor('#64748b');
      doc.text('(посада)', tableX + 27, sigLineY + 3.5, { align: 'center' });
      doc.text('(підпис)', tableX + 87, sigLineY + 3.5, { align: 'center' });
      doc.text('(п.і.б.)', tableX + 150, sigLineY + 3.5, { align: 'center' });

      cy += 18;

      // 2) Signature 2: Responsible for receiving or security control
      const isSecurityControl = selectedType === 'vtp_sc' || selectedType === 'rc_rc';
      const sig2Title = isSecurityControl 
        ? 'Підпис хто проконтролював переміщення ТМЦ'
        : 'Підпис відповідального за прийняття ТМЦ';
      const sig2Pos = isSecurityControl
        ? 'Старший зміни відділу охорони\nРЦ Перемога'
        : recipientPosition;
      const sig2Name = isSecurityControl
        ? '____________________'
        : (recipientName || '____________________');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor('#0f172a');
      doc.text(sig2Title, tableX, cy);
      cy += 5;

      const sigLineY2 = cy + 5;
      doc.line(tableX, sigLineY2, tableX + 55, sigLineY2);
      doc.line(tableX + 60, sigLineY2, tableX + 115, sigLineY2);
      doc.line(tableX + 120, sigLineY2, tableX + contentWidth, sigLineY2);

      doc.setFont('Roboto', 'normal');
      const yOffset = isSecurityControl ? 3.5 : 1;
      doc.setFontSize(8.5);
      doc.setTextColor('#1e293b');
      doc.text(sig2Pos, tableX, sigLineY2 - yOffset, { maxWidth: 53 });
      doc.text(sig2Name, tableX + 120, sigLineY2 - 1);

      doc.setFontSize(7.5);
      doc.setTextColor('#64748b');
      doc.text('(посада)', tableX + 27, sigLineY2 + 3.5, { align: 'center' });
      doc.text('(підпис)', tableX + 87, sigLineY2 + 3.5, { align: 'center' });
      doc.text('(п.і.б.)', tableX + 150, sigLineY2 + 3.5, { align: 'center' });

      // Save PDF down to local disk
      const fullFileName = `akt_peremichennya_${selectedType}_${dispatchDate}.pdf`;
      doc.save(fullFileName);

    } catch (err: any) {
      console.error(err);
      setFontLoadingError(err.message || 'Error configuring print properties');
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick preset selections of terminals
  const handleSelectPresets = (presetType: 'all_repairs' | 'all') => {
    if (presetType === 'all_repairs') {
      const repairs = terminals.filter(t => t.status === 'В ремонте').map(t => t.id);
      setSelectedTerminalIds(repairs);
    } else {
      setSelectedTerminalIds(terminals.map(t => t.id));
    }
  };

  if (!isOpen) return null;

  const innerContent = (
    <div
      className={`relative bg-slate-900 border border-slate-850 rounded-3xl w-full flex flex-col ${
        isFullPage ? 'min-h-[500px]' : 'max-w-5xl shadow-2xl max-h-[90vh] my-4'
      }`}
    >
      {/* Modal Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {lang === 'ua' ? 'Конструктор документів Акт А-4' : 'Конструктор документов Акт А-4'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ua' 
                ? 'Створення друкованих форм для передачі обладнання в один клік' 
                : 'Создание печатных форм для передачи оборудования в один клик'}
            </p>
          </div>
        </div>
        {!isFullPage && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Modal Double Panel Content Grid */}
      <div className={`flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 ${isFullPage ? '' : 'overflow-y-auto'}`}>
          
          {/* Left panel: configurations - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Act Type selector Tab cards / Bento options */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                {lang === 'ua' ? '1. Крок: Оберіть тип документа' : '1. Шаг: Выберите тип документа'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('vtp_warehouse')}
                  className={`p-4 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                    selectedType === 'vtp_warehouse'
                      ? 'bg-blue-600/10 border-blue-500 text-blue-300'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">
                    {lang === 'ua' ? 'ВТП - Склад' : 'ВТП - Склад'}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {lang === 'ua' ? '1) Переміщення ВТП – Склад' : '1) Перемещение ВТП – Склад'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                    {lang === 'ua' ? 'Здача пристроїв з IT-відділу безпосередньо у резерв складу.' : 'Сдача устройств из IT-отдела непосредственно в резерв склада.'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('vtp_sc')}
                  className={`p-4 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                    selectedType === 'vtp_sc'
                      ? 'bg-blue-600/10 border-blue-500 text-blue-300'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-1">
                    {lang === 'ua' ? 'ВТП - Сервіс' : 'ВТП - Сервис'}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {lang === 'ua' ? '2) Переміщення ВТП – СЦ' : '2) Перемещение ВТП – СЦ'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                    {lang === 'ua' ? 'Оформлення офіційної передачі несправних ТЗД у ремонт СЦ.' : 'Оформление официальной передачи неисправных ТСД в ремонт СЦ.'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('rc_rc')}
                  className={`p-4 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                    selectedType === 'rc_rc'
                      ? 'bg-blue-600/10 border-blue-500 text-blue-300'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-1">
                    {lang === 'ua' ? 'РЦ - РЦ Міжсклад' : 'РЦ - РЦ Межсклад'}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {lang === 'ua' ? '3) Переміщення РЦ – РЦ' : '3) Перемещение РЦ – РЦ'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                    {lang === 'ua' ? 'Передача ТЗД на інший логістичний вузол або розподільчий центр.' : 'Передача ТСД на другой логистический узел или распределительный центр.'}
                  </span>
                </button>
              </div>
            </div>

            {/* Document Attributes */}
            <div className="bg-slate-950/35 p-5 border border-slate-800/80 rounded-2xl space-y-4">
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                {lang === 'ua' ? '2. Крок: Реквізити документа та підписи' : '2. Шаг: Реквизиты документа и подписи'}
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Send Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {lang === 'ua' ? 'Дата відправки' : 'Дата отправки'}
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/20 focus:outline-hidden focus:border-blue-500 text-white font-medium"
                  />
                </div>

                {/* Receiver / Target RC for Variant 3 */}
                {selectedType === 'rc_rc' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-400 mb-1">
                      {lang === 'ua' ? 'Отримувач (РЦ Куди відправляється)' : 'Получатель (РЦ Куда отправляется)'}
                    </label>
                    <input
                      type="text"
                      value={targetRC}
                      onChange={(e) => setTargetRC(e.target.value)}
                      placeholder={lang === 'ua' ? 'наприклад, Київ' : 'например, Киев'}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-950/20 focus:outline-hidden focus:border-blue-500 text-white font-medium placeholder-slate-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {lang === 'ua' ? 'Отримувач ТМЦ' : 'Получатель ТМЦ'}
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/20 text-white font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic details for PDF signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                {/* Sender Details */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block bg-blue-500/5 px-2.5 py-1 rounded-md">
                    {lang === 'ua' ? 'ВІДПРАВНИК (ПІДПИС 1)' : 'ОТПРАВИТЕЛЬ (ПОДПИСЬ 1)'}
                  </span>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{lang === 'ua' ? 'Посада відправника' : 'Должность отправителя'}</label>
                    <input
                      type="text"
                      value={senderPosition}
                      onChange={(e) => setSenderPosition(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.0 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{lang === 'ua' ? 'П.І.Б. відправника' : 'Ф.И.О. отправителя'}</label>
                    <input
                      type="text"
                      placeholder="наприклад Кім О.В."
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.0 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-100 placeholder-slate-600"
                    />
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block bg-slate-800 px-2.5 py-1 rounded-md">
                    {lang === 'ua' ? 'ОТРИМУВАЧ (ПІДПИС 2)' : 'ПОЛУЧАТЕЛЬ (ПОДПИСЬ 2)'}
                  </span>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{lang === 'ua' ? 'Посада отримувача' : 'Должность получателя'}</label>
                    <input
                      type="text"
                      value={recipientPosition}
                      onChange={(e) => setRecipientPosition(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.0 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{lang === 'ua' ? 'П.І.Б. отримувача' : 'Ф.И.О. получателя'}</label>
                    <input
                      type="text"
                      placeholder="наприклад Шевченко І.І."
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.0 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-100 placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Multi-selector with checklist */}
            <div className="bg-slate-950/35 p-5 border border-slate-800/80 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  {lang === 'ua' ? '3. Крок: Виберіть ТЗД для акту' : '3. Шаг: Выберите ТСД для акта'}
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPresets('all_repairs')}
                    className="text-[10px] bg-red-950/30 border border-red-500/20 text-red-400 hover:bg-red-950/50 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer"
                  >
                    {lang === 'ua' ? 'Всі в ремонті' : 'Все в ремонте'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresets('all')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer"
                  >
                    {lang === 'ua' ? 'Обрати всі' : 'Выбрать все'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTerminalIds([])}
                    className="text-[10px] bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer"
                  >
                    {lang === 'ua' ? 'Очистити' : 'Очистить'}
                  </button>
                </div>
              </div>

              {/* Search search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'ua' ? 'Швидкий пошук у списку...' : 'Быстрый поиск в списке...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>

              {/* Checklist scrolling area */}
              <div className="max-h-[180px] overflow-y-auto rounded-xl border border-slate-800/60 divide-y divide-slate-850 bg-slate-900/30">
                {filteredTerminals.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    {lang === 'ua' ? 'Не знайдено пристроїв.' : 'Не найдено устройств.'}
                  </div>
                ) : (
                  filteredTerminals.map(term => {
                    const isSelected = selectedTerminalIds.includes(term.id);
                    return (
                      <div
                        key={term.id}
                        onClick={() => toggleTerminalSelection(term.id)}
                        className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/10' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 bg-slate-950/40 text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-200">{term.model}</span>
                            <span className="font-mono text-[10px] text-blue-300 bg-blue-500/5 px-2 py-0.5 rounded-md ml-2 border border-blue-500/10">
                              {term.serialNumber}
                            </span>
                          </div>
                        </div>

                        {/* Status Label */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          term.status === 'В ремонте' ? 'bg-red-500/10 text-red-400' :
                          term.status === 'На складе' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {term.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{lang === 'ua' ? 'Всього в базі:' : 'Всего в базе:'} <strong>{terminals.length} шт.</strong></span>
                <span>{lang === 'ua' ? 'Обрано для акту:' : 'Выбрано для акта:'} <strong className="text-blue-400">{selectedTerminalIds.length} шт.</strong></span>
              </div>
            </div>

          </div>

          {/* Right panel: visual preview representation - 5 cols */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Live Document Layout A4 Preview Container */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between overflow-hidden shadow-inner text-[10px] font-mono shadow-black/40 text-black">
              
              <div id="print-area-card" className="bg-white p-6 rounded-xl space-y-4 shadow-sm w-full font-sans select-text max-h-[460px] overflow-y-auto">
                {/* Header */}
                <div className="text-center space-y-1 border-b border-dashed border-slate-200 pb-3">
                  <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">АКТ</h4>
                  <p className="text-[9px] font-medium text-slate-600">на переміщення товаро-матеріальних цінностей</p>
                </div>

                {/* Metadata Properties block */}
                <div className="border border-slate-300 text-[9px] text-slate-800 rounded-md overflow-hidden">
                  <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50">
                    <div className="col-span-4 p-1.5 font-bold border-r border-slate-200">Дата відправки</div>
                    <div className="col-span-8 p-1.5 font-mono text-blue-700">{formatDateString(dispatchDate) || 'не вказано'}</div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-4 p-1.5 font-bold border-r border-slate-200">Відправник</div>
                    <div className="col-span-8 p-1.5 font-semibold text-slate-700">{sender}</div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 p-1.5 font-bold border-r border-slate-200">Отримувач</div>
                    <div className="col-span-8 p-1.5 font-semibold text-slate-700 font-sans">
                      {selectedType === 'rc_rc' ? `РЦ ${targetRC}` : recipient}
                    </div>
                  </div>
                </div>

                {/* Central item table subheading */}
                <p className="text-[9px] font-bold text-center text-slate-800 mt-2">
                  Перелік техніки що відправляється:
                </p>

                {/* Hardware List table */}
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse text-[8px]">
                    <thead>
                      <tr className="preview-table-header bg-[#2e7d32] text-white font-bold">
                        <th className="p-1.5 text-center border-r border-green-700 w-[15%]">К-сть</th>
                        <th className="p-1.5 border-r border-green-700">№ моделі</th>
                        <th className="p-1.5">S\№ пристрою</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedTerminalIds.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400 italic font-sans text-[9px]">
                            {lang === 'ua' ? 'Оберіть пристрої з лівої колонки' : 'Выберите устройства из левой колонки'}
                          </td>
                        </tr>
                      ) : (
                        selectedTerminalIds.map((id, index) => {
                          const term = terminals.find(t => t.id === id);
                          if (!term) return null;
                          return (
                            <tr key={id} className="hover:bg-slate-50 font-medium">
                              <td className="p-1.5 text-center font-bold border-r border-slate-200 text-slate-800">{index + 1}</td>
                              <td className="p-1.5 border-r border-slate-200 text-slate-900 font-semibold">{term.model}</td>
                              <td className="p-1.5 text-blue-900 font-mono font-bold">{term.serialNumber}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer signatures visual */}
                <div className="space-y-4 pt-3 border-t border-dashed border-slate-200 text-[8px] text-slate-800 font-medium">
                  {/* Sender signature block */}
                  <div className="space-y-1.5">
                    <p className="font-bold text-[8.5px] text-slate-900">Підпис відповідального за переміщення ТМЦ</p>
                    <div className="grid grid-cols-12 gap-1.5 border-b border-slate-300 pb-1 items-end min-h-[22px]">
                      <div className="col-span-5 truncate text-slate-600 font-semibold leading-tight text-[7.5px]">{senderPosition}</div>
                      <div className="col-span-3 border-r border-slate-200 h-4"></div>
                      <div className="col-span-4 font-bold text-slate-700">{senderName || '________________'}</div>
                    </div>
                    <div className="grid grid-cols-12 text-[7px] text-slate-400 text-center leading-none">
                      <div className="col-span-5">(посада)</div>
                      <div className="col-span-3">(підпис)</div>
                      <div className="col-span-4">(п.і.б.)</div>
                    </div>
                  </div>

                  {/* Recipient / security control signature block */}
                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-[8.5px] text-slate-900">
                      {selectedType === 'vtp_sc' || selectedType === 'rc_rc'
                        ? 'Підпис хто проконтролював переміщення ТМЦ'
                        : 'Підпис відповідального за прийняття ТМЦ'}
                    </p>
                    <div className="grid grid-cols-12 gap-1.5 border-b border-slate-300 pb-1 min-h-[22px] items-end">
                      <div className="col-span-5 text-slate-600 font-semibold leading-tight text-[7.5px]">
                        {selectedType === 'vtp_sc' || selectedType === 'rc_rc' ? (
                          <>
                            Старший зміни відділу охорони<br />РЦ Перемога
                          </>
                        ) : (
                          recipientPosition
                        )}
                      </div>
                      <div className="col-span-3 border-r border-slate-200 h-4"></div>
                      <div className="col-span-4 font-bold text-slate-700">
                        {selectedType === 'vtp_sc' || selectedType === 'rc_rc'
                          ? '________________'
                          : (recipientName || '________________')}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 text-[7px] text-slate-400 text-center leading-none">
                      <div className="col-span-5">(посада)</div>
                      <div className="col-span-3">(підпис)</div>
                      <div className="col-span-4">(п.і.б.)</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Visual preview indicators */}
              <div className="text-[10px] text-slate-400 text-center select-none font-mono">
                {lang === 'ua' 
                  ? '✦ Інтерактивний макет документа формату А4 ✦' 
                  : '✦ Интерактивный макет документа формата А4 ✦'}
              </div>
            </div>

            {/* Font loading error banners */}
            {fontLoadingError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                {fontLoadingError}
              </p>
            )}

            {/* Main Action Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                {lang === 'ua' ? 'Закрити' : 'Закрыть'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={selectedTerminalIds.length === 0}
                className="py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                {lang === 'ua' ? 'Друк / Зберегти як PDF' : 'Печать / Сохранить в PDF'}
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGenerating || selectedTerminalIds.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center justify-center cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                    {lang === 'ua' ? 'Формування...' : 'Формирование...'}
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2 text-white" />
                    {lang === 'ua' ? 'Пряме скачування (PDF)' : 'Прямое скачивание (PDF)'}
                  </>
                )}
              </motion.button>
            </div>

          </div>

        </div>

      </div>
  );

  return (
    <>
      {isFullPage ? (
        innerContent
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-5xl flex flex-col justify-center items-center"
          >
            {innerContent}
          </motion.div>
        </div>
      )}
      {createPortal(
        <div className="hidden print:block printable-a4-sheet font-sans text-black">
          {/* Header */}
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300 mb-3">
            <h4 className="text-lg font-bold uppercase tracking-wider text-black">АКТ</h4>
            <p className="text-[10px] font-semibold text-slate-700">на переміщення товаро-матеріальних цінностей</p>
          </div>

          {/* Metadata Table */}
          <table className="w-full text-left border border-black border-collapse text-[10px] mb-3">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1 px-2 font-bold border-r border-black w-1/4 bg-slate-50">Дата відправки</td>
                <td className="p-1 px-2 font-mono font-bold">{formatDateString(dispatchDate) || 'не вказано'}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 px-2 font-bold border-r border-black bg-slate-50">Відправник</td>
                <td className="p-1 px-2 font-semibold">{sender}</td>
              </tr>
              <tr>
                <td className="p-1 px-2 font-bold border-r border-black bg-slate-50">Отримувач</td>
                <td className="p-1 px-2 font-semibold">{selectedType === 'rc_rc' ? `РЦ ${targetRC}` : recipient}</td>
              </tr>
            </tbody>
          </table>

          {/* Subheading */}
          <p className="text-[10px] font-bold text-center mb-2">
            Перелік техніки що відправляється:
          </p>

          {/* Equipment Table */}
          <table className="w-full text-left border border-black border-collapse text-[10px] mb-4">
            <thead>
              <tr className="print-table-header bg-[#2e7d32] text-white font-bold">
                <th className="p-1.5 text-center border-r border-black w-[15%] text-white">К-сть</th>
                <th className="p-1.5 border-r border-black text-white">№ моделі</th>
                <th className="p-1.5 text-white">S\№ пристрою</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {selectedTerminalIds.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-slate-400 italic">
                    Не обрано жодного пристрою
                  </td>
                </tr>
              ) : (
                selectedTerminalIds.map((id, index) => {
                  const term = terminals.find(t => t.id === id);
                  if (!term) return null;
                  return (
                    <tr key={id} className="font-semibold text-black">
                      <td className="p-1 text-center font-bold border-r border-black">{index + 1}</td>
                      <td className="p-1 border-r border-black text-black">{term.model}</td>
                      <td className="p-1 font-mono text-black font-bold">{term.serialNumber}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="space-y-4 pt-2 text-[10px] font-semibold text-black">
            {/* Sender */}
            <div className="space-y-1">
              <p className="font-bold text-[10px]">Підпис відповідального за переміщення ТМЦ</p>
              <div className="grid grid-cols-12 gap-1 border-b border-black pb-1">
                <div className="col-span-5 truncate text-slate-800">{senderPosition}</div>
                <div className="col-span-3"></div>
                <div className="col-span-4 font-bold text-black">{senderName || '____________________'}</div>
              </div>
              <div className="grid grid-cols-12 text-[8px] text-slate-500 text-center leading-none">
                <div className="col-span-5">(посада)</div>
                <div className="col-span-3">(підпис)</div>
                <div className="col-span-4">(п.і.б.)</div>
              </div>
            </div>

            {/* Recipient / security control */}
            <div className="space-y-1 pt-1">
              <p className="font-bold text-[10px]">
                {selectedType === 'vtp_sc' || selectedType === 'rc_rc'
                  ? 'Підпис хто проконтролював переміщення ТМЦ'
                  : 'Підпис відповідального за прийняття ТМЦ'}
              </p>
              <div className="grid grid-cols-12 gap-1 border-b border-black pb-1 items-end min-h-[28px]">
                <div className="col-span-5 text-slate-800 leading-tight font-semibold text-[9px]">
                  {selectedType === 'vtp_sc' || selectedType === 'rc_rc' ? (
                    <>
                      Старший зміни відділу охорони<br />РЦ Перемога
                    </>
                  ) : (
                    recipientPosition
                  )}
                </div>
                <div className="col-span-3"></div>
                <div className="col-span-4 font-bold text-black">
                  {selectedType === 'vtp_sc' || selectedType === 'rc_rc'
                    ? '____________________'
                    : (recipientName || '____________________')}
                </div>
              </div>
              <div className="grid grid-cols-12 text-[8px] text-slate-500 text-center leading-none">
                <div className="col-span-5">(посада)</div>
                <div className="col-span-3">(підпис)</div>
                <div className="col-span-4">(п.і.б.)</div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
