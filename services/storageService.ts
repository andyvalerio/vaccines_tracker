
import { Vaccine, Account, Suggestion, DietEntry } from '../types';
import { User } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { ref, set, push, remove, onValue, off, get, child, query, orderByChild } from 'firebase/database';

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
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const mockVaccines: Vaccine[] = [
        { id: 'v1', name: 'Flu Shot', dateTaken: '2023-10-01', notes: 'Annual', history: [], createdAt: Date.now() },
        { id: 'v2', name: 'Tetanus', nextDueDate: '2026-05-01', notes: 'Booster', history: [], createdAt: Date.now() }
      ];
      onUpdate(mockVaccines);
      return () => { };
    }
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
    if (localStorage.getItem('E2E_TEST_MODE')) {
      onUpdate([{ id: 's1', name: 'Shingles', reason: 'Recommended for age group' }]);
      return () => { };
    }
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

  // --- Event Emitters for Mock Mode ---
  _dietSubscribers: [] as ((entries: DietEntry[]) => void)[],

  _notifyDietSubscribers: () => {
    const stored = localStorage.getItem('MOCK_DB_DIET');
    const entries = stored ? JSON.parse(stored) : [
      { id: 'd1', type: 'food', name: 'Salad', timestamp: Date.now(), notes: 'Healthy lunch' },
      { id: 'd2', type: 'medicine', name: 'Aspirin', timestamp: Date.now() - 3600000 }
    ];
    // Sort descending
    entries.sort((a: DietEntry, b: DietEntry) => b.timestamp - a.timestamp);
    StorageService._dietSubscribers.forEach(cb => cb(entries));
  },

  subscribeDietEntries: (accountId: string, onUpdate: (entries: DietEntry[]) => void): () => void => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      StorageService._dietSubscribers.push(onUpdate);
      // Initial emit
      const stored = localStorage.getItem('MOCK_DB_DIET');
      if (!stored) {
        // Initialize mock DB if empty
        const defaults = [
          { id: 'd1', type: 'food', name: 'Salad', timestamp: Date.now(), notes: 'Healthy lunch' },
          { id: 'd2', type: 'medicine', name: 'Aspirin', timestamp: Date.now() - 3600000 }
        ];
        localStorage.setItem('MOCK_DB_DIET', JSON.stringify(defaults));
      }
      StorageService._notifyDietSubscribers();
      return () => {
        StorageService._dietSubscribers = StorageService._dietSubscribers.filter(cb => cb !== onUpdate);
      };
    }
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
    return StorageService.addDietEntries(accountId, [entry]);
  },

  addDietEntries: async (accountId: string, entriesToAdd: Partial<DietEntry>[]): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_DIET');
      const entries = stored ? JSON.parse(stored) : [];

      entriesToAdd.forEach(entry => {
        entries.push({
          ...entry,
          id: 'mock_' + Date.now() + Math.random(),
          timestamp: entry.timestamp || Date.now()
        });
      });

      localStorage.setItem('MOCK_DB_DIET', JSON.stringify(entries));
      StorageService._notifyDietSubscribers();
      return;
    }

    const dietRef = ref(db, `users/${accountId}/diet`);
    await Promise.all(entriesToAdd.map(async (entry) => {
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
    }));
  },

  deleteDietEntry: async (accountId: string, entryId: string): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_DIET');
      if (stored) {
        const entries = JSON.parse(stored).filter((e: DietEntry) => e.id !== entryId);
        localStorage.setItem('MOCK_DB_DIET', JSON.stringify(entries));
        StorageService._notifyDietSubscribers();
      }
      return;
    }

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
