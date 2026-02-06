
import { Vaccine, Account, Suggestion, DietEntry } from '../types';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { ref, set, push, remove, onValue, off, get, child, query, orderByChild, limitToLast } from 'firebase/database';

export const StorageService = {

  // --- Initialization ---
  
  initializeAccount: async (user: User): Promise<Account> => {
    return {
      id: user.uid,
      name: user.displayName || 'User',
      email: user.email || ''
    };
  },

  // --- Realtime Subscriptions ---

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

  subscribeSuggestions: (accountId: string, onUpdate: (suggestions: Suggestion[]) => void): () => void => {
    const refPath = ref(db, `users/${accountId}/suggestions`);
    const listener = onValue(refPath, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }
      const list = Object.values(data) as Suggestion[];
      onUpdate(list);
    });
    return () => off(refPath, 'value', listener);
  },

  subscribeDietEntries: (accountId: string, onUpdate: (entries: DietEntry[]) => void): () => void => {
    const dietRef = ref(db, `users/${accountId}/diet`);
    const dietQuery = query(dietRef, orderByChild('timestamp'));
    
    const listener = onValue(dietQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }
      const list = Object.values(data) as DietEntry[];
      // Sort descending for timeline
      onUpdate(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => off(dietRef, 'value', listener);
  },

  // --- Read Operations ---
  
  getDismissedNames: async (accountId: string): Promise<string[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users/${accountId}/dismissed`));
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as string[];
    }
    return [];
  },

  // --- Write Operations ---

  addVaccine: async (accountId: string, vaccine: Vaccine): Promise<void> => {
    const vaccinesRef = ref(db, `users/${accountId}/vaccines`);
    const newItemRef = vaccine.id ? ref(db, `users/${accountId}/vaccines/${vaccine.id}`) : push(vaccinesRef);
    const finalVaccine = { ...vaccine, id: newItemRef.key! };
    Object.keys(finalVaccine).forEach(key => {
        if ((finalVaccine as any)[key] === undefined) delete (finalVaccine as any)[key];
    });
    await set(newItemRef, finalVaccine);
  },

  updateVaccine: async (accountId: string, vaccine: Vaccine): Promise<void> => {
    if (!vaccine.id) throw new Error("Cannot update vaccine without ID");
    const itemRef = ref(db, `users/${accountId}/vaccines/${vaccine.id}`);
    const finalVaccine = { ...vaccine };
    Object.keys(finalVaccine).forEach(key => {
        if ((finalVaccine as any)[key] === undefined) delete (finalVaccine as any)[key];
    });
    await set(itemRef, finalVaccine);
  },

  deleteVaccine: async (accountId: string, vaccineId: string): Promise<void> => {
    const itemRef = ref(db, `users/${accountId}/vaccines/${vaccineId}`);
    await remove(itemRef);
  },

  addDietEntry: async (accountId: string, entry: Partial<DietEntry>): Promise<void> => {
    const dietRef = ref(db, `users/${accountId}/diet`);
    const newItemRef = push(dietRef);
    const finalEntry = {
      ...entry,
      id: newItemRef.key!,
      timestamp: entry.timestamp || Date.now()
    };
    
    // Explicitly strip undefined values before saving to Firebase
    Object.keys(finalEntry).forEach(key => {
        if ((finalEntry as any)[key] === undefined) delete (finalEntry as any)[key];
    });

    await set(newItemRef, finalEntry);
  },

  deleteDietEntry: async (accountId: string, entryId: string): Promise<void> => {
    const itemRef = ref(db, `users/${accountId}/diet/${entryId}`);
    await remove(itemRef);
  },

  // --- Suggestions & Dismissal Logic ---

  setSuggestions: async (accountId: string, suggestions: Suggestion[]): Promise<void> => {
    const refPath = ref(db, `users/${accountId}/suggestions`);
    const data: Record<string, Suggestion> = {};
    suggestions.forEach(s => {
      const id = s.id || push(refPath).key!;
      data[id] = { ...s, id };
    });
    await set(refPath, data);
  },

  removeSuggestion: async (accountId: string, suggestionId: string): Promise<void> => {
    const itemRef = ref(db, `users/${accountId}/suggestions/${suggestionId}`);
    await remove(itemRef);
  },

  addToDismissed: async (accountId: string, vaccineName: string): Promise<void> => {
    const refPath = ref(db, `users/${accountId}/dismissed`);
    await push(refPath, vaccineName);
  }
};
