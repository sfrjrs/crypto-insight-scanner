import { Injectable, inject, signal, computed } from '@angular/core';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/firebase-app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getFirebaseAuth();
  private readonly userSignal = signal<User | null>(null);
  private readonly readySignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly isReady = this.readySignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly uid = computed(() => this.userSignal()?.uid ?? null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userSignal.set(user);
      this.readySignal.set(true);
    });
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmail(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
