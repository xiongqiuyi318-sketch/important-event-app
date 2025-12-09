import { useState, useEffect } from 'react';
import { Event, EventCategory, EventPriority } from '../types';
import { addEvent, updateEvent, loadEvents } from '../utils/storage';
import { generateStepsForCategory, updateStepsFromDescription } from '../utils/stepGenerator';
import './EventForm.css';

interface EventFormProps {
  event?: Event;
  onSave: () => void;
  onCancel: () => void;
}

const categories: EventCategory[] = [
  '发货', '进口', '本地销售', '开会', '学习', 
  '项目开发', '活动策划', '机械维修', '其他'
];

export default function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [category, setCategory] = useState<EventCategory>(event?.category || '其他');
  const [priority, setPriority] = useState<EventPriority>(event?.priority || 3);
  const [deadline, setDeadline] = useState(
    event?.deadline ? new Date(event.deadline).toISOString().slice(0, 16) : ''
  );
  const [startTime, setStartTime] = useState(
    event?.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : ''
  );
  const [startTimeReminderEnabled, setStartTimeReminderEnabled] = useState(
    event?.startTimeReminderEnabled || false
  );
  const [startTimeReminderType, setStartTimeReminderType] = useState<'sound' | 'vibration' | 'both'>(
    event?.startTimeReminderType || 'sound'
  );
  const [deadlineReminderEnabled, setDeadlineReminderEnabled] = useState(
    event?.deadlineReminderEnabled || false
  );
  const [deadlineReminderType, setDeadlineReminderType] = useState<'sound' | 'vibration' | 'both'>(
    event?.deadlineReminderType || 'sound'
  );
  const [steps, setSteps] = useState(event?.steps || []);
  const [newStepContent, setNewStepContent] = useState('');

  // 当标题或描述变化时，自动生成步骤（仅新建事件）
  useEffect(() => {
    if (!event && (title || description)) {
      const generatedSteps = generateStepsForCategory(category, title, description);
      setSteps(generatedSteps);
    }
  }, [title, description, category, event]);

  // 当描述变化时（编辑模式），更新步骤
  useEffect(() => {
    if (!event) return;
    
    const originalDescription = event.description || '';
    if (description === originalDescription) return;
    
    const currentSteps = steps.length > 0 ? steps : (event.steps || []);
    const updatedSteps = updateStepsFromDescription(currentSteps, description, category);
    
    // 只有当步骤内容真正改变时才更新
    const currentContents = currentSteps.map(s => s.content).join('|');
    const updatedContents = updatedSteps.map(s => s.content).join('|');
    if (currentContents !== updatedContents) {
      setSteps(updatedSteps);
    }
  }, [description, category, event, steps]);

  const handleAddManualStep = () => {
    if (newStepContent.trim()) {
      const newStep = {
        id: `step-${Date.now()}`,
        content: newStepContent.trim(),
        completed: false,
        order: steps.length
      };
      setSteps([...steps, newStep]);
      setNewStepContent('');
    }
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId).map((s, index) => ({ ...s, order: index })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('请填写事件标题');
      return;
    }

    const eventData: Event = {
      id: event?.id || `event-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      steps: steps.map((s, index) => ({ ...s, order: index })),
      createdAt: event?.createdAt || new Date().toISOString(),
      completed: event?.completed || false,
      expired: false,
      sortOrder: event?.sortOrder || loadEvents().filter(e => e.priority === priority).length,
      startTimeReminderEnabled: startTime && startTimeReminderEnabled ? startTimeReminderEnabled : undefined,
      startTimeReminderType: startTime && startTimeReminderEnabled ? startTimeReminderType : undefined,
      deadlineReminderEnabled: deadline && deadlineReminderEnabled ? deadlineReminderEnabled : undefined,
      deadlineReminderType: deadline && deadlineReminderEnabled ? deadlineReminderType : undefined,
    };

    if (event) {
      updateEvent(event.id, eventData);
    } else {
      addEvent(eventData);
    }

    onSave();
  };

  return (
    <div className="modal-overlay">
      <div className="event-form-modal">
        <h2>{event ? '编辑事件' : '新增事件'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>事件标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入事件标题"
              required
            />
          </div>

          <div className="form-group">
            <label>事件分类 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>优先级 *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as EventPriority)}
            >
              <option value={1}>第一优先级 - 重要且紧急</option>
              <option value={2}>第二优先级 - 重要</option>
              <option value={3}>第三优先级 - 一般</option>
              <option value={4}>第四优先级 - 不重要</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>开始时间</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {startTime && (
                <div className="reminder-settings">
                  <label className="reminder-checkbox">
                    <input
                      type="checkbox"
                      checked={startTimeReminderEnabled}
                      onChange={(e) => setStartTimeReminderEnabled(e.target.checked)}
                    />
                    <span>启用提醒</span>
                  </label>
                  {startTimeReminderEnabled && (
                    <div className="reminder-type-group">
                      <label>
                        <input
                          type="radio"
                          name="startTimeReminder"
                          checked={startTimeReminderType === 'sound'}
                          onChange={() => setStartTimeReminderType('sound')}
                        />
                        铃声
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="startTimeReminder"
                          checked={startTimeReminderType === 'vibration'}
                          onChange={() => setStartTimeReminderType('vibration')}
                        />
                        振动
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="startTimeReminder"
                          checked={startTimeReminderType === 'both'}
                          onChange={() => setStartTimeReminderType('both')}
                        />
                        铃声+振动
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>截止时间 (Deadline)</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              {deadline && (
                <div className="reminder-settings">
                  <label className="reminder-checkbox">
                    <input
                      type="checkbox"
                      checked={deadlineReminderEnabled}
                      onChange={(e) => setDeadlineReminderEnabled(e.target.checked)}
                    />
                    <span>启用提醒</span>
                  </label>
                  {deadlineReminderEnabled && (
                    <div className="reminder-type-group">
                      <label>
                        <input
                          type="radio"
                          name="deadlineReminder"
                          checked={deadlineReminderType === 'sound'}
                          onChange={() => setDeadlineReminderType('sound')}
                        />
                        铃声
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="deadlineReminder"
                          checked={deadlineReminderType === 'vibration'}
                          onChange={() => setDeadlineReminderType('vibration')}
                        />
                        振动
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="deadlineReminder"
                          checked={deadlineReminderType === 'both'}
                          onChange={() => setDeadlineReminderType('both')}
                        />
                        铃声+振动
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>事件描述/备注</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入事件描述，系统会根据描述自动生成步骤。每行可以作为一个步骤。"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>完成步骤</label>
            <div className="steps-list">
              {steps.map((step, index) => (
                <div key={step.id} className="step-item">
                  <span className="step-number">{index + 1}.</span>
                  <span className="step-content">{step.content}</span>
                  <button
                    type="button"
                    className="btn-delete-step"
                    onClick={() => handleDeleteStep(step.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="add-step-control">
              <input
                type="text"
                value={newStepContent}
                onChange={(e) => setNewStepContent(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddManualStep()}
                placeholder="手动添加步骤（回车添加）"
              />
              <button type="button" onClick={handleAddManualStep}>
                添加步骤
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn-submit">
              {event ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
