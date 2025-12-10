import React, { useState, useEffect, useMemo, memo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { LogService, TeamConfig } from './LogService';
import { ConstructionLogEntry } from './types';
import { Project, Employee, GlobalSettings } from '../../types';
import { CalendarView } from '../../components/CalendarView'; 

// ==========================================
// 🚀 懒更新组件
// ==========================================
const LazyInput = memo(({ value, onChange, ...props }: any) => {
  const [localVal, setLocalVal] = useState(value || '');
  useEffect(() => setLocalVal(value || ''), [value]);
  return <input {...props} value={localVal} onChange={e => setLocalVal(e.target.value)} onBlur={() => onChange(localVal)} />;
});

const LazyTextarea = memo(({ value, onChange, ...props }: any) => {
  const [localVal, setLocalVal] = useState(value || '');
  useEffect(() => setLocalVal(value || ''), [value]);
  return <textarea {...props} value={localVal} onChange={e => setLocalVal(e.target.value)} onBlur={() => onChange(localVal)} />;
});
// 🟢 [新增] 导出日期范围选择弹窗
const ExportRangeModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (start: string, end: string) => void }) => {
    const now = new Date();
    // 默认本月1号到今天
    const [start, setStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [end, setEnd] = useState(now.toISOString().slice(0, 10));

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#1E293B' }}>📅 选择导出时间段</h3>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display:'block', fontSize:'12px', color:'#64748B', marginBottom:'4px' }}>开始日期</label>
                    <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display:'block', fontSize:'12px', color:'#64748B', marginBottom:'4px' }}>结束日期</label>
                    <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '8px', border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', color: '#64748B' }}>取消</button>
                    <button onClick={() => onConfirm(start, end)} style={{ flex: 1, padding: '8px', background: '#10B981', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 'bold' }}>确认导出</button>
                </div>
            </div>
        </div>
    );
};
export const ConstructionLogWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  // 🟢 [新增] 多选状态
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
 const [showExportModal, setShowExportModal] = useState(false); // 🟢 新增
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [logs, setLogs] = useState<ConstructionLogEntry[]>([]);

  // 🟢 [新增] 切换项目或日志数量变化时，重置选择
  useEffect(() => {
    setSelectedLogIds(new Set());
  }, [activeProjectId, logs.length]);
  // 数据状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [formData, setFormData] = useState<Partial<ConstructionLogEntry>>({});
  const [teamConfig, setTeamConfig] = useState<TeamConfig>({ teams: [], allocations: {} });
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]); 
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ standardHoursPerDay: 9, overtimeHoursPerDay: 9 });
  
  // UI 状态
  const [isEditing, setIsEditing] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false); 
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [tempAllocations, setTempAllocations] = useState<Record<string, string>>({}); 
  
  const [newTeamName, setNewTeamName] = useState('');
  const [transferWorker, setTransferWorker] = useState('');
  const [transferTargetTeam, setTransferTargetTeam] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 监听打开指令
  useEffect(() => {
    const handleOpenRequest = (e: any) => {
      const { projectId, dateStr } = e.detail || {};
      
      let targetProjectId = projectId;
      if (!targetProjectId) {
         try {
            const raw = localStorage.getItem('workgrid_projects');
            if(raw) {
                const ps = JSON.parse(raw);
                const headerTitle = document.querySelector('header span.truncate')?.textContent?.trim();
                const matched = ps.find((p:any) => p.name === headerTitle);
                targetProjectId = matched ? matched.id : ps[0]?.id;
            }
         } catch(e) {}
      }

      if (targetProjectId) setActiveProjectId(targetProjectId);
      if (dateStr) setCurrentDate(dateStr);
      
      setIsOpen(true);
      setTempAllocations({});
      
      if (targetProjectId) {
          refreshData(targetProjectId);
          if (dateStr) {
             const currentLogs = LogService.getLogs(targetProjectId);
             const log = currentLogs.find(l => l.date === dateStr);
             if (log) {
                 setFormData(log);
                 setIsEditing(false);
             } else {
                 setFormData({});
                 setIsEditing(true);
             }
          } else {
             setIsEditing(false);
          }
      }
    };
    window.addEventListener('WORKGRID_OPEN_LOG', handleOpenRequest);
    return () => window.removeEventListener('WORKGRID_OPEN_LOG', handleOpenRequest);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshData = (pid: string) => {
      setLogs(LogService.getLogs(pid));
      setTeamConfig(LogService.getTeamConfig(pid));
      setGlobalSettings(LogService.getGlobalSettings());
      const projs = LogService.getProjects();
      setProjects(projs);
  };

  useEffect(() => {
    if (activeProjectId) {
      refreshData(activeProjectId);
      const [y, m] = currentDate.split('-').map(Number);
      const emps = LogService.getEmployees(activeProjectId, y, m);
      setAllEmployees(emps);
    }
  }, [activeProjectId, currentDate, showTeamManager, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const targetLog = logs.find(l => l.date === currentDate);
    if (targetLog) {
       if (!isEditing) setFormData(targetLog);
    } else {
       if (!isEditing) setFormData({});
    }
  }, [currentDate, logs, isOpen]);

  const generateSummary = (projectId: string, dateStr: string, currentConfig: TeamConfig, tempOverrides: Record<string, string> = {}) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const employees = LogService.getEmployees(projectId, y, m);
      const activeWorkers = employees.filter(e => {
        if (!e || !e.days) return false;
        const dayData = e.days[d];
        return dayData && (Number(dayData.morning) > 0 || Number(dayData.afternoon) > 0 || Number(dayData.overtime) > 0);
      });

      if (activeWorkers.length === 0) return '本日无考勤记录或未录入。';

      const groups: Record<string, string[]> = {};
      const unassigned: string[] = [];

      activeWorkers.forEach(w => {
        let teamName = tempOverrides[w.name]; 
        if (teamName === undefined) teamName = currentConfig.allocations[w.name];
        if (teamName && teamName !== '未分组' && currentConfig.teams.includes(teamName)) {
          if (!groups[teamName]) groups[teamName] = [];
          groups[teamName].push(w.name);
        } else {
          unassigned.push(w.name);
        }
      });

      let text = `本日实勤 ${activeWorkers.length} 人。`;
      currentConfig.teams.forEach(team => {
        if (groups[team] && groups[team].length > 0) text += `\n【${team}】${groups[team].join('、')}；`;
      });
      if (unassigned.length > 0) text += `\n【未分组】${unassigned.join('、')}`;
      return text;
    } catch (e) { return '读取考勤数据失败'; }
  };

  const getTodayActiveWorkers = () => {
      const [y, m, d] = currentDate.split('-').map(Number);
      return allEmployees.filter(e => {
        const dayData = e.days[d];
        return dayData && (Number(dayData.morning) > 0 || Number(dayData.afternoon) > 0 || Number(dayData.overtime) > 0);
      });
  };

  const handleRefreshSummary = () => {
    const summary = generateSummary(activeProjectId, currentDate, teamConfig, tempAllocations);
    setFormData(prev => ({ ...prev, workersSummary: summary }));
  };

  const handleCreateNew = () => {
    const summary = generateSummary(activeProjectId, currentDate, teamConfig, tempAllocations);
    const newLog: ConstructionLogEntry = {
      id: Date.now().toString(),
      projectId: activeProjectId,
      date: currentDate,
      weather: '晴',
      temperature: '',
      content: '',
      safetyNotes: '现场作业安全，无事故。',
      materialNotes: '',
      workersSummary: summary,
      updatedAt: new Date().toISOString()
    };
    setFormData(newLog);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.content) return alert("请填写施工内容");
    LogService.saveLog(activeProjectId, formData as ConstructionLogEntry);
    setLogs(LogService.getLogs(activeProjectId));
    setIsEditing(false);
    alert("保存成功");
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此日志？')) return;
    LogService.deleteLog(activeProjectId, id);
    setLogs(LogService.getLogs(activeProjectId));
    setFormData({});
    setIsEditing(false);
  };

  const handleInsertText = (text: string) => {
    setFormData(prev => {
      const oldContent = prev.content || '';
      const prefix = oldContent.length > 0 && !oldContent.endsWith('\n') ? ' ' : '';
      return { ...prev, content: oldContent + prefix + text };
    });
  };

  const confirmTransfer = () => {
      if (!transferWorker) return alert("请选择人员");
      const newTemps = { ...tempAllocations, [transferWorker]: transferTargetTeam || '未分组' };
      setTempAllocations(newTemps);
      const newSummary = generateSummary(activeProjectId, currentDate, teamConfig, newTemps);
      setFormData(prev => ({ ...prev, workersSummary: newSummary }));
      setShowTransferModal(false);
  };
// 🟢 [新增] 单个勾选
  const toggleSelectLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发点击切换日期
    const newSet = new Set(selectedLogIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLogIds(newSet);
  };

  // 🟢 [新增] 全选/反选
  const toggleSelectAll = () => {
    if (selectedLogIds.size === logs.length && logs.length > 0) {
      setSelectedLogIds(new Set()); // 全不选
    } else {
      const allIds = new Set(logs.map(l => l.id));
      setSelectedLogIds(allIds);
    }
  };
// 1. 🟢 执行导出 (核心逻辑)
  const executeExport = (targetLogs: ConstructionLogEntry[]) => {
      if (targetLogs.length === 0) return alert("没有可导出的日志");

      const header = ["日期", "天气", "温度", "施工内容", "人员出勤", "安全记录", "材料进场"];
      const data = targetLogs
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(l => [l.date, l.weather, l.temperature, l.content, l.workersSummary, l.safetyNotes, l.materialNotes]);
      
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
      
      const range = XLSX.utils.decode_range(ws['!ref']!);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center" } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工日志");
      
      const projectName = projects.find(p => p.id === activeProjectId)?.name || "项目";
      const countStr = selectedLogIds.size > 0 ? `(${selectedLogIds.size}篇)` : `(${targetLogs.length}篇)`;
      
      XLSX.writeFile(wb, `${projectName}_施工日志_${countStr}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // 2. 🟢 导出按钮点击处理
  const handleExportClick = () => {
    if (logs.length === 0) return alert("暂无日志可导出");

    // 策略：如果有勾选，直接导出勾选的；否则打开时间范围弹窗
    if (selectedLogIds.size > 0) {
        const targetLogs = logs.filter(l => selectedLogIds.has(l.id));
        executeExport(targetLogs);
    } else {
        setShowExportModal(true); // 打开弹窗
    }
  };

  // 3. 🟢 确认范围导出
  const handleRangeExportConfirm = (start: string, end: string) => {
      if (start > end) return alert("开始日期不能晚于结束日期");
      const targetLogs = logs.filter(l => l.date >= start && l.date <= end);
      if (targetLogs.length === 0) return alert("该时间段内没有日志");
      
      executeExport(targetLogs);
      setShowExportModal(false);
  };

  const handleAddTeam = () => { if (!newTeamName.trim() || teamConfig.teams.includes(newTeamName)) return; const newConfig = { ...teamConfig, teams: [...teamConfig.teams, newTeamName] }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); setNewTeamName(''); };
  const handleDeleteTeam = (team: string) => { if (!confirm(`确定删除 ${team} 吗？`)) return; const newTeams = teamConfig.teams.filter(t => t !== team); const newAllocations = { ...teamConfig.allocations }; Object.keys(newAllocations).forEach(key => { if (newAllocations[key] === team) delete newAllocations[key]; }); const newConfig = { teams: newTeams, allocations: newAllocations }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); };
  const handleAssignWorker = (workerName: string, teamName: string) => { const newAllocations = { ...teamConfig.allocations, [workerName]: teamName }; if (!teamName) delete newAllocations[workerName]; const newConfig = { ...teamConfig, allocations: newAllocations }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); };

  // 左侧日历月份选择处理
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [y, m] = e.target.value.split('-');
      // 切换日历月份时，把日期重置为该月1号，以便刷新日历
      setCurrentDate(`${y}-${m}-01`);
  };

  if (!isOpen) return null; 

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'white', display: 'flex', flexDirection: 'row', pointerEvents: 'auto' }}>
      
      {/* 
         🟢 魔法 CSS：精细控制日历显示 (40%宽度适配)
      */}
      <style>{`
        /* 格子整体布局 */
        #mini-calendar-wrapper .min-h-\\[140px\\] {
            min-height: 75px !important; /* 高度 */
            height: auto !important;
            padding: 2px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            overflow: hidden !important;
        }
        
        /* 强制显示内容容器 */
        #mini-calendar-wrapper .space-y-1,
        #mini-calendar-wrapper .flex.flex-col.gap-1\\.5 {
            display: flex !important;
            flex-direction: column !important;
            gap: 1px !important;
            width: 100% !important;
            margin-top: 2px !important;
        }

        /* 🟢 修复：确保人数少时(列表模式)也显示 */
        #mini-calendar-wrapper .space-y-1 > div {
            padding: 0 4px !important;
            margin: 0 !important;
            border-radius: 2px !important;
            height: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border: none !important;
            background-color: #F8FAFC !important;
        }
        #mini-calendar-wrapper .space-y-1 > div span:first-child {
            font-size: 9px !important;
            color: #64748B !important;
            width: 40px !important; 
            overflow: hidden !important;
            white-space: nowrap !important;
        }
        #mini-calendar-wrapper .space-y-1 > div span:last-child {
            font-size: 9px !important;
            font-weight: bold !important;
            color: #334155 !important;
        }

        /* 🟢 修复：确保人数多时(汇总模式)也显示 */
        #mini-calendar-wrapper .flex-1.flex.flex-col.gap-1 {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
        }

        #mini-calendar-wrapper .bg-blue-50,
        #mini-calendar-wrapper .bg-amber-50 {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-radius: 3px !important;
            width: 100% !important;
            height: 18px !important; 
            padding: 0 4px !important;
            margin: 0 !important;
        }
/* ==================== 顶部统计卡片瘦身 (精准修改这里) ==================== */
        
        /* 1. 隐藏背景那个淡淡的大图标 (太占地，显得乱) */
        #mini-calendar-wrapper .absolute.right-0 {
            display: none !important;
        }

        /* 2. 缩小卡片之间的间距 */
        #mini-calendar-wrapper .grid.gap-4 {
            gap: 8px !important;
            margin-bottom: 12px !important;
        }

        /* 3. 缩小卡片内部的留白 (Padding) */
        #mini-calendar-wrapper .p-4 {
            padding: 8px 10px !important;
        }

        /* 4. 缩小数字字体 (46.5, 418.5 等) */
        #mini-calendar-wrapper .text-2xl {
            font-size: 18px !important; /* 原来是 24px */
            line-height: 1.2 !important;
            margin-bottom: 0 !important;
        }

        /* 5. 缩小标题字体 (本月总有效工天等) */
        #mini-calendar-wrapper .text-sm.font-medium {
            font-size: 11px !important;
            margin-bottom: 2px !important;
            white-space: nowrap !important; /* 防止换行 */
        }

        /* 6. 隐藏 "基于全局规则" 这种废话小标签 */
        #mini-calendar-wrapper .mt-2.text-xs {
            display: none !important;
        }

        /* 7. 压扁进度条 */
        #mini-calendar-wrapper .h-1\\.5 {
            height: 4px !important;
            margin-top: 4px !important;
        }
        /* 正常工时 (蓝) */
        #mini-calendar-wrapper .bg-blue-50 {
            background-color: #EFF6FF !important;
            border: 1px solid #DBEAFE !important;
        }
        #mini-calendar-wrapper .bg-blue-50 span:first-child { font-size: 9px !important; color: #60A5FA !important; }
        #mini-calendar-wrapper .bg-blue-50 span:last-child { font-size: 10px !important; font-weight: 800 !important; color: #2563EB !important; }

        /* 加班工时 (黄) */
        #mini-calendar-wrapper .bg-amber-50 {
            background-color: #FFFBEB !important;
            border: 1px solid #FEF3C7 !important;
        }
        #mini-calendar-wrapper .bg-amber-50 span:first-child { font-size: 9px !important; color: #D97706 !important; }
        #mini-calendar-wrapper .bg-amber-50 span:last-child { font-size: 10px !important; font-weight: 800 !important; color: #B45309 !important; }
        
        /* 隐藏圆点图标 */
        #mini-calendar-wrapper .bg-amber-50 span:first-child span { display: none !important; }

        /* 通用隐藏 */
        #mini-calendar-wrapper .h-1\\.5 { display: none !important; }
        #mini-calendar-wrapper .bg-slate-100.rounded-full { display: none !important; }
        
        /* 日期数字 */
        #mini-calendar-wrapper .text-2xl {
            font-size: 13px !important;
            margin-bottom: 2px !important;
            font-weight: bold !important;
            color: #64748B !important;
            margin-left: 2px !important;
        }
        /* 头部星期几 */
        #mini-calendar-wrapper .py-3 {
            padding: 6px 0 !important;
            font-size: 12px !important;
        }
      `}</style>

      {/* 
        🔴 左侧侧边栏 (宽度占比 40%) 
      */}
      <div style={{ width: '40%', height: '100vh', backgroundColor: 'white', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        
{/* 1. 顶部导航栏 (固定高度) */}
        <div style={{ height: '64px', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', justifyContent: 'space-between', flexShrink: 0 }}>
           {/* 🟢 恢复返回按钮 */}
           <button onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> 返回
           </button>
           
           <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
               <select style={{ padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', minWidth:'140px' }} value={activeProjectId} onChange={e => setActiveProjectId(e.target.value)}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <input type="month" style={{ padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} value={currentDate.slice(0, 7)} onChange={handleMonthChange} />
           </div>
        </div>
        
        {/* 2. 中间：考勤日历 (高度占比 60%) */}
        <div style={{ height: '60%', padding: '20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
             <div id="mini-calendar-wrapper" style={{ height: '100%', backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', overflowY: 'auto' }} className="custom-scrollbar">
                 <CalendarView 
                    employees={allEmployees}
                    currentMonth={parseInt(currentDate.split('-')[1])}
                    currentYear={parseInt(currentDate.split('-')[0])}
                    globalSettings={globalSettings}
                 />
             </div>
        </div>

        {/* 3. 底部：剩余空间 (操作区) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: 'white', overflowY: 'auto' }} className="custom-scrollbar">
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
               <button onClick={handleExportClick} style={{ padding: '12px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition:'all 0.2s' }}>
                  📂 导出 Excel
               </button>
               <button onClick={() => setShowTeamManager(true)} style={{ padding: '12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition:'all 0.2s' }}>
                  ⚙️ 班组管理
               </button>
           </div>

{/* 近期日志列表 (带勾选) */}
           <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', paddingRight:'6px' }}>
                   <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold' }}>近期日志 ({logs.length})</span>
                   {/* 🟢 全选按钮 */}
                   <label style={{ fontSize: '11px', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <input type="checkbox" checked={logs.length > 0 && selectedLogIds.size === logs.length} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                       全选
                   </label>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight:'4px' }} className="custom-scrollbar">
                  {logs.length === 0 && <div style={{textAlign:'center', color:'#CBD5E1', fontSize:'12px', padding:'20px'}}>本月暂无日志</div>}
                  {logs.slice(0, 50).map(log => (
                    <div 
                      key={log.id}
                      onClick={() => setCurrentDate(log.date)}
                      style={{ 
                        flexShrink: 0, 
                        padding: '8px 10px', 
                        backgroundColor: log.date === currentDate ? '#EFF6FF' : '#F8FAFC', 
                        border: '1px solid',
                        borderColor: log.date === currentDate ? '#3B82F6' : '#E2E8F0',
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                       {/* 🟢 单个勾选框 */}
                       <input 
                         type="checkbox" 
                         checked={selectedLogIds.has(log.id)}
                         onClick={(e) => toggleSelectLog(log.id, e)}
                         style={{ cursor: 'pointer', width:'14px', height:'14px' }}
                       />
                       <div style={{ flex: 1, overflow: 'hidden' }}>
                           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                               <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{log.date.slice(5)}</span>
                               <span style={{ fontSize: '10px', color: '#94A3B8' }}>{log.weather}</span>
                           </div>
                           <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.content}</div>
                       </div>
                    </div>
                  ))}
               </div>
           </div>
        </div>
      </div>

      {/* --- 右侧：内容编辑区 (60% 自适应) --- */}
      <div className="custom-scrollbar" style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '40px', backgroundColor: '#F8FAFC' }}>
         <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            
{/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              
              {/* 🟢 修改这里：控制左边的标题和日期 */}
              <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',         // 标题和日期之间的间距 (调小了)
                  marginLeft: '40px'   // 👈 【核心】控制往右挪多少像素，数字越大越靠右
              }}>
                  <h1 style={{ 
                      fontSize: '28px',    // 👈 【核心】标题字体大小 (原32px -> 20px)
                      fontWeight: 'bold', 
                      color: '#1E293B', 
                      letterSpacing: '-0.5px' 
                  }}>
                      施工日志
                  </h1>
                  
              <input 
                    type="date" 
                    // 🟢 核心修改：编辑模式下禁用 (锁死)
                    disabled={isEditing} 
                    style={{ 
                        fontSize: '14px', 
                        padding: '4px 10px', 
                        border: '1px solid #CBD5E1', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        color: '#334155', 
                        // 🟢 视觉反馈：编辑时变灰，鼠标变禁止符号
                        backgroundColor: isEditing ? '#F1F5F9' : 'white',
                        cursor: isEditing ? 'not-allowed' : 'pointer',
                        opacity: isEditing ? 0.7 : 1
                    }} 
                    value={currentDate} 
                    onChange={e => setCurrentDate(e.target.value)} 
                  />
              </div>

              {/* 右边的按钮保持不变 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {!isEditing ? (
                  <>
                     <button onClick={() => handleDelete(formData.id!)} style={{ padding: '8px 20px', color: '#EF4444', background: 'white', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} disabled={!formData.id}>删除</button>
                     <button onClick={() => { if(formData.id) setIsEditing(true); else handleCreateNew(); }} style={{ padding: '8px 28px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>{formData.id ? '编辑日志' : '新建日志'}</button>
                  </>
                ) : (
                  <>
                     <button onClick={() => setIsEditing(false)} style={{ padding: '8px 20px', color: '#64748B', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>取消</button>
                     <button onClick={handleSave} style={{ padding: '8px 28px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)' }}>保存</button>
                  </>
                )}
              </div>
            </div>

            {/* 编辑卡片 */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
               
               {/* 基本信息 */}
               <div style={{ display: 'flex', gap: '40px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px dashed #E2E8F0' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94A3B8', marginBottom: '8px', fontWeight: 'bold' }}>天气情况</label>
                    {isEditing ? (
                      <select style={{ width: '100%', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '15px', backgroundColor: '#F8FAFC' }} value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})}>
                        <option>晴</option><option>阴</option><option>多云</option><option>小雨</option><option>大雨</option><option>雪</option>
                      </select>
                    ) : ( <div style={{ fontSize: '18px', fontWeight: '500', color: '#1E293B' }}>{formData.weather || '-'}</div> )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94A3B8', marginBottom: '8px', fontWeight: 'bold' }}>现场温度</label>
                    {isEditing ? (
                      <LazyInput style={{ width: '100%', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '15px', backgroundColor: '#F8FAFC' }} value={formData.temperature} onChange={(val:string) => setFormData({...formData, temperature: val})} placeholder="如 25℃" />
                    ) : ( <div style={{ fontSize: '18px', fontWeight: '500', color: '#1E293B' }}>{formData.temperature || '-'}</div> )}
                  </div>
               </div>

               {/* 人员出勤 */}
               <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{width:'4px', height:'16px', background:'#3B82F6', borderRadius:'2px'}}></span>
                        人员出勤情况
                    </label>
                    {isEditing && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowTransferModal(true)} style={{ fontSize: '12px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>⚡️ 临时调动</button>
                        <button onClick={handleRefreshSummary} style={{ fontSize: '12px', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>🔄 刷新数据</button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <LazyTextarea rows={4} style={{ width: '100%', padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', backgroundColor: '#F8FAFC', lineHeight: '1.8', fontSize: '15px', color: '#334155' }} value={formData.workersSummary} onChange={(val:string) => setFormData({...formData, workersSummary: val})} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#475569', fontSize: '15px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>{formData.workersSummary || '暂无数据'}</div>
                  )}
               </div>

               {/* 施工内容 */}
               <div style={{ marginBottom: '32px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#4F46E5', display: 'flex', alignItems:'center', gap:'6px', marginBottom: '12px' }}>
                      <span style={{width:'4px', height:'16px', background:'#4F46E5', borderRadius:'2px'}}></span>
                      施工内容记录
                  </label>
                  
                  {isEditing && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', paddingLeft: '10px' }}>
                         <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>快速插入:</span>
                         {teamConfig.teams.map(t => (
                           <button key={t} onClick={() => handleInsertText(`【${t}】`)} style={{ fontSize: '12px', padding: '4px 10px', background: 'white', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '20px', cursor: 'pointer', transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#EEF2FF'} onMouseLeave={e=>e.currentTarget.style.background='white'}>{t}</button>
                         ))}
                         <select style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '20px', background: 'white', cursor: 'pointer' }} onChange={(e) => { if(e.target.value) { handleInsertText(e.target.value); e.target.value=""; } }}>
                            <option value="">👤 选择工人...</option>
                            {getTodayActiveWorkers().map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                         </select>
                      </div>
                  )}

                  {isEditing ? (
                    <LazyTextarea rows={12} style={{ width: '100%', padding: '20px', border: '2px solid #E0E7FF', borderRadius: '12px', fontSize: '16px', lineHeight: '1.8', outline: 'none', minHeight: '300px', color: '#1E293B' }} placeholder="在此记录今日施工进度、部位、存在问题..." value={formData.content} onChange={(val:string) => setFormData({...formData, content: val})} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#1E293B', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', minHeight: '200px', fontSize: '16px', border: '1px solid #F1F5F9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>{formData.content || '未填写内容'}</div>
                  )}
               </div>

               {/* 底部记录 */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', display:'flex', alignItems:'center', gap:'6px', marginBottom: '12px' }}>
                        <span style={{width:'4px', height:'16px', background:'#EF4444', borderRadius:'2px'}}></span>
                        安全记录
                    </label>
                    {isEditing ? <LazyTextarea rows={3} style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', backgroundColor: '#F8FAFC' }} value={formData.safetyNotes} onChange={(val:string) => setFormData({...formData, safetyNotes: val})} /> : <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#334155', border: '1px solid #F1F5F9', minHeight:'80px' }}>{formData.safetyNotes || '-'}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', display:'flex', alignItems:'center', gap:'6px', marginBottom: '12px' }}>
                        <span style={{width:'4px', height:'16px', background:'#10B981', borderRadius:'2px'}}></span>
                        材料进场
                    </label>
                    {isEditing ? <LazyTextarea rows={3} style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', backgroundColor: '#F8FAFC' }} value={formData.materialNotes} onChange={(val:string) => setFormData({...formData, materialNotes: val})} /> : <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#334155', border: '1px solid #F1F5F9', minHeight:'80px' }}>{formData.materialNotes || '-'}</div>}
                  </div>
               </div>
              
            </div>
         </div>
      </div>

      {/* 模态框省略，复用之前的 */}
      {showTeamManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ width: '500px', backgroundColor: 'white', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>班组管理</h3>
                 <button onClick={() => setShowTeamManager(false)}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input type="text" style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} placeholder="新班组名" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                <button onClick={handleAddTeam} style={{ padding: '8px 16px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px' }}>添加</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {teamConfig.teams.map(t => <span key={t} onClick={() => handleDeleteTeam(t)} style={{ padding: '4px 10px', background: '#EFF6FF', color: '#2563EB', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>{t} ×</span>)}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {allEmployees.map(emp => (
                   <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #F1F5F9' }}>
                      <span>{emp.name}</span>
                      <select style={{ border: '1px solid #E2E8F0', borderRadius: '4px' }} value={teamConfig.allocations[emp.name] || ''} onChange={e => handleAssignWorker(emp.name, e.target.value)}>
                         <option value="">未分配</option>
                         {teamConfig.teams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                ))}
              </div>
           </div>
        </div>
      )}
      
      {showTransferModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ width: '400px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>临时调动</h3>
              <select style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} value={transferWorker} onChange={e => setTransferWorker(e.target.value)}>
                 <option value="">选择今日出勤人员...</option>
                 {getTodayActiveWorkers().map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
              </select>
              <select style={{ padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px' }} value={transferTargetTeam} onChange={e => setTransferTargetTeam(e.target.value)}>
                 <option value="">选择目标班组...</option>
                 {teamConfig.teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '10px' }}>
                 <button onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white' }}>取消</button>
                 <button onClick={confirmTransfer} style={{ flex: 1, padding: '10px', background: '#3B82F6', color: 'white', borderRadius: '6px', border: 'none' }}>确认</button>
              </div>
           </div>
        </div>
      )}
   <ExportRangeModal 
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
  onConfirm={handleRangeExportConfirm}
/>
    </div>
  );
};