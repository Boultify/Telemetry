import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { FleetProvider } from './context/FleetContext';
import { CrashProvider } from './context/CrashContext';  // Keep this
import { ThemeProvider } from './context/ThemeContext';
// REMOVE THIS LINE: import CrashAlertBanner from './components/CrashAlertBanner';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import History from './pages/History';
import Logs from './pages/Logs';
import Admin from './pages/Admin';
import Alerts from './pages/Alerts';
import Layout from './Layout';

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen text-primary animate-pulse">
    Loading...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
};

const RoleRoute = ({ children, allow }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allow === 'admin' && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (allow === 'user' && isAdmin) return <Navigate to="/admin" replace />;
  return children;
};

const HomeRedirect = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="profile"
          element={
            <RoleRoute allow="user">
              <Profile />
            </RoleRoute>
          }
        />
        <Route path="alerts" element={<Alerts />} />
        <Route
          path="admin"
          element={
            <RoleRoute allow="admin">
              <Admin />
            </RoleRoute>
          }
        />
        <Route
          path="history"
          element={
            <RoleRoute allow="admin">
              <History />
            </RoleRoute>
          }
        />
        <Route
          path="logs"
          element={
            <RoleRoute allow="admin">
              <Logs />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <FleetProvider>
              <CrashProvider>
                {/* REMOVED CrashAlertBanner from here - it's now in Layout */}
                <AppRoutes />
              </CrashProvider>
            </FleetProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
