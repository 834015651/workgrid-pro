import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWorkGridLogic } from '../hooks/useWorkGridLogic';
import { Calendar, BarChart2, User, ChevronLeft, ChevronRight, FileText, Plus, X, Search, Filter, MoreVertical, ArrowLeft, Settings, Trash2, Cloud, LogIn, LogOut, Users, Check, ChevronDown, Briefcase } from 'lucide-react';
import { Employee, GlobalSettings, Project } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { LogService, TeamConfig } from '../modules/ConstructionLog/LogService';
import { ConstructionLogEntry } from '../modules/ConstructionLog/types';
import { AddEmployeeModal } from './AddEmployeeModal';
import { CloudSyncModal } from './CloudSyncModal';
import { AuthModal } from './AuthModal';
import { ActivationModal } from './ActivationModal';
import { supabase } from '../utils/supabaseClient';
import * as XLSX from 'xlsx-js-style';

type Props = {
  logic: ReturnType<typeof useWorkGridLogic>;
};

// ================= 0. Helper Components =================

const TabBar = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (t: string) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
    <button onClick={() => onTabChange('attendance')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'attendance' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <Calendar size={24} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">考勤</span>
    </button>
    <button onClick={() => onTabChange('logs')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'logs' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <FileText size={24} strokeWidth={activeTab === 'logs' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">日志</span>
    </button>
    <button onClick={() => onTabChange('stats')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <BarChart2 size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">统计</span>
    </button>
    <button onClick={() => onTabChange('me')} className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'me' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      <User size={24} strokeWidth={activeTab === 'me' ? 2.5 : 2} />
      <span className="text-[10px] font-medium">我的</span>
    </button>
  </div>
);

const MobileHeader = ({ title, leftAction, rightAction, subtitle }: { title: string, leftAction?: React.ReactNode, rightAction?: React.ReactNode, subtitle?: string }) => (
  <div className="h-14 bg-white flex items-center justify-between px-4 border-b border-slate-100 shadow-sm relative z-40 flex-shrink-0">
    <div className="flex items-center min-w-[40px]">{leftAction}</div>
    <div className="flex flex-col items-center justify-center flex-1">
        <h1 className="text-base font-bold text-slate-800 truncate max-w-[200px]">{title}</h1>
        {subtitle && <span className="text-[10px] text-slate-400 leading-none mt-0.5">{subtitle}</span>}
    </div>
    <div className="flex items-center justify-end min-w-[40px] gap-2">{rightAction}</div>
  </div>
);

const ExportRangeModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (start: string, end: string) => void }) => {
    const now = new Date();
    const [start, setStart] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [end, setEnd] = useState(now.toISOString().slice(0, 10));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xs p-6 rounded-xl shadow-2xl animate-in zoom-in-95">
                <h3 className="font-bold mb-4 text-slate-800">📅 选择导出时间段</h3>
                <div className="mb-3">
                    <label className="block text-xs text-slate-500 mb-1">开始日期</label>
                    <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="mb-5">
                    <label className="block text-xs text-slate-500 mb-1">结束日期</label>
                    <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 bg-white">取消</button>
                    <button onClick={() => onConfirm(start, end)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">确认导出</button>
                </div>
            </div>
        </div>
    );
};

const MobileTeamManager = ({ isOpen, onClose, employees, projectId }: { isOpen: boolean, onClose: () => void, employees: Employee[], projectId: string }) => {
    const [config, setConfig] = useState<TeamConfig>({ teams: [], allocations: {} });
    const [newTeamName, setNewTeamName] = useState('');

    useEffect(() => {
        if (isOpen && projectId) {
            setConfig(LogService.getTeamConfig(projectId));
        }
    }, [isOpen, projectId]);

    const saveConfig = (newConfig: TeamConfig) => {
        setConfig(newConfig);
        LogService.saveTeamConfig(projectId, newConfig);
    };

    const handleAddTeam = () => {
        if (!newTeamName.trim()) return;
        if (config.teams.includes(newTeamName)) return alert("班组已存在");
        saveConfig({ ...config, teams: [...config.teams, newTeamName] });
        setNewTeamName('');
    };

    const handleDeleteTeam = (team: string) => {
        if (!confirm(`确定删除班组 "${team}" 吗？`)) return;
        const newTeams = config.teams.filter(t => t !== team);
        const newAllocations = { ...config.allocations };
        Object.keys(newAllocations).forEach(k => {
            if (newAllocations[k] === team) delete newAllocations[k];
        });
        saveConfig({ teams: newTeams, allocations: newAllocations });
    };

    const handleAssign = (workerName: string, team: string) => {
        const newAllocations = { ...config.allocations, [workerName]: team };
        if (!team) delete newAllocations[workerName];
        saveConfig({ ...config, allocations: newAllocations });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-[#F7F8FA] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-14 bg-white flex items-center px-4 border-b border-slate-200 shadow-sm flex-shrink-0 justify-between">
                <div className="flex items-center">
                    <button onClick={onClose} className="mr-4 text-slate-500"><ArrowLeft size={20}/></button>
                    <h1 className="text-base font-bold text-slate-800">班组管理</h1>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">新建班组</h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)} 
                            placeholder="例如：木工一组" 
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        />
                        <button onClick={handleAddTeam} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-bold">添加</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {config.teams.map(t => (
                            <span key={t} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 flex items-center gap-1">
                                {t}
                                <button onClick={() => handleDeleteTeam(t)} className="w-4 h-4 flex items-center justify-center bg-blue-200 rounded-full hover:bg-red-500 hover:text-white transition-colors ml-1">×</button>
                            </span>
                        ))}
                        {config.teams.length === 0 && <span className="text-xs text-slate-400">暂无班组</span>}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">人员分配 ({employees.length}人)</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {employees.map(emp => (
                            <div key={emp.id} className="p-3 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-sm text-slate-800">{emp.name}</div>
                                    <div className="text-xs text-slate-400">{emp.role}</div>
                                </div>
                                <select 
                                    value={config.allocations[emp.name] || ''} 
                                    onChange={e => handleAssign(emp.name, e.target.value)}
                                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500 max-w-[120px]"
                                >
                                    <option value="">未分组</option>
                                    {config.teams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        ))}
                        {employees.length === 0 && <div className="p-8 text-center text-slate-400 text-xs">暂无工人名单</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MobileProjectSwitcher = ({ isOpen, onClose, projects, activeId, onSwitch }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">切换工地</h3>
                    <button onClick={onClose} className="p-1"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {projects.map((p: any) => (
                        <button 
                            key={p.id} 
                            onClick={() => { onSwitch(p.id); onClose(); }}
                            className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${p.id === activeId ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <span className={`font-bold ${p.id === activeId ? 'text-blue-700' : 'text-slate-700'}`}>{p.name}</span>
                            {p.id === activeId && <Check size={18} className="text-blue-600" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MobileCalendar = ({ employees, currentYear, currentMonth, globalSettings, onNavigateToLog }: { employees: Employee[], currentYear: number, currentMonth: number, globalSettings: GlobalSettings, onNavigateToLog: (d: number) => void }) => {
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const { daysInMonth, startDayOfWeek } = useMemo(() => {
        const date = new Date(currentYear, currentMonth - 1, 1);
        return {
            daysInMonth: new Date(currentYear, currentMonth, 0).getDate(),
            startDayOfWeek: date.getDay()
        };
    }, [currentYear, currentMonth]);

    const calendarGrid = useMemo(() => {
        const grid = [];
        for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(i);
        return grid;
    }, [daysInMonth, startDayOfWeek]);

    const getDayStatus = (day: number) => {
        let count = 0;
        employees.forEach(emp => {
            const d = emp.days[day];
            if (d) {
                if ((Number(d.morning)||0) + (Number(d.afternoon)||0) + (Number(d.overtime)||0) > 0) count++;
            }
        });
        return { count };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
                    <div key={i} className={`py-2 text-center text-xs font-bold ${i === 0 || i === 6 ? 'text-amber-600' : 'text-slate-500'}`}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 border-l border-t border-slate-100">
                {calendarGrid.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-14 bg-slate-50/50 border-r border-b border-slate-100"></div>;
                    
                    const status = getDayStatus(day);
                    const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === currentMonth && new Date().getFullYear() === currentYear;

                    return (
                        <div 
                            key={day} 
                            onClick={() => setSelectedDay(day)}
                            className={`h-14 border-r border-b border-slate-100 relative p-1 flex flex-col items-center justify-start cursor-pointer active:bg-blue-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}
                        >
                            <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}>{day}</span>
                            {status.count > 0 && (
                                <div className="mt-1 flex flex-col items-center gap-0.5">
                                    <span className={`text-[10px] font-bold ${status.count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{status.count}人</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Native Detail Modal */}
            {selectedDay !== null && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh] shadow-2xl">
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{selectedDay}日 考勤明细</h3>
                            <button onClick={() => setSelectedDay(null)} className="p-1 rounded-full hover:bg-slate-200"><X size={20} className="text-slate-400"/></button>
                        </div>
                        
                        {/* 🟢 跳转日志按钮 */}
                        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                            <span className="text-xs text-blue-600 font-medium">查看当日施工日志?</span>
                            <button 
                                onClick={() => { setSelectedDay(null); onNavigateToLog(selectedDay); }}
                                className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-bold shadow-sm hover:bg-blue-50 flex items-center gap-1"
                            >
                                <FileText size={12} />
                                跳转查看
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {employees.filter(e => {
                                const d = e.days[selectedDay];
                                return d && (Number(d.morning) || Number(d.afternoon) || Number(d.overtime));
                            }).length === 0 ? (
                                <p className="text-center text-slate-400 py-8 text-sm">本日无出勤记录</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-400 bg-slate-50">
                                        <tr>
                                            <th className="px-2 py-1 text-left">姓名</th>
                                            <th className="px-2 py-1 text-center">正常</th>
                                            <th className="px-2 py-1 text-center text-amber-600">加班</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {employees.map(emp => {
                                            const d = emp.days[selectedDay];
                                            const reg = (Number(d?.morning)||0) + (Number(d?.afternoon)||0);
                                            const ot = Number(d?.overtime)||0;
                                            if (reg + ot === 0) return null;
                                            return (
                                                <tr key={emp.id}>
                                                    <td className="px-2 py-2 font-medium text-slate-700">
                                                        {emp.name} <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded ml-1">{emp.role}</span>
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold text-blue-600">{reg > 0 ? reg : '-'}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-amber-600">{ot > 0 ? ot : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MobileSettingsView = ({ 
    onClose, globalSettings, setGlobalSettings, employees, handleUpdate, handleSave, setEmployees
}: any) => {
    const [tab, setTab] = useState<'rules' | 'workers'>('rules');
    const [rules, setRules] = useState(globalSettings);

    const handleSaveRules = () => {
        setGlobalSettings(rules);
        handleSave();
        alert("规则已保存！");
    };

    const updateWorker = (id: number, field: 'role' | 'dailyWage', val: string | number) => {
        setEmployees((prev: Employee[]) => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#F7F8FA] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-14 bg-white flex items-center px-4 border-b border-slate-200 shadow-sm flex-shrink-0">
                <button onClick={onClose} className="flex items-center text-slate-500 mr-4 active:text-slate-800">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-base font-bold text-slate-800">系统设置</h1>
            </div>

            <div className="flex p-4 gap-4 border-b border-slate-200 bg-white">
                <button onClick={() => setTab('rules')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'rules' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'bg-slate-50 text-slate-500'}`}>工时规则</button>
                <button onClick={() => setTab('workers')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'workers' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'bg-slate-50 text-slate-500'}`}>工人管理</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {tab === 'rules' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">标准白班时长 (小时/天)</label>
                                <input type="number" value={rules.standardHoursPerDay} onChange={e => setRules({...rules, standardHoursPerDay: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <p className="text-xs text-slate-400 mt-1">用于计算有效工天 (例如 9小时 = 1工)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">加班折算时长 (小时/天)</label>
                                <input type="number" value={rules.overtimeHoursPerDay} onChange={e => setRules({...rules, overtimeHoursPerDay: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <p className="text-xs text-slate-400 mt-1">用于将加班小时数折算为工天</p>
                            </div>
                        </div>
                        <button onClick={handleSaveRules} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">保存规则设置</button>
                    </div>
                )}

                {tab === 'workers' && (
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 mb-2">在此处修改将同步更新该工人的所有历史记录。</div>
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                                <div className="w-16 flex-shrink-0"><div className="font-bold text-slate-800 truncate">{emp.name}</div></div>
                                <div className="flex-1"><label className="text-[10px] text-slate-400 block mb-0.5">工种</label><input type="text" value={emp.role} onChange={e => updateWorker(emp.id, 'role', e.target.value)} className="w-full p-1.5 bg-slate-50 border border-slate-100 rounded text-sm font-medium focus:bg-white focus:border-blue-300 outline-none" /></div>
                                <div className="w-20"><label className="text-[10px] text-slate-400 block mb-0.5">日薪(¥)</label><input type="number" value={emp.dailyWage} onChange={e => updateWorker(emp.id, 'dailyWage', Number(e.target.value))} className="w-full p-1.5 bg-slate-50 border border-slate-100 rounded text-sm font-mono font-bold text-right focus:bg-white focus:border-blue-300 outline-none" /></div>
                            </div>
                        ))}
                        {employees.length === 0 && <div className="text-center text-slate-400 py-10">暂无工人数据</div>}
                        <div className="h-16"></div>
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-safe"><button onClick={() => { handleSave(); alert("工人信息已更新"); }} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform">保存更改</button></div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 🟢 1. 显式定义 Props 接口（放在组件上方或直接写在泛型里都可以，这里为了清晰分开写）
interface EmployeeDayCardProps {
  emp: Employee;
  day: number;
  onUpdate: (id: number, day: number, f: 'morning'|'afternoon'|'overtime', v: string) => void;
  onClickName: () => void;
  teamName?: string;
}

// 🟢 找到上方定义该组件的地方进行替换（大约在 410-450 行之间）

// 1. 定义接口
interface EmployeeDayCardProps {
  emp: Employee;
  day: number;
  onUpdate: (id: number, day: number, f: 'morning'|'afternoon'|'overtime', v: string) => void;
  onClickName: () => void;
  teamName?: string;
}

// 2. 组件实现
const EmployeeDayCard: React.FC<EmployeeDayCardProps> = ({ emp, day, onUpdate, onClickName, teamName }) => {
  // 👇 关键是这行，之前你可能漏掉了
  const data = emp.days[day] || { morning: '', afternoon: '', overtime: '' };
  
  const handleChange = (field: 'morning'|'afternoon'|'overtime', val: string) => { 
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      onUpdate(emp.id, day, field, val); 
    }
  };

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between mb-2">
      <div className="flex items-center gap-3 flex-1 min-w-0 active:opacity-60 cursor-pointer" onClick={onClickName}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner ${emp.id % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {emp.name.slice(-1)}
        </div>
        <div className="truncate pr-2">
          <div className="flex items-center gap-1">
             <p className="font-bold text-slate-800 text-sm truncate">{emp.name}</p>
             <ChevronRight size={12} className="text-slate-300" />
          </div>
          <div className="flex items-center gap-1 mt-0.5">
             <p className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded inline-block">{emp.role}</p>
             {teamName && <p className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block">{teamName}</p>}
          </div>
        </div>
      </div>
      
      <div className="flex gap-1.5 flex-shrink-0 items-center">
        <div className="flex flex-col items-center"><span className="text-[9px] text-slate-400 mb-0.5 scale-90">上午</span><input type="text" inputMode="decimal" placeholder="0" value={data.morning} onChange={e => handleChange('morning', e.target.value)} className={`w-11 h-9 rounded-lg text-center text-sm font-bold outline-none transition-all ${data.morning ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-100 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100'}`} /></div>
        <div className="flex flex-col items-center"><span className="text-[9px] text-slate-400 mb-0.5 scale-90">下午</span><input type="text" inputMode="decimal" placeholder="0" value={data.afternoon} onChange={e => handleChange('afternoon', e.target.value)} className={`w-11 h-9 rounded-lg text-center text-sm font-bold outline-none transition-all ${data.afternoon ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-100 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100'}`} /></div>
        <div className="flex flex-col items-center pl-1 border-l border-slate-100 border-dashed ml-1"><span className="text-[9px] text-amber-500 mb-0.5 scale-90 font-medium">加班</span><input type="text" inputMode="decimal" placeholder="0" value={data.overtime} onChange={e => handleChange('overtime', e.target.value)} className={`w-11 h-9 rounded-lg text-center text-sm font-bold outline-none transition-all ${data.overtime ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-100 focus:bg-white focus:border-amber-300 focus:ring-2 focus:ring-amber-100'}`} /></div>
      </div>
    </div>
  );
};

const EmployeeMonthDetailModal = ({ emp, year, month, onClose }: { emp: Employee | null, year: number, month: number, onClose: () => void }) => {
  if (!emp) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  let totalHours = 0; let totalOt = 0;
  days.forEach(d => { const dayData = emp.days[d]; if(dayData) { totalHours += (Number(dayData.morning)||0) + (Number(dayData.afternoon)||0); totalOt += (Number(dayData.overtime)||0); } });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
       <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><User size={18} className="text-blue-500"/>{emp.name}</h3><p className="text-xs text-slate-500">{year}年{month}月 考勤明细</p></div>
             <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200"><X size={20} className="text-slate-400"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
             <div className="bg-blue-50 rounded-lg p-3 mb-4 flex justify-around items-center border border-blue-100">
                 <div className="text-center"><p className="text-xs text-slate-500 mb-1">正常工时</p><p className="text-xl font-bold text-blue-700">{totalHours}</p></div>
                 <div className="w-px h-8 bg-blue-200"></div>
                 <div className="text-center"><p className="text-xs text-slate-500 mb-1">加班工时</p><p className="text-xl font-bold text-amber-600">{totalOt}</p></div>
             </div>
             <div className="grid grid-cols-4 gap-2 text-xs font-bold text-slate-400 mb-2 px-2 sticky top-0 bg-white py-2 border-b border-slate-100"><span>日期</span><span className="text-center">上午</span><span className="text-center">下午</span><span className="text-center text-amber-500">加班</span></div>
             <div className="space-y-1">
                {days.map(d => {
                    const data = emp.days[d] || { morning: '', afternoon: '', overtime: '' }; const m = Number(data.morning) || 0; const a = Number(data.afternoon) || 0; const o = Number(data.overtime) || 0;
                    if (m+a+o === 0) return null;
                    return (
                        <div key={d} className={`grid grid-cols-4 gap-2 text-sm py-2 border-b border-slate-50 items-center px-2 hover:bg-slate-50`}>
                            <span className="font-bold text-slate-700 flex items-center gap-1"><span className="w-5 h-5 bg-slate-100 rounded text-[10px] flex items-center justify-center text-slate-500">{d}</span></span>
                            <span className={`text-center font-medium ${m>0?'text-slate-800':'text-slate-300'}`}>{m || '-'}</span>
                            <span className={`text-center font-medium ${a>0?'text-slate-800':'text-slate-300'}`}>{a || '-'}</span>
                            <span className={`text-center font-bold ${o>0?'text-amber-600':'text-slate-300'}`}>{o || '-'}</span>
                        </div>
                    )
                })}
                {totalHours + totalOt === 0 && <div className="text-center py-8 text-slate-400 text-xs">该月暂无考勤数据</div>}
             </div>
          </div>
       </div>
    </div>
  )
}

// ================= 6. Main Component =================

export const MobileLayout: React.FC<Props> = ({ logic }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  const { 
    currentDate, projects, activeProjectId, employees, 
    handleUpdate, handleSave, handleRequestSwitchProject, 
    globalSettings, setGlobalSettings,
    isAddEmployeeModalOpen, setIsAddEmployeeModalOpen, 
    handleConfirmAddEmployee, availableRoles,
    handleDateChange,
    toastMsg, showToast,
    setEmployees, 
    // 🟢 Cloud Sync Props
    isCloudModalOpen, setIsCloudModalOpen,
    isAuthModalOpen, setIsAuthModalOpen,
    isActivationModalOpen, setIsActivationModalOpen,
    session, currentUserEmail, isActivated, setIsActivated,
    handleOpenCloudSync, setToastMsg, setShowToast
  } = logic;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<ConstructionLogEntry[]>([]);
  const [isLogEditorOpen, setIsLogEditorOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Partial<ConstructionLogEntry>>({});
  const [statsDate, setStatsDate] = useState({ year: currentDate.year, month: currentDate.month });
  const [showSettings, setShowSettings] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [teamConfig, setTeamConfig] = useState<TeamConfig>({ teams: [], allocations: {} });
  
  // 🟢 导出功能相关状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  const activeProjectName = useMemo(() => projects.find(p => p.id === activeProjectId)?.name || '默认工地', [projects, activeProjectId]);
  const daysInMonth = useMemo(() => new Date(currentDate.year, currentDate.month, 0).getDate(), [currentDate]);

  useEffect(() => {
      if (activeProjectId) {
          setTeamConfig(LogService.getTeamConfig(activeProjectId));
      }
  }, [activeProjectId, showTeamManager]);

  const filteredEmployees = useMemo(() => {
      if (!searchQuery) return employees;
      return employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [employees, searchQuery]);

  useEffect(() => {
    if(activeProjectId && activeTab === 'logs') {
      setLogs(LogService.getLogs(activeProjectId));
    }
  }, [activeProjectId, activeTab, isLogEditorOpen]);

  useEffect(() => {
      if (activeTab === 'stats') {
          setStatsDate({ year: currentDate.year, month: currentDate.month });
      }
  }, [activeTab, currentDate.year, currentDate.month]);

  // 重置勾选状态
  useEffect(() => {
    setSelectedLogIds(new Set());
  }, [activeProjectId, logs.length]);

  const handlePrevDay = () => {
      if (selectedDay > 1) setSelectedDay(d => d - 1);
      else {
          const prevMonth = currentDate.month === 1 ? 12 : currentDate.month - 1;
          const prevYear = currentDate.month === 1 ? currentDate.year - 1 : currentDate.year;
          const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
          handleDateChange(prevYear, prevMonth);
          setSelectedDay(prevMonthDays);
      }
  };

  const handleNextDay = () => {
      if (selectedDay < daysInMonth) setSelectedDay(d => d + 1);
      else {
          const nextMonth = currentDate.month === 12 ? 1 : currentDate.month + 1;
          const nextYear = currentDate.month === 12 ? currentDate.year + 1 : currentDate.year;
          handleDateChange(nextYear, nextMonth);
          setSelectedDay(1);
      }
  };

  const statsData = useMemo(() => {
      const data = employees.map(emp => {
          let reg = 0, ot = 0;
          Object.values(emp.days).forEach((d:any) => {
              reg += (Number(d.morning)||0) + (Number(d.afternoon)||0);
              ot += (Number(d.overtime)||0);
          });
          const eff = (globalSettings.standardHoursPerDay > 0 ? reg/globalSettings.standardHoursPerDay : 0) + 
                      (globalSettings.overtimeHoursPerDay > 0 ? ot/globalSettings.overtimeHoursPerDay : 0);
          return { name: emp.name, reg, ot, eff, wage: eff * emp.dailyWage };
      }).filter(d => d.reg + d.ot > 0).sort((a,b) => b.eff - a.eff);

      const totalWage = data.reduce((sum, d) => sum + d.wage, 0);
      const totalWorkers = employees.length;
      const activeWorkers = data.length;
      return { data, totalWage, totalWorkers, activeWorkers };
  }, [employees, globalSettings]);

  const dayStats = useMemo(() => {
    let reg = 0, ot = 0, count = 0;
    employees.forEach(emp => {
        const d = emp.days[selectedDay];
        if (d) {
            const m = Number(d.morning) || 0;
            const a = Number(d.afternoon) || 0;
            const o = Number(d.overtime) || 0;
            if (m + a + o > 0) count++;
            reg += m + a;
            ot += o;
        }
    });
    return { reg, ot, count };
  }, [employees, selectedDay]);

  const handleSaveLog = () => {
    if (!editingLog.content) return alert("请填写施工内容");
    const logToSave = {
        ...editingLog,
        id: editingLog.id || Date.now().toString(),
        projectId: activeProjectId,
        date: editingLog.date || new Date().toISOString().slice(0, 10),
        weather: editingLog.weather || '晴',
        updatedAt: new Date().toISOString()
    } as ConstructionLogEntry;
    
    LogService.saveLog(activeProjectId, logToSave);
    setIsLogEditorOpen(false);
    setEditingLog({});
    setLogs(LogService.getLogs(activeProjectId));
  };

  const openLogEditor = (log?: ConstructionLogEntry, initialDate?: string) => {
      setEditingLog(log || { date: initialDate || new Date().toISOString().slice(0, 10), weather: '晴' });
      setIsLogEditorOpen(true);
  };

  const deleteLog = (id: string) => {
      if(confirm("确定删除此日志吗？")) {
          LogService.deleteLog(activeProjectId, id);
          setLogs(LogService.getLogs(activeProjectId));
      }
  }

  const handleStatsMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [y, m] = e.target.value.split('-').map(Number);
      setStatsDate({ year: y, month: m });
      handleDateChange(y, m);
  };

  const handleLogout = async () => {
    if (confirm("确定要退出当前账号吗？")) {
      await supabase.auth.signOut();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const currentWeekDay = useMemo(() => {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekDays[new Date(currentDate.year, currentDate.month - 1, selectedDay).getDay()];
  }, [currentDate, selectedDay]);

  const navigateToLog = (day: number) => {
      const targetDate = `${currentDate.year}-${String(currentDate.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      setActiveTab('logs');
      const existingLogs = LogService.getLogs(activeProjectId);
      const log = existingLogs.find(l => l.date === targetDate);
      openLogEditor(log, targetDate);
  };

  const getDailyTeamSummary = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const activeWorkers = employees.filter(e => {
        const dayData = e.days[d];
        return dayData && (Number(dayData.morning) > 0 || Number(dayData.afternoon) > 0 || Number(dayData.overtime) > 0);
      });

      const teamGroups: Record<string, string[]> = {};
      const unassigned: string[] = [];

      activeWorkers.forEach(w => {
          const team = teamConfig.allocations[w.name];
          if (team && teamConfig.teams.includes(team)) {
              if (!teamGroups[team]) teamGroups[team] = [];
              teamGroups[team].push(w.name);
          } else {
              unassigned.push(w.name);
          }
      });

      return { teamGroups, unassigned, total: activeWorkers.length };
  };

  const dailyTeamSummary = useMemo(() => {
      const dateToUse = editingLog.date || new Date().toISOString().slice(0, 10);
      return getDailyTeamSummary(dateToUse);
  }, [editingLog.date, employees, teamConfig]);

  // 🟢 导出逻辑
  const executeExport = (targetLogs: ConstructionLogEntry[]) => {
      if (targetLogs.length === 0) return alert("没有可导出的日志");

      const header = ["日期", "天气", "温度", "施工内容", "人员出勤", "安全记录", "材料进场"];
      const data = targetLogs
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(l => [l.date, l.weather, l.temperature, l.content, l.workersSummary, l.safetyNotes, l.materialNotes]);
      
      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
      ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "施工日志");
      
      const projectName = projects.find(p => p.id === activeProjectId)?.name || "项目";
      XLSX.writeFile(wb, `${projectName}_施工日志_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportClick = () => {
      if (logs.length === 0) return alert("暂无日志可导出");
      if (selectedLogIds.size > 0) {
          const targetLogs = logs.filter(l => selectedLogIds.has(l.id));
          executeExport(targetLogs);
      } else {
          setShowExportModal(true);
      }
  };

  const toggleSelectLog = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); 
      const newSet = new Set(selectedLogIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLogIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedLogIds.size === logs.length && logs.length > 0) {
          setSelectedLogIds(new Set());
      } else {
          const allIds = new Set(logs.map(l => l.id));
          setSelectedLogIds(allIds);
      }
  };

  return (
    <div className="h-screen bg-[#F7F8FA] flex flex-col text-slate-800 font-sans">
      
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white px-4 py-2 rounded-full text-xs z-[100] transition-opacity duration-300 shadow-lg backdrop-blur-sm pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
         {toastMsg}
      </div>

      <AddEmployeeModal isOpen={isAddEmployeeModalOpen} onClose={() => setIsAddEmployeeModalOpen(false)} onSave={handleConfirmAddEmployee} existingRoles={availableRoles} />
      <EmployeeMonthDetailModal emp={viewingEmployee} year={currentDate.year} month={currentDate.month} onClose={() => setViewingEmployee(null)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ActivationModal isOpen={isActivationModalOpen} onClose={() => setIsActivationModalOpen(false)} onSuccess={() => { setIsActivationModalOpen(false); setIsActivated(true); setToastMsg("激活成功！"); setShowToast(true); setTimeout(() => setShowToast(false), 2000); setIsCloudModalOpen(true); }} />
      <CloudSyncModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} userEmail={currentUserEmail} onUploadSuccess={() => { setToastMsg("上传成功！"); setShowToast(true); setTimeout(()=>setShowToast(false), 2000); }} onDownloadSuccess={() => { setToastMsg("下载并合并成功！"); setShowToast(true); setTimeout(()=>setShowToast(false), 2000); window.location.reload(); }} onLogin={() => setIsAuthModalOpen(true)}/>
      <MobileTeamManager isOpen={showTeamManager} onClose={() => setShowTeamManager(false)} employees={employees} projectId={activeProjectId} />
      <MobileProjectSwitcher isOpen={showProjectSwitcher} onClose={() => setShowProjectSwitcher(false)} projects={projects} activeId={activeProjectId} onSwitch={handleRequestSwitchProject} />
      <ExportRangeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onConfirm={(start, end) => { const targets = logs.filter(l => l.date >= start && l.date <= end); executeExport(targets); setShowExportModal(false); }} />

      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'attendance' && (
          <>
            <MobileHeader 
              title={activeProjectName}
              subtitle="点击切换工地"
              leftAction={
                  <button onClick={() => setShowProjectSwitcher(true)} className="flex items-center text-slate-800 font-bold max-w-[200px] truncate">
                      {/* Invisible button */}
                  </button>
              }
              rightAction={<button onClick={() => setIsAddEmployeeModalOpen(true)} className="p-2 text-blue-600 active:bg-slate-100 rounded-full transition-colors"><Plus size={22} /></button>}
            />
            <div className="absolute top-0 left-16 right-16 h-14 z-[45] cursor-pointer" onClick={() => setShowProjectSwitcher(true)}></div>

            <div className="bg-white px-4 py-2 border-b border-slate-200 shadow-sm z-30">
               <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200 mb-2">
                  <button onClick={handlePrevDay} className="w-10 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 active:scale-95 transition-transform"><ChevronLeft size={20} /></button>
                  <div className="flex flex-col items-center relative px-4 py-1 cursor-pointer active:opacity-70 transition-opacity">
                      <div className="flex items-baseline gap-1">
                          <span className="font-bold text-lg text-slate-800 font-mono">{currentDate.month}月{selectedDay}日</span>
                          <span className="text-xs text-slate-500 font-medium">{currentWeekDay}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-none">{currentDate.year}年</span>
                      <input type="date" className="absolute inset-0 opacity-0 w-full h-full z-10 cursor-pointer" value={`${currentDate.year}-${String(currentDate.month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`} onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); if (y !== currentDate.year || m !== currentDate.month) handleDateChange(y, m); setSelectedDay(d); }} />
                  </div>
                  <button onClick={handleNextDay} className="w-10 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 active:scale-95 transition-transform"><ChevronRight size={20} /></button>
               </div>
               <div className="relative">
                  <input type="text" placeholder="搜索姓名..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none" />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-300 rounded-full p-0.5 text-white"><X size={12}/></button>}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-24">
                {filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center"><User size={32} className="text-slate-400" /></div>
                        <span className="text-sm">{searchQuery ? '未找到匹配工人' : '本月暂无工人名单'}</span>
                        {!searchQuery && <button onClick={() => setIsAddEmployeeModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">+ 添加第一位工人</button>}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredEmployees.map(emp => (
                            <EmployeeDayCard 
                                key={emp.id} 
                                emp={emp} 
                                day={selectedDay} 
                                onUpdate={handleUpdate as any} 
                                onClickName={() => setViewingEmployee(emp)}
                                teamName={(teamConfig.allocations as any)[emp.name]}
                            />
                        ))}
                        <div className="text-center text-xs text-slate-300 pt-4 pb-8">- 共 {filteredEmployees.length} 人 -</div>
                    </div>
                )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-between px-5 text-xs z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2"><span className="text-slate-500">今日:</span><span className="font-bold text-slate-800 text-sm">{dayStats.count} 人</span></div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-slate-500">工时:</span><span className="font-bold text-blue-600 text-sm font-mono">{parseFloat(dayStats.reg.toFixed(2))}</span></div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-slate-500">加班:</span><span className="font-bold text-amber-600 text-sm font-mono">{parseFloat(dayStats.ot.toFixed(2))}</span></div>
                </div>
            </div>
            <div className="absolute bottom-16 right-4 z-40"><button onClick={handleSave} className="w-12 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-blue-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></button></div>
          </>
        )}

        {activeTab === 'logs' && (
            <>
                <MobileHeader title="施工日志" rightAction={<button onClick={() => openLogEditor()} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">新建</button>} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 日志列表头部工具栏 */}
                    <div className="px-4 py-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm z-10">
                        <div className="flex items-center gap-2">
                             <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                 <input type="checkbox" checked={logs.length > 0 && selectedLogIds.size === logs.length} onChange={toggleSelectAll} className="rounded text-blue-600 focus:ring-blue-500" />
                                 全选
                             </label>
                             {selectedLogIds.size > 0 && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">已选 {selectedLogIds.size}</span>}
                        </div>
                        <button onClick={handleExportClick} className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-green-100">
                            <FileText size={12} /> 导出 Excel
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-4">
                        {logs.length === 0 ? (
                            <div className="text-center py-32 text-slate-400 text-sm flex flex-col items-center"><FileText size={48} className="text-slate-200 mb-2"/><p>暂无施工日志</p><p className="text-xs mt-1 opacity-70">点击右上角新建第一篇日志</p></div>
                        ) : (
                            logs.sort((a,b) => b.date.localeCompare(a.date)).map(log => (
                                <div key={log.id} onClick={() => openLogEditor(log)} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 active:border-blue-200 active:bg-slate-50 transition-all cursor-pointer group relative overflow-hidden flex gap-3">
                                    <div className="flex items-center" onClick={(e) => toggleSelectLog(log.id, e)}>
                                        <input type="checkbox" checked={selectedLogIds.has(log.id)} readOnly className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2"><span className="font-mono font-bold text-slate-800 text-base">{log.date}</span><span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{log.weather}</span></div>
                                            <ChevronRight size={16} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-2">{log.content}</p>
                                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50">
                                            <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>{log.temperature || '无温度记录'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </>
        )}

        {activeTab === 'stats' && (
          <>
            <MobileHeader title="统计报表" />
            <div className="bg-white px-4 py-2 border-b border-slate-100 sticky top-0 z-30">
               <div className="flex items-center justify-center relative bg-slate-50 rounded-lg p-2 border border-slate-200">
                   <Calendar size={16} className="text-slate-400 mr-2" /><span className="text-sm font-bold text-slate-700">{statsDate.year}年 {statsDate.month}月</span>
                   <input type="month" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" value={`${statsDate.year}-${String(statsDate.month).padStart(2,'0')}`} onChange={handleStatsMonthChange} />
                   <ChevronRight size={14} className="text-slate-400 ml-2 rotate-90" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="flex flex-col gap-4 mb-4">
                      <div className="flex justify-between items-start">
                          <div><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1"><BarChart2 size={16} className="text-blue-500" />工时统计</h3><p className="text-xs text-slate-400">预计薪资支出 (仅参考)</p></div>
                          <div className="text-right"><p className="text-xl font-bold text-blue-600">¥{Math.round(statsData.totalWage).toLocaleString()}</p></div>
                      </div>
                      <div className="flex gap-2 text-xs">
                          <div className="bg-slate-50 px-2 py-1 rounded text-slate-600">总人数 <span className="font-bold text-slate-800">{statsData.totalWorkers}</span></div>
                          <div className="bg-green-50 px-2 py-1 rounded text-green-700">实勤 <span className="font-bold">{statsData.activeWorkers}</span></div>
                      </div>
                  </div>
                  {/* 🟢 Stacked Bar Chart with Distinct Overtime Color */}
                  <div className="w-full" style={{ height: `${Math.max(300, statsData.data.length * 40)}px` }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={statsData.data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                          <Legend wrapperStyle={{fontSize: '10px'}} />
                          <Bar dataKey="reg" stackId="a" name="正常 (h)" fill="#3b82f6" barSize={16} radius={[0,0,0,0]} />
                          <Bar dataKey="ot" stackId="a" name="加班 (h)" fill="#f97316" barSize={16} radius={[0, 4, 4, 0]}>
                             <LabelList dataKey="eff" position="right" style={{ fontSize: 10, fill: '#64748b' }} formatter={(val:number)=>val.toFixed(1) + '工'} />
                          </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={16} className="text-orange-500" />出勤日历</h3></div>
                  <MobileCalendar employees={employees} currentYear={statsDate.year} currentMonth={statsDate.month} globalSettings={globalSettings} onNavigateToLog={navigateToLog} />
               </div>
            </div>
          </>
        )}

        {activeTab === 'me' && (
          <>
            <MobileHeader title="个人中心" />
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
               {session ? (
                   // 🟢 已登录状态：显示用户信息 + 退出按钮
                   <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Cloud size={64} className="text-blue-500" /></div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">{currentUserEmail?.[0]?.toUpperCase() || 'U'}</div>
                          <div className="flex-1 min-w-0"><h2 className="text-lg font-bold text-slate-800 truncate">{currentUserEmail}</h2><p className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded inline-block mt-1">云服务已连接</p></div>
                      </div>
                      <div className="flex gap-3 relative z-10">
                          <button onClick={handleOpenCloudSync} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><Cloud size={16} />云端数据同步</button>
                          <button onClick={handleLogout} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-transform"><LogOut size={16} /></button>
                      </div>
                   </div>
               ) : (
                   // 🟢 未登录状态：只显示登录按钮，不显示退出
                   <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-4 shadow-lg text-white relative overflow-hidden">
                      <div className="relative z-10">
                          <h2 className="text-xl font-bold mb-1">未登录账号</h2>
                          <p className="text-blue-100 text-xs mb-4">登录后可实现多设备数据漫游，永不丢失。</p>
                          <button onClick={() => setIsAuthModalOpen(true)} className="w-full py-2.5 bg-white text-blue-600 rounded-lg text-sm font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"><LogIn size={16} />立即登录 / 注册</button>
                      </div>
                      <div className="absolute -bottom-4 -right-4 opacity-20"><Cloud size={100} /></div>
                   </div>
               )}

               <div className="space-y-4">
                   <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                      <button className="w-full flex items-center p-4 border-b border-slate-50 active:bg-slate-50 transition-colors" onClick={() => setShowProjectSwitcher(true)}>
                         <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-3"><FileText size={18}/></div>
                         <div className="flex-1 text-left">
                             <div className="text-sm font-bold text-slate-700">当前工地</div>
                             <div className="text-xs text-slate-400">{activeProjectName}</div>
                         </div>
                         <ChevronRight size={16} className="text-slate-300" />
                      </button>
                      
                      <button className="w-full flex items-center p-4 border-b border-slate-50 active:bg-slate-50 transition-colors" onClick={() => setShowTeamManager(true)}>
                         <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mr-3"><Users size={18}/></div>
                         <span className="flex-1 text-left text-sm font-bold text-slate-700">班组人员管理</span>
                         <ChevronRight size={16} className="text-slate-300" />
                      </button>

                      <button className="w-full flex items-center p-4 active:bg-slate-50 transition-colors" onClick={() => setShowSettings(true)}>
                         <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3"><Settings size={18}/></div>
                         <span className="flex-1 text-left text-sm font-bold text-slate-700">系统设置</span>
                         <ChevronRight size={16} className="text-slate-300" />
                      </button>
                   </div>
                   
                   <div className="text-center text-xs text-slate-300 pt-4">WorkGrid Pro v2.0 Mobile</div>
               </div>
            </div>
          </>
        )}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {showSettings && <MobileSettingsView onClose={() => setShowSettings(false)} globalSettings={globalSettings} setGlobalSettings={setGlobalSettings} employees={employees} handleUpdate={handleUpdate} handleSave={handleSave} setEmployees={setEmployees} />}
      {isLogEditorOpen && (
          <div className="fixed inset-0 z-[100] bg-[#F7F8FA] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
                  <button onClick={() => setIsLogEditorOpen(false)} className="text-slate-500 px-2 py-1">取消</button>
                  <h3 className="font-bold text-slate-800">{editingLog.id ? '编辑日志' : '新建日志'}</h3>
                  <button onClick={handleSaveLog} className="text-white bg-blue-600 px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-blue-200">完成</button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      {/* 🟢 班组详情展示区 */}
                      {dailyTeamSummary.total > 0 && (
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                              <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                                  <Briefcase size={12} />
                                  当日班组详情 ({dailyTeamSummary.total}人)
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(dailyTeamSummary.teamGroups).map(([team, members]) => (
    <div key={team} className="text-xs">
        <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-blue-100 mr-1">{team}</span>
        {/* 🟢 下面这一行加了 (members as string[]) */}
        <span className="text-slate-500">{(members as string[]).join('、')}</span>
    </div>
))}
                                  {dailyTeamSummary.unassigned.length > 0 && (
                                      <div className="text-xs">
                                          <span className="font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-1">未分组</span>
                                          <span className="text-slate-400">{dailyTeamSummary.unassigned.join('、')}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      <div className="flex gap-4">
                          <div className="flex-1"><label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">日期</label><input type="date" value={editingLog.date} onChange={e => setEditingLog({...editingLog, date: e.target.value})} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-blue-400 transition-colors" /></div>
                          <div className="w-1/3"><label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">天气</label><select value={editingLog.weather} onChange={e => setEditingLog({...editingLog, weather: e.target.value})} className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-blue-400 transition-colors"><option>晴</option><option>阴</option><option>雨</option><option>雪</option><option>多云</option></select></div>
                      </div>
                      <div><label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase">温度/备注</label><input type="text" value={editingLog.temperature} onChange={e => setEditingLog({...editingLog, temperature: e.target.value})} placeholder="例如：25℃，微风" className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-blue-400 transition-colors" /></div>
                  </div>
                  <div className="flex-1 flex flex-col"><label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase pl-1">施工内容详情</label><textarea value={editingLog.content} onChange={e => setEditingLog({...editingLog, content: e.target.value})} placeholder="在此输入今日施工内容、进度、问题..." className="w-full flex-1 p-4 bg-white rounded-xl border border-slate-200 resize-none min-h-[300px] text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"></textarea></div>
              </div>
          </div>
      )}
    </div>
  );
};