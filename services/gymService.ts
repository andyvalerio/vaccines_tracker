import { db, auth } from '../firebaseConfig';
import { ref, get, set, push, remove, update } from 'firebase/database';
import { GymExercise, GymDay, WorkoutSession } from '../types';

export const getGymExercises = async (): Promise<GymExercise[]> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const dbRef = ref(db, `users/${uid}/gym/exercises`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data);
    }
    return [];
};

export const saveGymExercise = async (exercise: GymExercise): Promise<GymExercise> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    let ex = { ...exercise };
    if (!ex.id) {
        const newRef = push(ref(db, `users/${uid}/gym/exercises`));
        ex.id = newRef.key as string;
    }
    await set(ref(db, `users/${uid}/gym/exercises/${ex.id}`), ex);
    return ex;
};

export const deleteGymExercise = async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    await remove(ref(db, `users/${uid}/gym/exercises/${id}`));
};

export const getGymDays = async (): Promise<GymDay[]> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const dbRef = ref(db, `users/${uid}/gym/days`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data);
    }
    return [];
};

export const saveGymDay = async (day: GymDay): Promise<GymDay> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    let d = { ...day };
    if (!d.id) {
        const newRef = push(ref(db, `users/${uid}/gym/days`));
        d.id = newRef.key as string;
    }
    await set(ref(db, `users/${uid}/gym/days/${d.id}`), d);
    return d;
};

export const deleteGymDay = async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    await remove(ref(db, `users/${uid}/gym/days/${id}`));
};

export const saveWorkoutSession = async (session: WorkoutSession): Promise<WorkoutSession> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    let s = { ...session };
    if (!s.id) {
        const newRef = push(ref(db, `users/${uid}/gym/sessions`));
        s.id = newRef.key as string;
    }
    await set(ref(db, `users/${uid}/gym/sessions/${s.id}`), s);
    return s;
};

export const getWorkoutSessions = async (): Promise<WorkoutSession[]> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    const dbRef = ref(db, `users/${uid}/gym/sessions`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data) as WorkoutSession[];
    }
    return [];
};

export const deleteWorkoutSession = async (id: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const uid = auth.currentUser.uid;
    await remove(ref(db, `users/${uid}/gym/sessions/${id}`));
};
