import { HistoryRecord, HistoryFilter, AnalysisResult } from '../types';

const STORAGE_KEY = 'shooting_analysis_history';

export class HistoryService {
  private storage: Storage;

  constructor() {
    this.storage = window.localStorage;
  }

  saveRecord(
    analysisResult: AnalysisResult,
    imageUrl?: string,
    notes?: string,
    trainingType?: string,
    environment?: string,
    tags?: string[]
  ): HistoryRecord {
    const record: HistoryRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      analysisResult,
      imageUrl,
      notes,
      trainingType,
      environment,
      tags,
    };

    const history = this.getAllRecords();
    history.push(record);
    this.saveToStorage(history);

    return record;
  }

  getAllRecords(): HistoryRecord[] {
    const data = this.storage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  getRecordById(id: string): HistoryRecord | undefined {
    return this.getAllRecords().find(record => record.id === id);
  }

  updateRecord(id: string, updates: Partial<HistoryRecord>): HistoryRecord | null {
    const history = this.getAllRecords();
    const index = history.findIndex(record => record.id === id);

    if (index === -1) return null;

    history[index] = { ...history[index], ...updates };
    this.saveToStorage(history);

    return history[index];
  }

  deleteRecord(id: string): boolean {
    const history = this.getAllRecords();
    const filtered = history.filter(record => record.id !== id);

    if (filtered.length === history.length) return false;

    this.saveToStorage(filtered);
    return true;
  }

  filterRecords(filter: HistoryFilter): HistoryRecord[] {
    let records = this.getAllRecords();

    if (filter.dateRange) {
      records = records.filter(
        record =>
          record.timestamp >= filter.dateRange!.start &&
          record.timestamp <= filter.dateRange!.end
      );
    }

    if (filter.trainingType) {
      records = records.filter(
        record => record.trainingType === filter.trainingType
      );
    }

    if (filter.minScore !== undefined) {
      records = records.filter(
        record => record.analysisResult.statistics.totalScore >= filter.minScore!
      );
    }

    if (filter.maxScore !== undefined) {
      records = records.filter(
        record => record.analysisResult.statistics.totalScore <= filter.maxScore!
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      records = records.filter(record => {
        if (!record.tags) return false;
        return filter.tags!.some(tag => record.tags!.includes(tag));
      });
    }

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      records = records.filter(record => {
        return (
          (record.notes?.toLowerCase().includes(keyword) ||
            record.trainingType?.toLowerCase().includes(keyword) ||
            record.environment?.toLowerCase().includes(keyword) ||
            record.tags?.some(tag => tag.toLowerCase().includes(keyword)))
        );
      });
    }

    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllTags(): string[] {
    const records = this.getAllRecords();
    const tagSet = new Set<string>();

    records.forEach(record => {
      if (record.tags) {
        record.tags.forEach(tag => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  }

  getAllTrainingTypes(): string[] {
    const records = this.getAllRecords();
    const typeSet = new Set<string>();

    records.forEach(record => {
      if (record.trainingType) {
        typeSet.add(record.trainingType);
      }
    });

    return Array.from(typeSet).sort();
  }

  exportToCSV(records: HistoryRecord[]): string {
    const headers = [
      'Date',
      'Training Type',
      'Total Score',
      'Average Score',
      'Highest Score',
      'Lowest Score',
      'Total Shots',
      'Average Interval',
      'Trend',
      'Environment',
      'Tags',
      'Notes',
    ];

    const rows = records.map(record => {
      const date = new Date(record.timestamp).toLocaleString('zh-CN');
      const stats = record.analysisResult.statistics;
      const trend = record.analysisResult.trend.isImproving ? 'Improving' : 'Needs work';
      const tags = record.tags?.join('; ') || '';

      return [
        date,
        record.trainingType || '',
        stats.totalScore,
        stats.averageScore.toFixed(2),
        stats.highestScore,
        stats.lowestScore,
        stats.totalShots,
        stats.averageInterval.toFixed(2),
        trend,
        record.environment || '',
        tags,
        record.notes || '',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);
    });

    return [headers.join(','), ...rows].join('\n');
  }

  downloadCSV(filename: string, records: HistoryRecord[]): void {
    const csv = this.exportToCSV(records);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearAll(): void {
    this.storage.removeItem(STORAGE_KEY);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToStorage(records: HistoryRecord[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

export const historyService = new HistoryService();
