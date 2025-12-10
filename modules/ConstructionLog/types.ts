// src/modules/ConstructionLog/types.ts

export interface ConstructionLogEntry {
  id: string;
  projectId: string;   // 关联的工地ID
  date: string;        // YYYY-MM-DD
  weather: string;
  temperature: string;
  content: string;
  workersSummary: string; // 自动抓取的人员数据
  safetyNotes: string;
  materialNotes: string;  // <--- 补上这一行，解决 LogEditor 的报错
  updatedAt: string;
}