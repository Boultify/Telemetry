import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    const result = await signup(username, email, password);
    
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background selection:bg-primary selection:text-on-primary font-body">
      {/* Visual Sidebar: Brand & Aesthetics */}
      <aside className="hidden lg:flex w-2/5 flex-col justify-between p-12 bg-surface-container-lowest relative overflow-hidden">
        {/* Background Motif */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(158,202,255,0.08),transparent)]"></div>
          <img 
            className="w-full h-full object-cover opacity-20 grayscale brightness-50" 
            alt="High-tech luxury car" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6Hq6TI326UYtI8N85G0BL-VkljvzTnkr67SpOfBGBrD4bfJO45SPKtGRVSCEfM-Vc1GnkzYQnw7rFW5qxsfe0yLOdY2a-DecFeBwJJ7JfZqONg_x9s2_MJjuh1o5PFrGJf6HWyaEqwUlDLEXP77BIrB0nvrCJvhh1HAnaBStD4S86vpmgjfGPVMz5AV8S5lGO_WXDZQPBiI9_SyyIAISdrluEliyjuOf55hWWROudpbBbz6J57QuRZMu3vk-XD4j6oenQfsJK820"
          />
        </div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#9ecaff] to-[#004e85] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary font-bold">radar</span>
            </div>
            <span className="font-headline text-2xl font-black tracking-tighter text-primary">
              Telemetry Pro
            </span>
          </div>
        </div>
        
        {/* Narrative */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary font-label">
              Join the Network
            </span>
            <h2 className="font-headline text-5xl font-bold text-on-surface leading-tight">
              Start Monitoring Your Fleet
            </h2>
          </div>
          <p className="text-on-surface-variant text-lg max-w-md leading-relaxed font-body">
            Create your account to access real-time diagnostics, precision geolocation, and automated safety protocols.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="p-4 bg-surface-container rounded-xl flex flex-col gap-1 border border-outline-variant/10">
              <span className="font-headline text-xl font-bold text-primary">99.9%</span>
              <span className="text-[10px] uppercase tracking-wider text-outline">Uptime Target</span>
            </div>
            <div className="p-4 bg-surface-container rounded-xl flex flex-col gap-1 border border-outline-variant/10">
              <span className="font-headline text-xl font-bold text-primary">AES-256</span>
              <span className="text-[10px] uppercase tracking-wider text-outline">Encryption</span>
            </div>
          </div>
        </div>
        
        {/* Footer Meta */}
        <div className="relative z-10 flex justify-between items-center text-outline text-xs uppercase tracking-widest font-label">
          <span>Precision Tracking Systems</span>
          <span>v4.2.0-Alpha</span>
        </div>
      </aside>

      {/* Form Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-6 lg:py-12 lg:px-24 bg-surface min-h-screen">
        <div className="w-full max-w-md space-y-12">
          
          {/* Brand Title Section */}
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tighter uppercase">
              CREATE ACCOUNT
            </h1>
            <p className="text-sm font-label tracking-[0.2em] text-outline-variant uppercase">
              JOIN TELEMETRY PRO
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-xs text-center">
              {error}
            </div>
          )}
          
          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              
              {/* Username */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2 transition-colors group-focus-within:text-primary">
                  Username
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline-variant">person</span>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Choose a username"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest border-none focus:ring-0 text-on-surface placeholder:text-surface-variant rounded-lg transition-all"
                  />
                </div>
                <div className="h-[2px] w-full bg-outline-variant mt-1 overflow-hidden">
                  <div className="h-full bg-primary w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>
              
              {/* Email Address */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2 transition-colors group-focus-within:text-primary">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline-variant">alternate_email</span>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="fleet-admin@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest border-none focus:ring-0 text-on-surface placeholder:text-surface-variant rounded-lg transition-all"
                  />
                </div>
                <div className="h-[2px] w-full bg-outline-variant mt-1 overflow-hidden">
                  <div className="h-full bg-primary w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>
              
              {/* Password */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2 transition-colors group-focus-within:text-primary">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline-variant">lock</span>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest border-none focus:ring-0 text-on-surface placeholder:text-surface-variant rounded-lg transition-all"
                  />
                </div>
                <div className="h-[2px] w-full bg-outline-variant mt-1 overflow-hidden">
                  <div className="h-full bg-primary w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2 transition-colors group-focus-within:text-primary">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline-variant">lock_person</span>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest border-none focus:ring-0 text-on-surface placeholder:text-surface-variant rounded-lg transition-all"
                  />
                </div>
                <div className="h-[2px] w-full bg-outline-variant mt-1 overflow-hidden">
                  <div className="h-full bg-primary w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>
            </div>
            
            {/* Action Area */}
            <div className="space-y-6 pt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-br from-[#9ecaff] to-[#004e85] text-on-primary py-4 rounded-xl flex items-center justify-center gap-2 font-headline font-bold text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-primary/10 group disabled:opacity-50"
              >
                <span>{isLoading ? 'CREATING ACCOUNT...' : 'GET STARTED'}</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-outline font-body">Already have an account?</span>
                <Link to="/login" className="text-sm text-primary font-bold hover:underline">
                  Sign In
                </Link>
              </div>
            </div>
          </form>
          
          {/* Footer Disclaimers */}
          <div className="pt-12 border-t border-outline-variant/10 text-[10px] text-outline text-center space-y-2 uppercase tracking-widest font-label">
            <p>Secured by Telemetry Pro Cloud Services</p>
            <div className="flex justify-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <span className="text-surface-variant">/</span>
              <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}