import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// CRITICAL: Bind the exact firestoreDatabaseId and ignoreUndefinedProperties
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
  useFetchStreams: false
}, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth();
