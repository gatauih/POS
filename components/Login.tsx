
import React, { useState } from 'react';
import { useApp } from '../store';

export const Login: React.FC = () => {
  const { login, brandConfig, clearSession, cloudError, isCloudConnected, saveCloudConfig, cloudConfig } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  
  // Local setup state
  const [setupUrl, setSetupUrl] = useState(cloudConfig.url);
  const [setupKey, setSetupKey] = useState(cloudConfig.key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSetup = () => {
     if (!setupUrl || !setupKey) return alert("URL dan Key wajib diisi!");
     saveCloudConfig(setupUrl, setupKey);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: brandConfig.primaryColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100">
          <div className="p-10 pb-4 text-center">
            {brandConfig.logoUrl ? (
              <img src={brandConfig.logoUrl} className="w-24 h-24 object-contain mx-auto mb-6" alt="Brand Logo" />
            ) : (
              <div className="w-24 h-24 rounded-[32px] flex items-center justify-center text-white font-black text-5xl mx-auto mb-6 shadow-2xl transform -rotate-3 animate-in zoom-in duration-700 select-none" style={{ backgroundColor: brandConfig.primaryColor, boxShadow: `0 20px 40px ${brandConfig.primaryColor}33` }}>
                {brandConfig.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {brandConfig.name}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              {brandConfig.tagline}
            </p>
          </div>

          <div className="px-10 pb-10">
            {(error || cloudError) && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-bold text-center mb-6 border border-red-100 animate-in shake">
                ⚠️ {cloudError || error}
              </div>
            )}

            {!isCloudConnected && !showSetup && (
              <div className="mb-8 p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[28px] text-center">
                 <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Database Not Configured</p>
                 <button onClick={() => setShowSetup(true)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg">SETUP CLOUD NOW ⚡</button>
                 <p className="text-[8px] text-slate-400 mt-2 italic uppercase">Login with admin/123 to setup later</p>
              </div>
            )}

            {showSetup ? (
              <div className="space-y-5 animate-in slide-in-from-bottom-2">
                 <h3 className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest mb-4">Instance Setup</h3>
                 <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[9px] focus:ring-2 outline-none" 
                    placeholder="Supabase URL" 
                    value={setupUrl} 
                    onChange={e => setSetupUrl(e.target.value)} 
                 />
                 <input 
                    type="password" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[9px] focus:ring-2 outline-none" 
                    placeholder="Supabase Anon Key" 
                    value={setupKey} 
                    onChange={e => setSetupKey(e.target.value)} 
                 />
                 <div className="flex gap-2 pt-2">
                    <button onClick={handleSaveSetup} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg">CONNECT ✓</button>
                    <button onClick={() => setShowSetup(false)} className="px-5 py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[9px] uppercase">CANCEL</button>
                 </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-sm">👤</span>
                    <input 
                      type="text" 
                      className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300"
                      style={{ '--tw-ring-color': `${brandConfig.primaryColor}1a` } as any}
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-sm">🔑</span>
                    <input 
                      type="password" 
                      className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:outline-none transition-all font-semibold text-slate-700 text-sm placeholder:text-slate-300"
                      style={{ '--tw-ring-color': `${brandConfig.primaryColor}1a` } as any}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    disabled={isLoading}
                    type="submit"
                    className="w-full py-4 text-white font-black text-[11px] rounded-xl shadow-xl transition-all transform active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ backgroundColor: brandConfig.primaryColor, boxShadow: `0 10px 20px ${brandConfig.primaryColor}33` }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : 'Login to Dashboard'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Enterprise Food OS
          </p>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-slate-800"></span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Verified Integrity ✓</span>
            <span className="h-px w-8 bg-slate-800"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
