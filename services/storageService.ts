import { Vaccine, Account, Profile } from '../types';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { ref, set, push, remove, get, onValue, off, DatabaseReference } from 'firebase/database';

export const StorageService = {

  // --- Initialization ---
  
  /**
   * Ensures the user has a root node and a default profile in Firebase.
   * Returns the Account object.
   */
  initializeAccount: async (user: User): Promise<Account> => {
    const accountId = user.uid;
    const profilesRef = ref(db, `users/${accountId}/profiles`);
    
    // Check if profiles exist
    const snapshot = await get(profilesRef);
    
    if (!snapshot.exists()) {
      // Create default profile
      const newProfileRef = push(profilesRef);
      const newProfile: Profile = {
        id: newProfileRef.key!,
        accountId: accountId,
        name: user.displayName || 'Me',
        isPrimary: true,
        color: 'blue'
      };
      await set(newProfileRef, newProfile);
    }

    return {
      id: accountId,
      name: user.displayName || 'User',
      email: user.email || ''
    };
  },

  // --- Realtime Subscriptions ---

  /**
   * Subscribes to the user's profiles.
   * Returns an unsubscribe function.
   */
  subscribeProfiles: (accountId: string, onUpdate: (profiles: Profile[]) => void): () => void => {
    const profilesRef = ref(db, `users/${accountId}/profiles`);
    
    const listener = onValue(profilesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }
      // Convert Object { id1: {...}, id2: {...} } to Array [{...}, {...}]
      const list = Object.values(data) as Profile[];
      onUpdate(list);
    });

    return () => off(profilesRef, 'value', listener);
  },

  /**
   * Subscribes to ALL vaccines for the user (across all profiles).
   * Filtering is done client-side for smoother UI updates.
   */
  subscribeVaccines: (accountId: string, onUpdate: (vaccines: Vaccine[]) => void): () => void => {
    const vaccinesRef = ref(db, `users/${accountId}/vaccines`);
    
    const listener = onValue(vaccinesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }
      const list = Object.values(data) as Vaccine[];
      onUpdate(list);
    });

    return () => off(vaccinesRef, 'value', listener);
  },

  // --- Write Operations ---

  addProfile: async (accountId: string, name: string): Promise<void> => {
    const colors = ['rose', 'amber', 'emerald', 'violet', 'cyan'];
    const profilesRef = ref(db, `users/${accountId}/profiles`);
    const newRef = push(profilesRef);
    
    const newProfile: Profile = {
      id: newRef.key!,
      accountId,
      name,
      isPrimary: false,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    
    await set(newRef, newProfile);
  },

  addVaccine: async (accountId: string, vaccine: Vaccine): Promise<void> => {
    const vaccinesRef = ref(db, `users/${accountId}/vaccines`);
    // If ID is already generated (e.g. from the modal), use it, otherwise push new
    const newItemRef = vaccine.id ? ref(db, `users/${accountId}/vaccines/${vaccine.id}`) : push(vaccinesRef);
    
    const finalVaccine = { ...vaccine, id: newItemRef.key! };
    
    // Safety: Remove any keys that are undefined because Firebase set() throws an error on undefined
    Object.keys(finalVaccine).forEach(key => {
        if ((finalVaccine as any)[key] === undefined) {
            delete (finalVaccine as any)[key];
        }
    });
    
    await set(newItemRef, finalVaccine);
  },

  deleteVaccine: async (accountId: string, vaccineId: string): Promise<void> => {
    const itemRef = ref(db, `users/${accountId}/vaccines/${vaccineId}`);
    await remove(itemRef);
  }
};