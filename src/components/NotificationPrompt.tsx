import { useState, useEffect } from 'react';
import './NotificationPrompt.css';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // 如果权限是默认状态，显示提示
      if (Notification.permission === 'default' && !dismissed) {
        setShowPrompt(true);
      }
    }
  }, [dismissed]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        // 显示测试通知
        new Notification('通知已启用 ✓', {
          body: '您将收到重要事件的提醒通知',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (!('Notification' in window)) {
    return (
      <div className="notification-prompt warning">
        <span className="prompt-icon">⚠️</span>
        <span>您的浏览器不支持通知功能</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="notification-prompt error">
        <span className="prompt-icon">🔕</span>
        <span>通知已被阻止。请在浏览器设置中允许通知。</span>
      </div>
    );
  }

  if (!showPrompt || permission === 'granted') {
    return null;
  }

  return (
    <div className="notification-prompt">
      <div className="prompt-content">
        <span className="prompt-icon">🔔</span>
        <div className="prompt-text">
          <strong>启用通知提醒</strong>
          <p>接收重要事件和截止时间的推送通知</p>
        </div>
      </div>
      <div className="prompt-actions">
        <button className="btn-enable" onClick={requestPermission}>
          启用通知
        </button>
        <button className="btn-dismiss" onClick={handleDismiss}>
          稍后
        </button>
      </div>
    </div>
  );
}



