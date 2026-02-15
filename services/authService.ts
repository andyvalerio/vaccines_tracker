import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";
import { auth } from "../firebaseConfig";

export const AuthService = {
  register: async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the display name immediately after registration
    await updateProfile(userCredential.user, {
      displayName: name
    });
    return userCredential.user;
  },

  login: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  },

  logout: async () => {
    await signOut(auth);
  },

  subscribe: (callback: (user: User | null) => void) => {
    const e2eUser = localStorage.getItem('E2E_TEST_USER');
    if (e2eUser) {
      const mockUser = {
        uid: 'e2e-test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({ token: 'mock-token', ...({} as any) }),
        reload: async () => { },
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
      } as unknown as User;
      callback(mockUser);
      return () => { };
    }
    return onAuthStateChanged(auth, callback);
  }
};