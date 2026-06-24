import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Terminal, HistoryEntry, Instruction } from '../types';
import importedData from '../imported_data.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCEjtDav7-NZnSDoVIxp50Wh2U-DjrvSM8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kempt-yeti-9sjh2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kempt-yeti-9sjh2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kempt-yeti-9sjh2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "747112613518",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:747112613518:web:51c4002e971aeb1981ebdf"
};

const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-57b70c17-68ba-45d0-bea7-032e6118752e";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = !dbId || dbId === "(default)"
  ? initializeFirestore(app, {})
  : initializeFirestore(app, {}, dbId);

// Default data to seed if database is empty
const defaultTerminals = importedData.terminals as Terminal[];
const defaultHistory = importedData.history as HistoryEntry[];

const defaultInstructions: Instruction[] = [
  {
    id: 'i1',
    title: 'Калибровка экрана Zebra TC21 / TC26',
    content: '### Пошаговая калибровка сенсорного экрана:\n\n1. Перейдите в **Настройки** -> **Экран** -> **Дополнительно**.\n2. Выберите пункт **Калибровка сенсорной панели**.\n3. Положите ТСД на ровную поверхность.\n4. Нажимайте на перекрестия, последовательно появляющиеся на экране, тонким стилусом или пальцем.\n5. По завершении нажмите **Сохранить** и перезагрузите устройство.',
    category: 'Настройка ТСД',
    createdAt: new Date().toISOString()
  },
  {
    id: 'i2',
    title: 'Инструкция по отправке ТСД в СЦ через транспортную компанию',
    content: '### Процедура подготовки и отправки оборудования в ремонт:\n\n1. **Создайте ЗНО** в инфосистеме, прикрепив описание неисправности.\n2. Тщательно упакуйте терминал в пузырчатую пленку (минимум 3 слоя) и вложите в картонную коробку.\n3. Обязательно вложите внутрь сопроводительный лист со штрихкодом ЗНО, моделью, серийным номером и ФИО отправителя.\n4. На коробке напишите крупно номер ЗНО и адрес СЦ.\n5. Передайте курьеру ТК и внесите номер накладной в лог движения.',
    category: 'Логистика и отправка',
    createdAt: new Date().toISOString()
  }
];


export async function seedDatabaseIfEmpty() {
  try {
    const terminalsSnapshot = await getDocs(collection(db, 'terminals'));
    if (terminalsSnapshot.empty) {
      console.log('Seeding default terminals...');
      for (const t of defaultTerminals) {
        await setDoc(doc(db, 'terminals', t.id), t);
      }
    }

    const historySnapshot = await getDocs(collection(db, 'history'));
    if (historySnapshot.empty) {
      console.log('Seeding default history...');
      for (const h of defaultHistory) {
        await setDoc(doc(db, 'history', h.id), h);
      }
    }

    const instructionsSnapshot = await getDocs(collection(db, 'instructions'));
    if (instructionsSnapshot.empty) {
      console.log('Seeding default instructions...');
      for (const i of defaultInstructions) {
        await setDoc(doc(db, 'instructions', i.id), i);
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
