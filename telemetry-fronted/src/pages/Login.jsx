import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.isAdmin) {
        sessionStorage.setItem('adminWelcome', '1');
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-background text-on-background min-h-screen w-full flex items-center justify-center selection:bg-primary selection:text-on-primary relative">

      {/* Background Layers */}
      <div
        className="fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #333538 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />
      <div
        className="fixed inset-0 z-0 bg-cover bg-center grayscale opacity-10"
        style={{
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAGZMuVPcU8JdAkOOsH3ItWKvUw0Lb7biYrWd7jw2Hg6Og8V5hM1X8VFINfIxXELpbCAeNz_7S07jwhVqqozkFAR413g0itNTmkzEtMfEpOdZmQoaYjxnhcKkeR9RoXLUvgC0_8JAAfZEUiqEB9PPHy81oDbSQM4bmCiYxPiHECNhrLEGj8PzSh0BeREgm4aB5Fe1tzdxLXpB4IsdscaQt_EJ3SOpJ7WZp2Rlj3-W5oSteogmH99vDjjbSuv29qgxjX9Z-IjbUNHEk')"
        }}
      />
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(90deg, rgba(17,19,22,1) 0%, rgba(17,19,22,0.8) 50%, rgba(17,19,22,1) 100%)'
        }}
      />

      {/* Login Container */}
      <main className="relative z-10 w-full max-w-lg px-6 py-12">
        {/* Brand Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary-container flex items-center justify-center rounded-lg">
              <span
                className="material-symbols-outlined text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                precision_manufacturing
              </span>
            </div>
            <h1 className="font-headline text-3xl font-black tracking-tighter text-on-background">
              Telemetry Pro
            </h1>
          </div>
          <div className="space-y-1">
            <h2 className="font-headline text-5xl font-bold tracking-tighter text-on-surface">WELCOME BACK</h2>
            <p className="font-label text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              SIGN IN TO CONTINUE
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <section className="bg-surface-container border-t-2 border-primary-container p-8 md:p-10 rounded-xl shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">email</span>
                Email Address
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface-container-highest border-none text-on-surface placeholder:text-outline p-4 rounded-md focus:ring-0 focus:outline-none transition-all border-b-2 border-outline-variant focus:border-primary"
                  placeholder="driver@company.com"
                />
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300"></div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">key</span>
                Password
              </label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-container-highest border-none text-on-surface placeholder:text-outline p-4 rounded-md focus:ring-0 focus:outline-none transition-all border-b-2 border-outline-variant focus:border-primary"
                  placeholder="••••••••"
                />
                <div className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 group-focus-within:w-full transition-all duration-300"></div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform disabled:opacity-50"
              >
                <span className="uppercase tracking-widest text-sm">{isLoading ? 'SIGNING IN...' : 'SIGN IN'}</span>
                <span className="material-symbols-outlined">login</span>
              </button>
            </div>
          </form>

          {/* Bottom Links */}
          <div className="mt-8 flex flex-col items-center space-y-4">
            <p className="text-sm text-outline">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </section>

        {/* Technical Metadata Footer */}
        <footer className="mt-12 grid grid-cols-3 gap-4 border-t border-outline-variant/20 pt-6">
          <div className="text-center">
            <p className="font-label text-[9px] text-outline uppercase tracking-tighter">System Status</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></div>
              <p className="font-headline text-[11px] font-bold text-on-surface">OPTIMAL</p>
            </div>
          </div>
          <div className="text-center">
            <p className="font-label text-[9px] text-outline uppercase tracking-tighter">Encrypted Node</p>
            <p className="font-headline text-[11px] font-bold text-on-surface mt-1">TP-SEC-882</p>
          </div>
          <div className="text-center">
            <p className="font-label text-[9px] text-outline uppercase tracking-tighter">Uptime</p>
            <p className="font-headline text-[11px] font-bold text-on-surface mt-1">99.998%</p>
          </div>
        </footer>
      </main>
    </div>
  );
}