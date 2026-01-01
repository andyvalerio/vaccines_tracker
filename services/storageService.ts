import { Vaccine, Account, Profile } from '../types';
import { User } from 'firebase/auth';

const STORAGE_KEYS = {
  PROFILES: 'vt_profiles',
  VACCINES: 'vt_vaccines',
};

// This service now manages LOCAL DATA only. 
// Authentication is handled by Firebase.
export const StorageService = {

  // --- Sync Logic ---
  // Ensure that when a Firebase User logs in, we have a local "Profile" structure for them
  // so the existing UI code continues to work using localStorage as the DB.
  syncFirebaseUser: (user: User): Account => {
    const accountId = user.uid;
    const allProfiles = StorageService._getAllProfiles();
    
    // Check if we already have profiles for this account
    const existingProfiles = allProfiles.filter(p => p.accountId === accountId);

    if (existingProfiles.length === 0) {
      // First time login on this device? Create default profile.
      const newProfile: Profile = {
        id: 'prof_' + Date.now(),
        accountId: accountId,
        name: user.displayName || 'Me',
        isPrimary: true,
        color: 'blue'
      };
      StorageService._saveProfiles([newProfile]);
    }

    return {
      id: accountId,
      name: user.displayName || 'User',
      email: user.email || ''
    };
  },

  // --- Profiles ---

  getProfiles: (accountId: string): Profile[] => {
    const all = StorageService._getAllProfiles();
    return all.filter(p => p.accountId === accountId);
  },

  addProfile: (accountId: string, name: string): Profile => {
    const colors = ['rose', 'amber', 'emerald', 'violet', 'cyan'];
    const newProfile: Profile = {
      id: 'prof_' + Date.now() + Math.random().toString().slice(2, 5),
      accountId,
      name,
      isPrimary: false,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    StorageService._saveProfiles([newProfile]);
    return newProfile;
  },

  // --- Vaccines ---

  getVaccines: (profileId: string): Vaccine[] => {
    const all = StorageService._getAllVaccines();
    return all.filter(v => v.profileId === profileId);
  },

  addVaccine: (vaccine: Vaccine): void => {
    const all = StorageService._getAllVaccines();
    localStorage.setItem(STORAGE_KEYS.VACCINES, JSON.stringify([vaccine, ...all]));
  },

  deleteVaccine: (id: string): void => {
    const all = StorageService._getAllVaccines();
    localStorage.setItem(STORAGE_KEYS.VACCINES, JSON.stringify(all.filter(v => v.id !== id)));
  },

  // --- Internal Helpers ---

  _getAllProfiles: (): Profile[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]');
  },

  _saveProfiles: (newProfiles: Profile[]) => {
    const all = StorageService._getAllProfiles();
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify([...all, ...newProfiles]));
  },

  _getAllVaccines: (): Vaccine[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VACCINES) || '[]');
  }
};