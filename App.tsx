
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { Account } from './types';
import VaccineTracker from './components/vaccines/VaccineTracker';
import DietTracker from './components/diet/DietTracker';

type AppTab = 'vaccines' | 'diet';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Initialize tab from localStorage or default to 'vaccines'
  const [activeTab, setActiveTabState] = useState<AppTab>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved === 'diet' || saved === 'vaccines') ? (saved as AppTab) : 'vaccines';
  });

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  };

  useEffect(() => {
    const unsubscribeAuth = AuthService.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          setInitError(null);
          const syncedAccount = await StorageService.initializeAccount(firebaseUser);
          setAccount(syncedAccount);
        } catch (e: any) {
          console.error("Failed to init data", e);
          setInitError(e.message || "Unknown initialization error");
          setAccount(null);
        }
      } else {
        setAccount(null);
        setInitError(null);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setInitError(null);
    setAccount(null);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (initError) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100 text-center">
           <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
           <p className="text-slate-500 mb-6">{initError}</p>
           <button onClick={handleLogout} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium">
             Sign Out & Try Again
           </button>
         </div>
       </div>
     );
  }

  if (!account) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Health Tracker</span>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('vaccines')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'vaccines' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vaccines
            </button>
            <button 
              onClick={() => setActiveTab('diet')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'diet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Diet
            </button>
          </nav>

          <div className="flex items-center gap-4">
             <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'vaccines' ? (
          <VaccineTracker account={account} />
        ) : (
          <DietTracker account={account} />
        )}
      </main>
    </div>
  );
}

export default App;
