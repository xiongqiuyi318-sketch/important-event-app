import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { loadEvents, updateEvent, deleteEvent } from '../utils/storage';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import EventForm from '../components/EventForm';
import './EventDetailPage.css';

type CompressOptions = {
  maxBytes: number;
  maxWidth: number;
  maxHeight: number;
  mimeType: 'image/jpeg' | 'image/webp';
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mimeType, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function compressImageToDataUrl(
  file: File,
  opts: CompressOptions
): Promise<{ dataUrl: string; outBlob: Blob }> {
  if (!file.type.startsWith('image/')) throw new Error('Not an image');

  const img = await loadImageFromFile(file);
  const scale = Math.min(1, opts.maxWidth / img.width, opts.maxHeight / img.height);
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const qualities = [0.9, 0.82, 0.75, 0.68, 0.6, 0.52, 0.45, 0.38, 0.32, 0.26];
  let lastBlob: Blob | null = null;

  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, opts.mimeType, q);
    lastBlob = blob;
    if (blob.size <= opts.maxBytes) {
      return { dataUrl: await blobToDataUrl(blob), outBlob: blob };
    }
  }

  if (!lastBlob) throw new Error('Compression failed');
  return { dataUrl: await blobToDataUrl(lastBlob), outBlob: lastBlob };
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newStepContent, setNewStepContent] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepContent, setEditingStepContent] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [editingStatusImage, setEditingStatusImage] = useState('');
  const [editingStatusImageMeta, setEditingStatusImageMeta] = useState<{ name?: string; type?: string; size?: number } | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [editingReminderEnabled, setEditingReminderEnabled] = useState(false);

  const loadEventData = useCallback(() => {
    const events = loadEvents();
    const found = events.find(e => e.id === id);
    if (found) {
      setEvent(found);
    } else {
      navigate('/');
    }
  }, [id, navigate]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  if (!event) {
    return <div className="loading">加载中...</div>;
  }

  const completedSteps = event.steps.filter(s => s.completed).length;
  const totalSteps = event.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const priorityLabels: Record<number, string> = {
    1: '紧急',
    2: '重要',
    3: '一般',
    4: '其他'
  };

  const priorityColors: Record<number, string> = {
    1: '#ff4444',
    2: '#ff8800',
    3: '#4488ff',
    4: '#888888'
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除事件"${event.title}"吗？`)) {
      deleteEvent(event.id);
      navigate('/');
    }
  };

  const handleToggleStep = (stepId: string) => {
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    const allCompleted = updatedSteps.every(step => step.completed);
    updateEvent(event.id, { steps: updatedSteps, completed: allCompleted });
    loadEventData();
  };

  const handleAddStep = () => {
    if (newStepContent.trim()) {
      const newStep = {
        id: `step-${Date.now()}`,
        content: newStepContent.trim(),
        completed: false,
        order: event.steps.length
      };
      updateEvent(event.id, { steps: [...event.steps, newStep] });
      setNewStepContent('');
      setShowAddStep(false);
      loadEventData();
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (window.confirm('确定删除此步骤？')) {
      const updatedSteps = event.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index }));
      updateEvent(event.id, { steps: updatedSteps });
      loadEventData();
    }
  };

  const handleUpdateStepContent = (stepId: string) => {
    if (editingStepContent.trim()) {
      const updatedSteps = event.steps.map(step =>
        step.id === stepId ? { ...step, content: editingStepContent.trim() } : step
      );
      updateEvent(event.id, { steps: updatedSteps });
      setEditingStepId(null);
      setEditingStepContent('');
      loadEventData();
    }
  };

  const handleUpdateStepStatus = (stepId: string) => {
    const statusTrimmed = editingStatus.trim();
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? {
        ...step,
        status: statusTrimmed || undefined,
        statusImage: editingStatusImage ? {
          dataUrl: editingStatusImage,
          name: editingStatusImageMeta?.name,
          type: editingStatusImageMeta?.type,
          size: editingStatusImageMeta?.size,
          addedAt: new Date().toISOString()
        } : undefined
      } : step
    );
    updateEvent(event.id, { steps: updatedSteps });
    setEditingStatusId(null);
    setEditingStatus('');
    setEditingStatusImage('');
    setEditingStatusImageMeta(null);
    loadEventData();
  };

  const handleUpdateStepTime = (stepId: string) => {
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? {
        ...step,
        scheduledTime: editingTime ? new Date(editingTime).toISOString() : undefined,
        reminderEnabled: editingReminderEnabled
      } : step
    );
    updateEvent(event.id, { steps: updatedSteps });
    setEditingTimeId(null);
    setEditingTime('');
    setEditingReminderEnabled(false);
    loadEventData();
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const sortedSteps = [...event.steps].sort((a, b) => a.order - b.order);
    const index = sortedSteps.findIndex(s => s.id === stepId);
    if (
      (direction === 'up' && index <= 0) ||
      (direction === 'down' && index >= sortedSteps.length - 1)
    ) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = sortedSteps[index].order;
    sortedSteps[index].order = sortedSteps[swapIndex].order;
    sortedSteps[swapIndex].order = temp;

    updateEvent(event.id, { steps: sortedSteps });
    loadEventData();
  };

  const handleMarkComplete = () => {
    updateEvent(event.id, { completed: true });
    navigate('/');
  };

  if (showEditForm) {
    return (
      <div className="event-detail-page">
        <EventForm
          event={event}
          onSave={() => {
            setShowEditForm(false);
            loadEventData();
          }}
          onCancel={() => setShowEditForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      {/* 紧凑标题栏 */}
      <div className="detail-header-compact">
        <button className="btn-back-compact" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="title-with-tags">
          <h1 className="detail-title-compact">{event.title}</h1>
          <span 
            className="tag-compact"
            style={{ backgroundColor: priorityColors[event.priority] }}
          >
            {priorityLabels[event.priority]}
          </span>
          <span className="tag-compact category">{event.category}</span>
        </div>
        <div className="detail-actions-compact">
          <button className="btn-action-compact edit" onClick={() => setShowEditForm(true)}>
            ✏️ 编辑事件
          </button>
          <button className="btn-action-compact complete" onClick={handleMarkComplete}>
            ✓ 标记完成
          </button>
          <button className="btn-action-compact delete" onClick={handleDelete}>
            🗑️ 删除
          </button>
        </div>
      </div>

      {/* 紧凑进度栏 */}
      <div className="progress-bar-compact">
        <span className="progress-label">进度 {progress}%</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-count">{completedSteps}/{totalSteps} 步骤</span>
        <button 
          className="btn-add-step-compact"
          onClick={() => setShowAddStep(true)}
        >
          + 添加步骤
        </button>
      </div>

      {/* 添加步骤表单 */}
      {showAddStep && (
        <div className="add-step-form-compact">
          <input
            type="text"
            value={newStepContent}
            onChange={(e) => setNewStepContent(e.target.value)}
            placeholder="输入步骤内容..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddStep();
              if (e.key === 'Escape') {
                setShowAddStep(false);
                setNewStepContent('');
              }
            }}
            autoFocus
          />
          <button onClick={handleAddStep}>确定</button>
          <button onClick={() => { setShowAddStep(false); setNewStepContent(''); }}>取消</button>
        </div>
      )}

      {/* 步骤列表 */}
      <div className="steps-container">
        {event.steps.length === 0 ? (
          <div className="no-steps">暂无步骤，点击上方按钮添加</div>
        ) : (
          <ul className="steps-list-compact">
            {event.steps
              .sort((a, b) => a.order - b.order)
              .map((step, index) => {
                const isStepOverdue = step.scheduledTime && new Date(step.scheduledTime) < new Date() && !step.completed;
                return (
                  <li key={step.id} className={`step-item-compact ${step.completed ? 'completed' : ''} ${isStepOverdue ? 'overdue' : ''}`}>
                    <span className="step-num">{index + 1}</span>
                    <label className="step-checkbox-only">
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={() => handleToggleStep(step.id)}
                      />
                    </label>
                    
                    {editingStepId === step.id ? (
                      <div className="step-edit-container">
                        <input
                          type="text"
                          value={editingStepContent}
                          onChange={(e) => setEditingStepContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateStepContent(step.id);
                            if (e.key === 'Escape') {
                              setEditingStepId(null);
                              setEditingStepContent('');
                            }
                          }}
                          className="step-edit-input"
                          autoFocus
                        />
                        <button
                          className="btn-confirm-edit"
                          onClick={() => handleUpdateStepContent(step.id)}
                        >✓</button>
                        <button
                          className="btn-cancel-edit"
                          onClick={() => {
                            setEditingStepId(null);
                            setEditingStepContent('');
                          }}
                        >×</button>
                      </div>
                    ) : (
                      <span className={`step-text ${step.completed ? 'completed-text' : ''}`}>
                        {step.content}
                      </span>
                    )}

                    <div className="step-actions-compact">
                      <button onClick={() => handleMoveStep(step.id, 'up')} disabled={index === 0}>↑</button>
                      <button onClick={() => handleMoveStep(step.id, 'down')} disabled={index === event.steps.length - 1}>↓</button>
                      <button onClick={() => { setEditingStepId(step.id); setEditingStepContent(step.content); }}>✏️</button>
                      <button onClick={() => handleDeleteStep(step.id)}>×</button>
                    </div>

                    {/* 步骤详情行 */}
                    <div className="step-meta-row">
                      {step.scheduledTime && (
                        <span className={`step-time-badge ${isStepOverdue ? 'overdue' : ''}`}>
                          ⏰ {format(new Date(step.scheduledTime), 'MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      )}
                      {step.status && (
                        <span className="step-status-badge">📝 {step.status}</span>
                      )}
                      {step.statusImage?.dataUrl && (
                        <a
                          className="step-status-image-link"
                          href={step.statusImage.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="step-status-image-thumb"
                            src={step.statusImage.dataUrl}
                            alt="状态图片"
                          />
                        </a>
                      )}
                      
                      {editingTimeId === step.id ? (
                        <div className="edit-inline-form">
                          <input
                            type="datetime-local"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                          />
                          <label>
                            <input
                              type="checkbox"
                              checked={editingReminderEnabled}
                              onChange={(e) => setEditingReminderEnabled(e.target.checked)}
                            />
                            提醒
                          </label>
                          <button onClick={() => handleUpdateStepTime(step.id)}>保存</button>
                          <button onClick={() => { setEditingTimeId(null); setEditingTime(''); }}>取消</button>
                        </div>
                      ) : (
                        <button
                          className="btn-meta-compact"
                          onClick={() => {
                            setEditingTimeId(step.id);
                            setEditingTime(step.scheduledTime ? new Date(step.scheduledTime).toISOString().slice(0, 16) : '');
                            setEditingReminderEnabled(step.reminderEnabled || false);
                          }}
                        >
                          + 设置时间
                        </button>
                      )}

                      {editingStatusId === step.id ? (
                        <div className="edit-inline-form">
                          <input
                            type="text"
                            value={editingStatus}
                            onChange={(e) => setEditingStatus(e.target.value)}
                            placeholder="状态描述..."
                          />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              try {
                                const MAX_BYTES = 800 * 1024;
                                const { dataUrl, outBlob } = await compressImageToDataUrl(file, {
                                  maxBytes: MAX_BYTES,
                                  maxWidth: 1600,
                                  maxHeight: 1600,
                                  mimeType: 'image/jpeg'
                                });

                                if (outBlob.size > MAX_BYTES) {
                                  alert('图片太大，已尽力压缩仍超过 800KB。请换图或先压缩后再选。');
                                  e.target.value = '';
                                  return;
                                }

                                setEditingStatusImage(dataUrl);
                                setEditingStatusImageMeta({ name: file.name, type: outBlob.type, size: outBlob.size });
                              } catch {
                                alert('图片处理失败，请换一张图片重试。');
                                e.target.value = '';
                              }
                            }}
                          />

                          {editingStatusImage && (
                            <div className="status-image-preview-row">
                              <img
                                className="status-image-preview"
                                src={editingStatusImage}
                                alt="预览"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStatusImage('');
                                  setEditingStatusImageMeta(null);
                                }}
                              >
                                移除图片
                              </button>
                            </div>
                          )}
                          <button onClick={() => handleUpdateStepStatus(step.id)}>保存</button>
                          <button onClick={() => {
                            setEditingStatusId(null);
                            setEditingStatus('');
                            setEditingStatusImage('');
                            setEditingStatusImageMeta(null);
                          }}>取消</button>
                        </div>
                      ) : (
                        <button
                          className="btn-meta-compact"
                          onClick={() => {
                            setEditingStatusId(step.id);
                            setEditingStatus(step.status || '');
                            setEditingStatusImage(step.statusImage?.dataUrl || '');
                            setEditingStatusImageMeta(
                              step.statusImage
                                ? { name: step.statusImage.name, type: step.statusImage.type, size: step.statusImage.size }
                                : null
                            );
                          }}
                        >
                          + 添加状态
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
