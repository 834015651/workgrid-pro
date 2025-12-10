import React, { useState, useEffect } from 'react';
import { Employee, GlobalSettings, Project } from '../types';
import { StoredMonth } from '../types';
import { supabase } from '../utils/supabaseClient'; // 🟢 引入 supabase 用于退出登录

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  globalSettings: GlobalSettings;
  storedMonths: StoredMonth[];
  projects: Project[];
  isActivated: boolean;       // 🟢 接收登录状态
  currentUserEmail?: string;  // 🟢 接收用户邮箱
  onSaveGlobalSettings: (settings: GlobalSettings) => void;
  onUpdateEmployee: (id: number, field: 'role' | 'dailyWage', value: string | number) => void;
  onImportRoles: (roles: string[]) => void;
  onDeleteAllEmployees: () => void;
  onDeleteMonth: (year: number, month: number) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onExportData: () => void;
  onImportData: (json: string) => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
  onOpenPayslipModal: () => void;
  onOpenCloudSync: () => void;
   // 🟢 新增这两个定义
  deletedProjects?: Project[];
  onRestoreProject?: (p: Project) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, employees, globalSettings, storedMonths, projects,
  isActivated, currentUserEmail, // 🟢 解构这两个
  deletedProjects = [], 
  onRestoreProject,// 🟢 解构参数
  onSaveGlobalSettings, onUpdateEmployee, onImportRoles, onDeleteAllEmployees, onDeleteMonth,
  onAddProject, onDeleteProject, onRenameProject,
  onExportData, onImportData, onDownloadTemplate, onExportExcel, onImportExcel,
  onOpenPayslipModal, onOpenCloudSync
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'wages' | 'project' | 'data'>('rules');
  
  const [standardHours, setStandardHours] = useState(globalSettings.standardHoursPerDay);
  const [overtimeDivisor, setOvertimeDivisor] = useState(globalSettings.overtimeHoursPerDay);

  useEffect(() => {
    setStandardHours(globalSettings.standardHoursPerDay);
    setOvertimeDivisor(globalSettings.overtimeHoursPerDay);
  }, [globalSettings]);

  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  if (!isOpen) return null;

  const handleSaveRules = () => {
    onSaveGlobalSettings({
      standardHoursPerDay: Number(standardHours),
      overtimeHoursPerDay: Number(overtimeDivisor)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => onImportData(ev.target?.result as string);
        reader.readAsText(file);
    }
    e.target.value = ''; 
  };

// 🟢 [优化] 暴力退出逻辑：不等待网络响应，直接刷新
 const handleLogout = async () => {
    if(confirm("确定要退出登录吗？")) {
      // 1. 告诉服务器我要走了 (不等待结果)
      supabase.auth.signOut().catch(() => {});

      // 2. 🟢【核心修复】手动清除本地 Supabase 凭证
      // Supabase 的 Key 通常以 'sb-' 开头，以 '-auth-token' 结尾
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      // 删除找到的凭证
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 3. 刷新页面
      window.location.reload();
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {/* 修复后的齿轮图标 */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20" fill="currentColor" className="text-slate-600">
               <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
            </svg>
            系统设置
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button onClick={() => setActiveTab('rules')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rules' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>工时规则</button>
          <button onClick={() => setActiveTab('wages')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>工人信息</button>
          <button onClick={() => setActiveTab('project')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'project' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>工地管理</button>
          <button onClick={() => setActiveTab('data')} className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>数据管理</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {/* --- 工时规则 --- */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-blue-800 font-bold mb-2">说明</h3>
                <p className="text-sm text-blue-600">在此处设置每天的标准工作小时数。系统将根据此数值自动将工时转换为“有效工天”。<br/>公式：有效工天 = 总工时 / 每日标准工时</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">标准白班时长 (小时/天)</label>
                  <input type="number" value={standardHours} onChange={(e) => setStandardHours(Number(e.target.value))} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-slate-400 mt-1">例如：9小时算1个工</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">加班折算时长 (小时/天)</label>
                  <input type="number" value={overtimeDivisor} onChange={(e) => setOvertimeDivisor(Number(e.target.value))} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-slate-400 mt-1">例如：加班9小时算1个工</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                 <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">取消</button>
                 <button onClick={handleSaveRules} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors">保存设置</button>
              </div>
            </div>
          )}

          {/* --- 工人信息 --- */}
          {activeTab === 'wages' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-sm text-slate-500">在此处统一管理所有工人的基础信息。修改后，历史记录也会同步更新。</p>
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                     <tr>
                       <th className="px-4 py-3">姓名</th>
                       <th className="px-4 py-3">工种</th>
                       <th className="px-4 py-3">日薪 (元/天)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {employees.map(emp => (
                       <tr key={emp.id} className="hover:bg-slate-50">
                         <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                         <td className="px-4 py-3">
                           <input type="text" defaultValue={emp.role} onBlur={(e) => onUpdateEmployee(emp.id, 'role', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none px-1 py-0.5" />
                         </td>
                         <td className="px-4 py-3">
                           <input type="number" defaultValue={emp.dailyWage} onBlur={(e) => onUpdateEmployee(emp.id, 'dailyWage', Number(e.target.value))} className="w-24 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none px-1 py-0.5" />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {employees.length === 0 && <div className="p-8 text-center text-slate-400">暂无工人数据</div>}
               </div>
            </div>
          )}

          {/* --- 工地管理 --- */}
          {activeTab === 'project' && (
            <div className="space-y-6">
               <div className="flex gap-2">
                 <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="输入新工地名称..." className="flex-1 p-2 border border-slate-300 rounded-lg text-sm" />
                 <button onClick={() => { if(newProjectName) { onAddProject(newProjectName); setNewProjectName(''); }}} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">新建工地</button>
               </div>
               <div className="space-y-2">
                 {projects.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg group hover:border-blue-300 transition-colors">
                      {editingProjectId === p.id ? (
                        <input autoFocus value={editingProjectName} onChange={(e) => setEditingProjectName(e.target.value)} onBlur={() => { onRenameProject(p.id, editingProjectName); setEditingProjectId(null); }} onKeyDown={(e) => { if(e.key === 'Enter') { onRenameProject(p.id, editingProjectName); setEditingProjectId(null); }}} className="flex-1 p-1 border border-blue-300 rounded text-sm" />
                      ) : (
                        <span className="font-medium text-slate-700">{p.name}</span>
                      )}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProjectId(p.id); setEditingProjectName(p.name); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                        <button onClick={() => onDeleteProject(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
          {/* 原有的项目列表 (projects.map) 应该在上面 */}
              
              {/* 🟢 新增：回收站区域 */}
              {deletedProjects && deletedProjects.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    可恢复的工地 (本次运行)
                  </h4>
                  <div className="space-y-2">
                    {deletedProjects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-blue-200 transition-colors">
                        <span className="text-sm text-slate-500 line-through decoration-slate-400 decoration-2">{p.name}</span>
                        <button
                          onClick={() => onRestoreProject && onRestoreProject(p)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="恢复该工地"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                          撤销删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

          {/* --- 数据管理 --- */}
          {activeTab === 'data' && (
            <div className="space-y-8">
              
              {/* 🟢 优化后的云端同步卡片 */}
              {isActivated ? (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                         </div>
                         <div>
                            <h4 className="font-bold text-slate-800">当前已登录</h4>
                            <p className="text-sm text-slate-500">{currentUserEmail}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={onOpenCloudSync}
                           className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.1 0-5.7 2.2-6.4 5.3C.2 15.6-.2 16.1.1 16.6c.3.9 1.1 1.6 2 1.9 0 0 .1 0 .1.1.2.2.5.3.9.4H17.5z"/><path d="M12 10V4"/><path d="m8 8 4-4 4 4"/></svg>
                           管理同步
                         </button>
                         <button 
                           onClick={handleLogout}
                           className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                         >
                           退出
                         </button>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span>云服务连接正常，数据将安全同步到您的私有账户。</span>
                   </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
                   <div>
                      <h4 className="text-xl font-bold flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.2-3.4-3.1-6-6.5-6-3.1 0-5.7 2.2-6.4 5.3C.2 15.6-.2 16.1.1 16.6c.3.9 1.1 1.6 2 1.9 0 0 .1 0 .1.1.2.2.5.3.9.4H17.5z"/><path d="M12 10V4"/><path d="m8 8 4-4 4 4"/></svg>
                         开启云端同步
                      </h4>
                      <p className="text-blue-100 text-sm mt-1 opacity-90">登录后可实现多设备数据漫游，永不丢失。</p>
                   </div>
                   <button 
                     onClick={onOpenCloudSync}
                     className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg shadow-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
                   >
                     立即登录 / 注册
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                   </button>
                </div>
              )}

              {/* Excel 操作区域 */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Excel 考勤管理
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={onExportExcel} className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm font-medium flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                     导出考勤表
                   </button>

                   <button onClick={onOpenPayslipModal} className="py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-sm text-sm font-medium flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                     生成工资条
                   </button>

                   <label className="col-span-1 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors">
                     <input 
                       type="file" 
                       accept=".xlsx, .xls" 
                       className="hidden" 
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           onImportExcel(file);
                           e.target.value = '';
                         }
                       }} 
                     />
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                     导入考勤表 Excel
                   </label>

                   <button onClick={onDownloadTemplate} className="col-span-1 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                     下载模板
                   </button>
                </div>
              </div>

              {/* 危险区域 */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-red-600 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>危险操作区域</h4>
                
                <div className="bg-red-50 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-red-800">清空当前月所有数据</p>
                      <p className="text-xs text-red-600/70">仅删除当月考勤记录，保留工人名单</p>
                    </div>
                    <button onClick={onDeleteAllEmployees} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs hover:bg-red-100 font-medium">清空当前月</button>
                  </div>

                  <div className="border-t border-red-100 my-2"></div>

                  <div>
                    <p className="font-medium text-red-800 mb-2">历史归档管理</p>
                    {storedMonths.length === 0 ? (
                      <p className="text-xs text-red-400 italic">暂无历史归档数据</p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {storedMonths.map(m => (
                          <div key={`${m.year}-${m.month}`} className="flex justify-between items-center text-sm p-1.5 hover:bg-red-100/50 rounded">
                            <span className="text-red-900">{m.year}年 {m.month}月 <span className="text-xs opacity-50">({m.count}人)</span></span>
                            <button onClick={() => onDeleteMonth(m.year, m.month)} className="text-xs text-red-500 hover:underline">永久删除</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-red-100 my-2"></div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                       <p className="font-medium text-red-800">全量备份导出</p>
                       <button onClick={onExportData} className="text-xs text-blue-600 hover:underline">下载 JSON 备份</button>
                    </div>
                    <label className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer hover:text-blue-600">
                       <span>从备份文件恢复:</span>
                       <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                       <span className="underline">点击上传恢复</span>
                    </label>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};