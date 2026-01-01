import { Vaccine, Account } from '../types';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { ref, set, push, remove, onValue, off } from 'firebase/database';

export const StorageService = {

  // --- Initialization ---
  
  /**
   * Simply maps the Firebase User to our Account type.
   * No longer creates database nodes for profiles.
   */
  initializeAccount: async (user: User): Promise<Account> => {
    return {
      id: user.uid,
      name: user.displayName || 'User',
      email: user.email || ''
    };
  },

  // --- Realtime Subscriptions ---

  /**
   * Subscribes to ALL vaccines for the user.
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

  updateVaccine: async (accountId: string, vaccine: Vaccine): Promise<void> => {
    if (!vaccine.id) throw new Error("Cannot update vaccine without ID");
    
    const itemRef = ref(db, `users/${accountId}/vaccines/${vaccine.id}`);
    
    // Safety: Remove any keys that are undefined
    const finalVaccine = { ...vaccine };
    Object.keys(finalVaccine).forEach(key => {
        if ((finalVaccine as any)[key] === undefined) {
            delete (finalVaccine as any)[key];
        }
    });

    await set(itemRef, finalVaccine);
  },

  deleteVaccine: async (accountId: string, vaccineId: string): Promise<void> => {
    const itemRef = ref(db, `users/${accountId}/vaccines/${vaccineId}`);
    await remove(itemRef);
  }
};