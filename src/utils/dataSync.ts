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
    // 检查文本是否为空
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        message: '数据为空，请检查粘贴的内容',
        count: 0,
      };
    }

    // 检查数据大小（如果超过 10MB，可能有问题）
    if (text.length > 10 * 1024 * 1024) {
      return {
        success: false,
        message: `数据过大（${(text.length / 1024 / 1024).toFixed(2)}MB），请检查数据是否完整`,
        count: 0,
      };
    }

    // 检查 JSON 是否完整（简单检查括号匹配）
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/\]/g) || []).length;
    
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      return {
        success: false,
        message: '数据不完整，可能被截断了。请确保复制了完整的数据，或使用"导出为文件"功能重新导出',
        count: 0,
      };
    }

    let data: ExportData;
    try {
      data = JSON.parse(text) as ExportData;
    } catch (parseError) {
      // 提供更详细的解析错误信息
      const errorMessage = parseError instanceof Error ? parseError.message : '未知错误';
      // 检查是否是常见的 JSON 格式错误
      if (errorMessage.includes('Unexpected end') || errorMessage.includes('end of data')) {
        return {
          success: false,
          message: '数据不完整，可能被截断了。请确保复制了完整的数据，或使用"导出为文件"功能重新导出',
          count: 0,
        };
      }
      if (errorMessage.includes('Unexpected token')) {
        return {
          success: false,
          message: `JSON 格式错误：${errorMessage}。请检查数据格式是否正确`,
          count: 0,
        };
      }
      return {
        success: false,
        message: `数据解析失败：${errorMessage}。请检查数据是否完整`,
        count: 0,
      };
    }
    
    // 验证数据格式
    if (!data.events || !Array.isArray(data.events)) {
      return {
        success: false,
        message: '数据格式不正确：缺少 events 数组',
        count: 0,
      };
    }

    // 验证事件数量是否与声明的一致
    if (data.eventsCount !== undefined && data.events.length !== data.eventsCount) {
      console.warn(`警告：声明的事件数量(${data.eventsCount})与实际数量(${data.events.length})不一致`);
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
    // 捕获其他未预期的错误
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('导入数据时发生错误:', error);
    return {
      success: false,
      message: `导入失败：${errorMessage}`,
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








