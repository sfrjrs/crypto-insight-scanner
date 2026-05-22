import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { collection, doc, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/firebase-app';
import { Coin } from '../models/coin.model';

@Injectable({ providedIn: 'root' })
export class CoinRepository {
  private readonly db = getFirebaseFirestore();

  watchCoins(limitCount = 200): Observable<Coin[]> {
    const q = query(
      collection(this.db, 'coins'),
      orderBy('investScore', 'desc'),
      limit(limitCount),
    );
    return new Observable<Coin[]>((subscriber) => {
      const unsub = onSnapshot(
        q,
        (snap) => subscriber.next(snap.docs.map((d) => d.data() as Coin)),
        (err) => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  watchCoin(id: string): Observable<Coin | undefined> {
    const ref = doc(this.db, 'coins', id);
    return new Observable<Coin | undefined>((subscriber) => {
      const unsub = onSnapshot(
        ref,
        (snap) => subscriber.next(snap.exists() ? (snap.data() as Coin) : undefined),
        (err) => subscriber.error(err),
      );
      return () => unsub();
    });
  }
}
