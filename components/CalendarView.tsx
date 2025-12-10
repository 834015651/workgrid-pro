import React, { useMemo } from 'react';
import { Employee, GlobalSettings, DayEntry } from '../types';
import { DayDetailModal } from './DayDetailModal';
// 🟢 1. 引入我们刚写的农历工具类
import { getLunarInfo } from '../utils/lunarHelper'; 

interface CalendarViewProps {
  employees: Employee[];
  currentMonth: number;
  currentYear: number;
  globalSettings: GlobalSettings;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ employees, currentMonth, currentYear, globalSettings }) => {
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  // Calculate calendar grid
  const { calendarDays, startDayOfWeek } = useMemo(() => {
    const startDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate(); 
    
    return {
      calendarDays: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      startDayOfWeek: startDay
    };
  }, [currentMonth, currentYear]);

  // Calculate Monthly Aggregates
  const monthlyStats = useMemo(() => {
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalWages = 0;
    let totalEffectiveDays = 0;

    employees.forEach(emp => {
      let empRegHours = 0;
      let empOtHours = 0;

      Object.values(emp.days).forEach((d: DayEntry) => {
        const m = Number(d.morning) || 0;
        const a = Number(d.afternoon) || 0;
        const o = Number(d.overtime) || 0;
        empRegHours += (m + a);
        empOtHours += o;
      });

      const effRegDays = globalSettings.standardHoursPerDay > 0 ? empRegHours / globalSettings.standardHoursPerDay : 0;
      const effOtDays = globalSettings.overtimeHoursPerDay > 0 ? empOtHours / globalSettings.overtimeHoursPerDay : 0;
      const empTotalDays = effRegDays + effOtDays;

      totalRegularHours += empRegHours;
      totalOvertimeHours += empOtHours;
      totalEffectiveDays += empTotalDays;
      totalWages += empTotalDays * emp.dailyWage;
    });

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalEffectiveDays,
      totalWages
    };
  }, [employees, globalSettings]);

  // Aggregate data per day
  const dailyStats = useMemo(() => {
    const stats: Record<number, { 
      totalRegular: number; 
      totalOvertime: number; 
      workersPresent: number;
      details: Array<{name: string, type: 'regular' | 'overtime' | 'both', val: string}> 
    }> = {};

    calendarDays.forEach(day => {
      let reg = 0;
      let ot = 0;
      let count = 0;
      const details: Array<{name: string, type: 'regular' | 'overtime' | 'both', val: string}> = [];

      employees.forEach(emp => {
        const d = emp.days[day];
        if (!d) return;
        const m = Number(d.morning) || 0;
        const a = Number(d.afternoon) || 0;
        const o = Number(d.overtime) || 0;
        
        if (m > 0 || a > 0 || o > 0) {
          count++;
          reg += (m + a);
          ot += o;
          
          let type: 'regular' | 'overtime' | 'both' = 'regular';
          if ((m+a) > 0 && o > 0) type = 'both';
          else if (o > 0) type = 'overtime';
          
          if (employees.length <= 8) {
             const valStr = [];
             if (m+a > 0) valStr.push(`${m+a}h`);
             if (o > 0) valStr.push(`+${o}h`);
             details.push({ name: emp.name, type, val: valStr.join(' ') });
          }
        }
      });

      stats[day] = {
        totalRegular: parseFloat(reg.toFixed(2)),
        totalOvertime: parseFloat(ot.toFixed(2)),
        workersPresent: count,
        details
      };
    });

    return stats;
  }, [employees, calendarDays]);

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const blanks = Array.from({ length: startDayOfWeek }, (_, i) => i);

  return (
    <div className="space-y-6">
      <DayDetailModal 
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        day={selectedDay || 1}
        employees={employees}
      />

      {/* Monthly Summary Cards (保持不变) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
           <div className="absolute right-0 top-0 p-3 opacity-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2.9.1-2 .1L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
           </div>
           <div>
             <p className="text-sm font-medium text-slate-500 mb-1">本月总有效工天</p>
             <p className="text-2xl font-bold text-blue-700">{parseFloat(monthlyStats.totalEffectiveDays.toFixed(2))} <span className="text-sm font-medium text-blue-400">工</span></p>
           </div>
           <div className="mt-2 text-xs text-blue-400 bg-blue-50 inline-block px-2 py-1 rounded self-start">基于全局折算规则</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
             <p className="text-sm font-medium text-slate-500 mb-1">正常白班工时</p>
             <p className="text-2xl font-bold text-slate-800">{parseFloat(monthlyStats.totalRegularHours.toFixed(2))} <span className="text-sm font-medium text-slate-400">h</span></p>
           </div>
           <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
           <div>
             <p className="text-sm font-medium text-slate-500 mb-1">加班总工时</p>
             <p className="text-2xl font-bold text-amber-600">{parseFloat(monthlyStats.totalOvertimeHours.toFixed(2))} <span className="text-sm font-medium text-amber-400">h</span></p>
           </div>
           <div className="mt-2 h-1.5 w-full bg-amber-50 rounded-full overflow-hidden">
             <div className="h-full bg-amber-500 rounded-full" style={{ width: `${monthlyStats.totalRegularHours > 0 ? (monthlyStats.totalOvertimeHours / monthlyStats.totalRegularHours) * 100 : 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
           <div className="absolute right-0 top-0 p-3 opacity-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-green-600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.61 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.35 0 .81.91 1.32 2.69 1.87 2.69.89 4.15 2.08 4.15 4.04 0 1.68-1.19 2.81-2.81 3.28z"/></svg>
           </div>
           <div>
             <p className="text-sm font-medium text-slate-500 mb-1">预计总薪资支出</p>
             <p className="text-2xl font-bold text-green-700">¥{Math.round(monthlyStats.totalWages).toLocaleString()}</p>
           </div>
           <div className="mt-2 text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded self-start">{employees.length} 名工人</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map((day, idx) => (
            <div key={day} className={`py-3 text-center text-sm font-semibold ${idx === 0 || idx === 6 ? 'text-amber-600' : 'text-slate-600'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200">
          {/* Blanks */}
          {blanks.map(b => (
            <div key={`blank-${b}`} className="bg-slate-50 min-h-[140px]"></div>
          ))}

          {/* Days */}
          {calendarDays.map(day => {
            const stat = dailyStats[day];
            const dateObj = new Date(currentYear, currentMonth - 1, day);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isToday = new Date().toDateString() === dateObj.toDateString();
            const hasRecords = stat.workersPresent > 0;

            // 🟢 2. 调用农历算法获取详细信息
            const lunarInfo = getLunarInfo(dateObj);
            
            // 🟢 3. 判断是否是放假状态 (如果是法定节假日且不是调休班)
            const isHolidayOff = lunarInfo.legalHoliday === '休';
            // 🟢 4. 判断是否是补班状态 (周末被调休上班)
            const isWorkShift = lunarInfo.legalHoliday === '班';

            // 决定显示什么文字 (优先级：法定节日 > 传统节日 > 节气 > 农历日期)
            let lunarLabel = lunarInfo.lunarDay;
            let labelColor = 'text-slate-400';
            
            if (lunarInfo.holidayName) {
               lunarLabel = lunarInfo.holidayName;
               labelColor = 'text-red-500 font-bold';
            } else if (lunarInfo.festivals.length > 0) {
               lunarLabel = lunarInfo.festivals[0];
               labelColor = 'text-red-500 font-bold'; // 传统节日也标红
            } else if (lunarInfo.jieqi) {
               lunarLabel = lunarInfo.jieqi;
               labelColor = 'text-teal-600 font-medium'; // 节气用青色
            }

            return (
              <div 
                key={day} 
                className={`
                  min-h-[140px] p-2 transition-all relative flex flex-col group cursor-pointer
                  ${isToday ? 'bg-white ring-2 ring-inset ring-blue-500 z-10 shadow-md' : ''}
                  ${!isToday && isHolidayOff ? 'bg-red-50/40 hover:bg-red-50' : ''}
                  ${!isToday && !isHolidayOff && isWeekend && !isWorkShift ? 'bg-slate-100/60 hover:bg-slate-100' : ''}
                  ${!isToday && !isHolidayOff && (!isWeekend || isWorkShift) ? 'bg-white hover:bg-blue-50/50' : ''}
                `}
                onClick={() => setSelectedDay(day)}
                title={`农历${lunarInfo.lunarMonth}${lunarInfo.lunarDay} ${lunarInfo.jieqi ? '- ' + lunarInfo.jieqi : ''}`}
              >
                {/* 🟢 5. 更新后的日期头部 */}
                <div className="flex justify-between items-start mb-2 pointer-events-none">
                   <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors shadow-sm
                        ${isToday ? 'bg-blue-600 text-white' : 
                          isHolidayOff ? 'bg-white text-red-600 border border-red-200' : 
                          hasRecords ? 'bg-white text-slate-800 border border-slate-200' : 'text-slate-400'}
                      `}>
                        {day}
                      </span>
                      
                      {/* 农历/节日文字显示 */}
                      <span className={`text-[10px] scale-95 origin-left ${labelColor}`}>
                         {lunarLabel}
                      </span>
                   </div>

                   {/* 右上角角标区 */}
                   <div className="flex flex-col items-end gap-1">
                      {/* 法定节假日/补班 角标 */}
                      {lunarInfo.legalHoliday && (
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded leading-none ${
                           lunarInfo.legalHoliday === '休' ? 'text-red-500 bg-red-100' : 'text-slate-500 bg-slate-200'
                        }`}>
                           {lunarInfo.legalHoliday}
                        </span>
                      )}
                      
                      {/* 如果是今天 */}
                      {isToday && !lunarInfo.legalHoliday && (
                         <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shadow-sm">
                           今天
                        </span>
                      )}

                      {/* 工人人数统计 */}
                      {stat.workersPresent > 0 && employees.length > 8 && (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {stat.workersPresent}人
                        </span>
                      )}
                   </div>
                </div>

                {/* Content (保持不变) */}
                {stat.workersPresent > 0 ? (
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pointer-events-none">
                     {employees.length > 5 ? (
                       <div className="flex flex-col gap-1.5 mt-1">
                          {stat.totalRegular > 0 && (
                            <div className="flex items-center justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded border border-blue-100 shadow-sm">
                               <span className="opacity-75">正常</span>
                               <span className="font-bold">{stat.totalRegular}h</span>
                            </div>
                          )}
                          {stat.totalOvertime > 0 && (
                            <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-700 px-2 py-1.5 rounded border border-amber-100 shadow-sm">
                               <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> 加班</span>
                               <span className="font-bold">{stat.totalOvertime}h</span>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="space-y-1">
                         {stat.details.map((det, idx) => (
                           <div 
                              key={idx} 
                              className={`
                                flex items-center justify-between text-[11px] leading-tight p-1.5 rounded border shadow-sm
                                ${det.type === 'overtime' ? 'bg-amber-50 border-amber-100 text-amber-800' : 
                                  det.type === 'both' ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 
                                  'bg-slate-50 border-slate-100 text-slate-700'}
                              `}
                           >
                              <span className="font-medium truncate max-w-[60%]">{det.name}</span>
                              <span className="font-mono font-bold">
                                {det.val}
                              </span>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                ) : (
                   <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-slate-300">无记录</span>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};