import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { ExportService } from './services/exportService';
import { GeminiService } from './services/geminiService';
import { Account, Vaccine, Suggestion } from './types';
import { PlusIcon, TrashIcon, CalendarIcon, DownloadIcon, PencilIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon } from './components/Icons';
import AddVaccineModal from './components/AddVaccineModal';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [prefilledName, setPrefilledName] = useState<string>('');
  
  // Track if we have performed the initial suggestion check to avoid loops
  const [hasCheckedSuggestions, setHasCheckedSuggestions] = useState(false);
  // Suggestion specific loading state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  // Specific ID of suggestion being accepted
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  
  // UI State for suggestions visibility
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);

  // Load Session & Realtime Data via Firebase
  useEffect(() => {
    let unsubscribeVaccines: (() => void) | undefined;
    let unsubscribeSuggestions: (() => void) | undefined;

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

          // 3. Subscribe to Suggestions
          unsubscribeSuggestions = StorageService.subscribeSuggestions(syncedAccount.id, (loadedSuggestions) => {
            setSuggestions(loadedSuggestions);
          });

        } catch (e: any) {
          console.error("Failed to init data", e);
          setInitError(e.message || "Unknown initialization error");
          setAccount(null);
        }
      } else {
        setAccount(null);
        setVaccines([]);
        setSuggestions([]);
        setInitError(null);
        setHasCheckedSuggestions(false);
        
        // Cleanup subscriptions
        if (unsubscribeVaccines) unsubscribeVaccines();
        if (unsubscribeSuggestions) unsubscribeSuggestions();
      }
      setIsLoadingAuth(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeVaccines) unsubscribeVaccines();
      if (unsubscribeSuggestions) unsubscribeSuggestions();
    };
  }, []);

  // AI Suggestion Logic
  useEffect(() => {
    const checkSuggestions = async () => {
      if (!account || hasCheckedSuggestions || vaccines.length === 0 || loadingSuggestions) return;
      
      // If we already have stored suggestions, don't generate more
      if (suggestions.length > 0) {
        setHasCheckedSuggestions(true);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const dismissed = await StorageService.getDismissedNames(account.id);
        const newSuggestions = await GeminiService.suggestMissingVaccines(vaccines, dismissed);
        
        if (newSuggestions.length > 0) {
          await StorageService.setSuggestions(account.id, newSuggestions);
        }
      } catch (e) {
        console.error("Error generating suggestions:", e);
      } finally {
        setLoadingSuggestions(false);
        setHasCheckedSuggestions(true);
      }
    };

    // Small delay to ensure firebase data is fully synced before checking
    const timeout = setTimeout(() => {
        checkSuggestions();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [account, vaccines, suggestions.length, hasCheckedSuggestions, loadingSuggestions]);

  const handleLogout = async () => {
    await AuthService.logout();
    setInitError(null);
    setAccount(null);
  };

  const handleSaveVaccine = async (vaccine: Vaccine) => {
    if (!account) return;
    try {
      if (editingVaccine) {
        await StorageService.updateVaccine(account.id, vaccine);
      } else {
        await StorageService.addVaccine(account.id, vaccine);
        // If this came from a suggestion, remove that suggestion
        if (activeSuggestionId) {
            await StorageService.removeSuggestion(account.id, activeSuggestionId);
        }
      }
    } catch (e) {
      console.error("Failed to save vaccine", e);
      alert("Failed to save record. Check your connection.");
    }
  };

  const handleEdit = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    setPrefilledName('');
    setActiveSuggestionId(null);
    setIsModalOpen(true);
  };

  const handleAddFromSuggestion = (suggestion: Suggestion) => {
    setEditingVaccine(null);
    setPrefilledName(suggestion.name);
    setActiveSuggestionId(suggestion.id);
    setIsModalOpen(true);
  };

  const handleDismissSuggestion = async (suggestion: Suggestion) => {
    if (!account) return;
    try {
      // Remove from suggestions list
      await StorageService.removeSuggestion(account.id, suggestion.id);
      // Add to dismissed list so AI doesn't pick it up again
      await StorageService.addToDismissed(account.id, suggestion.name);
    } catch (e) {
      console.error("Failed to dismiss suggestion", e);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingVaccine(null);
    setPrefilledName('');
    setActiveSuggestionId(null);
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

  const handleExportExcel = () => {
    ExportService.exportToExcel(vaccines);
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
                    <div 
                      key={vaccine.id} 
                      onClick={() => handleEdit(vaccine)}
                      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group border border-slate-700 cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <div className="relative z-10">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg">{vaccine.name}</h3>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full font-medium backdrop-blur-sm border border-white/10">
                            Due: {vaccine.nextDueDate}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">Last taken: {vaccine.dateTaken}</p>
                        {vaccine.notes && (
                            <p className="mt-3 text-sm text-white/90 bg-white/5 p-2 rounded-lg border border-white/5">
                                {vaccine.notes}
                            </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Record History</h2>
                {vaccines.length > 0 && (
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Export Excel
                  </button>
                )}
              </div>
              
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
                    <div 
                      key={vaccine.id} 
                      onClick={() => handleEdit(vaccine)}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-start group hover:border-blue-200"
                    >
                      <div className="flex-1 mr-4">
                        <h3 className="font-bold text-slate-800 text-lg">{vaccine.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 flex-wrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium whitespace-nowrap">Taken: {vaccine.dateTaken}</span>
                          {vaccine.nextDueDate && (
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium whitespace-nowrap">Next: {vaccine.nextDueDate}</span>
                          )}
                        </div>
                        {vaccine.notes && (
                          <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-lg">{vaccine.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                         <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(vaccine); }}
                          className="text-slate-300 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                          title="Edit record"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(vaccine.id); }}
                          className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete record"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Might Be Missing Section (AI Suggestions) */}
            {suggestions.length > 0 && (
              <div className="mb-8 animate-fade-in">
                <div 
                  onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
                  className="flex items-center justify-between mb-4 px-1 cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
                      Might Be Missing
                      {!isSuggestionsExpanded && <span className="ml-2 text-xs normal-case font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{suggestions.length} suggestions</span>}
                    </h2>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    {isSuggestionsExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                </div>
                
                {isSuggestionsExpanded && (
                  <div className="grid gap-3 sm:grid-cols-2 animate-fade-in">
                    {suggestions.map(suggestion => (
                       <div 
                        key={suggestion.id}
                        className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col justify-between"
                       >
                          <div>
                            <h3 className="font-bold text-amber-900 text-lg">{suggestion.name}</h3>
                            <p className="text-amber-700/80 text-sm mt-1 mb-4">{suggestion.reason}</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => handleAddFromSuggestion(suggestion)}
                               className="flex-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                             >
                               <PlusIcon className="w-4 h-4" />
                               Add Record
                             </button>
                             <button 
                               onClick={() => handleDismissSuggestion(suggestion)}
                               className="bg-white hover:bg-amber-100 text-amber-600 border border-amber-200 p-2 rounded-lg transition-colors"
                               title="Don't show this again"
                             >
                               <span className="sr-only">Dismiss</span>
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                             </button>
                          </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => { setEditingVaccine(null); setPrefilledName(''); setActiveSuggestionId(null); setIsModalOpen(true); }}
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
        onClose={handleModalClose} 
        onSave={handleSaveVaccine}
        existingVaccines={vaccines}
        vaccineToEdit={editingVaccine}
        prefilledName={prefilledName}
      />
    </div>
  );
}

export default App;