import React from 'react';
import { Employee } from '../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  employees: Employee[];
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, onClose, day, employees }) => {
  if (!isOpen) return null;

  // Filter employees who worked on this day
  const activeEmployees = employees.filter(emp => {
    const d = emp.days[day];
    if (!d) return false;
    const m = Number(d.morning) || 0;
    const a = Number(d.afternoon) || 0;
    const o = Number(d.overtime) || 0;
    return m > 0 || a > 0 || o > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg z-50 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-slate-800">{day}日 考勤详情</h3>
           <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
           {activeEmployees.length === 0 ? (
             <p className="text-center text-slate-400 py-8">本日无出勤记录</p>
           ) : (
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                 <tr>
                   <th className="px-3 py-2">姓名</th>
                   <th className="px-3 py-2 text-center">工种</th>
                   <th className="px-3 py-2 text-center">正常</th>
                   <th className="px-3 py-2 text-center">加班</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {activeEmployees.map(emp => {
                    const d = emp.days[day];
                    const reg = (Number(d.morning)||0) + (Number(d.afternoon)||0);
                    const ot = Number(d.overtime)||0;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{emp.name}</td>
                        <td className="px-3 py-2 text-center text-slate-500 text-xs">{emp.role}</td>
                        <td className="px-3 py-2 text-center text-blue-600 font-medium">{reg > 0 ? reg : '-'}</td>
                        <td className="px-3 py-2 text-center text-amber-600 font-medium">{ot > 0 ? ot : '-'}</td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
           )}
        </div>
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-right">
           <span className="text-xs text-slate-500 mr-2">共 {activeEmployees.length} 人出勤</span>
           <button onClick={onClose} className="px-4 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50">关闭</button>
        </div>
      </div>
    </div>
  );
};