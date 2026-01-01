import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { AuthService } from '../services/authService';
import { SparklesIcon, GoogleIcon } from './Icons';

interface AuthScreenProps {
  onLogin?: (account: Account) => void; 
}

const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for handling domain auth errors specifically
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState('');

  // Helper to extract the actual domain, handling tricky Blob URLs
  const getEffectiveDomain = () => {
    let hostname = window.location.hostname;
    
    // If hostname is missing (common in some previews) or it's a blob URL
    if (!hostname || window.location.protocol === 'blob:') {
      try {
        const rawUrl = window.location.href;
        // Strip 'blob:' if present to make it parsable by URL()
        const cleanUrl = rawUrl.startsWith('blob:') ? rawUrl.slice(5) : rawUrl;
        const urlObj = new URL(cleanUrl);
        hostname = urlObj.hostname;
      } catch (e) {
        console.warn("Could not parse blob URL:", e);
      }
    }
    return hostname || 'unknown-domain';
  };

  useEffect(() => {
    // Debug logging to help identify environment issues
    console.log("Debug - Location:", window.location.href);
  }, []);

  const handleAuthError = (err: any) => {
    console.error("Auth Error Full Object:", err);
    let msg = "Authentication failed";
    
    const errCode = err.code || '';
    const errMessage = err.message || '';

    // Handle standard firebase errors
    if (errCode === 'auth/invalid-credential') msg = "Invalid email or password.";
    else if (errCode === 'auth/email-already-in-use') msg = "Email already registered.";
    else if (errCode === 'auth/weak-password') msg = "Password should be at least 6 characters.";
    else if (errCode === 'auth/popup-closed-by-user') msg = "Sign-in cancelled.";
    
    // Handle Domain Error specifically (checking both code and message text)
    else if (
      errCode === 'auth/unauthorized-domain' || 
      errMessage.includes('unauthorized domain') ||
      errMessage.includes('unauthorized-domain')
    ) {
       const dom = getEffectiveDomain();
       setDetectedDomain(dom);
       setShowDomainConfig(true);
       return; // Stop here, let the config screen take over
    } else {
      msg = `Error: ${errMessage.replace('Firebase: ', '')}`;
    }
    
    setError(msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowDomainConfig(false);
    setIsLoading(true);

    try {
      if (isLogin) {
        await AuthService.login(email, password);
      } else {
        if (!name.trim()) throw new Error("Name is required");
        await AuthService.register(email, password, name);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setShowDomainConfig(false);
    setIsLoading(true);
    try {
      await AuthService.loginWithGoogle();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Error Screen for Domain Configuration
  if (showDomainConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border-2 border-red-500 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
           <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Google Sign-In Blocked</h2>
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                This preview domain is not authorized in your Firebase project settings.
              </p>
              
              <div className="bg-slate-100 p-4 rounded-lg w-full mb-6 border-2 border-slate-300 text-left">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Domain to Authorize:</p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 bg-white border border-slate-300 p-3 rounded text-slate-900 font-mono text-base font-bold break-all select-all text-center">
                    {detectedDomain}
                  </code>
                </div>
                <p className="text-xs text-slate-400">
                   Add this to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains
                </p>
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <button 
                    onClick={() => setShowDomainConfig(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition"
                >
                    I've Added It, Try Again
                </button>

                <button 
                    onClick={() => setShowDomainConfig(false)}
                    className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-3 px-4 rounded-xl hover:bg-slate-50 transition"
                >
                    Back to Email/Password Login
                </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
             <SparklesIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-slate-500">
            {isLogin ? 'Sign in to access your records' : 'Start tracking your health journey'}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center break-words border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transform transition mt-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl shadow-sm bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5" />
            Google
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-slate-500 hover:text-blue-600 font-medium transition"
            disabled={isLoading}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;