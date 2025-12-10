import { Employee } from './types';

export const NAMES = [
  "李佳彬", "赖勇", "张金长", "仵宁", "刘帅军", 
  "李纺", "张明存", "张新龙", "冯春蕾", "艾伟强", "张玉军"
];

export const ROLES = ["木工", "瓦工", "钢筋工", "普工", "电工"];

// Helper to generate empty month data
export const generateEmptyMonth = () => {
  const days: Record<number, { morning: string; afternoon: string; overtime: string }> = {};
  for (let i = 1; i <= 31; i++) {
    days[i] = { morning: "", afternoon: "", overtime: "" };
  }
  return days;
};

// Generate data for a specific month to simulate different datasets
export const generateMonthData = (monthIndex: number, year: number): Employee[] => {
  return NAMES.map((name, index) => {
    // Assign random role and wage based on index for variety
    const role = ROLES[index % ROLES.length];
    const dailyWage = 200 + (index % 5) * 50; // 200, 250, 300...

    const employee: Employee = {
      id: index + 1,
      name,
      role,
      dailyWage,
      days: generateEmptyMonth(),
    };

    // Randomize data slightly based on month and year to show difference
    const seed = (year * 12 + monthIndex) + (index * 7);

    // Pattern 1: Regular 4.5 shifts (slightly different patterns per month)
    const endDay = 25 + (seed % 5);
    for (let i = 1; i <= endDay; i++) {
      // Simulate weekends or breaks
      // Simple heuristic for weekends based on day index (not accurate calendar but deterministic)
      if ((i + monthIndex) % 7 === 0) continue;

      employee.days[i].morning = "4.5"; // Ensure string format as per types usually
      if (i !== 4 && i !== 12) employee.days[i].afternoon = "4.5"; // Random gaps
    }
    
    // Pattern 2: Some Overtime
    if ((index + monthIndex) % 2 === 0) {
        employee.days[8].overtime = "1.5";
        employee.days[9].overtime = "1";
        employee.days[15].overtime = "2.5";
    }

    return employee;
  });
};