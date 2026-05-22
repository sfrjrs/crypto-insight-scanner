import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/firebase-app';
import { DEFAULT_PREFERENCES, UserPreferences } from '../models/coin.model';
import { AuthService } from './auth.service';
import { ALLOWED_CATEGORY_IDS } from '../config/allowed-categories';

const PREFS_DOC = 'settings';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly db = getFirebaseFirestore();
  private readonly auth = inject(AuthService);

  watchPreferences(): Observable<UserPreferences> {
    return new Observable<UserPreferences>((subscriber) => {
      const uid = this.auth.uid();
      if (!uid) {
        subscriber.next(DEFAULT_PREFERENCES);
        return;
      }
      const ref = doc(this.db, 'users', uid, 'preferences', PREFS_DOC);
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          subscriber.next(snap.data() as UserPreferences);
        } else {
          subscriber.next({
            ...DEFAULT_PREFERENCES,
            enabledCategories: [...ALLOWED_CATEGORY_IDS],
          });
        }
      });
      return () => unsub();
    });
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const ref = doc(this.db, 'users', uid, 'preferences', PREFS_DOC);
    await setDoc(ref, prefs, { merge: true });
  }

  async ensureDefaults(): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const ref = doc(this.db, 'users', uid, 'preferences', PREFS_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...DEFAULT_PREFERENCES,
        enabledCategories: [...ALLOWED_CATEGORY_IDS],
      });
    }
  }
}
