
export enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  JSON = 'JSON',
  CSV = 'CSV',
  UNKNOWN = 'UNKNOWN'
}

export interface ImportedFile {
  id: string;
  name: string;
  type: ContentType;
  content: string; // Text content or Base64 string for images
  mimeType?: string;
  timestamp: number;
}

export enum AnalysisType {
  SUMMARY = 'SUMMARY',
  EXTRACTION = 'EXTRACTION', // Structured JSON
  CLEANUP = 'CLEANUP', // Fix formatting/grammar
  CUSTOM = 'CUSTOM'
}

export interface AnalysisResult {
  id: string;
  fileId: string;
  type: AnalysisType;
  markdown: string;
  rawJson?: any; // If structured data is extracted
  timestamp: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
}

export interface DayEntry {
  morning: number | string;
  afternoon: number | string;
  overtime: number | string;
}

export interface Employee {
  id: number;
  name: string;
  role: string;      // Job Title / Worker Type
  dailyWage: number; // Salary per "Effective Day"
  days: Record<number, DayEntry>; // Key is day number (1-31)
}

export interface Stats {
  totalWhiteShift: number; // Morning + Afternoon
  totalOvertime: number;   // Overtime
}

export interface GlobalSettings {
  standardHoursPerDay: number; // e.g., 9 hours = 1 day
  overtimeHoursPerDay: number; // e.g., 9 hours overtime = 1 day (or could be different)
}

export interface Project {
  id: string;
  name: string;
}

// 新增日志条目类型
export interface LogEntry { 
  id: string; 
  projectId?: string; 
  type: 'add' | 'remove' | 'edit'; 
  message: string; 
  timestamp: string; 
  targetYear?: number; 
  targetMonth?: number; 
}

// 新增归档月份类型
export interface StoredMonth { 
  year: number; 
  month: number; 
  count: number; 
}
