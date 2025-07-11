import type { Period } from "../types/financial";

export class PeriodModel implements Period {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  order: number;
  isActual: boolean;

  constructor(data: Partial<Period> & { name: string; startDate: Date; endDate: Date; order: number }) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.order = data.order;
    this.isActual = data.isActual || false;
  }

  private generateId(): string {
    return `period_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDurationInMonths(): number {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  isFuture(): boolean {
    return this.startDate > new Date();
  }

  isPast(): boolean {
    return this.endDate < new Date();
  }

  isCurrent(): boolean {
    const now = new Date();
    return this.contains(now);
  }

  formatShort(): string {
    const year = this.startDate.getFullYear();
    const month = this.startDate.getMonth() + 1;
    return `${year}/${month}`;
  }

  formatLong(): string {
    const startYear = this.startDate.getFullYear();
    const startMonth = this.startDate.getMonth() + 1;
    const endYear = this.endDate.getFullYear();
    const endMonth = this.endDate.getMonth() + 1;
    
    if (startYear === endYear && startMonth === endMonth) {
      return `${startYear}年${startMonth}月`;
    } else if (startYear === endYear) {
      return `${startYear}年${startMonth}月〜${endMonth}月`;
    } else {
      return `${startYear}年${startMonth}月〜${endYear}年${endMonth}月`;
    }
  }
}