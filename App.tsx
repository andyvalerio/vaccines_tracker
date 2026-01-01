import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { Account, Profile, Vaccine } from './types';
import { PlusIcon, TrashIcon, CalendarIcon } from './components/Icons';
import AddVaccineModal from './components/AddVaccineModal';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Session via Firebase
  useEffect(() => {
    const unsubscribe = AuthService.subscribe((firebaseUser) => {
      if (firebaseUser) {
        // Sync Firebase User with our Local Storage Data Structure
        const syncedAccount = StorageService.syncFirebaseUser(firebaseUser);
        setAccount(syncedAccount);
        
        // Load data associated with this account
        const userProfiles = StorageService.getProfiles(syncedAccount.id);
        setProfiles(userProfiles);
        
        if (userProfiles.length > 0) {
          const primary = userProfiles.find(p => p.isPrimary) || userProfiles[0];
          setActiveProfileId(primary.id);
          refreshVaccines(primary.id);
        }
      } else {
        setAccount(null);
        setProfiles([]);
        setVaccines([]);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshVaccines = (profileId: string) => {
    const vax = StorageService.getVaccines(profileId);
    setVaccines(vax.sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()));
  };

  // Switch Profile
  useEffect(() => {
    if (activeProfileId) {
      refreshVaccines(activeProfileId);
    }
  }, [activeProfileId]);

  const handleLogout = async () => {
    await AuthService.logout();
    // State clearing is handled by the subscription above
  };

  const handleAddVaccine = (vaccine: Vaccine) => {
    StorageService.addVaccine(vaccine);
    refreshVaccines(activeProfileId);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      StorageService.deleteVaccine(id);
      refreshVaccines(activeProfileId);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!account) {
    return <AuthScreen />;
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const upcomingVaccines = vaccines.filter(v => 
    v.nextDueDate && new Date(v.nextDueDate) > new Date()
  ).sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  // Helper to determine dashboard title
  const getDashboardTitle = (profile: Profile) => {
    if (profile.isPrimary) return "My Dashboard";
    if (profile.name.toLowerCase() === 'me') return "My Dashboard";
    
    const name = profile.name;
    return name.endsWith('s') ? `${name}' Dashboard` : `${name}'s Dashboard`;
  };

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
             <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Profile Switcher */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-3">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tracking Profile</h2>
           </div>
           
           <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveProfileId(p.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
                    activeProfileId === p.id 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.color === 'rose' ? 'bg-rose-400' : 'bg-blue-400'}`}></span>
                  {p.name} {(p.isPrimary && p.name.toLowerCase() !== 'me') && '(Me)'}
                </button>
              ))}
              {/* Add Person button removed as requested */}
           </div>
        </div>

        {activeProfile && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-end mb-6">
                <div>
                   <h1 className="text-2xl font-bold text-slate-900">{getDashboardTitle(activeProfile)}</h1>
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
                  <p className="text-slate-500 mt-1 max-w-xs mx-auto">Start tracking by adding {activeProfile.isPrimary ? 'your' : `${activeProfile.name}'s`} first vaccine record.</p>
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
        )}
      </main>

      {/* Floating Action Button */}
      {activeProfile && (
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
      )}

      {activeProfile && (
        <AddVaccineModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleAddVaccine}
          activeUser={{ id: activeProfile.id, name: activeProfile.name }}
          existingVaccines={vaccines}
        />
      )}
    </div>
  );
}

export default App;