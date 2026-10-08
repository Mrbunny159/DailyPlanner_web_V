import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import type { User } from 'firebase/auth';

import { auth, googleProvider } from './config';

export function loginWithGoogle(): Promise<User> {
  return signInWithPopup(auth, googleProvider).then((result) => result.user);
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}