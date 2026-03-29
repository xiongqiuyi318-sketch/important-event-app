import { useState } from 'react';
import { useAccess } from '../context/AccessContext';
import './PasswordProtection.css';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const { mode, loading, signInEditor } = useAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('请输入编辑者邮箱');
      return;
    }

    setSubmitting(true);
    const result = await signInEditor(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setError('');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="password-protection">
        <div className="password-container">
          <div className="password-box">
            <h2>重要事件备忘录</h2>
            <p className="password-hint">正在检查登录状态...</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'editor') {
    return <>{children}</>;
  }

  return (
    <div className="password-protection">
      <div className="password-container">
        <div className="password-box">
          <h2>重要事件备忘录</h2>
          <p className="password-hint">编辑者登录后可创建和修改事件。</p>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="编辑者邮箱"
              autoFocus
              className="password-input"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="编辑者密码"
              className="password-input"
            />
            {error && <div className="password-error">{error}</div>}
            <div className="auth-actions">
              <button type="submit" className="password-submit" disabled={submitting}>
                {submitting ? '登录中...' : '编辑者登录'}
              </button>
              {/* 仅保留编辑者登录 */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
