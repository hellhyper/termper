export type TerminalStatus = 'На складе' | 'В кабинете' | 'В ремонте';

export interface Terminal {
  id: string;
  model: string;
  serialNumber: string;
  status: TerminalStatus;
  createdAt: string;
  warrantyEndsAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface HistoryEntry {
  id: string;
  terminalId: string;
  model: string;
  serialNumber: string;
  malfunction: string;      // Несправність
  dateToIT: string;         // Дата передачі ІТ
  dateToSC: string;         // Дата передачі в СЦ
  repairedBy: string;       // Ким виконувався ремонт
  dateFromRepair: string;   // Дата прийому з ремонту
  dateToWarehouse: string;  // Дата передачі на склад
  rc: string;               // РЦ
  zno: string;              // ЗНО
  createdAt: string;
  userLogin?: string;
}

export interface Instruction {
  id: string;
  title: string;
  content: string; // Markdown or plain text instructions
  category: string;
  createdAt: string;
}

export interface DatabaseSchema {
  terminals: Terminal[];
  history: HistoryEntry[];
  instructions: Instruction[];
}
