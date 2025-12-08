import { useState, useEffect } from 'react';
import './PasswordProtection.css';

interface PasswordProtectionProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

// 访问密码：570508
// 如需修改密码，请联系管理员更改此代码中的密码值
const CORRECT_PASSWORD = '570508';
const REMEMBER_PASSWORD_KEY = 'app_remember_password';
const SAVED_PASSWORD_HASH_KEY = 'app_saved_password_hash';

// 简单的密码哈希函数（用于本地存储验证）
const hashPassword = (pwd: string): string => {
  return btoa(pwd + 'salt_570508').substring(0, 32);
};

export default function PasswordProtection({ children, onLogout }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查是否之前选择了记住密码（用于显示复选框状态）
    const shouldRemember = localStorage.getItem(REMEMBER_PASSWORD_KEY) === 'true';
    setRememberPassword(shouldRemember);

    // 检查是否已经通过验证
    const sessionAuth = sessionStorage.getItem('app_authenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
      return;
    }

    // 如果选择了记住密码且保存的哈希匹配，自动登录
    if (shouldRemember) {
      const savedPasswordHash = localStorage.getItem(SAVED_PASSWORD_HASH_KEY);
      const currentPasswordHash = hashPassword(CORRECT_PASSWORD);
      if (savedPasswordHash === currentPasswordHash) {
        setIsAuthenticated(true);
        sessionStorage.setItem('app_authenticated', 'true');
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('app_authenticated', 'true');
      
      // 保存或清除记住密码设置
      if (rememberPassword) {
        localStorage.setItem(REMEMBER_PASSWORD_KEY, 'true');
        localStorage.setItem(SAVED_PASSWORD_HASH_KEY, hashPassword(CORRECT_PASSWORD));
      } else {
        localStorage.removeItem(REMEMBER_PASSWORD_KEY);
        localStorage.removeItem(SAVED_PASSWORD_HASH_KEY);
      }
      
      setError('');
      setPassword('');
    } else {
      setError('密码错误，请重试');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="password-protection">
      <div className="password-container">
        <div className="password-box">
          <h2>重要事件备忘录</h2>
          <p className="password-hint">请输入密码以访问应用</p>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="请输入访问密码"
              autoFocus
              className="password-input"
            />
            {error && <div className="password-error">{error}</div>}
            <div className="remember-password">
              <label>
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                />
                <span>记住密码（保存到本地）</span>
              </label>
            </div>
            <button type="submit" className="password-submit">
              进入应用
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
