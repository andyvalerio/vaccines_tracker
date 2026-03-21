
import { Vaccine, Account, Suggestion, DietEntry, BloodMarker, BloodMarkerRecord } from '../types';
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
  },

  // --- Blood Markers ---

  _markerSubscribers: [] as ((markers: BloodMarker[]) => void)[],
  _markerRecordSubscribers: [] as ((records: BloodMarkerRecord[]) => void)[],

  _notifyMarkerSubscribers: () => {
    const stored = localStorage.getItem('MOCK_DB_MARKERS');
    const markers = stored ? JSON.parse(stored) : [
      { id: 'm1', name: 'LDL Cholesterol', rangeMin: 3.0, rangeMax: 5.0 }
    ];
    StorageService._markerSubscribers.forEach(cb => cb(markers));
  },

  _notifyMarkerRecordSubscribers: () => {
    const stored = localStorage.getItem('MOCK_DB_MARKER_RECORDS');
    const records = stored ? JSON.parse(stored) : [
      { id: 'r1', markerId: 'm1', date: '2023-10-17', value: 4.8 },
      { id: 'r2', markerId: 'm1', date: '2024-12-02', value: 6.2 }
    ];
    StorageService._markerRecordSubscribers.forEach(cb => cb(records));
  },

  subscribeMarkers: (accountId: string, onUpdate: (markers: BloodMarker[]) => void): () => void => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      StorageService._markerSubscribers.push(onUpdate);
      const stored = localStorage.getItem('MOCK_DB_MARKERS');
      if (!stored) {
        localStorage.setItem('MOCK_DB_MARKERS', JSON.stringify([{ id: 'm1', name: 'LDL Cholesterol', rangeMin: 3.0, rangeMax: 5.0 }]));
      }
      StorageService._notifyMarkerSubscribers();
      return () => { StorageService._markerSubscribers = StorageService._markerSubscribers.filter(cb => cb !== onUpdate); };
    }
    const markersRef = ref(db, `users/${accountId}/markers`);
    const listener = onValue(markersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return onUpdate([]);
      onUpdate(Object.values(data));
    });
    return () => off(markersRef, 'value', listener);
  },

  addMarker: async (accountId: string, marker: Partial<BloodMarker>): Promise<string> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKERS');
      const markers = stored ? JSON.parse(stored) : [];
      const newId = 'mock_m_' + Date.now();
      markers.push({ ...marker, id: newId });
      localStorage.setItem('MOCK_DB_MARKERS', JSON.stringify(markers));
      StorageService._notifyMarkerSubscribers();
      return newId;
    }
    const markersRef = ref(db, `users/${accountId}/markers`);
    const newItemRef = push(markersRef);
    const finalItem = { ...marker, id: newItemRef.key! };
    Object.keys(finalItem).forEach(key => { if ((finalItem as any)[key] === undefined) delete (finalItem as any)[key]; });
    await set(newItemRef, finalItem);
    return newItemRef.key!;
  },

  updateMarker: async (accountId: string, marker: BloodMarker): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKERS');
      if (stored) {
        const markers = JSON.parse(stored).map((m: BloodMarker) => m.id === marker.id ? marker : m);
        localStorage.setItem('MOCK_DB_MARKERS', JSON.stringify(markers));
        StorageService._notifyMarkerSubscribers();
      }
      return;
    }
    const itemRef = ref(db, `users/${accountId}/markers/${marker.id}`);
    const finalItem = { ...marker };
    Object.keys(finalItem).forEach(key => { if ((finalItem as any)[key] === undefined) delete (finalItem as any)[key]; });
    await set(itemRef, finalItem);
  },

  deleteMarker: async (accountId: string, markerId: string): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKERS');
      if (stored) {
        const markers = JSON.parse(stored).filter((m: BloodMarker) => m.id !== markerId);
        localStorage.setItem('MOCK_DB_MARKERS', JSON.stringify(markers));
        StorageService._notifyMarkerSubscribers();
      }
      return;
    }
    await remove(ref(db, `users/${accountId}/markers/${markerId}`));
  },

  subscribeMarkerRecords: (accountId: string, onUpdate: (records: BloodMarkerRecord[]) => void): () => void => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      StorageService._markerRecordSubscribers.push(onUpdate);
      const stored = localStorage.getItem('MOCK_DB_MARKER_RECORDS');
      if (!stored) {
        localStorage.setItem('MOCK_DB_MARKER_RECORDS', JSON.stringify([
          { id: 'r1', markerId: 'm1', date: '2023-10-17', value: 4.8 },
          { id: 'r2', markerId: 'm1', date: '2024-12-02', value: 6.2 }
        ]));
      }
      StorageService._notifyMarkerRecordSubscribers();
      return () => { StorageService._markerRecordSubscribers = StorageService._markerRecordSubscribers.filter(cb => cb !== onUpdate); };
    }
    const recordsRef = ref(db, `users/${accountId}/marker_records`);
    const listener = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return onUpdate([]);
      onUpdate(Object.values(data));
    });
    return () => off(recordsRef, 'value', listener);
  },

  addMarkerRecord: async (accountId: string, record: Partial<BloodMarkerRecord>): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKER_RECORDS');
      const records = stored ? JSON.parse(stored) : [];
      records.push({ ...record, id: 'mock_r_' + Date.now() });
      localStorage.setItem('MOCK_DB_MARKER_RECORDS', JSON.stringify(records));
      StorageService._notifyMarkerRecordSubscribers();
      return;
    }
    const recordsRef = ref(db, `users/${accountId}/marker_records`);
    const newItemRef = push(recordsRef);
    const finalItem = { ...record, id: newItemRef.key! };
    Object.keys(finalItem).forEach(key => { if ((finalItem as any)[key] === undefined) delete (finalItem as any)[key]; });
    await set(newItemRef, finalItem);
  },

  updateMarkerRecord: async (accountId: string, record: BloodMarkerRecord): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKER_RECORDS');
      if (stored) {
        const records = JSON.parse(stored).map((r: BloodMarkerRecord) => r.id === record.id ? record : r);
        localStorage.setItem('MOCK_DB_MARKER_RECORDS', JSON.stringify(records));
        StorageService._notifyMarkerRecordSubscribers();
      }
      return;
    }
    const itemRef = ref(db, `users/${accountId}/marker_records/${record.id}`);
    const finalItem = { ...record };
    Object.keys(finalItem).forEach(key => { if ((finalItem as any)[key] === undefined) delete (finalItem as any)[key]; });
    await set(itemRef, finalItem);
  },

  deleteMarkerRecord: async (accountId: string, recordId: string): Promise<void> => {
    if (localStorage.getItem('E2E_TEST_MODE')) {
      const stored = localStorage.getItem('MOCK_DB_MARKER_RECORDS');
      if (stored) {
        const records = JSON.parse(stored).filter((r: BloodMarkerRecord) => r.id !== recordId);
        localStorage.setItem('MOCK_DB_MARKER_RECORDS', JSON.stringify(records));
        StorageService._notifyMarkerRecordSubscribers();
      }
      return;
    }
    await remove(ref(db, `users/${accountId}/marker_records/${recordId}`));
  }
};
