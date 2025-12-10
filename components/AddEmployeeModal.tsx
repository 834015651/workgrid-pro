import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ROLES } from '../constants';
import { Employee } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, role: string, dailyWage: number) => void;
  existingRoles?: string[];
  editingEmployee?: Employee | null;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  existingRoles = [],
  editingEmployee = null
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('普工');
  const [dailyWage, setDailyWage] = useState('');
  const [showWage, setShowWage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Create a stable ID for the datalist
  const listId = useMemo(() => "role-list-" + Math.random().toString(36).substr(2, 9), []);

  const suggestionRoles = useMemo(() => {
    return Array.from(new Set([...ROLES, ...existingRoles]));
  }, [existingRoles]);

  useEffect(() => {
    if (isOpen) {
      if (editingEmployee) {
        setName(editingEmployee.name);
        setRole(editingEmployee.role);
        setDailyWage(editingEmployee.dailyWage.toString());
        setShowWage(false);
      } else {
        setName('');
        setRole('普工');
        setDailyWage('');
        setShowWage(false); 
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, editingEmployee]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("请输入工人姓名");
      return;
    }
    onSave(name, role, Number(dailyWage) || 0);
    onClose();
  };

  const isEditMode = !!editingEmployee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md z-50 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
             <div className={`p-1.5 rounded-lg ${isEditMode ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                {isEditMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                )}
             </div>
             {isEditMode ? '修改工人信息' : '添加新工人'}
           </h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">
               姓名 <span className="text-red-500">*</span>
             </label>
             <input 
               ref={inputRef}
               type="text"
               value={name}
               onChange={(e) => setName(e.target.value)}
               className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
               placeholder="输入工人姓名"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">工种</label>
             <div className="relative group">
               <input 
                 list={listId}
                 type="text"
                 value={role}
                 onChange={(e) => setRole(e.target.value)}
                 className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                 placeholder="输入或选择工种"
               />
               <datalist id={listId}>
                 {suggestionRoles.map(r => <option key={r} value={r} />)}
               </datalist>
               
               <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-10">
                 {role ? (
                   <button 
                     type="button"
                     onClick={() => setRole('')}
                     className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded hover:bg-slate-100 cursor-pointer"
                     title="清除内容以显示下拉列表"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                   </button>
                 ) : (
                    <span className="text-slate-400 pointer-events-none p-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                 )}
               </div>
             </div>
             <p className="text-xs text-slate-400 mt-1 ml-1">
               {role ? '点击右侧 "X" 清除内容即可查看所有选项' : '可从下拉列表选择或输入新工种'}
             </p>
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">日薪 (元/天)</label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
               <input 
                 type={showWage ? "number" : "password"}
                 value={dailyWage}
                 onChange={(e) => setDailyWage(e.target.value)}
                 className="w-full pl-7 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                 placeholder={showWage ? "0" : "******"}
               />
               <button 
                 type="button"
                 onClick={() => setShowWage(!showWage)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md hover:bg-slate-100"
               >
                 {showWage ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                 )}
               </button>
             </div>
           </div>
           
           <div className="flex justify-end gap-3 mt-8 pt-2 border-t border-slate-50">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button 
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isEditMode ? '保存修改' : '确认添加'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};