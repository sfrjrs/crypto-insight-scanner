import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth, Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

let app: FirebaseApp;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(environment.firebase);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (environment.useEmulators) {
      connectAuthEmulator(auth, `http://127.0.0.1:${environment.emulatorPorts.auth}`, {
        disableWarnings: true,
      });
    }
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
    if (environment.useEmulators) {
      connectFirestoreEmulator(firestore, '127.0.0.1', environment.emulatorPorts.firestore);
    }
  }
  return firestore;
}

