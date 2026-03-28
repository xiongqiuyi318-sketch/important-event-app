import { useState, useEffect } from 'react';
import { Event, StepAttachment, StepStatusImage } from '../types';
import { useAccess } from '../context/AccessContext';
import { loadEvents, deleteEvent } from '../services/eventStorageService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import JSZip from 'jszip';
import {
  safeFilename,
  buildStepDocumentDownloadName,
  buildStepImageFilename,
  getImageExtension,
} from '../utils/fileDownload';
import { downloadDataUrlAsFile, openDataUrlInNewWindow } from '../utils/dataUrlActions';
import './HistoryPage.css';

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return await res.blob();
};

const getStepStatusImages = (step: Event['steps'][number]): StepStatusImage[] => {
  if (Array.isArray(step.statusImages) && step.statusImages.length > 0) {
    return step.statusImages.filter((img) => Boolean(img?.dataUrl)).slice(0, 3);
  }
  return step.statusImage?.dataUrl ? [step.statusImage] : [];
};

const getStepAttachments = (
  step: Event['steps'][number],
  key: 'excelDocuments' | 'pdfDocuments'
): StepAttachment[] => {
  const arr = step[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter((d) => Boolean(d?.dataUrl)).slice(0, 3);
};

const hasAnyStepAttachment = (event: Event): boolean => {
  return (event.steps || []).some(
    (s) =>
      getStepStatusImages(s).length > 0 ||
      getStepAttachments(s, 'excelDocuments').length > 0 ||
      getStepAttachments(s, 'pdfDocuments').length > 0
  );
};

export default function HistoryPage() {
  const { canEdit } = useAccess();
  const [events, setEvents] = useState<Event[]>([]);

  const handleOpenDataUrl = async (dataUrl: string) => {
    try {
      await openDataUrlInNewWindow(dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'POPUP_BLOCKED') {
        alert('无法打开新窗口，请允许浏览器弹窗，或先点「下载」保存后查看。');
      } else {
        alert('无法在新窗口打开，请使用「下载」保存后用本地应用查看（微信内可点右上角用系统浏览器打开本页再试）。');
      }
    }
  };

  const handleDownloadDataUrl = async (dataUrl: string, filename: string) => {
    try {
      await downloadDataUrlAsFile(dataUrl, filename);
    } catch {
      alert('下载失败，请稍后再试；若在微信内，可尝试用系统浏览器打开本页后下载。');
    }
  };

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
    const sortedSteps = [...(event.steps || [])].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedSteps.length; i++) {
      const step = sortedSteps[i];
      const images = getStepStatusImages(step);
      for (let j = 0; j < images.length; j++) {
        const image = images[j];
        const blob = await dataUrlToBlob(image.dataUrl);
        const filename = `${buildStepImageFilename(event.title, i + 1, image.dataUrl, image.type).replace(/\.[^.]+$/, '')}-图${j + 1}.${getImageExtension(image.dataUrl, image.type)}`;
        folder.file(filename, blob);
        count++;
      }
      const excels = getStepAttachments(step, 'excelDocuments');
      for (let j = 0; j < excels.length; j++) {
        const doc = excels[j];
        const blob = await dataUrlToBlob(doc.dataUrl);
        const filename = buildStepDocumentDownloadName(event.title, i + 1, j + 1, 'excel', doc);
        folder.file(filename, blob);
        count++;
      }
      const pdfs = getStepAttachments(step, 'pdfDocuments');
      for (let j = 0; j < pdfs.length; j++) {
        const doc = pdfs[j];
        const blob = await dataUrlToBlob(doc.dataUrl);
        const filename = buildStepDocumentDownloadName(event.title, i + 1, j + 1, 'pdf', doc);
        folder.file(filename, blob);
        count++;
      }
    }

    if (count === 0) {
      alert('没有可下载的步骤附件（图片 / Excel / PDF）。');
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

    alert('附件已下载到“确认”文件夹');
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
                  {hasAnyStepAttachment(event) && (
                    <button
                      className="btn-download-confirm"
                      onClick={() => downloadConfirmZipForEvent(event)}
                      title="下载该事件所有步骤的图片、Excel、PDF（打包为确认.zip）"
                    >
                      一键下载确认附件
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
                    {[...event.steps].sort((a, b) => a.order - b.order).map((step, index) => {
                      const stepImages = getStepStatusImages(step);
                      const excelDocs = getStepAttachments(step, 'excelDocuments');
                      const pdfDocs = getStepAttachments(step, 'pdfDocuments');
                      return (
                        <li key={step.id} className={step.completed ? 'completed-step' : ''}>
                          <div className="step-content-wrapper">
                            <span>{step.content}</span>
                            {step.status && (
                              <div className="step-status-history">
                                <span className="step-status-label">状态：</span>
                                <span className="step-status-text">{step.status}</span>
                              </div>
                            )}
                            {stepImages.length > 0 && (
                              <div className="step-status-image-history-list">
                                {stepImages.map((img, imgIndex) => (
                                  <div className="step-status-image-history" key={`${step.id}-img-${imgIndex}`}>
                                    <span className="step-status-label">图片{imgIndex + 1}：</span>
                                    <button
                                      type="button"
                                      className="step-history-image-preview-btn"
                                      title="查看大图"
                                      onClick={() => void handleOpenDataUrl(img.dataUrl)}
                                    >
                                      <img
                                        className="step-status-image-thumb"
                                        src={img.dataUrl}
                                        alt={`状态图片${imgIndex + 1}`}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      className="step-status-image-download"
                                      title="下载该步骤图片"
                                      onClick={() =>
                                        void handleDownloadDataUrl(
                                          img.dataUrl,
                                          `${buildStepImageFilename(
                                            event.title,
                                            index + 1,
                                            img.dataUrl,
                                            img.type
                                          ).replace(/\.[^.]+$/, '')}-图${imgIndex + 1}.${getImageExtension(img.dataUrl, img.type)}`
                                        )
                                      }
                                    >
                                      下载图片{imgIndex + 1}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {excelDocs.length > 0 && (
                              <div className="step-doc-history-block">
                                <span className="step-status-label">Excel：</span>
                                {excelDocs.map((doc, di) => (
                                  <span key={`${step.id}-xls-${di}`} className="step-doc-history-actions">
                                    <span className="step-doc-history-name" title={doc.name}>
                                      {doc.name || `Excel${di + 1}`}
                                    </span>
                                    <button
                                      type="button"
                                      className="step-status-image-download"
                                      onClick={() =>
                                        void handleDownloadDataUrl(
                                          doc.dataUrl,
                                          buildStepDocumentDownloadName(
                                            event.title,
                                            index + 1,
                                            di + 1,
                                            'excel',
                                            doc
                                          )
                                        )
                                      }
                                    >
                                      下载
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            {pdfDocs.length > 0 && (
                              <div className="step-doc-history-block">
                                <span className="step-status-label">PDF：</span>
                                {pdfDocs.map((doc, di) => (
                                  <span key={`${step.id}-pdf-${di}`} className="step-doc-history-actions">
                                    <span className="step-doc-history-name" title={doc.name}>
                                      {doc.name || `PDF${di + 1}`}
                                    </span>
                                    <button
                                      type="button"
                                      className="step-status-image-download"
                                      onClick={() =>
                                        void handleDownloadDataUrl(
                                          doc.dataUrl,
                                          buildStepDocumentDownloadName(
                                            event.title,
                                            index + 1,
                                            di + 1,
                                            'pdf',
                                            doc
                                          )
                                        )
                                      }
                                    >
                                      下载
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
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
