import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Project } from '../types';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'report' | 'payslip';
  projects: Project[];
  activeProjectId: string;
  currentYear: number;
  currentMonth: number;
  getEmployeesByFilter: (projectId: string, year: number, month: number) => Employee[];
  // 🟢 修改：回调参数改为 string[] (名字列表)
  onConfirm: (start: {y:number, m:number}, end: {y:number, m:number}, projectId: string, selectedNames?: string[]) => void;
}

export const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen, onClose, type, projects, activeProjectId, currentYear, currentMonth, getEmployeesByFilter, onConfirm
}) => {
  const [start, setStart] = useState({ y: currentYear, m: currentMonth });
  const [end, setEnd] = useState({ y: currentYear, m: currentMonth });
  const [targetProjectId, setTargetProjectId] = useState(activeProjectId);
  
  const [displayEmployees, setDisplayEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  // 🟢 修改：存名字，不存 ID
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  
  // 获取范围内所有出现过的人名（去重）
  useEffect(() => {
    if (isOpen) {
      const namesSet = new Set<string>();
      const tempEmpList: Employee[] = [];
      
      let tempY = start.y;
      let tempM = start.m;
      const endVal = end.y * 12 + end.m;

      while (tempY * 12 + tempM <= endVal) {
        const list = getEmployeesByFilter(targetProjectId, tempY, tempM);
        list.forEach(emp => {
          // 按名字去重
          if (!namesSet.has(emp.name)) {
            namesSet.add(emp.name);
            tempEmpList.push(emp);
          }
        });
        tempM++;
        if (tempM > 12) { tempM = 1; tempY++; }
      }

      setDisplayEmployees(tempEmpList.sort((a, b) => a.name.localeCompare(b.name, 'zh')));
    }
  }, [isOpen, targetProjectId, start.y, start.m, end.y, end.m, getEmployeesByFilter]);

  useEffect(() => {
    if (isOpen) {
      setStart({ y: currentYear, m: currentMonth });
      setEnd({ y: currentYear, m: currentMonth });
      setTargetProjectId(activeProjectId);
      setSearchText('');
    }
  }, [isOpen, type, activeProjectId, currentYear, currentMonth]);

  // 切换工地清空选择
  useEffect(() => {
    setSelectedNames([]);
  }, [targetProjectId]);

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return displayEmployees;
    return displayEmployees.filter(e => e.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [displayEmployees, searchText]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (end.y < start.y || (end.y === start.y && end.m < start.m)) {
      alert("结束时间不能早于开始时间");
      return;
    }
    
    if (type === 'payslip' && selectedNames.length === 0) {
      if(!confirm("您未勾选任何人员，是否确认导出（可能为空）？\n建议先勾选人员。")) return;
    }

    // 🟢 传名字列表
    const finalSelected = type === 'payslip' ? selectedNames : undefined;
    onConfirm(start, end, targetProjectId, finalSelected);
    onClose();
  };

  // 🟢 切换选中状态 (按名字)
  const toggleName = (name: string) => {
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSelectAll = () => {
    const names = filteredList.map(e => e.name);
    const allSelected = names.every(n => selectedNames.includes(n));
    
    if (allSelected) {
      setSelectedNames(prev => prev.filter(n => !names.includes(n)));
    } else {
      setSelectedNames(prev => Array.from(new Set([...prev, ...names])));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 flex flex-col max-h-[85vh]">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-none">
          {type === 'report' ? '导出考勤报表' : '导出工资条'}
        </h3>

        <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">选择工地</label>
            <select value={targetProjectId} onChange={(e) => setTargetProjectId(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">时间范围</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1 items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                <input type="number" className="w-full bg-transparent p-1.5 text-center text-sm outline-none font-bold text-slate-700" value={start.y} onChange={e => setStart({...start, y: parseInt(e.target.value)})} />
                <span className="text-xs text-slate-400">年</span>
                <input type="number" className="w-12 bg-transparent p-1.5 text-center text-sm outline-none font-bold text-slate-700" value={start.m} min={1} max={12} onChange={e => setStart({...start, m: parseInt(e.target.value)})} />
                <span className="text-xs text-slate-400 pr-1">月</span>
              </div>
              <span className="text-slate-300 font-bold">-</span>
              <div className="flex gap-1 flex-1 items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                <input type="number" className="w-full bg-transparent p-1.5 text-center text-sm outline-none font-bold text-slate-700" value={end.y} onChange={e => setEnd({...end, y: parseInt(e.target.value)})} />
                <span className="text-xs text-slate-400">年</span>
                <input type="number" className="w-12 bg-transparent p-1.5 text-center text-sm outline-none font-bold text-slate-700" value={end.m} min={1} max={12} onChange={e => setEnd({...end, m: parseInt(e.target.value)})} />
                <span className="text-xs text-slate-400 pr-1">月</span>
              </div>
            </div>
          </div>

          {type === 'payslip' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-700">
                  人员筛选 <span className="text-xs font-normal text-slate-400">({selectedNames.length}人)</span>
                </label>
                <button onClick={handleSelectAll} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                  {filteredList.length > 0 && filteredList.every(e => selectedNames.includes(e.name)) ? '取消全选' : '全选当前'}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-focus-within:text-blue-500 transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="搜索姓名..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                {searchText && (<button onClick={() => setSearchText('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>)}
              </div>
              
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50 custom-scrollbar">
                {filteredList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredList.map(emp => (
                      // 🟢 这里的 key 改成了 name，toggle 改成了 toggleName
                      <label key={emp.name} className={`flex items-center gap-2 text-xs cursor-pointer p-2 rounded border transition-all select-none ${selectedNames.includes(emp.name) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'}`}>
                        <input type="checkbox" checked={selectedNames.includes(emp.name)} onChange={() => toggleName(emp.name)} className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                        <span className="truncate font-medium">{emp.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center">
                    {displayEmployees.length === 0 ? "该月无人员名单" : "未找到匹配人员"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 mt-auto border-t border-slate-100 flex-none">
          <button onClick={onClose} className="flex-1 py-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm transition-colors font-medium">取消</button>
          <button onClick={handleConfirm} className="flex-1 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 font-medium flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            确认导出
          </button>
        </div>
      </div>
    </div>
  );
};