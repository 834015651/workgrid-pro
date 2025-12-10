import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Employee, GlobalSettings, DayEntry } from '../types';

interface StatsPanelProps {
  employees: Employee[];
  globalSettings: GlobalSettings;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ employees, globalSettings }) => {
  const [deferredEmployees, setDeferredEmployees] = useState<Employee[]>(employees);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeferredEmployees(employees);
    }, 300);
    return () => clearTimeout(timer);
  }, [employees]);

  const chartData = useMemo(() => {
    return deferredEmployees.map(emp => {
      let regularHours = 0;
      let overtimeHours = 0;
      Object.values(emp.days).forEach((d: DayEntry) => {
        const m = parseFloat(String(d.morning));
        const a = parseFloat(String(d.afternoon));
        const o = parseFloat(String(d.overtime));
        regularHours += (isNaN(m) ? 0 : m) + (isNaN(a) ? 0 : a);
        overtimeHours += (isNaN(o) ? 0 : o);
      });

      const effectiveRegularDays = globalSettings.standardHoursPerDay > 0
        ? regularHours / globalSettings.standardHoursPerDay
        : 0;

      const effectiveOvertimeDays = globalSettings.overtimeHoursPerDay > 0
        ? overtimeHours / globalSettings.overtimeHoursPerDay
        : 0;
      
      const totalEffectiveDays = effectiveRegularDays + effectiveOvertimeDays;

      return {
        name: emp.name,
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        totalHours: parseFloat((regularHours + overtimeHours).toFixed(2)),
        effectiveRegularDays: parseFloat(effectiveRegularDays.toFixed(2)),
        effectiveOvertimeDays: parseFloat(effectiveOvertimeDays.toFixed(2)),
        totalEffectiveDays: parseFloat(totalEffectiveDays.toFixed(2))
      };
    });
  }, [deferredEmployees, globalSettings]);

  const totalEffectiveDaysAll = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.totalEffectiveDays, 0), 
  [chartData]);

  const hasValidData = useMemo(() => {
    return chartData.some(item => item.totalHours > 0);
  }, [chartData]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col h-[45vh] min-h-[350px] transition-all duration-500 ease-in-out">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          工时统计图表 
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded ml-2 animate-pulse">Live</span>
        </h3>
        <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-2">
           <span className="text-xs text-blue-600 font-medium">本月总有效工天:</span>
           <span className="text-lg font-bold text-blue-800">{parseFloat(totalEffectiveDaysAll.toFixed(2))} 工</span>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0 relative">
        {!hasValidData ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <p className="text-sm">暂无考勤数据</p>
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                isAnimationActive={true} 
                animationDuration={200}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="regularHours" 
                name="正常工时 (h)" 
                stackId="a" 
                fill="#3b82f6" 
                barSize={30} 
                isAnimationActive={true} 
                animationDuration={1000}
              />
              <Bar 
                dataKey="overtimeHours" 
                name="加班工时 (h)" 
                stackId="a" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]} 
                barSize={30} 
                isAnimationActive={true}
                animationDuration={1000}
              >
                 <LabelList 
                   dataKey="totalEffectiveDays" 
                   position="top" 
                   style={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                   formatter={(val: number) => val > 0 ? `${val}工` : ''} 
                 />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};