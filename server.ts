import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');

app.use(express.json());

// Helper function to safely read data from json
function readDatabase() {
  const defaultData = {
    terminals: [
      { id: '1', model: 'Honeywell EDA51', serialNumber: 'EDA51-23091103', status: 'На складе', createdAt: new Date().toISOString() },
      { id: '2', model: 'Zebra TC21', serialNumber: 'TC21-9840293', status: 'В кабинете', createdAt: new Date().toISOString() },
      { id: '3', model: 'Urovo RT40', serialNumber: 'RT40-48209382', status: 'В ремонте', createdAt: new Date().toISOString() }
    ],
    history: [
      {
        id: 'h1',
        terminalId: '2',
        model: 'Zebra TC21',
        serialNumber: 'TC21-9840293',
        malfunction: 'Разбит тачскрин при падении на складе',
        dateToIT: '2026-05-10',
        dateToSC: '2026-05-12',
        repairedBy: 'Сервисный Центр "Реновация"',
        dateFromRepair: '2026-05-18',
        dateToWarehouse: '2026-05-20',
        rc: 'РЦ Ногинск',
        zno: 'ЗНО-45892',
        createdAt: new Date().toISOString()
      },
      {
        id: 'h2',
        terminalId: '3',
        model: 'Urovo RT40',
        serialNumber: 'RT40-48209382',
        malfunction: 'Не сканирует штрихкоды',
        dateToIT: '2026-05-15',
        dateToSC: '2026-05-16',
        repairedBy: 'РМ-Технолоджи',
        dateFromRepair: '2026-05-22',
        dateToWarehouse: '',
        rc: 'РЦ Ногинск',
        zno: 'ЗНО-45903',
        createdAt: new Date().toISOString()
      }
    ],
    instructions: [
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
    ]
  };

  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database file, returning defaults', error);
    return defaultData;
  }
}

// Helper to write database
function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database file', error);
    return false;
  }
}

// Robust font down-loader to bypass browser sandbox CFR/CORS blocks and follow redirects
async function getFont(url: string, dest: string): Promise<Buffer> {
  if (fs.existsSync(dest)) {
    try {
      const stats = fs.statSync(dest);
      // Valid TTF fonts are usually at least 20KB+; if it's smaller, it's likely a corrupted downloaded file or HTML error page.
      if (stats.size > 10000) {
        return fs.readFileSync(dest);
      }
      fs.unlinkSync(dest); // Delete invalid/corrupt font file
    } catch (e) {
      console.error('Error checking existing font file', e);
    }
  }
  
  const download = (targetUrl: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      https.get(targetUrl, (res) => {
        // Handle redirect
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, targetUrl).href;
          download(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download font: status code ${res.statusCode} from ${targetUrl}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length < 10000) {
            reject(new Error(`Downloaded font file is too small (${buffer.length} bytes), likely invalid`));
            return;
          }
          try {
            fs.writeFileSync(dest, buffer);
          } catch (e) {
            console.error('Could not write downloaded font to disk', e);
          }
          resolve(buffer);
        });
        res.on('error', (err) => reject(err));
      }).on('error', (err) => reject(err));
    });
  };

  return download(url);
}

// Font proxy routes using extremely stable and permanent jsDelivr CDN
app.get('/api/fonts/regular', async (req, res) => {
  try {
    const dest = path.join(process.cwd(), 'Roboto-Regular.ttf');
    const url = 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/fonts/Roboto/Roboto-Regular.ttf';
    const buffer = await getFont(url, dest);
    res.setHeader('Content-Type', 'font/ttf');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (error: any) {
    console.error('Font download error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/fonts/bold', async (req, res) => {
  try {
    const dest = path.join(process.cwd(), 'Roboto-Bold.ttf');
    const url = 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/fonts/Roboto/Roboto-Bold.ttf';
    const buffer = await getFont(url, dest);
    res.setHeader('Content-Type', 'font/ttf');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (error: any) {
    console.error('Font download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// REST API Endpoints
// Get all data
app.get('/api/data', (req, res) => {
  const db = readDatabase();
  res.json(db);
});

// TERMINALS
app.post('/api/terminals', (req, res) => {
  const { model, serialNumber, status, warrantyEndsAt } = req.body;
  if (!model || !serialNumber || !status) {
    return res.status(400).json({ error: 'Модель, серийный номер и статус обязательны' });
  }

  const db = readDatabase();
  
  // Clean checks
  const existing = db.terminals.find((t: any) => t.serialNumber.toLowerCase() === serialNumber.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `Терминал с серийным номером ${serialNumber} уже существует` });
  }

  const newTerminal = {
    id: Math.random().toString(36).substring(2, 9),
    model,
    serialNumber,
    status,
    warrantyEndsAt: warrantyEndsAt || '',
    createdAt: new Date().toISOString()
  };

  db.terminals.push(newTerminal);
  writeDatabase(db);
  res.status(201).json(newTerminal);
});

app.put('/api/terminals/:id', (req, res) => {
  const { id } = req.params;
  const { model, serialNumber, status, warrantyEndsAt } = req.body;

  const db = readDatabase();
  const index = db.terminals.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Терминал не найден' });
  }

  // Update
  if (model !== undefined) db.terminals[index].model = model;
  if (serialNumber !== undefined) db.terminals[index].serialNumber = serialNumber;
  if (status !== undefined) db.terminals[index].status = status;
  if (warrantyEndsAt !== undefined) db.terminals[index].warrantyEndsAt = warrantyEndsAt;

  writeDatabase(db);
  res.json(db.terminals[index]);
});

app.delete('/api/terminals/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  
  const index = db.terminals.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Терминал не найден' });
  }

  db.terminals.splice(index, 1);
  // Also optionally keep or clean history, let's keep it but flag it or orphan it,
  // or just filter out if terminal was deleted. We will keep history entries.
  
  writeDatabase(db);
  res.json({ success: true, message: 'Терминал успешно удален' });
});

// HISTORY
app.post('/api/history', (req, res) => {
  const {
    terminalId, model, serialNumber, malfunction, dateToIT, dateToSC,
    repairedBy, dateFromRepair, dateToWarehouse, rc, zno
  } = req.body;

  const db = readDatabase();
  const newEntry = {
    id: Math.random().toString(36).substring(2, 9),
    terminalId: terminalId || '',
    model: model || '',
    serialNumber: serialNumber || '',
    malfunction: malfunction || '',
    dateToIT: dateToIT || '',
    dateToSC: dateToSC || '',
    repairedBy: repairedBy || '',
    dateFromRepair: dateFromRepair || '',
    dateToWarehouse: dateToWarehouse || '',
    rc: rc || '',
    zno: zno || '',
    createdAt: new Date().toISOString()
  };

  db.history.push(newEntry);
  writeDatabase(db);
  res.status(201).json(newEntry);
});

app.put('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const db = readDatabase();
  const index = db.history.findIndex((h: any) => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Запись истории не найдена' });
  }

  // Merging fields
  db.history[index] = {
    ...db.history[index],
    ...fields
  };

  writeDatabase(db);
  res.json(db.history[index]);
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.history.findIndex((h: any) => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Запись истории не найдена' });
  }

  db.history.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true, message: 'Запись истории удалена' });
});

// INSTRUCTIONS
app.post('/api/instructions', (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Название и содержание инструкции обязательны' });
  }

  const db = readDatabase();
  const newInstruction = {
    id: Math.random().toString(36).substring(2, 9),
    title,
    content,
    category: category || 'Без категории',
    createdAt: new Date().toISOString()
  };

  db.instructions.push(newInstruction);
  writeDatabase(db);
  res.status(201).json(newInstruction);
});

app.put('/api/instructions/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, category } = req.body;

  const db = readDatabase();
  const index = db.instructions.findIndex((i: any) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Инструкция не найдена' });
  }

  if (title) db.instructions[index].title = title;
  if (content) db.instructions[index].content = content;
  if (category) db.instructions[index].category = category;

  writeDatabase(db);
  res.json(db.instructions[index]);
});

app.delete('/api/instructions/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.instructions.findIndex((i: any) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Инструкция не найдена' });
  }

  db.instructions.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true, message: 'Инструкция успешно удалена' });
});

// START EXPRESS SERVER WITH VITE INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
