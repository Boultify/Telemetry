import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useFleet } from './context/FleetContext';
import { useTheme } from './context/ThemeContext';
import FleetSelectionBanner from './components/FleetSelectionBanner';
import CrashAlertBanner from './components/CrashAlertBanner';

const USER_LINKS = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/profile', icon: 'account_circle', label: 'Profile' },
  { path: '/alerts', icon: 'notifications', label: 'Alerts' },
];

const ADMIN_LINKS = [
  { path: '/admin', icon: 'admin_panel_settings', label: 'Admin' },
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/history', icon: 'history', label: 'History' },
  { path: '/logs', icon: 'description', label: 'Logs' },
  { path: '/alerts', icon: 'notifications', label: 'Alerts' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { clearFleetSelection } = useFleet();
  const { theme, toggleTheme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navLinks = isAdmin ? ADMIN_LINKS : USER_LINKS;

  const handleLogout = async () => {
    clearFleetSelection();
    await logout();
    navigate('/login');
  };

  const pageTitle = (() => {
    if (location.pathname === '/admin') return 'ADMIN CONSOLE';
    if (location.pathname === '/profile') return 'OPERATOR PROFILE';
    if (location.pathname === '/alerts') return 'ALERTS';
    return 'CRASHGUARD TELEMETRY';
  })();

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-full z-40 flex flex-col bg-surface w-64 border-r border-border-theme transition-transform duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold tracking-tighter text-primary headline-font">CrashGuard</span>
            <span className="text-xs uppercase tracking-widest text-outline font-label">Telemetry System</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto">
          <ul className="space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path} className="px-4">
                  <Link
                    to={link.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                        : 'text-outline hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                    <span className="text-xs uppercase tracking-widest font-label">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border-theme space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsMobileSidebarOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-outline hover:text-error hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-xs uppercase tracking-widest font-label font-bold">Log out</span>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container border border-primary-border">
              <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold headline-font text-primary truncate">
                  {user?.username || 'Admin'}
                </span>
                <span className="text-[10px] text-outline uppercase tracking-tighter">Administrator</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 z-20 flex justify-between items-center px-4 md:px-8 bg-surface/95 backdrop-blur-xl border-b border-border-theme">
        <div className="flex items-center gap-4 flex-1">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <span className="text-base md:text-lg font-black tracking-tighter text-primary headline-font uppercase truncate">
            {pageTitle}
          </span>
        </div>
        
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="material-symbols-outlined">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </header>

      <main className="ml-0 md:ml-64 pt-16 h-screen flex flex-col bg-surface-container-lowest">
        <CrashAlertBanner />
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isAdmin && <FleetSelectionBanner />}
          <Outlet />
        </div>
      </main>
    </>
  );
}
