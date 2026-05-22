import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/firebase-app';
import { AuthService } from './auth.service';
import { WatchlistItem } from '../models/coin.model';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly db = getFirebaseFirestore();
  private readonly auth = inject(AuthService);

  watchWatchlist(): Observable<Set<string>> {
    return new Observable<Set<string>>((subscriber) => {
      const uid = this.auth.uid();
      if (!uid) {
        subscriber.next(new Set());
        return;
      }
      const col = collection(this.db, 'users', uid, 'watchlist');
      const unsub = onSnapshot(col, (snap) => {
        subscriber.next(new Set(snap.docs.map((d) => d.id)));
      });
      return () => unsub();
    });
  }

  async toggle(coinId: string, currentlyWatched: boolean): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const ref = doc(this.db, 'users', uid, 'watchlist', coinId);
    if (currentlyWatched) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { coinId, addedAt: Timestamp.now() } satisfies WatchlistItem);
    }
  }
}
