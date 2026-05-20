import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useFleet } from './context/FleetContext';
import FleetSelectionBanner from './components/FleetSelectionBanner';
import CrashAlertBanner from './components/CrashAlertBanner';  // ADD THIS

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
      <aside className="side-bar fixed left-0 top-0 h-full z-40 flex flex-col bg-[#111316] w-64 border-r border-white/5">
        <div className="p-6 flex flex-col gap-1">
          <span className="text-xl font-bold tracking-tighter text-[#9ecaff] headline-font">CrashGuard</span>
          <span className="text-xs uppercase tracking-widest text-slate-500 font-label">Telemetry System</span>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto">
          <ul className="space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path} className="px-4">
                  <Link
                    to={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-[#282a2d] text-[#9ecaff] font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2023]'
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

        <div className="p-4 border-t border-white/5 space-y-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-300 hover:bg-[#1e2023] transition-all"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-xs uppercase tracking-widest font-label font-bold">Log out</span>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1e2023] border border-primary/20">
              <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold headline-font text-[#9ecaff] truncate">
                  {user?.username || 'Admin'}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Administrator</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <header className="fixed top-0 right-0 left-64 h-16 z-30 flex justify-between items-center px-8 bg-[#111316]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4 flex-1">
          <span className="hidden md:block text-lg font-black tracking-tighter text-[#9ecaff] headline-font uppercase">
            {pageTitle}
          </span>
        </div>
      </header>

      <main className="ml-64 pt-16 h-screen flex flex-col bg-[#0c0e11]">
        <CrashAlertBanner />
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isAdmin && <FleetSelectionBanner />}
          <Outlet />
        </div>
      </main>
    </>
  );
}
