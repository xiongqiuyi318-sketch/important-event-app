import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PasswordProtection from './components/PasswordProtection';
import ReminderManager from './components/ReminderManager';
import MonthlyCleanupReminder from './components/MonthlyCleanupReminder';
import { useAccess } from './context/AccessContext';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import EventDetailPage from './pages/EventDetailPage';
import CompletedEventsPage from './pages/CompletedEventsPage';
import './App.css';

function Header() {
  const location = useLocation();
  const { canEdit, signOut } = useAccess();

  const handleLogout = async () => {
    if (!window.confirm('确定要退出当前模式吗？')) {
      return;
    }
    await signOut();
    window.location.reload();
  };
  
  return (
    <header className="app-header-unified">
      <h1 className="app-title">重要事件备忘录</h1>
      <nav className="nav-links">
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
      </nav>
      <span className={`access-mode ${canEdit ? 'editor' : 'guest'}`}>
        {canEdit ? '编辑者模式' : '只读'}
      </span>
      <button 
        className="logout-btn"
        onClick={handleLogout}
        title="切换模式"
      >
        退出
      </button>
    </header>
  );
}

function App() {
  return (
    <PasswordProtection>
      <ReminderManager />
      <Router>
        <MonthlyCleanupReminder />
        <div className="app">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/event/:id" element={<EventDetailPage />} />
              <Route path="/completed" element={<CompletedEventsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </PasswordProtection>
  );
}

export default App;
