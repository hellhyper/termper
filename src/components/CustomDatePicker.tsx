import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Convert YYYY-MM-DD to DD.MM.YYYY
const toDisplayFormat = (val?: any) => {
  if (typeof val !== 'string' || !val) return '';
  const clean = val.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return val;
};

// Convert DD.MM.YYYY to YYYY-MM-DD
const toDbFormat = (val: any) => {
  if (typeof val !== 'string' || !val) return '';
  const parts = val.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = `20${year}`; // default to 20xx
    }
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return '';
};

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_UA = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export default function CustomDatePicker({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'дд.мм.рррр',
  className = ''
}: CustomDatePickerProps) {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(toDisplayFormat(value));
  
  // For calendar navigation
  const [navDate, setNavDate] = useState(() => {
    if (value && typeof value === 'string') {
      const cleanVal = value.split('T')[0];
      const parsed = new Date(cleanVal);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync value from parent
  useEffect(() => {
    setTextValue(toDisplayFormat(value));
    if (value && typeof value === 'string') {
      const cleanVal = value.split('T')[0];
      const parsed = new Date(cleanVal);
      if (!isNaN(parsed.getTime())) {
        setNavDate(parsed);
      }
    }
  }, [value]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const months = lang === 'ua' ? MONTHS_UA : MONTHS_RU;
  const weekdays = lang === 'ua' ? WEEKDAYS_UA : WEEKDAYS_RU;

  // Masked Typing handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, ''); // numbers only
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = '';
    if (raw.length > 0) {
      formatted += raw.slice(0, 2);
    }
    if (raw.length > 2) {
      formatted += '.' + raw.slice(2, 4);
    }
    if (raw.length > 4) {
      formatted += '.' + raw.slice(4, 8);
    }

    setTextValue(formatted);

    // If complete date is entered, check validity and call parent
    if (formatted.length === 10) {
      const dbVal = toDbFormat(formatted);
      if (dbVal) {
        const parsed = new Date(dbVal);
        if (!isNaN(parsed.getTime())) {
          onChange(dbVal);
          setNavDate(parsed);
        }
      }
    }
  };

  // Popover quick select day handler
  const handleSelectDay = (day: number) => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const selectedDate = new Date(year, month, day);
    
    // Format to YYYY-MM-DD manually to prevent timezone offsets
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDb = `${yyyy}-${mm}-${dd}`;
    
    onChange(formattedDb);
    setTextValue(`${dd}.${mm}.${yyyy}`);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar calculations
  const calendarCells = useMemo(() => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    
    if (isNaN(year) || isNaN(month)) return [];
    
    // First day of currently navigated month
    const firstDayIndex = new Date(year, month, 1).getDay();
    // JS days: 0 = Sun, 1 = Mon... Convert to Mon=0, Sun=6
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // Empty padding slots
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    // Days slots
    for (let day = 1; day <= totalDays; day++) {
      cells.push(day);
    }
    return cells;
  }, [navDate]);

  const selectedDayInfo = useMemo(() => {
    if (!value) return null;
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate()
    };
  }, [value]);

  const isSelected = (day: number) => {
    if (!selectedDayInfo) return false;
    return (
      selectedDayInfo.day === day &&
      selectedDayInfo.month === navDate.getMonth() &&
      selectedDayInfo.year === navDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === navDate.getMonth() &&
      today.getFullYear() === navDate.getFullYear()
    );
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full min-w-[130px]">
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          value={textValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full text-xs bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2 text-slate-300 font-bold focus:outline-hidden focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all ${className}`}
        />
        
        {/* Toggle / Calendar Icon button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-blue-400 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 z-50 w-64 bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-2xl shadow-black/90 space-y-3"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {(months[navDate.getMonth()] || '') + ' ' + (isNaN(navDate.getFullYear()) ? '' : navDate.getFullYear())}
              </span>

              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Weekdays row */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((wd, idx) => (
                <span key={idx} className="text-[9px] font-black uppercase text-slate-500">
                  {wd}
                </span>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }

                const selected = isSelected(day);
                const current = isToday(day);

                return (
                  <motion.button
                    key={`day-${day}`}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectDay(day)}
                    className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      selected 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : current
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>

            {/* Clear date option */}
            {value && (
              <div className="border-t border-slate-800/80 pt-2 flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onChange('');
                    setTextValue('');
                    setIsOpen(false);
                  }}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 hover:bg-rose-500/5 rounded-lg cursor-pointer transition-all"
                >
                  {lang === 'ua' ? 'Очистити дату' : 'Очистить дату'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
