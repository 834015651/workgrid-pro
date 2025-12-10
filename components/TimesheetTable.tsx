import React, { memo, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { Employee, GlobalSettings, DayEntry } from '../types';

export interface BulkUpdateItem {
  empId: number;
  day: number;
  field: 'morning' | 'afternoon' | 'overtime';
  value: string;
}

export interface TimesheetTableRef {
  applyValueToSelection: (value: string) => void;
  getSelection: () => SelectionBounds | null;
}

interface TimesheetTableProps {
  employees: Employee[];
  currentMonth: number;
  currentYear: number;
  visibleDays: number[];
  globalSettings: GlobalSettings;
  onUpdate: (empId: number, day: number, field: 'morning' | 'afternoon' | 'overtime', value: string) => void;
  onBulkUpdate: (updates: BulkUpdateItem[]) => void;
  onAddEmployee: () => void;
  onDeleteEmployee: (id: number) => void;
  onEditEmployee: (employee: Employee) => void;
}

interface SelectionCoord { row: number; col: number; }
interface SelectionBounds { minRow: number; maxRow: number; minCol: number; maxCol: number; }

interface FastInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

const FastInput = memo(({ value, onChange, className, ...props }: FastInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== (value || '')) {
      onChange(localValue);
    }
  };

  return (
    <input
      {...props}
      type="text"
      className={className}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      autoComplete="off"
      draggable={false}
    />
  );
}, (prev, next) => {
  return prev.value === next.value && prev.className === next.className;
});

interface TableMetrics {
  id: number; name: number; role: number; wage: number; label: number; day: number; total: number; effDays: number; estWage: number;
  fontSize: string; headerFontSize: string; padding: string; inputHeight: string; rowHeight: string; headerRowHeight: string; headerHeightPx: number;
}

const METRICS_COMPACT: TableMetrics = { id: 36, name: 80, role: 60, wage: 60, label: 40, day: 34, total: 44, effDays: 50, estWage: 70, fontSize: 'text-[11px]', headerFontSize: 'text-xs', padding: 'p-0.5', inputHeight: 'h-7', rowHeight: 'h-7', headerRowHeight: 'h-8', headerHeightPx: 32 };
const METRICS_STANDARD: TableMetrics = { id: 48, name: 100, role: 80, wage: 80, label: 50, day: 40, total: 50, effDays: 60, estWage: 80, fontSize: 'text-sm', headerFontSize: 'text-sm', padding: 'p-1', inputHeight: 'h-8', rowHeight: 'h-8', headerRowHeight: 'h-8', headerHeightPx: 32 };
const METRICS_COMFORT: TableMetrics = { id: 60, name: 120, role: 100, wage: 100, label: 60, day: 46, total: 60, effDays: 70, estWage: 100, fontSize: 'text-sm', headerFontSize: 'text-base', padding: 'p-2', inputHeight: 'h-10', rowHeight: 'h-10', headerRowHeight: 'h-10', headerHeightPx: 40 };

const getRowDetails = (rowIndex: number) => {
  const empIndex = Math.floor(rowIndex / 3);
  const remainder = rowIndex % 3;
  const field = remainder === 0 ? 'morning' : remainder === 1 ? 'afternoon' : 'overtime';
  return { empIndex, field };
};

const getSelectionBounds = (start: SelectionCoord | null, end: SelectionCoord | null): SelectionBounds | null => {
  if (!start || !end) return null;
  return {
    minRow: Math.min(start.row, end.row), maxRow: Math.max(start.row, end.row),
    minCol: Math.min(start.col, end.col), maxCol: Math.max(start.col, end.col),
  };
};

const isCellInBounds = (row: number, col: number, bounds: SelectionBounds | null) => {
  if (!bounds) return false;
  return row >= bounds.minRow && row <= bounds.maxRow && col >= bounds.minCol && col <= bounds.maxCol;
};

const DaysHeader = memo(({ days, onDayClick, metrics, currentYear, currentMonth }: { days: number[], onDayClick: (day: number) => void, metrics: TableMetrics, currentYear: number, currentMonth: number }) => {
  const isToday = (day: number) => { const today = new Date(); return today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === day; };
  const getWeekday = (day: number) => { const date = new Date(currentYear, currentMonth - 1, day); return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]; };

  return (
  <>
    {days.map((day) => {
      const today = isToday(day);
      const weekday = getWeekday(day);
      const isWeekend = weekday === '日' || weekday === '六';
      return (
        <th key={day} onClick={() => onDayClick(day)} style={{ width: metrics.day, minWidth: metrics.day, top: metrics.headerHeightPx, height: metrics.headerHeightPx }}
          className={`border border-slate-300 text-center font-medium p-0 select-none cursor-pointer transition-all align-middle sticky z-30 ${today ? 'bg-blue-600 text-white ring-2 ring-blue-400' : isWeekend ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white text-slate-700 hover:bg-blue-50'} ${metrics.fontSize}`}
          title={today ? "今天 (点击选中整列)" : "点击选中整列"}
        >
          <div className="flex flex-col leading-none py-1 justify-center h-full"><span>{day}</span><span className={`text-[10px] scale-90 ${today ? 'text-blue-100' : 'text-slate-400'}`}>{weekday}</span></div>
        </th>
      );
    })}
  </>
)});

interface EmployeeRowsProps {
  employee: Employee;
  baseRowIndex: number;
  onUpdate: (empId: number, day: number, field: 'morning' | 'afternoon' | 'overtime', value: string) => void;
  onBulkUpdate: (updates: BulkUpdateItem[]) => void;
  onDeleteEmployee: (id: number) => void;
  onEditEmployee: (employee: Employee) => void;
  selectionBounds: SelectionBounds | null;
  onCellPointerDown: (e: React.PointerEvent, row: number, col: number) => void;
  onPaste: (e: React.ClipboardEvent, row: number, colIndex: number) => void;
  employees: Employee[]; 
  visibleDays: number[];
  globalSettings: GlobalSettings;
  showInfoCols: boolean;
  metrics: TableMetrics;
  stickyPositions: { name: number; role: number; wage: number; label: number };
  isWageMasked: boolean;
}

const EmployeeRows = memo(({ 
  employee, baseRowIndex, onUpdate, onBulkUpdate, onDeleteEmployee, onEditEmployee, selectionBounds,
  onCellPointerDown, onPaste, employees, visibleDays, globalSettings, showInfoCols, metrics, stickyPositions, isWageMasked
}: EmployeeRowsProps) => {
  
  const { id, name, days, role, dailyWage } = employee;
  
  let totalWhiteShiftHours = 0; let totalOvertimeHours = 0;
  (Object.values(days) as DayEntry[]).forEach(d => { totalWhiteShiftHours += (Number(d.morning) || 0) + (Number(d.afternoon) || 0); totalOvertimeHours += (Number(d.overtime) || 0); });
  const effectiveRegularDays = globalSettings.standardHoursPerDay > 0 ? totalWhiteShiftHours / globalSettings.standardHoursPerDay : 0;
  const effectiveOvertimeDays = globalSettings.overtimeHoursPerDay > 0 ? totalOvertimeHours / globalSettings.overtimeHoursPerDay : 0;
  const totalEffectiveDays = effectiveRegularDays + effectiveOvertimeDays;
  const totalSalary = totalEffectiveDays * dailyWage;
  const daysBreakdown = `正常工时折算: ${parseFloat(effectiveRegularDays.toFixed(2))}工\n加班工时折算: ${parseFloat(effectiveOvertimeDays.toFixed(2))}工`;

  const handleInputChange = useCallback((currentRow: number, day: number, field: 'morning' | 'afternoon' | 'overtime', value: string) => {
    if (value !== '' && !/^-?\d*\.?\d*$/.test(value)) return;
    
    if (isCellInBounds(currentRow, day, selectionBounds)) {
       const updates: BulkUpdateItem[] = [];
       const { minRow, maxRow, minCol, maxCol } = selectionBounds!;
       const isMultiEmployee = (maxRow - minRow) > 2;
       for (let r = minRow; r <= maxRow; r++) {
         for (let c = minCol; c <= maxCol; c++) {
           const details = getRowDetails(r);
           if (isMultiEmployee && field !== 'overtime' && details.field === 'overtime') continue;
           if (field === 'overtime' && details.field !== 'overtime') continue;
           if (details.empIndex < employees.length) {
              updates.push({ empId: employees[details.empIndex].id, day: c, field: details.field as any, value: value });
           }
         }
       }
       onBulkUpdate(updates);
    } else {
      onUpdate(id, day, field, value);
    }
  }, [selectionBounds, employees, onBulkUpdate, onUpdate, id]);

  const renderCell = (rowIndex: number, field: 'morning' | 'afternoon' | 'overtime', extraClass = "") => {
    return visibleDays.map((day, colIndex) => {
      const isSelected = isCellInBounds(rowIndex, day, selectionBounds);
      const bgClass = isSelected ? "bg-blue-100/60" : (extraClass || "bg-transparent");
      const textClass = isSelected ? "text-blue-900 font-semibold" : "text-slate-700";

      return (
        <td key={`${field}-${day}`} className={`border border-slate-300 p-0 ${metrics.rowHeight} transition-none select-none ${bgClass}`} style={{ width: metrics.day, minWidth: metrics.day }}>
          <FastInput
            className={`w-full h-full text-center ${metrics.fontSize} focus:outline-none bg-transparent ${textClass} selection:bg-blue-200 cursor-cell`}
            value={String(days[day]?.[field] || '')}
            onChange={(val) => handleInputChange(rowIndex, day, field, val)}
            data-r={rowIndex}
            data-c={day}
            onPointerDown={(e) => onCellPointerDown(e, rowIndex, day)}
            onPaste={(e) => onPaste(e, rowIndex, colIndex)}
          />
        </td>
      );
    });
  };

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors group">
        <td rowSpan={3} style={{ left: 0, width: metrics.name, minWidth: metrics.name }} className={`border border-slate-300 bg-white sticky z-20 select-none px-1 group/name relative align-middle`}>
          <div className="flex flex-col items-center justify-center relative">
             <span className={`font-bold text-slate-800 ${metrics.fontSize}`}>{name}</span>
             {!showInfoCols && <span className={`text-[10px] text-slate-500 bg-slate-100 px-1.5 rounded mt-0.5 scale-90 origin-center`}>{role}</span>}
             <button onClick={() => onEditEmployee(employee)} className="absolute -left-1 top-1/2 -translate-y-[120%] opacity-0 group-hover/name:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-all bg-white shadow-sm border border-slate-200 rounded-full z-10" title="修改工人信息"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
             <button onClick={() => { if(confirm(`确定要删除工人 "${name}" 吗?`)) onDeleteEmployee(id); }} className="absolute -left-1 top-1/2 translate-y-[20%] opacity-0 group-hover/name:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all bg-white shadow-sm border border-slate-200 rounded-full z-10" title="删除工人"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
          </div>
        </td>
        {showInfoCols && <><td rowSpan={3} style={{ left: stickyPositions.role, width: metrics.role, minWidth: metrics.role }} className={`border border-slate-300 bg-white sticky z-20 text-center ${metrics.fontSize} text-slate-600 select-none align-middle`}>{role}</td><td rowSpan={3} style={{ left: stickyPositions.wage, width: metrics.wage, minWidth: metrics.wage }} className={`border border-slate-300 bg-white sticky z-20 text-center ${metrics.fontSize} text-slate-600 select-none align-middle`}>¥{dailyWage}</td></>}
        <td style={{ left: stickyPositions.label, width: metrics.label, minWidth: metrics.label }} className={`border border-slate-300 text-center ${metrics.fontSize} text-red-600 font-medium bg-slate-50 sticky z-20 select-none align-middle`}>上午</td>
        {renderCell(baseRowIndex + 0, 'morning')}
        <td rowSpan={3} style={{ width: metrics.total, minWidth: metrics.total }} className={`border border-slate-300 text-center text-blue-800 bg-blue-50 select-none ${metrics.fontSize} font-medium align-middle`}>{totalWhiteShiftHours > 0 ? parseFloat(totalWhiteShiftHours.toFixed(2)) : ''}</td>
        <td rowSpan={3} style={{ width: metrics.total, minWidth: metrics.total }} className={`border border-slate-300 text-center text-amber-700 bg-amber-50 select-none ${metrics.fontSize} font-medium align-middle`}>{totalOvertimeHours > 0 ? parseFloat(totalOvertimeHours.toFixed(2)) : ''}</td>
        <td rowSpan={3} style={{ width: metrics.effDays, minWidth: metrics.effDays }} className="border border-slate-300 text-center bg-blue-50/50 select-none px-1 align-middle" title={daysBreakdown}><div className="flex flex-col gap-0.5 items-center justify-center h-full"><span className="text-[10px] text-slate-400 scale-90">总工</span><span className={`font-bold text-blue-700 ${metrics.fontSize}`}>{parseFloat(totalEffectiveDays.toFixed(2))}</span></div></td>
        <td rowSpan={3} style={{ width: metrics.estWage, minWidth: metrics.estWage }} className="border border-slate-300 text-center bg-slate-50 select-none px-1 align-middle"><div className="flex flex-col gap-0.5 opacity-75 items-center justify-center h-full"><span className={`font-bold text-slate-600 ${metrics.fontSize}`}>{isWageMasked ? '****' : `¥${Math.round(totalSalary).toLocaleString()}`}</span></div></td>
      </tr>
      <tr className="hover:bg-slate-50 transition-colors group"><td style={{ left: stickyPositions.label, width: metrics.label, minWidth: metrics.label }} className={`border border-slate-300 text-center ${metrics.fontSize} text-red-600 font-medium bg-slate-50 sticky z-20 select-none align-middle`}>下午</td>{renderCell(baseRowIndex + 1, 'afternoon')}</tr>
      <tr className="hover:bg-slate-50 transition-colors border-b-2 border-slate-400 group"><td style={{ left: stickyPositions.label, width: metrics.label, minWidth: metrics.label }} className={`border border-slate-300 text-center ${metrics.fontSize} text-green-600 font-medium bg-green-50 sticky z-20 select-none align-middle`}>加班</td>{renderCell(baseRowIndex + 2, 'overtime', 'bg-green-50/30')}</tr>
    </>
  );
}, (prev, next) => {
  if (prev.employee !== next.employee) return false; 
  if (prev.metrics !== next.metrics) return false; 
  if (prev.showInfoCols !== next.showInfoCols) return false;
  if (prev.isWageMasked !== next.isWageMasked) return false;
  if (prev.visibleDays !== next.visibleDays) return false;
  
  const prevIn = prev.baseRowIndex >= (prev.selectionBounds?.minRow??-1) && prev.baseRowIndex + 2 <= (prev.selectionBounds?.maxRow??-1);
  const nextIn = next.baseRowIndex >= (next.selectionBounds?.minRow??-1) && next.baseRowIndex + 2 <= (next.selectionBounds?.maxRow??-1);
  if (prevIn !== nextIn) return false; 
  if (prev.selectionBounds !== next.selectionBounds && (prevIn || nextIn)) return false; 

  return true; 
});

export const TimesheetTable = forwardRef<TimesheetTableRef, TimesheetTableProps>(({ employees, currentMonth, currentYear, visibleDays, onUpdate, onBulkUpdate, globalSettings, onAddEmployee, onDeleteEmployee, onEditEmployee }, ref) => {
  const [selectionStart, setSelectionStart] = useState<SelectionCoord | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectionCoord | null>(null);
  const [showInfoCols, setShowInfoCols] = useState(false);
  const [isWageMasked, setIsWageMasked] = useState(true);
  const [metrics, setMetrics] = useState<TableMetrics>(METRICS_STANDARD);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1024) setMetrics(METRICS_COMPACT); else if (width >= 1024 && width < 1536) setMetrics(METRICS_STANDARD); else setMetrics(METRICS_COMFORT);
    };
    handleResize(); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectionBounds = useMemo(() => getSelectionBounds(selectionStart, selectionEnd), [selectionStart, selectionEnd]);

  useImperativeHandle(ref, () => ({
    getSelection: () => selectionBounds,
    applyValueToSelection: (value: string) => {
      if (!selectionBounds) return;
      const updates: BulkUpdateItem[] = [];
      const { minRow, maxRow, minCol, maxCol } = selectionBounds;
      const isMultiEmployee = (maxRow - minRow) > 2;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const details = getRowDetails(r);
          if (isMultiEmployee && details.field === 'overtime') continue;
          if (details.empIndex < employees.length) {
            updates.push({ empId: employees[details.empIndex].id, day: c, field: details.field as any, value: value });
          }
        }
      }
      onBulkUpdate(updates);
    }
  }));

  const handlePaste = useCallback((e: React.ClipboardEvent, startRow: number, startColIndex: number) => {
     e.preventDefault();
     const clipboardData = e.clipboardData.getData('text');
     if (!clipboardData) return;
     const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.length > 0);
     if (rows.length === 0) return;
     const updates: BulkUpdateItem[] = [];
     rows.forEach((rowStr, rIdx) => {
       const cols = rowStr.split('\t');
       cols.forEach((value, cIdx) => {
          const targetRow = startRow + rIdx;
          const targetColIndex = startColIndex + cIdx;
          if (targetColIndex < visibleDays.length) {
             const targetDay = visibleDays[targetColIndex];
             const details = getRowDetails(targetRow);
             if (details.empIndex < employees.length) {
                updates.push({ empId: employees[details.empIndex].id, day: targetDay, field: details.field as any, value: value.trim() });
             }
          }
       });
     });
     if (updates.length > 0) onBulkUpdate(updates);
  }, [employees, visibleDays, onBulkUpdate]);

  const grandTotals = useMemo(() => {
    return employees.reduce((acc, emp) => {
      let reg = 0; let ot = 0;
      Object.values(emp.days).forEach((d: DayEntry) => { reg += (Number(d.morning) || 0) + (Number(d.afternoon) || 0); ot += (Number(d.overtime) || 0); });
      const effReg = globalSettings.standardHoursPerDay > 0 ? reg / globalSettings.standardHoursPerDay : 0;
      const effOt = globalSettings.overtimeHoursPerDay > 0 ? ot / globalSettings.overtimeHoursPerDay : 0;
      const effTotal = effReg + effOt;
      return { reg: acc.reg + reg, ot: acc.ot + ot, days: acc.days + effTotal, wages: acc.wages + (effTotal * emp.dailyWage) };
    }, { reg: 0, ot: 0, days: 0, wages: 0 });
  }, [employees, globalSettings]);

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (!isSelectingRef.current) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target) return;
      
      const rStr = target.getAttribute('data-r');
      const cStr = target.getAttribute('data-c');
      if (rStr && cStr) {
        const row = parseInt(rStr);
        const col = parseInt(cStr);
        setSelectionEnd(prev => {
          if (prev && prev.row === row && prev.col === col) return prev;
          return { row, col };
        });
      }
    };
    const handleGlobalUp = () => {
      isSelectingRef.current = false;
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
    if (isSelectingRef.current) {
      window.addEventListener('pointermove', handleGlobalMove);
      window.addEventListener('pointerup', handleGlobalUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, []);

  const handleCellPointerDown = useCallback((e: React.PointerEvent, row: number, col: number) => { 
    (e.target as Element).setPointerCapture(e.pointerId);
    isSelectingRef.current = true;
    setSelectionStart({ row, col }); 
    setSelectionEnd({ row, col }); 
    
    const moveHandler = (ev: PointerEvent) => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement;
        if (target) {
           const r = target.getAttribute('data-r');
           const c = target.getAttribute('data-c');
           if (r && c) setSelectionEnd({ row: parseInt(r), col: parseInt(c) });
        }
    };
    const upHandler = () => {
       isSelectingRef.current = false;
       window.removeEventListener('pointermove', moveHandler);
       window.removeEventListener('pointerup', upHandler);
    };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  }, []);

  const handleDayHeaderClick = useCallback((day: number) => { const maxRow = employees.length * 3 - 1; setSelectionStart({ row: 0, col: day }); setSelectionEnd({ row: maxRow, col: day }); }, [employees.length]);
  
  const stickyPositions = useMemo(() => {
    const namePos = 0; const rolePos = metrics.name; const wagePos = metrics.name + metrics.role;
    let labelPos = metrics.name; if (showInfoCols) labelPos += metrics.role + metrics.wage;
    return { name: namePos, role: rolePos, wage: wagePos, label: labelPos };
  }, [metrics, showInfoCols]);

  const HeaderRow = useMemo(() => (
    <DaysHeader days={visibleDays} onDayClick={handleDayHeaderClick} metrics={metrics} currentYear={currentYear} currentMonth={currentMonth} />
  ), [visibleDays, handleDayHeaderClick, metrics, currentYear, currentMonth]);

  return (
    <div className="space-y-4 transition-all duration-300">
      <div className="overflow-x-auto shadow-lg border border-slate-200 rounded-lg bg-white relative max-h-[70vh]">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr className={metrics.headerRowHeight} style={{ height: metrics.headerHeightPx }}>
                <th rowSpan={2} style={{ left: 0, width: metrics.name, minWidth: metrics.name }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold sticky top-0 z-40 select-none group align-middle`}>
                  <div className="flex items-center justify-between">
                    <span>姓名</span>
                    <button onClick={() => setShowInfoCols(!showInfoCols)} className="text-slate-400 hover:text-blue-600 focus:outline-none transition-colors" title={showInfoCols ? "隐藏详细信息" : "显示工种和日薪"}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </th>
                {showInfoCols && <><th rowSpan={2} style={{ left: stickyPositions.role, width: metrics.role, minWidth: metrics.role }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold sticky top-0 z-40 select-none align-middle`}>工种</th><th rowSpan={2} style={{ left: stickyPositions.wage, width: metrics.wage, minWidth: metrics.wage }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold sticky top-0 z-40 select-none align-middle`}>日薪</th></>}
                <th rowSpan={2} style={{ left: stickyPositions.label, width: metrics.label, minWidth: metrics.label }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold sticky top-0 z-40 select-none align-middle`}>日期</th>
                <th colSpan={visibleDays.length} className={`border border-slate-300 bg-blue-100 text-blue-900 p-0 ${metrics.headerFontSize} font-bold text-center select-none sticky top-0 z-30 align-middle shadow-sm`}>{currentYear}年 {currentMonth}月</th>
                <th rowSpan={2} style={{ width: metrics.total, minWidth: metrics.total }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold select-none text-xs sticky top-0 z-40 align-middle`}>正常<br/><span className="font-normal scale-90 block">工时</span></th>
                <th rowSpan={2} style={{ width: metrics.total, minWidth: metrics.total }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold select-none text-xs sticky top-0 z-40 align-middle`}>加班<br/><span className="font-normal scale-90 block">工时</span></th>
                <th rowSpan={2} style={{ width: metrics.effDays, minWidth: metrics.effDays }} className={`border border-slate-300 bg-blue-50 ${metrics.padding} ${metrics.headerFontSize} font-semibold select-none text-blue-900 sticky top-0 z-40 align-middle`}>有效<br/>工天</th>
                <th rowSpan={2} style={{ width: metrics.estWage, minWidth: metrics.estWage }} className={`border border-slate-300 bg-slate-100 ${metrics.padding} ${metrics.headerFontSize} font-semibold select-none group cursor-pointer sticky top-0 z-40 align-middle`} onClick={() => setIsWageMasked(!isWageMasked)} title="点击显示/隐藏金额"><div className="flex items-center justify-center gap-1">预计<br/>工资</div></th>
              </tr>
              <tr className={metrics.headerRowHeight} style={{ height: metrics.headerHeightPx }}>
                {HeaderRow}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index) => (
                <EmployeeRows 
                  key={emp.id} employee={emp} baseRowIndex={index * 3} onUpdate={onUpdate} onBulkUpdate={onBulkUpdate} onDeleteEmployee={onDeleteEmployee} onEditEmployee={onEditEmployee}
                  selectionBounds={selectionBounds} 
                  onCellPointerDown={handleCellPointerDown} 
                  onPaste={handlePaste} employees={employees} visibleDays={visibleDays}
                  globalSettings={globalSettings} showInfoCols={showInfoCols} metrics={metrics} stickyPositions={stickyPositions} isWageMasked={isWageMasked}
                />
              ))}
            </tbody>
            <tfoot className="font-bold text-slate-700 border-t-2 border-slate-300 bg-slate-50 relative z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
               <tr>
                    <td style={{ left: 0, width: metrics.name, minWidth: metrics.name }} className={`border border-slate-300 bg-slate-100 sticky z-30 p-2 text-center text-slate-900`}>总计</td>
                    {showInfoCols && <><td style={{ left: stickyPositions.role, width: metrics.role, minWidth: metrics.role }} className="border border-slate-300 bg-slate-100 sticky z-30"></td><td style={{ left: stickyPositions.wage, width: metrics.wage, minWidth: metrics.wage }} className="border border-slate-300 bg-slate-100 sticky z-30"></td></>}
                    <td style={{ left: stickyPositions.label, width: metrics.label, minWidth: metrics.label }} className="border border-slate-300 bg-slate-100 sticky z-30"></td>
                    <td colSpan={visibleDays.length} className="border border-slate-300 bg-slate-50 text-right px-4 text-slate-400 text-sm font-medium">全月汇总</td>
                    <td className="border border-slate-300 text-center bg-blue-100 text-slate-800 p-1 text-sm">{parseFloat(grandTotals.reg.toFixed(2))}</td>
                    <td className="border border-slate-300 text-center bg-amber-100 text-amber-800 p-1 text-sm">{parseFloat(grandTotals.ot.toFixed(2))}</td>
                    <td className="border border-slate-300 text-center bg-blue-100 text-blue-800 p-1 text-sm">{parseFloat(grandTotals.days.toFixed(2))}</td>
                    <td className="border border-slate-300 text-center bg-slate-200 text-slate-800 p-1 text-sm">{isWageMasked ? '****' : `¥${Math.round(grandTotals.wages).toLocaleString()}`}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button onClick={onAddEmployee} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-300 border-dashed rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm group">
          <div className="bg-slate-100 group-hover:bg-blue-200 rounded-full p-1 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
          <span className="font-medium">添加新工人</span>
        </button>
      </div>
    </div>
  );
});

TimesheetTable.displayName = 'TimesheetTable';