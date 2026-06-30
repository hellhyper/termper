import { useState, useEffect } from 'react';
import { Terminal, HistoryEntry, Instruction, TerminalStatus } from './types';
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import TerminalList from './components/TerminalList';
import TerminalHistory from './components/TerminalHistory';
import InstructionsDb from './components/InstructionsDb';
import SCDirectionsHelp from './components/SCDirectionsHelp';
import PasswordGate from './components/PasswordGate';
import WarrantiesList from './components/WarrantiesList';
import RecentMovements from './components/RecentMovements';
import ActGeneratorModal from './components/ActGeneratorModal';
import RecentlyDeleted from './components/RecentlyDeleted';
import DetailedStats from './components/DetailedStats';
import { Monitor, BookOpen, AlertCircle, RefreshCw, BarChart2, History, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import { useI18n } from './context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

// Firebase Imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, seedDatabaseIfEmpty } from './lib/firebase';

export default function App() {
  const { lang, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'terminals' | 'acts' | 'instructions' | 'help' | 'setup' | 'movements' | 'deleted' | 'analytics'>('terminals');
  
  // Database States
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  
  // Navigation / Detail Drill down
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  // Status logs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authenticate listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data
  const fetchData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Seed if Firestore collection is blank
      await seedDatabaseIfEmpty();
      
      const [terminalsSnapshot, historySnapshot, instructionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'terminals')),
        getDocs(collection(db, 'history')),
        getDocs(collection(db, 'instructions'))
      ]);

      const terminalsList = terminalsSnapshot.docs.map(d => d.data() as Terminal);
      const historyList = historySnapshot.docs.map(d => d.data() as HistoryEntry);
      const instructionsList = instructionsSnapshot.docs.map(d => d.data() as Instruction);

      // Sort data descending by date
      terminalsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      historyList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      instructionsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setTerminals(terminalsList);
      setHistory(historyList);
      setInstructions(instructionsList);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к облачной базе данных Firestore');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Post new terminal
  const handleAddTerminal = async (newTerm: { model: string; serialNumber: string; status: TerminalStatus }) => {
    try {
      // Clean checks
      const existing = terminals.find((t) => t.serialNumber.toLowerCase() === newTerm.serialNumber.toLowerCase());
      if (existing) {
        throw new Error(`Терминал с серийным номером ${newTerm.serialNumber} уже существует`);
      }

      const id = Math.random().toString(36).substring(2, 9);
      const newTerminal: Terminal = {
        id,
        ...newTerm,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'terminals', id), newTerminal);
      setNewlyAddedId(id);
      setTimeout(() => setNewlyAddedId(null), 5000);
      await fetchData(true);
    } catch (err: any) {
      throw err;
    }
  };

  // Update terminal status quick controls or deep edits
  const handleUpdateTerminalStatus = async (id: string, newStatus: TerminalStatus) => {
    try {
      const targetTerminal = terminals.find(t => t.id === id);
      if (!targetTerminal) return;

      await updateDoc(doc(db, 'terminals', id), { status: newStatus });

      // Add logical history auto-entry when status changes
      let malfunctionDesc = '';
      if (newStatus === 'В ремонте') {
        malfunctionDesc = 'Отправлен на диагностику (ручной перевод статуса)';
      } else if (newStatus === 'На складе') {
        malfunctionDesc = 'Возвращен в резерв хранения';
      } else {
        malfunctionDesc = 'Выдан в отдел / кабинет оператора';
      }

      const historyId = Math.random().toString(36).substring(2, 9);
      const newHistory: HistoryEntry = {
        id: historyId,
        terminalId: id,
        model: targetTerminal.model,
        serialNumber: targetTerminal.serialNumber,
        malfunction: malfunctionDesc,
        dateToIT: newStatus === 'В ремонте' ? new Date().toISOString().split('T')[0] : '',
        dateToSC: '',
        repairedBy: '',
        dateFromRepair: '',
        dateToWarehouse: newStatus === 'На складе' ? new Date().toISOString().split('T')[0] : '',
        rc: 'РЦ Ногинск',
        zno: '',
        createdAt: new Date().toISOString(),
        userLogin: user?.email || 'System'
      };

      await setDoc(doc(db, 'history', historyId), newHistory);

      // Sync local terminal state after updating status
      if (selectedTerminal?.id === id) {
        setSelectedTerminal({ ...targetTerminal, status: newStatus });
      }

      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка синхронизации статуса');
    }
  };

  // Update terminal (serial number or other profile information)
  const handleUpdateTerminal = async (id: string, fields: Partial<Terminal>) => {
    try {
      await updateDoc(doc(db, 'terminals', id), fields);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления терминала');
      throw err;
    }
  };

  // Delete terminal (Soft delete - move to Recently Deleted)
  const handleDeleteTerminal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'terminals', id), {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      
      if (selectedTerminal?.id === id) {
        setSelectedTerminal(null);
      }
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка при удалении устройства');
    }
  };

  // Restore terminal from Recently Deleted
  const handleRestoreTerminal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'terminals', id), {
        isDeleted: false,
        deletedAt: null
      });
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка при восстановлении устройства');
    }
  };

  // Permanently delete terminal
  const handlePurgeTerminal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'terminals', id));
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка при окончательном удалении устройства');
    }
  };

  // Add History record manually in the terminal detail view
  const handleAddHistory = async (newLog: Omit<HistoryEntry, 'id' | 'createdAt'>) => {
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const newHistoryEntry: HistoryEntry = {
        id,
        ...newLog,
        createdAt: new Date().toISOString(),
        userLogin: user?.email || 'System'
      };

      await setDoc(doc(db, 'history', id), newHistoryEntry);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения движения ТСД');
    }
  };

  // Update History item
  const handleUpdateHistory = async (id: string, fields: Partial<HistoryEntry>) => {
    try {
      await updateDoc(doc(db, 'history', id), fields);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления записи в архиве');
    }
  };

  // Delete History record
  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'history', id));
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления записи');
    }
  };

  // Add custom Instruction Base
  const handleAddInstruction = async (newInst: { title: string; content: string; category: string }) => {
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const newInstructionEntry: Instruction = {
        id,
        ...newInst,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'instructions', id), newInstructionEntry);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка публикации руководства');
    }
  };

  // Update existing Instruction file
  const handleUpdateInstruction = async (id: string, updatedFields: { title: string; content: string; category: string }) => {
    try {
      await updateDoc(doc(db, 'instructions', id), updatedFields);
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления руководства');
    }
  };

  // Delete Instruction
  const handleDeleteInstruction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'instructions', id));
      await fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Ошибка при удалении инструкции');
    }
  };

  // Helper to sync drill-down reference if full database refreshes in background
  useEffect(() => {
    if (selectedTerminal) {
      const synced = terminals.find(t => t.id === selectedTerminal.id);
      if (synced) {
        setSelectedTerminal(synced);
      }
    }
  }, [terminals]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <PasswordGate
        onSuccess={() => {
          // Authentication state is handled dynamically by Firebase onAuthStateChanged
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none antialiased text-slate-100">
      {/* Absolute top visual header with local clock & database metrics */}
      <Header
        onShowHelp={() => {
          setSelectedTerminal(null);
          setActiveTab(activeTab === 'help' ? 'terminals' : 'help');
        }}
        isHelpActive={activeTab === 'help'}
        onLogoClick={() => {
          setSelectedTerminal(null);
          setActiveTab('terminals');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 border-slate-900">
        
        {/* Connection status/error banners */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 flex items-center space-x-3 shadow-lg animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-bold text-rose-200">Возникла ошибка соединения:</span> {error}
            </div>
            <button
              onClick={() => fetchData()}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              Повторить попытку
            </button>
          </div>
        )}

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-24 text-slate-500 space-y-6"
          >
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 blur-md"
              />
              {/* Middle spinning gradient border */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 relative z-10"
              />
            </div>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400"
            >
              {t('loading')}
            </motion.p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            
            {/* Tab Swappers & Secondary Info - Hide when drilling history */}
            {!selectedTerminal && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                {/* Visual state selector tabs */}
                 <div className="inline-flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 relative text-slate-400">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('terminals')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'terminals' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Monitor className={`relative w-4 h-4 z-10 ${activeTab === 'terminals' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'terminals' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>{t('tab_registry')}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('analytics')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'analytics' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <BarChart2 className={`relative w-4 h-4 z-10 ${activeTab === 'analytics' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'analytics' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>
                      {lang === 'ua' ? 'Аналітика' : 'Аналитика'}
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('acts')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'acts' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <FileText className={`relative w-4 h-4 z-10 ${activeTab === 'acts' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'acts' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>{t('tab_create_act')}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('instructions')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'instructions' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <BookOpen className={`relative w-4 h-4 z-10 ${activeTab === 'instructions' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'instructions' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>
                      {t('tab_instructions')} ({instructions.length})
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('help')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'help' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${activeTab === 'help' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>{t('tab_logistics')}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('movements')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'movements' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <History className={`relative w-4 h-4 z-10 ${activeTab === 'movements' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'movements' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>{t('tab_movements')}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('deleted')}
                    className="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
                  >
                    {activeTab === 'deleted' && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-blue-500/15 border border-blue-500/30 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Trash2 className={`relative w-4 h-4 z-10 ${activeTab === 'deleted' ? 'text-blue-300' : 'text-slate-400'}`} />
                    <span className={`relative z-10 ${activeTab === 'deleted' ? 'text-blue-300 font-extrabold' : 'text-slate-400 hover:text-white'}`}>
                      {lang === 'ua' ? 'Кошик' : 'Корзина'} ({terminals.filter(t => t.isDeleted).length})
                    </span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.025 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    setSelectedTerminal(null);
                    setActiveTab(activeTab === 'setup' ? 'terminals' : 'setup');
                  }}
                  className={`flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'setup'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-emerald-500/10 hover:bg-emerald-600/20 active:bg-emerald-600/30 text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400 shrink-0" />
                  <span>{t('tab_setup')}</span>
                </motion.button>

              </div>
            )}

            {/* View Switching with smooth transition container */}
            <AnimatePresence mode="wait">
              {selectedTerminal ? (
                // 1. Detailed Terminal History view
                <motion.div
                  key="history-detail"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <TerminalHistory
                    terminal={selectedTerminal}
                    history={history}
                    onBack={() => setSelectedTerminal(null)}
                    onAddHistory={handleAddHistory}
                    onUpdateHistory={handleUpdateHistory}
                    onDeleteHistory={handleDeleteHistory}
                  />
                </motion.div>
              ) : (
                // 2. Tab switching content (Dashboard vs Manual instructions database vs SC Directions Help)
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {activeTab === 'terminals' && (
                    <div className="space-y-6">
                      {/* Top statistics summary donuts */}
                      <StatsDashboard terminals={terminals} />

                      {/* Central main database grid */}
                      <TerminalList
                        terminals={terminals.filter(t => !t.isDeleted)}
                        onAddTerminal={handleAddTerminal}
                        onUpdateStatus={handleUpdateTerminalStatus}
                        onDeleteTerminal={handleDeleteTerminal}
                        onSelectTerminal={(t) => setSelectedTerminal(t)}
                        onUpdateTerminal={handleUpdateTerminal}
                        onNavigateToActs={() => setActiveTab('acts')}
                        newlyAddedId={newlyAddedId}
                      />
                    </div>
                  )}

                  {activeTab === 'acts' && (
                    <ActGeneratorModal
                      isOpen={true}
                      onClose={() => setActiveTab('terminals')}
                      terminals={terminals.filter(t => !t.isDeleted)}
                      isFullPage={true}
                    />
                  )}

                  {activeTab === 'instructions' && (
                    <InstructionsDb
                      instructions={instructions}
                      onAddInstruction={handleAddInstruction}
                      onDeleteInstruction={handleDeleteInstruction}
                    />
                  )}

                  {activeTab === 'help' && (
                    <SCDirectionsHelp
                      instructions={instructions}
                      onAddInstruction={handleAddInstruction}
                      onUpdateInstruction={handleUpdateInstruction}
                    />
                  )}

                  {activeTab === 'setup' && (
                    <WarrantiesList
                      terminals={terminals.filter(t => !t.isDeleted)}
                      onUpdateTerminal={handleUpdateTerminal}
                      onAddTerminal={handleAddTerminal}
                      onDeleteTerminal={handleDeleteTerminal}
                    />
                  )}

                  {activeTab === 'movements' && (
                    <RecentMovements
                      terminals={terminals.filter(t => !t.isDeleted)}
                      history={history}
                      onSelectTerminal={(t) => setSelectedTerminal(t)}
                      onSelectTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                  {activeTab === 'analytics' && (
                    <DetailedStats
                      terminals={terminals}
                      history={history}
                    />
                  )}

                  {activeTab === 'deleted' && (
                    <RecentlyDeleted
                      terminals={terminals}
                      onRestoreTerminal={handleRestoreTerminal}
                      onPurgeTerminal={handlePurgeTerminal}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </main>

      {/* Footer credits and information */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500 font-medium font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Логистический Портал терминалов сбора данных на РЦ. Все данные сохраняются в облачной базе данных Firebase (Firestore).</p>
          <p className="mt-1 text-[10px] text-slate-600">Учет движения и ремонтов оборудования — Склады Распределительного Центра.</p>
        </div>
      </footer>
    </div>
  );
}
