import { useState, useEffect } from 'react';
import { Event } from '../types';
import { useAccess } from '../context/AccessContext';
import { loadEvents, deleteEvent } from '../services/eventStorageService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import JSZip from 'jszip';
import './HistoryPage.css';

const safeFilename = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return await res.blob();
};

const hasAnyStatusImage = (event: Event): boolean => {
  return (event.steps || []).some((s) => !!s.statusImage?.dataUrl);
};

export default function HistoryPage() {
  const { canEdit } = useAccess();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    void loadHistoryEvents();
  }, []);

  const loadHistoryEvents = async () => {
    const allEvents = await loadEvents();
    // 只显示已完成或过期的事件
    const historyEvents = allEvents
      .filter(e => e.completed || e.expired)
      .sort((a, b) => {
        // 按完成时间或过期时间倒序
        const aTime = a.completed 
          ? new Date(a.createdAt).getTime() 
          : (a.deadline ? new Date(a.deadline).getTime() : 0);
        const bTime = b.completed 
          ? new Date(b.createdAt).getTime() 
          : (b.deadline ? new Date(b.deadline).getTime() : 0);
        return bTime - aTime;
      });
    setEvents(historyEvents);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    const event = events.find(e => e.id === id);
    const eventTitle = event ? event.title : '此事件';
    if (window.confirm(`确定要永久删除事件"${eventTitle}"吗？此操作无法撤销。`)) {
      await deleteEvent(id);
      await loadHistoryEvents();
    }
  };

  const downloadConfirmZipForEvent = async (event: Event) => {
    const zip = new JSZip();
    const folder = zip.folder('确认');
    if (!folder) throw new Error('zip folder failed');

    let count = 0;
    for (let i = 0; i < (event.steps || []).length; i++) {
      const step = event.steps[i];
      const dataUrl = step.statusImage?.dataUrl;
      if (!dataUrl) continue;

      const blob = await dataUrlToBlob(dataUrl);
      const ext =
        blob.type === 'image/png' ? 'png' :
        blob.type === 'image/webp' ? 'webp' :
        'jpg';

      const base = safeFilename(event.title || '事件');
      const filename = `${base}-步骤${i + 1}.${ext}`;
      folder.file(filename, blob);
      count++;
    }

    if (count === 0) {
      alert('没有可下载的状态图片。');
      return;
    }

    const out = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(out);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename(event.title || '事件')}-确认.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    alert('图片已下载到“确认文件夹”');
  };

  const getPriorityLabel = (priority: number) => {
    const labels = {
      1: '重要且紧急',
      2: '重要',
      3: '一般',
      4: '不重要'
    };
    return labels[priority as 1 | 2 | 3 | 4];
  };

  const getPriorityClass = (priority: number) => {
    return `priority-${priority}`;
  };

  return (
    <div className="history-page">
      <h2>历史事件</h2>
      {events.length === 0 ? (
        <div className="empty-state">暂无历史事件</div>
      ) : (
        <div className="history-list">
          {events.map(event => (
            <div key={event.id} className={`history-item ${event.completed ? 'completed' : 'expired'}`}>
              <div className="history-item-header">
                <div className="history-item-title">
                  <h3>{event.title}</h3>
                  <span className={`priority-badge ${getPriorityClass(event.priority)}`}>
                    {getPriorityLabel(event.priority)}
                  </span>
                  <span className="category-badge">{event.category}</span>
                </div>
                <div className="history-item-actions">
                  {hasAnyStatusImage(event) && (
                    <button
                      className="btn-download-confirm"
                      onClick={() => downloadConfirmZipForEvent(event)}
                      title="下载该事件所有步骤的状态图片（打包为确认.zip）"
                    >
                      一键下载确认图片
                    </button>
                  )}
                  <button 
                    className="btn-delete"
                    onClick={() => void handleDelete(event.id)}
                    disabled={!canEdit}
                  >
                    删除
                  </button>
                </div>
              </div>
              
              {event.description && (
                <div className="history-item-description">{event.description}</div>
              )}

              <div className="history-item-meta">
                {event.startTime && (
                  <span>
                    <strong>开始时间：</strong>
                    {format(new Date(event.startTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                )}
                {event.deadline && (
                  <span>
                    <strong>截止时间：</strong>
                    {format(new Date(event.deadline), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                )}
                <span className={event.completed ? 'status-completed' : 'status-expired'}>
                  {event.completed ? '已完成' : (event.expired ? '已过期' : '无截止日期')}
                </span>
              </div>

              {event.steps && event.steps.length > 0 && (
                <div className="history-item-steps">
                  <strong>完成步骤：</strong>
                  <ul>
                    {event.steps.map((step) => (
                      <li 
                        key={step.id} 
                        className={step.completed ? 'completed-step' : ''}
                      >
                        <div className="step-content-wrapper">
                          <span>{step.content}</span>
                          {step.status && (
                            <div className="step-status-history">
                              <span className="step-status-label">状态：</span>
                              <span className="step-status-text">{step.status}</span>
                            </div>
                          )}
                          {step.statusImage?.dataUrl && (
                            <div className="step-status-image-history">
                              <span className="step-status-label">图片：</span>
                              <a href={step.statusImage.dataUrl} target="_blank" rel="noreferrer">
                                <img
                                  className="step-status-image-thumb"
                                  src={step.statusImage.dataUrl}
                                  alt="状态图片"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
