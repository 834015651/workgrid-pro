import React, { useState, useEffect, useMemo, memo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { LogService, TeamConfig } from './LogService';
import { ConstructionLogEntry } from './types';
import { Project, Employee } from '../../types';

// 复用之前的懒加载组件
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

interface ConstructionLogPageProps {
  activeProjectId: string;
  onBack: () => void; // 返回主页面的回调
}

export const ConstructionLogPage: React.FC<ConstructionLogPageProps> = ({ activeProjectId, onBack }) => {
  // 状态管理
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState<ConstructionLogEntry[]>([]);
  const [formData, setFormData] = useState<Partial<ConstructionLogEntry>>({});
  const [teamConfig, setTeamConfig] = useState<TeamConfig>({ teams: [], allocations: {} });
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  // 界面状态
  const [isEditing, setIsEditing] = useState(false); // 是否处于编辑模式
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null); // 当前选中的日志
  const [showTeamManager, setShowTeamManager] = useState(false); // 班组管理模态框
  const [tempAllocations, setTempAllocations] = useState<Record<string, string>>({}); // 临时调动
  const [showTransferModal, setShowTransferModal] = useState(false);

  // 临时状态
  const [newTeamName, setNewTeamName] = useState('');
  const [transferWorker, setTransferWorker] = useState('');
  const [transferTargetTeam, setTransferTargetTeam] = useState('');

  // 加载数据
  useEffect(() => {
    if (activeProjectId) {
      setLogs(LogService.getLogs(activeProjectId));
      setTeamConfig(LogService.getTeamConfig(activeProjectId));
      loadEmployees(currentDate);
    }
  }, [activeProjectId]);

  // 当日期变化时，加载当月员工
  useEffect(() => {
    loadEmployees(currentDate);
    // 如果该日期有日志，自动选中
    const targetLog = logs.find(l => l.date === currentDate);
    if (targetLog) {
      setSelectedLogId(targetLog.id);
      setFormData(targetLog);
      setIsEditing(false); // 查看模式
    } else {
      setSelectedLogId(null);
      setFormData({});
      setIsEditing(true); // 准备新建
    }
  }, [currentDate, logs]);

  const loadEmployees = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    const emps = LogService.getEmployees(activeProjectId, y, m);
    setAllEmployees(emps);
  };

  // 生成摘要逻辑 (复用之前的)
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

  // 操作处理
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
    setSelectedLogId(null);
  };

  const handleSave = () => {
    if (!formData.content) return alert("请填写施工内容");
    LogService.saveLog(activeProjectId, formData as ConstructionLogEntry);
    setLogs(LogService.getLogs(activeProjectId)); // 刷新列表
    setSelectedLogId(formData.id as string);
    setIsEditing(false);
    alert("保存成功");
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此日志？')) return;
    LogService.deleteLog(activeProjectId, id);
    setLogs(LogService.getLogs(activeProjectId));
    if (selectedLogId === id) {
      setSelectedLogId(null);
      handleCreateNew();
    }
  };

  // 快速插入
  const handleInsertText = (text: string) => {
    setFormData(prev => {
      const oldContent = prev.content || '';
      const prefix = oldContent.length > 0 && !oldContent.endsWith('\n') ? ' ' : '';
      return { ...prev, content: oldContent + prefix + text };
    });
  };

  // 班组/调动管理
  const handleRefreshSummary = () => {
    const summary = generateSummary(activeProjectId, currentDate, teamConfig, tempAllocations);
    setFormData(prev => ({ ...prev, workersSummary: summary }));
  };

  const confirmTransfer = () => {
      if (!transferWorker) return alert("请选择人员");
      const newTemps = { ...tempAllocations, [transferWorker]: transferTargetTeam || '未分组' };
      setTempAllocations(newTemps);
      const newSummary = generateSummary(activeProjectId, currentDate, teamConfig, newTemps);
      setFormData(prev => ({ ...prev, workersSummary: newSummary }));
      setShowTransferModal(false);
  };

  const handleAddTeam = () => { if (!newTeamName.trim() || teamConfig.teams.includes(newTeamName)) return; const newConfig = { ...teamConfig, teams: [...teamConfig.teams, newTeamName] }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); setNewTeamName(''); };
  const handleDeleteTeam = (team: string) => { if (!confirm(`确定删除 ${team} 吗？`)) return; const newTeams = teamConfig.teams.filter(t => t !== team); const newAllocations = { ...teamConfig.allocations }; Object.keys(newAllocations).forEach(key => { if (newAllocations[key] === team) delete newAllocations[key]; }); const newConfig = { teams: newTeams, allocations: newAllocations }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); };
  const handleAssignWorker = (workerName: string, teamName: string) => { const newAllocations = { ...teamConfig.allocations, [workerName]: teamName }; if (!teamName) delete newAllocations[workerName]; const newConfig = { ...teamConfig, allocations: newAllocations }; setTeamConfig(newConfig); LogService.saveTeamConfig(activeProjectId, newConfig); };

  // 导出
  const handleExport = () => {
      if (logs.length === 0) return alert("暂无日志可导出");
      const header = ["日期", "天气", "温度", "施工内容", "人员出勤", "安全记录", "材料进场"];
      const data = logs.sort((a, b) => b.date.localeCompare(a.date)).map(l => [l.date, l.weather, l.temperature, l.content, l.workersSummary, l.safetyNotes, l.materialNotes]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工日志");
      XLSX.writeFile(wb, `施工日志_导出_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ================= 左侧：导航栏 (250px) ================= */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-slate-50">
           <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span className="font-bold">返回主页</span>
           </button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* 日历选择 */}
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">选择日期</label>
             <input 
               type="date" 
               className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
               value={currentDate}
               onChange={e => setCurrentDate(e.target.value)}
             />
          </div>

          {/* 功能入口 */}
          <div className="space-y-2">
             <button onClick={handleExport} className="w-full py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 text-sm font-medium flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出日志 Excel
             </button>
             <button onClick={() => setShowTeamManager(true)} className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 text-sm font-medium flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                班组/人员管理
             </button>
          </div>

          {/* 历史日志列表 (当月) */}
          <div>
            <div className="flex items-center justify-between mb-2">
               <label className="text-xs font-bold text-slate-400 uppercase">近期日志</label>
               <span className="text-xs text-slate-400">{logs.length} 篇</span>
            </div>
            <div className="space-y-2">
               {logs.length === 0 && <p className="text-xs text-slate-300 text-center py-4">暂无历史记录</p>}
               {logs.slice(0, 10).map(log => (
                 <div 
                   key={log.id}
                   onClick={() => { setCurrentDate(log.date); }}
                   className={`p-2 rounded cursor-pointer text-sm border transition-all ${log.date === currentDate ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <div className="flex justify-between">
                       <span className="font-mono font-bold">{log.date}</span>
                       <span className="text-xs opacity-70">{log.weather}</span>
                    </div>
                    <div className="text-xs opacity-60 truncate mt-1">{log.content}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 右侧：工作区 (自适应) ================= */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
         {/* 头部信息 */}
         <div className="h-16 px-8 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{currentDate} 施工日志</h1>
              <span className={`text-sm px-2 py-0.5 rounded ${formData.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                 {formData.id ? '已存档' : '未创建/编辑中'}
              </span>
            </div>
            <div className="flex gap-3">
               {!isEditing && formData.id && (
                 <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold shadow-sm">
                    修改日志
                 </button>
               )}
               {isEditing && (
                 <>
                   <button onClick={() => { setIsEditing(false); loadEmployees(currentDate); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm">取消</button>
                   <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold shadow-md">保存日志</button>
                 </>
               )}
               {formData.id && (
                 <button onClick={() => handleDelete(formData.id!)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="删除日志">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                 </button>
               )}
            </div>
         </div>

         {/* 编辑/查看区域 */}
         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* 基本信息卡片 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">今日概况</h3>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">天气</label>
                       {isEditing ? (
                         <select className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})}>
                            <option>晴</option><option>阴</option><option>多云</option><option>小雨</option><option>大雨</option><option>雪</option>
                         </select>
                       ) : (
                         <div className="text-lg font-medium text-slate-800">{formData.weather || '-'}</div>
                       )}
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">温度/备注</label>
                       {isEditing ? (
                         <LazyInput className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" placeholder="例如：25℃" value={formData.temperature} onChange={(val: string) => setFormData({...formData, temperature: val})} />
                       ) : (
                         <div className="text-lg font-medium text-slate-800">{formData.temperature || '-'}</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* 人员与内容卡片 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
                 
                 {/* 人员出勤 */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">人员出勤</h3>
                       {isEditing && (
                         <div className="flex gap-2">
                            <button onClick={() => setShowTransferModal(true)} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded hover:bg-amber-100 font-bold">⚡️ 临时调动</button>
                            <button onClick={handleRefreshSummary} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">🔄 刷新数据</button>
                         </div>
                       )}
                    </div>
                    {isEditing ? (
                      <LazyTextarea rows={4} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm leading-relaxed" value={formData.workersSummary} onChange={(val: string) => setFormData({...formData, workersSummary: val})} />
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed">{formData.workersSummary || '无记录'}</div>
                    )}
                 </div>

                 <hr className="border-slate-100" />

                 {/* 施工内容 */}
                 <div>
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">施工内容 (重点)</h3>
                    
                    {isEditing && (
                      <div className="flex flex-wrap gap-2 mb-3">
                         <span className="text-xs text-slate-400 self-center">快速插入:</span>
                         {teamConfig.teams.map(t => (
                           <button key={t} onClick={() => handleInsertText(`【${t}】`)} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded border border-indigo-100 hover:bg-indigo-100">{t}</button>
                         ))}
                         <select className="px-2 py-1 bg-slate-50 border border-slate-200 text-xs rounded" onChange={(e) => { if(e.target.value) { handleInsertText(e.target.value); e.target.value=""; } }}>
                            <option value="">选择工人...</option>
                            {getTodayActiveWorkers().map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                         </select>
                      </div>
                    )}

                    {isEditing ? (
                      <LazyTextarea rows={8} className="w-full p-4 bg-white border-2 border-indigo-100 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-base" placeholder="详细记录今日施工进度、部位、存在问题..." value={formData.content} onChange={(val: string) => setFormData({...formData, content: val})} />
                    ) : (
                      <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[100px]">{formData.content || '未填写施工内容'}</div>
                    )}
                 </div>

                 {/* 安全与材料 */}
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">🛡️ 安全记录</label>
                       {isEditing ? (
                         <LazyInput className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" value={formData.safetyNotes} onChange={(val: string) => setFormData({...formData, safetyNotes: val})} />
                       ) : (
                         <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm">{formData.safetyNotes || '-'}</div>
                       )}
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">🏗️ 材料进场</label>
                       {isEditing ? (
                         <LazyInput className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" value={formData.materialNotes} onChange={(val: string) => setFormData({...formData, materialNotes: val})} />
                       ) : (
                         <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm">{formData.materialNotes || '-'}</div>
                       )}
                    </div>
                 </div>

              </div>
            </div>
         </div>
      </div>

      {/* 🟢 模态框：班组管理 (Overlay) */}
      {showTeamManager && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold">班组管理</h3>
                 <button onClick={() => setShowTeamManager(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                 <div className="flex gap-2">
                    <input type="text" className="flex-1 p-2 border rounded" placeholder="新建班组名称" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                    <button onClick={handleAddTeam} className="bg-green-600 text-white px-4 rounded hover:bg-green-700">添加</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {teamConfig.teams.map(t => (
                      <span key={t} onClick={() => handleDeleteTeam(t)} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">{t} ×</span>
                    ))}
                 </div>
                 <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-bold text-slate-500">人员分配</p>
                    {allEmployees.map(emp => (
                       <div key={emp.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span>{emp.name}</span>
                          <select className="p-1 border rounded text-sm" value={teamConfig.allocations[emp.name] || ''} onChange={e => handleAssignWorker(emp.name, e.target.value)}>
                             <option value="">未分配</option>
                             {teamConfig.teams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 🟢 模态框：临时调动 */}
      {showTransferModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="text-lg font-bold mb-1">今日临时调动</h3>
              <p className="text-xs text-slate-500 mb-4">仅影响今日日志统计，不修改全局设置。</p>
              <div className="space-y-3">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">选择人员 (今日出勤)</label>
                    <select className="w-full p-2 border rounded" value={transferWorker} onChange={e => setTransferWorker(e.target.value)}>
                       <option value="">请选择...</option>
                       {getTodayActiveWorkers().map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">调入班组</label>
                    <select className="w-full p-2 border rounded" value={transferTargetTeam} onChange={e => setTransferTargetTeam(e.target.value)}>
                       <option value="">未分组</option>
                       {teamConfig.teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-2 mt-4">
                    <button onClick={() => setShowTransferModal(false)} className="flex-1 py-2 border rounded hover:bg-slate-50">取消</button>
                    <button onClick={confirmTransfer} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};