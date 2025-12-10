
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style'; 
import { generateEmptyMonth } from '../constants';
import { Employee, GlobalSettings, Project, LogEntry, StoredMonth } from '../types';
import { supabase } from '../utils/supabaseClient';
import { isAppActivated } from '../utils/activation';
import { TimesheetTableRef, BulkUpdateItem } from '../components/TimesheetTable';

// 常量定义
const GLOBAL_KEY = 'workgrid_global';
const PROJECTS_KEY = 'workgrid_projects';
const INIT_KEY = 'workgrid_initialized';

// 辅助函数
const getMonthKey = (projectId: string, year: number, month: number) => `workgrid_data_${projectId}_${year}_${month}`;
const createLogTimestamp = (viewYear: number, viewMonth: number) => new Date().toISOString();

export const useWorkGridLogic = () => {
  const tableRef = useRef<TimesheetTableRef>(null);
  
  // ================= 1. 状态定义 (State) =================
  // 基础数据
  const [currentDate, setCurrentDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [projects, setProjects] = useState<Project[]>([{ id: 'default', name: '默认工地' }]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  
  // 界面状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [changeLog, setChangeLog] = useState<LogEntry[]>([]); 
  const [quickFillInput, setQuickFillInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storedMonths, setStoredMonths] = useState<StoredMonth[]>([]);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  
  // 云同步与登录状态
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>(undefined);
  const [isActivated, setIsActivated] = useState(false); 

  // 系统配置
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ standardHoursPerDay: 9, overtimeHoursPerDay: 9 });
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'calendar'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // 缓存与未保存状态
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedBuffer, setUnsavedBuffer] = useState<Record<string, Employee[]>>({});
  
  // 提示与导出
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | undefined>(undefined);
  const [exportModalConfig, setExportModalConfig] = useState<{open: boolean, type: 'report'|'payslip'}>({open: false, type: 'report'});

  // 退出与切换确认
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExitSyncModalOpen, setIsExitSyncModalOpen] = useState(false);
  const [isExitUploading, setIsExitUploading] = useState(false);
  const [isProjectSwitchModalOpen, setIsProjectSwitchModalOpen] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  
  // 统计显示
  const [showStats, setShowStats] = useState(() => {
    const saved = localStorage.getItem('workgrid_pref_showstats');
    return saved ? JSON.parse(saved) : false;
  });
  const [deferredEmployees, setDeferredEmployees] = useState<Employee[]>(employees);

  // 🚀 撤回/重做 状态
  const employeesRef = useRef(employees);
  useEffect(() => { employeesRef.current = employees; }, [employees]);
  const [historyPast, setHistoryPast] = useState<Employee[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Employee[][]>([]);

  // ================= 核心逻辑 =================

  // 切换月份
  const switchMonthFunc = (newYear: number, newMonth: number) => {
    if (hasUnsavedChanges) {
      const currentKey = getMonthKey(activeProjectId, currentDate.year, currentDate.month);
      setUnsavedBuffer(prev => ({ ...prev, [currentKey]: employees }));
    }
    setCurrentDate({ year: newYear, month: newMonth });
    setIsMonthPickerOpen(false); 
    setCurrentWeekStart(1);
  };

  const handleDateChange = (year: number, month: number) => { switchMonthFunc(year, month); };
  
  const nextMonth = () => { 
    let m = currentDate.month + 1; 
    let y = currentDate.year; 
    if (m > 12) { m = 1; y++; } 
    switchMonthFunc(y, m); 
  };
  
  const prevMonth = () => { 
    let m = currentDate.month - 1; 
    let y = currentDate.year; 
    if (m < 1) { m = 12; y--; } 
    switchMonthFunc(y, m); 
  };

  // 记录历史
  const recordHistory = useCallback(() => {
    const currentData = employeesRef.current;
    setHistoryPast(prev => [...prev, JSON.parse(JSON.stringify(currentData))].slice(-30));
    setHistoryFuture([]);
  }, []);

  // 保存数据
  const handleSave = useCallback(() => {
    try {
      const currentKey = getMonthKey(activeProjectId, currentDate.year, currentDate.month);
      localStorage.setItem(currentKey, JSON.stringify(employees));
      Object.entries(unsavedBuffer).forEach(([key, data]) => localStorage.setItem(key, JSON.stringify(data)));
      try {
        const globalData = JSON.parse(localStorage.getItem(GLOBAL_KEY) || '{}');
        const newGlobalData = { ...globalData, logs: changeLog, settings: globalSettings }; 
        localStorage.setItem(GLOBAL_KEY, JSON.stringify(newGlobalData));
      } catch (e) { console.error("全局数据保存失败", e); }
      setUnsavedBuffer({});
      setHasUnsavedChanges(false);
      setToastMsg('所有数据(含工时规则)已保存！'); setShowToast(true); setTimeout(() => setShowToast(false), 2000);
    } catch (e) { alert('保存失败，请检查存储空间'); }
  }, [employees, activeProjectId, currentDate, unsavedBuffer, changeLog, globalSettings]);

  // 加载月份数据
  const loadMonthData = useCallback((projectId: string, year: number, month: number) => {
    const key = getMonthKey(projectId, year, month);
    if (unsavedBuffer[key]) {
      setEmployees(unsavedBuffer[key]);
    } else {
      const savedMonth = localStorage.getItem(key);
      if (savedMonth) {
        try { setEmployees(JSON.parse(savedMonth)); } catch (e) { setEmployees([]); }
      } else {
        let prevMonth = month - 1; let prevYear = year;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        const prevData = localStorage.getItem(getMonthKey(projectId, prevYear, prevMonth));
        if (prevData) {
            try {
              const prevEmps: Employee[] = JSON.parse(prevData);
              const newEmps = prevEmps.map(e => ({ ...e, days: generateEmptyMonth() }));
              setEmployees(newEmps);
              localStorage.setItem(key, JSON.stringify(newEmps));
              setToastMsg(`已自动继承上月名单`); setShowToast(true); setTimeout(()=>setShowToast(false),3000);
            } catch (e) { setEmployees([]); }
        } else {
            const init = localStorage.getItem(INIT_KEY);
            if (!init && projectId === 'default') {
               setEmployees([]); 
               localStorage.setItem(INIT_KEY, 'true'); 
               localStorage.setItem(key, JSON.stringify([]));
            } else { setEmployees([]); }
        }
      }
    }
    setSearchQuery(''); 
    setCurrentWeekStart(1);
    setHistoryPast([]); 
    setHistoryFuture([]);
  }, [unsavedBuffer]);

  // 初始化
  useEffect(() => {
    const savedProjects = localStorage.getItem(PROJECTS_KEY);
    if (savedProjects) { try { const p = JSON.parse(savedProjects); if(Array.isArray(p) && p.length>0) { setProjects(p); setActiveProjectId(p[0].id); } } catch(e){} }
    const globalData = localStorage.getItem(GLOBAL_KEY);
    if (globalData) { try { const p = JSON.parse(globalData); if(p.settings) setGlobalSettings(p.settings); if(p.roles) setCustomRoles(p.roles); if(p.logs) setChangeLog(p.logs); } catch(e){} }
  }, []);

  useEffect(() => { if (activeProjectId) loadMonthData(activeProjectId, currentDate.year, currentDate.month); }, [currentDate, activeProjectId, loadMonthData]);

 useEffect(() => {
    let isMounted = true;

    // 1. 定义检查授权的函数
    const checkUserLicense = async (userId: string) => {
      // ... (你原来的 license 逻辑保持不变) ...
    };

    // 2. 🔥【核心修改】启动时的初始化检查
    const initAuth = async () => {
      // 先拿本地缓存 (这一步很快，但不保真)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // 没缓存，肯定是未登录
        if (isMounted) {
          setSession(null);
          setIsActivated(false);
        }
        return;
      }

      // 🛑【新增】拿到缓存了，别急着信！强制联网验身 (getUser)
      const { error: userError } = await supabase.auth.getUser();

      if (userError) {
        // 😱 发现缓存是假的/过期的，或者CORS被拦截了！
        console.warn("❌ 虚假/失效 Session，执行强制清理", userError);
        
        // ⚡️ 马上杀毒
        await supabase.auth.signOut(); // 通知 Supabase 清理
        localStorage.clear();          // 暴力清空本地
        
        if (isMounted) {
          setSession(null);
          setCurrentUserEmail(undefined);
          setIsActivated(false);
        }
      } else {
        // ✅ 只有 getUser 也没报错，才是真的登录了
        if (isMounted) {
          setSession(session);
          if (session.user) {
            setCurrentUserEmail(session.user.email);
            checkUserLicense(session.user.id);
          }
        }
      }
    };

    // 执行初始化
    initAuth();

    // 3. 监听状态变化 (保持你原来的逻辑，加上防错)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
         // 这里也可以加一个 getUser 双保险，但在 init 做过通常就够了
         setCurrentUserEmail(session.user.email);
         checkUserLicense(session.user.id);
         setIsAuthModalOpen(false);
      } else if (event === 'SIGNED_OUT') {
         setCurrentUserEmail(undefined);
         setIsActivated(false);
         // ...
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 延迟更新
  useEffect(() => {
    const timer = setTimeout(() => { setDeferredEmployees(employees); }, 300);
    return () => clearTimeout(timer);
  }, [employees]);

  // 各种业务处理函数
  const handleUpdate = useCallback((empId: number, day: number, field: 'morning' | 'afternoon' | 'overtime', value: string) => {
    recordHistory();
    setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, days: { ...emp.days, [day]: { ...emp.days[day], [field]: value } } } : emp));
    setHasUnsavedChanges(true);
  }, [recordHistory]);

  const handleUndo = useCallback(() => {
    setHistoryPast(prev => {
      if (prev.length === 0) return prev;
      const newPast = [...prev];
      const previousState = newPast.pop();
      setHistoryFuture(f => [JSON.parse(JSON.stringify(employeesRef.current)), ...f]);
      if (previousState) setEmployees(previousState);
      setToastMsg(`已撤回 (${prev.length}步)`); setShowToast(true); setTimeout(() => setShowToast(false), 1500);
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture(prev => {
      if (prev.length === 0) return prev;
      const newFuture = [...prev];
      const nextState = newFuture.shift();
      setHistoryPast(p => [...p, JSON.parse(JSON.stringify(employeesRef.current))]);
      if (nextState) setEmployees(nextState);
      setToastMsg('已重做'); setShowToast(true); setTimeout(() => setShowToast(false), 1500);
      return newFuture;
    });
  }, []);

  // 🟢 新增：添加工人逻辑
  const handleConfirmAddEmployee = useCallback((name: string, role: string, dailyWage: number) => {
    const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
    const newEmployee: Employee = {
      id: newId,
      name,
      role,
      dailyWage,
      days: generateEmptyMonth()
    };
    
    setEmployees(prev => [...prev, newEmployee]);
    setHasUnsavedChanges(true);
    setToastMsg(`已添加工人: ${name}`); 
    setShowToast(true); 
    setTimeout(() => setShowToast(false), 2000);
    setIsAddEmployeeModalOpen(false);
    
    // 更新自定义工种
    if (role && !customRoles.includes(role)) {
        setCustomRoles(prev => [...prev, role]);
    }
  }, [employees, customRoles]);

  // 🟢 新增：删除工人逻辑
  const handleDeleteEmployee = useCallback((id: number) => {
      setEmployees(prev => prev.filter(e => e.id !== id));
      setHasUnsavedChanges(true);
      setToastMsg('已删除工人'); setShowToast(true); setTimeout(() => setShowToast(false), 2000);
  }, []);

  // 🟢 新增：计算可用工种
  const availableRoles = useMemo(() => {
    const empRoles = new Set(employees.map(e => e.role));
    const combined = new Set([...empRoles, ...customRoles]);
    return Array.from(combined).filter(r => r && r.trim() !== '').sort();
  }, [employees, customRoles]);

  // 数据导出
  const handleExport = useCallback(() => {
    try {
      const data: any = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        projects, activeProjectId, globalSettings, changeLog, customRoles,
        months: {} 
      };
      const prefix = 'workgrid_data_';
      for(let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if(key && key.startsWith(prefix)) {
           try { data.months[key] = JSON.parse(localStorage.getItem(key)||'[]'); } catch(e){}
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkGrid_Backup_${projects.find(p=>p.id===activeProjectId)?.name}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMsg('全量备份已导出'); setShowToast(true); setTimeout(()=>setShowToast(false),2000);
    } catch (e) { alert("导出失败"); }
  }, [projects, activeProjectId, globalSettings, changeLog, customRoles]);

  // 更多函数...
  const handleAddProject = useCallback((n: string) => {
    const np: Project = { id: Date.now().toString(), name: n };
    const up = [...projects, np]; setProjects(up); localStorage.setItem(PROJECTS_KEY, JSON.stringify(up));
    setActiveProjectId(np.id); setToastMsg(`已创建: ${n}`); setShowToast(true); setTimeout(()=>setShowToast(false),3000);
  }, [projects]);
  
const handleOpenCloudSync = useCallback(() => {
    // 🔥 核心逻辑修正：
    // 如果没有 session (没登录)，千万别打开同步窗口，直接打开登录窗口 (AuthModal)
    if (!session) {
      setToastMsg("请先登录账号");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setIsAuthModalOpen(true); // 👈 导向正确的登录门
    } else {
      // 只有登录了，才允许开同步窗口
      setIsCloudModalOpen(true);
    }
  }, [session]); // 👈 别忘了这里要监听 session 变化
  const handleRequestSwitchProject = useCallback((id: string) => {
    if (hasUnsavedChanges) {
      setPendingProjectId(id);
      setIsProjectSwitchModalOpen(true);
    } else {
      setActiveProjectId(id);
    }
  }, [hasUnsavedChanges]);

  // 返回所有逻辑和状态
  return {
    tableRef,
    currentDate, setCurrentDate, handleDateChange, nextMonth, prevMonth,
    projects, setProjects, activeProjectId, setActiveProjectId,
    employees, setEmployees, deferredEmployees, setDeferredEmployees, 
    searchQuery, setSearchQuery,
    isMonthPickerOpen, setIsMonthPickerOpen,
    changeLog, setChangeLog,
    quickFillInput, setQuickFillInput,
    isSettingsOpen, setIsSettingsOpen,
    storedMonths, setStoredMonths,
    isAddEmployeeModalOpen, setIsAddEmployeeModalOpen,
    editingEmployee, setEditingEmployee,
    isProjectMenuOpen, setIsProjectMenuOpen,
    isCloudModalOpen, setIsCloudModalOpen,
    isAuthModalOpen, setIsAuthModalOpen,
    isActivationModalOpen, setIsActivationModalOpen,
    session, currentUserEmail, isActivated, setIsActivated, 
    globalSettings, setGlobalSettings,
    viewMode, setViewMode,
    currentWeekStart, setCurrentWeekStart,
    isOnline,
    hasUnsavedChanges, setHasUnsavedChanges,
    toastMsg, setToastMsg, showToast, setShowToast, toastUndoAction, setToastUndoAction,
    exportModalConfig, setExportModalConfig,
    isExitModalOpen, setIsExitModalOpen,
    isExitSyncModalOpen, setIsExitSyncModalOpen,
    isExitUploading, setIsExitUploading,
    isProjectSwitchModalOpen, setIsProjectSwitchModalOpen,
    pendingProjectId, setPendingProjectId,
    projectToDelete, setProjectToDelete,
    deletedProjects, setDeletedProjects,
    showStats, setShowStats,
    handleSave, handleUpdate, handleUndo, handleRedo, handleExport, handleAddProject,
    customRoles, setCustomRoles,
    loadMonthData, recordHistory,
    unsavedBuffer, setUnsavedBuffer,
    handleOpenCloudSync, handleRequestSwitchProject,
    handleConfirmAddEmployee, handleDeleteEmployee, availableRoles // 🟢 导出新增的函数和变量
  };
};
