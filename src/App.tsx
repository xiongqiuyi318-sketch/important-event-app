import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PasswordProtection from './components/PasswordProtection';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？退出后需要重新输入密码。')) {
      // 清除所有认证信息
      sessionStorage.removeItem('app_authenticated');
      localStorage.removeItem('app_remember_password');
      localStorage.removeItem('app_saved_password_hash');
      // 触发页面重新加载以显示登录界面
      window.location.reload();
    }
  };
  
  return (
    <nav className="navigation">
      <div className="nav-links">
        <Link 
          to="/" 
          className={location.pathname === '/' ? 'active' : ''}
        >
          首页
        </Link>
        <Link 
          to="/history" 
          className={location.pathname === '/history' ? 'active' : ''}
        >
          历史
        </Link>
      </div>
      <button 
        className="logout-btn"
        onClick={handleLogout}
        title="退出登录"
      >
        退出
      </button>
    </nav>
  );
}

function App() {
  return (
    <PasswordProtection>
      <Router>
        <div className="app">
          <header className="app-header">
            <h1>重要事件备忘录</h1>
          </header>
          <Navigation />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </PasswordProtection>
  );
}

export default App;
