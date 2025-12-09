import { Event } from '../types';
import { loadEvents, saveEvents } from './storage';

export interface ExportData {
  version: string;
  exportDate: string;
  eventsCount: number;
  events: Event[];
}

// 导出数据
export const exportData = (): ExportData => {
  const events = loadEvents();
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    eventsCount: events.length,
    events: events,
  };
  return exportData;
};

// 导出为JSON文件
export const exportToFile = () => {
  const data = exportData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `重要事件备忘录-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 导出为文本（用于复制粘贴）
export const exportToText = (): string => {
  const data = exportData();
  return JSON.stringify(data);
};

// 从文本导入
export const importFromText = (text: string, mode: 'merge' | 'replace' = 'replace'): { success: boolean; message: string; count: number } => {
  try {
    const data = JSON.parse(text) as ExportData;
    
    // 验证数据格式
    if (!data.events || !Array.isArray(data.events)) {
      return {
        success: false,
        message: '数据格式不正确',
        count: 0,
      };
    }

    if (mode === 'replace') {
      // 替换模式：清空现有数据
      saveEvents(data.events);
      return {
        success: true,
        message: `成功导入 ${data.events.length} 个事件`,
        count: data.events.length,
      };
    } else {
      // 合并模式：保留现有数据，添加新数据
      const existingEvents = loadEvents();
      const existingIds = new Set(existingEvents.map(e => e.id));
      
      // 过滤掉已存在的事件（根据ID）
      const newEvents = data.events.filter(e => !existingIds.has(e.id));
      const mergedEvents = [...existingEvents, ...newEvents];
      
      saveEvents(mergedEvents);
      return {
        success: true,
        message: `成功合并 ${newEvents.length} 个新事件，跳过 ${data.events.length - newEvents.length} 个重复事件`,
        count: newEvents.length,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: '数据解析失败，请检查数据格式',
      count: 0,
    };
  }
};

// 从文件导入
export const importFromFile = (file: File, mode: 'merge' | 'replace' = 'replace'): Promise<{ success: boolean; message: string; count: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = importFromText(text, mode);
      resolve(result);
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        message: '文件读取失败',
        count: 0,
      });
    };
    
    reader.readAsText(file);
  });
};

// 生成二维码数据（压缩版）
export const generateQRData = (): string => {
  const data = exportData();
  // 只导出未完成的事件以减小数据量
  const activeEvents = data.events.filter(e => !e.completed && !e.expired);
  const compactData = {
    v: data.version,
    d: data.exportDate,
    e: activeEvents,
  };
  return JSON.stringify(compactData);
};

// 从二维码数据导入
export const importFromQRData = (qrData: string): { success: boolean; message: string; count: number } => {
  try {
    const data = JSON.parse(qrData);
    const events = data.e || data.events || [];
    
    if (!Array.isArray(events)) {
      return {
        success: false,
        message: '二维码数据格式不正确',
        count: 0,
      };
    }

    // 总是使用合并模式导入二维码数据
    const existingEvents = loadEvents();
    const existingIds = new Set(existingEvents.map((e: Event) => e.id));
    const newEvents = events.filter((e: Event) => !existingIds.has(e.id));
    const mergedEvents = [...existingEvents, ...newEvents];
    
    saveEvents(mergedEvents);
    return {
      success: true,
      message: `成功从二维码导入 ${newEvents.length} 个事件`,
      count: newEvents.length,
    };
  } catch (error) {
    return {
      success: false,
      message: '二维码数据解析失败',
      count: 0,
    };
  }
};

// 检查是否需要备份提醒
export const shouldShowBackupReminder = (): boolean => {
  const lastBackup = localStorage.getItem('lastBackupDate');
  if (!lastBackup) return true;
  
  const daysSinceBackup = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceBackup >= 7; // 7天提醒一次
};

// 记录备份时间
export const recordBackup = () => {
  localStorage.setItem('lastBackupDate', new Date().toISOString());
};

