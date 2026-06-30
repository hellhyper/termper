import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../context/LanguageContext';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
// @ts-ignore
import { PDF417 } from 'pdf417-generator';
import { 
  QrCode, 
  Download, 
  FileDown, 
  Terminal as TerminalIcon, 
  Copy, 
  Check, 
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function TzdRenameTab() {
  const { lang } = useI18n();
  const [terminalName, setTerminalName] = useState('TSD-NEW-DEVICE');
  const [copiedXml, setCopiedXml] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean and validate the input name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Transliterate or filter characters to match typical hostname rules (alphanumeric, hyphens, underscores)
    // Hostnames shouldn't contain Cyrillic, spaces, or most special chars. Let's automatically clean or warn
    const cleaned = val.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
    setTerminalName(cleaned);

    if (val !== cleaned) {
      setErrorMsg(
        lang === 'ua'
          ? 'Для імені хоста дозволені лише латинські літери, цифри, дефіс та підкреслення. Символи автоматично очищено.'
          : 'Для имени хоста разрешены только латинские буквы, цифры, дефис и подчеркивание. Символы автоматически очищены.'
      );
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setErrorMsg(null);
    }
  };

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<wap-provisioningdoc>
  <characteristic version="11.5" type="HostsMgr">
    <parm name="HostName" value="${terminalName || 'NEW_NAME'}"/>
    <parm name="DeviceName" value="${terminalName || 'NEW_NAME'}"/>
  </characteristic>
</wap-provisioningdoc>`;

  // Generate barcode on canvas when name changes
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      // Clear the canvas first
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const textToEncode = xmlContent.trim();
      if (!textToEncode) return;

      // Draw PDF417 onto canvas
      // draw parameter signature: draw(code, canvas, aspectratio, ecl, devicePixelRatio, lineColor)
      // We can use default error correction (-1) and aspect ratio (2)
      PDF417.draw(textToEncode, canvas, 2, -1, 2, '#ffffff');
    } catch (err: any) {
      console.error('Error drawing PDF417:', err);
    }
  }, [xmlContent]);

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Create a temporary canvas with a solid black/dark background or clean white border for scanning
    const printCanvas = document.createElement('canvas');
    const ctx = printCanvas.getContext('2d');
    if (!ctx) return;

    // Add padding around the barcode
    const padding = 20;
    printCanvas.width = canvas.width + padding * 2;
    printCanvas.height = canvas.height + padding * 2;

    // Zebra scanners usually read better if there is high contrast (white background, black barcode)
    // Let's generate a white-background high-contrast PNG barcode for scanning from screen/paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // Draw temporary black barcode
    const tempCanvas = document.createElement('canvas');
    try {
      PDF417.draw(xmlContent.trim(), tempCanvas, 2, -1, 2, '#000000');
      ctx.drawImage(tempCanvas, padding, padding, canvas.width, canvas.height);
    } catch (err) {
      console.error(err);
      // fallback to drawing original directly
      ctx.drawImage(canvas, padding, padding);
    }

    const a = document.createElement('a');
    a.href = printCanvas.toDataURL('image/png');
    a.download = `stagenow-rename-${terminalName || 'device'}.png`;
    a.click();
  };

  const handleDownloadPdf = () => {
    if (!canvasRef.current) return;

    try {
      // Create PDF in A4 size
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Prepare a high-contrast black barcode image
      const tempCanvas = document.createElement('canvas');
      PDF417.draw(xmlContent.trim(), tempCanvas, 2, -1, 2, '#000000');
      const imgData = tempCanvas.toDataURL('image/png');

      // Styles and margins
      const margin = 20;
      doc.setFillColor(248, 250, 252); // Soft light blue-grey header
      doc.rect(15, 15, 180, 40, 'F');

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(
        lang === 'ua' ? 'ПРОФІЛЬ ПЕРЕЙМЕНУВАННЯ ТЗД' : 'ПРОФИЛЬ ПЕРЕИМЕНОВАНИЯ ТСД',
        20,
        30
      );

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 38);
      doc.text(`Configuration Standard: Zebra StageNow / XML Profile v11.5`, 20, 44);

      // Details block
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont('Helvetica', 'bold');
      doc.text(lang === 'ua' ? 'Деталі конфігурації:' : 'Детали конфигурации:', 20, 70);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${lang === 'ua' ? 'Нове ім\'я пристрою (DeviceName):' : 'Новое имя устройства (DeviceName):'}  ${terminalName}`, 20, 78);
      doc.text(`${lang === 'ua' ? 'Нове ім\'я хоста (HostName):' : 'Новое имя хоста (HostName):'}       ${terminalName}`, 20, 84);
      doc.text(`Type of barcode: PDF417 (2D StageNow XML)`, 20, 90);

      // Line separator
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(20, 96, 190, 96);

      // Add Barcode Image
      // Let's scale barcode proportionally to fit well on A4
      const barcodeWidth = 140; 
      const barcodeHeight = 65; 
      const x = (210 - barcodeWidth) / 2; // centered
      doc.rect(x - 5, 105 - 5, barcodeWidth + 10, barcodeHeight + 10, 'S'); // border
      doc.addImage(imgData, 'PNG', x, 105, barcodeWidth, barcodeHeight);

      // Instructions block
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(20, 185, 170, 45, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(lang === 'ua' ? 'ІНСТРУКЦІЯ ЗІ СКАНУВАННЯ:' : 'ИНСТРУКЦИЯ ПО СКАНИРОВАНИЮ:', 25, 193);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700
      
      const instructions = lang === 'ua' ? [
        '1. Переконайтеся, що на ТЗД Zebra запущено утиліту "StageNow" або вбудований сканер налаштування.',
        '2. Направте промінь зчитувача штрих-коду на зображення PDF417 вище.',
        '3. Після успішного зчитування утиліта автоматично застосує налаштування імені.',
        '4. Пристрій змінить HostName та DeviceName на "' + terminalName + '" та оновиться.'
      ] : [
        '1. Убедитесь, что на ТСД Zebra запущена утилита "StageNow" или встроенный сканер настроек.',
        '2. Направьте луч считывателя штрих-кода на изображение PDF417 выше.',
        '3. После успешного считывания утилита автоматически применит настройки имени.',
        '4. Устройство изменит HostName и DeviceName на "' + terminalName + '" и обновится.'
      ];

      let yPos = 200;
      instructions.forEach(line => {
        doc.text(line, 25, yPos);
        yPos += 6;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        lang === 'ua' 
          ? 'Згенеровано автоматично в системі обліку ТЗД. PDF417 штрих-код містить повноцінний XML-профіль HostsMgr.' 
          : 'Сгенерировано автоматически в системе учета ТСД. PDF417 штрих-код содержит полноценный XML-профиль HostsMgr.',
        20,
        280
      );

      doc.save(`stagenow-rename-${terminalName || 'device'}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* Left Form controls and instruction */}
      <div className="xl:col-span-6 flex flex-col justify-between space-y-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800/60">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {lang === 'ua' ? 'Перейменування пристрою' : 'Переименование устройства'}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {lang === 'ua' ? 'Зміна HostName та DeviceName через штрих-код' : 'Смена HostName и DeviceName через штрих-код'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400">
              {lang === 'ua' ? 'Бажане ім\'я терміналу:' : 'Желаемое имя терминала:'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={terminalName}
                onChange={handleNameChange}
                maxLength={32}
                placeholder="E.g. TSD-RESERVE-02"
                className="w-full pl-3 pr-16 py-3 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950/60 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 tracking-wider transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 font-bold">
                {terminalName.length}/32
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* XML profile viewer card */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1" />
                {lang === 'ua' ? 'Згенерований XML профіль' : 'Сгенерированный XML профиль'}
              </span>
              <button
                type="button"
                onClick={handleCopyXml}
                className="flex items-center space-x-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {copiedXml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{lang === 'ua' ? 'Скопійовано!' : 'Скопировано!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'ua' ? 'Копіювати XML' : 'Копировать XML'}</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/80 text-[10px] font-mono text-slate-400 leading-relaxed overflow-x-auto max-h-[160px] scrollbar-thin">
              {xmlContent}
            </pre>
          </div>
        </div>

        {/* Quick Instructions list */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300 font-bold">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>{lang === 'ua' ? 'Як цим користуватися?' : 'Как этим пользоваться?'}</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed pl-1">
            <li className="flex items-start">
              <span className="text-blue-500 mr-1.5 font-bold">•</span>
              <span>{lang === 'ua' ? 'Введіть нову назву для ТЗД у поле вводу вище.' : 'Введите новое название для ТСД в поле ввода выше.'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-1.5 font-bold">•</span>
              <span>{lang === 'ua' ? 'Справа миттєво згенерується двовимірний штрих-код PDF417.' : 'Справа мгновенно сгенерируется двумерный штрих-код PDF417.'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-1.5 font-bold">•</span>
              <span>{lang === 'ua' ? 'Завантажте його як малюнок або у форматі PDF для друку.' : 'Скачайте его как изображение или в формате PDF для печати.'}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-1.5 font-bold">•</span>
              <span>{lang === 'ua' ? 'Відкрийте утиліту StageNow на Zebra ТЗД та відскануйте згенерований штрих-код.' : 'Откройте утилиту StageNow на Zebra ТСД и отсканируйте сгенерированный штрих-код.'}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Barcode Output preview */}
      <div className="xl:col-span-6 flex flex-col justify-between items-center bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 text-center">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 w-full text-left">
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-black text-white">
                  {lang === 'ua' ? 'Штрих-код PDF417' : 'Штрих-код PDF417'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {lang === 'ua' ? 'Відскануйте для налаштування' : 'Отсканируйте для настройки'}
                </p>
              </div>
            </div>
            {terminalName && (
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                {terminalName}
              </span>
            )}
          </div>

          {/* Barcode display container */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 border border-slate-800 min-h-[220px] shadow-inner relative group">
            <div className="max-w-full overflow-auto p-1.5 flex justify-center items-center">
              <canvas 
                ref={canvasRef} 
                id="barcode-preview"
                className="max-w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            
            <p className="text-[10px] font-bold text-slate-500 tracking-wide mt-4 uppercase">
              {lang === 'ua' ? 'StageNow XML Barcode' : 'StageNow XML Barcode'}
            </p>
          </div>
        </div>

        {/* Actions panel */}
        <div className="w-full grid grid-cols-2 gap-3.5 mt-5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPng}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>{lang === 'ua' ? 'Завантажити PNG' : 'Скачать PNG'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPdf}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-500/10"
          >
            <FileDown className="w-4 h-4 text-blue-200" />
            <span>{lang === 'ua' ? 'Завантажити PDF' : 'Скачать PDF'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
