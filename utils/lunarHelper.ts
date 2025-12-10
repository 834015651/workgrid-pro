import { Lunar, Solar, HolidayUtil } from 'lunar-javascript';

export interface LunarInfo {
  lunarDay: string;      // 初一、十五
  lunarMonth: string;    // 正月、腊月
  jieqi: string;         // 立春、清明 (没有则为空)
  festivals: string[];   // 春节、中秋 (传统节日)
  legalHoliday: string;  // 休、班 (法定节假日标记)
  holidayName: string;   // 国庆节、劳动节 (法定节日名)
  isTerm: boolean;       // 是否是节气
}

/**
 * 获取指定日期的农历和节日信息
 * @param date Date 对象
 */
export const getLunarInfo = (date: Date): LunarInfo => {
  const solar = Solar.fromDate(date);
  const lunar = Lunar.fromDate(date);
  
  // 1. 获取节气 (JieQi)
  const jieqi = lunar.getJieQi(); // 如果当天是节气，返回名称，否则为空

  // 2. 获取传统节日 (Festivals)
  // lunar.getFestivals() 返回的是数组，比如 ['春节']
  const festivals = lunar.getFestivals();

  // 3. 获取法定节假日 (Legal Holidays)
  // 需要注意：lunar-javascript 的 HolidayUtil 数据通常可以在线更新，
  // 或者使用内置的几年数据。如果需要最新的放假安排，可能需要配置。
  // 这里使用基础的 holiday 获取
  const d = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate());
  let legalHoliday = '';
  let holidayName = '';
  
  if (d) {
    legalHoliday = d.isWork() ? '班' : '休';
    holidayName = d.getName();
  } else {
    // 补充逻辑：周末
    const day = date.getDay();
    if (day === 0 || day === 6) {
      // legalHoliday = '休'; // 可选：如果你想标记普通周末
    }
  }

  // 4. 优化显示：如果是初一，显示月份
  let dayStr = lunar.getDayInChinese();
  if (dayStr === '初一') {
    dayStr = lunar.getMonthInChinese() + '月';
  }

  return {
    lunarDay: dayStr,
    lunarMonth: lunar.getMonthInChinese() + '月',
    jieqi: jieqi || '',
    festivals: festivals,
    legalHoliday,
    holidayName,
    isTerm: !!jieqi
  };
};