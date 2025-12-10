import { useState, useEffect, useRef } from 'react';
import { Event, EventCategory, EventPriority } from '../types';
import { addEvent, updateEvent, loadEvents } from '../utils/storage';
import { generateStepsForCategory, updateStepsFromDescription } from '../utils/stepGenerator';
import './EventForm.css';

interface EventFormProps {
  event?: Event;
  onSave: () => void;
  onCancel: () => void;
}

interface ValidationError {
  field: 'title' | 'category' | 'priority';
  label: string;
  message: string;
}

const categories: EventCategory[] = [
  '发货', '进口', '本地销售', '开会', '学习', 
  '项目开发', '活动策划', '机械维修', '其他'
];

export default function EventForm({ event, onSave, onCancel }: EventFormProps) {
  // 表单数据状态 - 改成强制选择（无默认值）
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [category, setCategory] = useState<EventCategory | ''>(event?.category || '');
  const [priority, setPriority] = useState<EventPriority | ''>(event?.priority || '');
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
  
  // 验证状态
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  
  // 用于自动滚动到错误字段
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);

  // 验证函数
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // 验证标题
    if (!title || title.trim() === '') {
      errors.push({
        field: 'title',
        label: '事件标题',
        message: '请输入事件标题'
      });
    } else if (title.trim().length < 2) {
      errors.push({
        field: 'title',
        label: '事件标题',
        message: '事件标题至少需要2个字符'
      });
    }
    
    // 验证分类
    if (!category || category === '') {
      errors.push({
        field: 'category',
        label: '事件分类',
        message: '请选择事件分类'
      });
    }
    
    // 验证优先级
    if (!priority || priority === '') {
      errors.push({
        field: 'priority',
        label: '优先级',
        message: '请选择优先级'
      });
    }
    
    return errors;
  };
  
  // 清除特定字段的错误
  const clearFieldError = (field: 'title' | 'category' | 'priority') => {
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };
  
  // 滚动到第一个错误字段并聚焦
  const scrollToFirstError = (errors: ValidationError[]) => {
    if (errors.length === 0) return;
    
    const firstError = errors[0];
    let element: HTMLElement | null = null;
    
    switch (firstError.field) {
      case 'title':
        element = titleRef.current;
        break;
      case 'category':
        element = categoryRef.current;
        break;
      case 'priority':
        element = priorityRef.current;
        break;
    }
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        element?.focus();
      }, 300);
    }
  };

  // 当标题或描述变化时，自动生成步骤（仅新建事件）
  useEffect(() => {
    if (!event && category && category !== '' && (title || description)) {
      const generatedSteps = generateStepsForCategory(category as EventCategory, title, description);
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

    // 执行验证
    const errors = validateForm();
    
    if (errors.length > 0) {
      // 有错误：显示错误
      setValidationErrors(errors);
      setShowErrorModal(true);
      
      // 标记所有字段为已触摸
      setTouched(new Set(['title', 'category', 'priority']));
      
      // 不提交表单
      return;
    }

    // 验证通过：保存数据
    const eventData: Event = {
      id: event?.id || `event-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category as EventCategory,
      priority: priority as EventPriority,
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
  
  // 处理错误弹窗关闭
  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    // 关闭弹窗后滚动到第一个错误字段
    setTimeout(() => {
      scrollToFirstError(validationErrors);
    }, 100);
  };

  // 获取字段的错误信息
  const getFieldError = (field: 'title' | 'category' | 'priority'): string | null => {
    if (!touched.has(field)) return null;
    const error = validationErrors.find(e => e.field === field);
    return error ? error.message : null;
  };

  return (
    <div className="modal-overlay">
      <div className="event-form-modal">
        <h2>{event ? '编辑事件' : '新增事件'}</h2>
        
        {/* 错误提示弹窗 */}
        {showErrorModal && validationErrors.length > 0 && (
          <div className="error-modal-overlay" onClick={handleCloseErrorModal}>
            <div className="error-modal" onClick={(e) => e.stopPropagation()}>
              <div className="error-modal-header">
                <h3>⚠️ 无法创建事件</h3>
              </div>
              <div className="error-modal-content">
                <p>以下必填项未填写：</p>
                <ul className="error-list">
                  {validationErrors.map((error, index) => (
                    <li key={index}>
                      <span className="error-icon">❌</span>
                      <span className="error-text">{error.label}：{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="error-modal-actions">
                <button 
                  type="button"
                  className="btn-error-ok" 
                  onClick={handleCloseErrorModal}
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* 事件标题 - 必填 */}
          <div className={`form-group ${getFieldError('title') ? 'has-error' : ''}`}>
            <label className="form-label required">
              事件标题
              <span className="required-mark">🔴 必填</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              className={`form-input ${getFieldError('title') ? 'error' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError('title');
              }}
              onBlur={() => setTouched(prev => new Set([...prev, 'title']))}
              placeholder="请输入事件标题"
            />
            {getFieldError('title') && (
              <div className="field-error">
                <span className="error-icon">❌</span>
                <span>{getFieldError('title')}</span>
              </div>
            )}
          </div>

          {/* 事件分类 - 必填 */}
          <div className={`form-group ${getFieldError('category') ? 'has-error' : ''}`}>
            <label className="form-label required">
              事件分类
              <span className="required-mark">🔴 必填</span>
            </label>
            <select
              ref={categoryRef}
              className={`form-input ${getFieldError('category') ? 'error' : ''}`}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as EventCategory);
                clearFieldError('category');
              }}
              onBlur={() => setTouched(prev => new Set([...prev, 'category']))}
            >
              <option value="">请选择事件分类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {getFieldError('category') && (
              <div className="field-error">
                <span className="error-icon">❌</span>
                <span>{getFieldError('category')}</span>
              </div>
            )}
          </div>

          {/* 优先级 - 必填 */}
          <div className={`form-group ${getFieldError('priority') ? 'has-error' : ''}`}>
            <label className="form-label required">
              优先级
              <span className="required-mark">🔴 必填</span>
            </label>
            <select
              ref={priorityRef}
              className={`form-input ${getFieldError('priority') ? 'error' : ''}`}
              value={priority}
              onChange={(e) => {
                setPriority(Number(e.target.value) as EventPriority);
                clearFieldError('priority');
              }}
              onBlur={() => setTouched(prev => new Set([...prev, 'priority']))}
            >
              <option value="">请选择优先级</option>
              <option value={1}>第一优先级 - 重要且紧急</option>
              <option value={2}>第二优先级 - 重要</option>
              <option value={3}>第三优先级 - 一般</option>
              <option value={4}>第四优先级 - 不重要</option>
            </select>
            {getFieldError('priority') && (
              <div className="field-error">
                <span className="error-icon">❌</span>
                <span>{getFieldError('priority')}</span>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label optional">开始时间 <span className="optional-mark">（选填）</span></label>
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
              <label className="form-label optional">截止时间 <span className="optional-mark">（选填）</span></label>
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
            <label className="form-label optional">事件描述/备注 <span className="optional-mark">（选填）</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入事件描述，系统会根据描述自动生成步骤。每行可以作为一个步骤。"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label optional">完成步骤 <span className="optional-mark">（选填）</span></label>
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
