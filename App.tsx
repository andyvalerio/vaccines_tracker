import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { Account, Vaccine } from './types';
import { PlusIcon, TrashIcon, CalendarIcon } from './components/Icons';
import AddVaccineModal from './components/AddVaccineModal';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Session & Realtime Data via Firebase
  useEffect(() => {
    let unsubscribeVaccines: (() => void) | undefined;

    const unsubscribeAuth = AuthService.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          setInitError(null);
          // 1. Initialize Account (Maps firebase user to internal account type)
          const syncedAccount = await StorageService.initializeAccount(firebaseUser);
          setAccount(syncedAccount);
          
          // 2. Subscribe to Realtime Data
          unsubscribeVaccines = StorageService.subscribeVaccines(syncedAccount.id, (loadedVaccines) => {
            // Sort by date taken descending
            const sorted = loadedVaccines.sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime());
            setVaccines(sorted);
          });

        } catch (e: any) {
          console.error("Failed to init data", e);
          setInitError(e.message || "Unknown initialization error");
          setAccount(null);
        }
      } else {
        setAccount(null);
        setVaccines([]);
        setInitError(null);
        
        // Cleanup subscriptions
        if (unsubscribeVaccines) unsubscribeVaccines();
      }
      setIsLoadingAuth(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeVaccines) unsubscribeVaccines();
    };
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    setInitError(null);
    setAccount(null);
  };

  const handleAddVaccine = async (vaccine: Vaccine) => {
    if (!account) return;
    try {
      await StorageService.addVaccine(account.id, vaccine);
    } catch (e) {
      console.error("Failed to add vaccine", e);
      alert("Failed to save record. Check your connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!account) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await StorageService.deleteVaccine(account.id, id);
      } catch (e) {
        console.error("Failed to delete", e);
        alert("Failed to delete record.");
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error State - e.g. Permission Denied or Database Connection Failed
  if (initError) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100 text-center">
           <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
           </div>
           <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
           <p className="text-slate-500 mb-6">
             We couldn't load your data. This usually happens if the database rules prevent access or if the connection configuration is missing.
           </p>
           <div className="bg-slate-100 p-3 rounded text-left mb-6 overflow-x-auto">
             <code className="text-xs text-red-600 font-mono whitespace-pre-wrap">{initError}</code>
           </div>
           <button onClick={handleLogout} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
             Sign Out & Try Again
           </button>
         </div>
       </div>
     );
  }

  if (!account) {
    return <AuthScreen />;
  }

  const upcomingVaccines = vaccines.filter(v => 
    v.nextDueDate && new Date(v.nextDueDate) > new Date()
  ).sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">Vaccines Tracker</span>
          </div>
          
          <div className="flex items-center gap-4">
             <span className="text-sm text-slate-500 hidden sm:inline-block">Hi, {account.name.split(' ')[0]}</span>
             <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        <div className="animate-fade-in">
             <div className="flex justify-between items-end mb-6">
                <div>
                   <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                   <p className="text-slate-500">Managing immunizations</p>
                </div>
             </div>

            {/* Upcoming Section */}
            {upcomingVaccines.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Upcoming Due Dates</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcomingVaccines.map(vaccine => (
                    <div key={vaccine.id} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group border border-slate-700">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <CalendarIcon className="w-16 h-16" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg">{vaccine.name}</h3>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full font-medium backdrop-blur-sm border border-white/10">
                            Due: {vaccine.nextDueDate}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">Last taken: {vaccine.dateTaken}</p>
                        {vaccine.notes && <p className="mt-3 text-sm text-white/90 bg-white/5 p-2 rounded-lg border border-white/5">{vaccine.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Section */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Record History</h2>
              
              {vaccines.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300 mb-4">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-slate-900 font-medium text-lg">No records found</h3>
                  <p className="text-slate-500 mt-1 max-w-xs mx-auto">Start tracking by adding your first vaccine record.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccines.map(vaccine => (
                    <div key={vaccine.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start group">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{vaccine.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">Taken: {vaccine.dateTaken}</span>
                          {vaccine.nextDueDate && (
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">Next: {vaccine.nextDueDate}</span>
                          )}
                        </div>
                        {vaccine.notes && (
                          <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-lg">{vaccine.notes}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDelete(vaccine.id)}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete record"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg shadow-blue-300 hover:shadow-xl hover:scale-105 transition-all duration-200 group"
          aria-label="Add Vaccine"
        >
          <PlusIcon className="w-7 h-7" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
            Add Record
          </span>
        </button>
      </div>

      <AddVaccineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddVaccine}
        existingVaccines={vaccines}
      />
    </div>
  );
}

export default App;