import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { loadAllEvents, deleteEvent, updateEvent, deleteMultipleEvents } from '../utils/storage';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './CompletedEventsPage.css';

export default function CompletedEventsPage() {
  const navigate = useNavigate();
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(() => {
    const allEvents = loadAllEvents();
    const completed = allEvents.filter(e => e.completed);
    setCompletedEvents(completed);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAll = () => {
    if (selectedIds.size === completedEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(completedEvents.map(e => e.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 个事件吗？此操作无法撤销。`)) {
      deleteMultipleEvents(Array.from(selectedIds));
      loadData();
    }
  };

  const handleDeleteAll = () => {
    if (completedEvents.length === 0) return;
    
    if (window.confirm(`确定要删除所有 ${completedEvents.length} 个已完成事件吗？此操作无法撤销。`)) {
      deleteMultipleEvents(completedEvents.map(e => e.id));
      loadData();
    }
  };

  const handleRestore = (id: string) => {
    updateEvent(id, { completed: false });
    loadData();
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`确定要删除事件"${title}"吗？此操作无法撤销。`)) {
      deleteEvent(id);
      loadData();
    }
  };

  const priorityLabels: Record<number, string> = {
    1: '紧急且重要',
    2: '重要',
    3: '一般',
    4: '不紧急不重要'
  };

  const priorityColors: Record<number, string> = {
    1: '#ff4444',
    2: '#ff8800',
    3: '#4488ff',
    4: '#888888'
  };

  return (
    <div className="completed-events-page">
      <div className="completed-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <h1>✅ 已完成事件</h1>
        <span className="completed-count">共 {completedEvents.length} 个</span>
      </div>

      {completedEvents.length > 0 && (
        <div className="completed-actions">
          <label className="select-all-checkbox">
            <input
              type="checkbox"
              checked={selectedIds.size === completedEvents.length}
              onChange={handleSelectAll}
            />
            全选
          </label>
          <button
            className="btn-delete-selected"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            删除选中 ({selectedIds.size})
          </button>
          <button
            className="btn-delete-all"
            onClick={handleDeleteAll}
          >
            全部删除
          </button>
        </div>
      )}

      {completedEvents.length === 0 ? (
        <div className="no-completed">
          <div className="empty-icon">🎉</div>
          <p>暂无已完成的事件</p>
          <button className="btn-go-home" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      ) : (
        <div className="completed-list">
          {completedEvents.map(event => (
            <div key={event.id} className="completed-item">
              <div className="item-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(event.id)}
                  onChange={() => handleToggleSelect(event.id)}
                />
              </div>
              
              <div className="item-content">
                <div className="item-header">
                  <h3 className="item-title">{event.title}</h3>
                  <span 
                    className="item-priority"
                    style={{ backgroundColor: priorityColors[event.priority] }}
                  >
                    {priorityLabels[event.priority]}
                  </span>
                  <span className="item-category">{event.category}</span>
                </div>
                
                <div className="item-meta">
                  <span className="meta-item">
                    📅 创建于 {format(new Date(event.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                  </span>
                  {event.deadline && (
                    <span className="meta-item">
                      ⏰ 截止于 {format(new Date(event.deadline), 'yyyy-MM-dd', { locale: zhCN })}
                    </span>
                  )}
                  <span className="meta-item">
                    ✓ {event.steps.filter(s => s.completed).length}/{event.steps.length} 步骤
                  </span>
                </div>
              </div>

              <div className="item-actions">
                <button
                  className="btn-restore"
                  onClick={() => handleRestore(event.id)}
                  title="恢复为未完成"
                >
                  ↩️ 恢复
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(event.id, event.title)}
                  title="删除事件"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



