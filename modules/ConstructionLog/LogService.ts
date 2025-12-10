import { Employee, Project, GlobalSettings } from '../../types'; 

const STORAGE_PREFIX = 'workgrid_construction_logs_';
const DATA_PREFIX = 'workgrid_data_';
const PROJ_KEY = 'workgrid_projects';
const TEAM_CONFIG_PREFIX = 'workgrid_log_team_config_';
const GLOBAL_KEY = 'workgrid_global'; // 🟢 新增：全局配置 Key

// 定义班组配置结构
export interface TeamConfig {
  teams: string[]; 
  allocations: Record<string, string>; 
}

export const LogService = {
  // 1. 获取所有工地列表
  getProjects: (): Project[] => {
    try {
      const raw = localStorage.getItem(PROJ_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  // 2. 获取指定工地的员工考勤
  getEmployees: (projectId: string, year: number, month: number): Employee[] => {
    try {
      const key = `${DATA_PREFIX}${projectId}_${year}_${month}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  // 3. 获取日志列表
  getLogs: (projectId: string): any[] => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  // 4. 保存日志
  saveLog: (projectId: string, log: any) => {
    const logs = LogService.getLogs(projectId);
    const index = logs.findIndex((l: any) => l.id === log.id);
    let newLogs;
    if (index >= 0) {
      newLogs = [...logs];
      newLogs[index] = log;
    } else {
      newLogs = [log, ...logs];
    }
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(newLogs));
  },

  // 5. 删除日志
  deleteLog: (projectId: string, logId: string) => {
    const logs = LogService.getLogs(projectId);
    const newLogs = logs.filter((l: any) => l.id !== logId);
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(newLogs));
  },

  // 6. 获取班组配置
  getTeamConfig: (projectId: string): TeamConfig => {
    try {
      const raw = localStorage.getItem(`${TEAM_CONFIG_PREFIX}${projectId}`);
      return raw ? JSON.parse(raw) : { teams: [], allocations: {} };
    } catch { 
      return { teams: [], allocations: {} }; 
    }
  },

  // 7. 保存班组配置
  saveTeamConfig: (projectId: string, config: TeamConfig) => {
    localStorage.setItem(`${TEAM_CONFIG_PREFIX}${projectId}`, JSON.stringify(config));
  },

  // 🟢 8. [新增] 获取全局工时配置 (用于渲染日历)
  getGlobalSettings: (): GlobalSettings => {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return data.settings || { standardHoursPerDay: 9, overtimeHoursPerDay: 9 };
      }
    } catch (e) {}
    return { standardHoursPerDay: 9, overtimeHoursPerDay: 9 };
  }
};