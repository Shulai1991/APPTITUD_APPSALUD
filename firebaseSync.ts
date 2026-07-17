import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, PROFESSIONALS, MOCK_USERS, MOCK_CENTERS } from './constants';
import { DEFAULT_PRICE_LIST } from './components/PriceList';
import type { Patient, Appointment, Professional, User, MedicalCenter, ClinicSettings, PriceListItem } from './types';

// ---------------------------------------------
// Operation Types for error logging
// ---------------------------------------------
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  
  // Protect the application from uncaught exceptions that freeze the React UI on background real-time listeners
  if (operationType !== OperationType.LIST && operationType !== OperationType.GET) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Ensure the user is signed in anonymously to pass the security rules
export async function ensureFirebaseAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
      console.log("Firebase Auth: Signed in anonymously successfully.");
    }
  } catch (error: any) {
    if (error && error.code === 'auth/admin-restricted-operation') {
      console.warn("Firebase Auth: Anonymous authentication is restricted/disabled in the Firebase Console. Continuing without Auth (Firestore is configured with open rules).");
    } else {
      console.warn("Firebase Auth initialization warning:", error);
    }
  }
}

// ---------------------------------------------
// Seeding & Initialization Helpers (Runs if remote DB is empty)
// ---------------------------------------------
export async function seedDatabaseIfEmpty() {
  await ensureFirebaseAuth();

  // 1. Check if the database has already been seeded in the past.
  // This avoids re-seeding demo data if a collection is emptied during stable/production use!
  try {
    const initFlagDoc = await getDoc(doc(db, 'system', 'initializer'));
    if (initFlagDoc.exists() && initFlagDoc.data()?.seeded === true) {
      console.log('Database has already been initialized/seeded. Skipping automatic mock data insertion.');
      return;
    }
  } catch (err) {
    // If we throw here, it's due to offline state or auth missing. Proceeding is unsafe as we cannot assure if there is existing data.
    console.error("Could not retrieve system seeding lock doc due to error/offline. Aborting automatic seeding to prevent overwriting user data:", err);
    return;
  }
  
  let didSeedAny = false;

  // Seed Centers
  try {
    const centersSnap = await getDocs(collection(db, 'centers'));
    if (centersSnap.empty) {
      console.log('Seeding initial centers to Firestore...');
      for (const center of MOCK_CENTERS) {
        await setDoc(doc(db, 'centers', center.id), center);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding centers:", err);
  }

  // Seed Users
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of MOCK_USERS) {
        await setDoc(doc(db, 'users', u.id.toString()), u);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding users:", err);
  }

  // Seed Patients
  try {
    const patsSnap = await getDocs(collection(db, 'patients'));
    if (patsSnap.empty) {
      console.log('Seeding initial patients to Firestore...');
      for (const pat of MOCK_PATIENTS) {
        await setDoc(doc(db, 'patients', pat.id.toString()), pat);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding patients:", err);
  }

  // Seed Appointments
  try {
    const aptsSnap = await getDocs(collection(db, 'appointments'));
    if (aptsSnap.empty) {
      console.log('Seeding initial appointments to Firestore...');
      for (const apt of MOCK_APPOINTMENTS) {
        await setDoc(doc(db, 'appointments', apt.id.toString()), apt);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding appointments:", err);
  }

  // Seed Professionals
  try {
    const prosSnap = await getDocs(collection(db, 'professionals'));
    if (prosSnap.empty) {
      console.log('Seeding initial professionals to Firestore...');
      for (const p of PROFESSIONALS) {
        await setDoc(doc(db, 'professionals', p.id.toString()), p);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding professionals:", err);
  }

  // Seed Price List Items
  try {
    const priceSnap = await getDocs(collection(db, 'priceListItems'));
    if (priceSnap.empty) {
      console.log('Seeding initial price lists to Firestore...');
      for (const item of DEFAULT_PRICE_LIST) {
        await setDoc(doc(db, 'priceListItems', item.id), item);
      }
      didSeedAny = true;
    }
  } catch (err) {
    console.error("Error seeding price list items:", err);
  }

  // 2. Mark the database as seeded so we never re-seed even if subsequent client deletes leaves lists empty.
  try {
    await setDoc(doc(db, 'system', 'initializer'), { seeded: true, seededAt: new Date().toISOString() });
    console.log("Database initialized/seeded flag marked successfully as permanent lock.");
  } catch (err) {
    console.error("Failed to save database initialization lock doc:", err);
  }
}

// ---------------------------------------------
// Write & Mutation Operations (Saves directly to Firebase)
// ---------------------------------------------

export async function saveCenterToFirestore(center: MedicalCenter) {
  const path = `centers/${center.id}`;
  try {
    await setDoc(doc(db, 'centers', center.id), center);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCenterFromFirestore(id: string) {
  const path = `centers/${id}`;
  try {
    await deleteDoc(doc(db, 'centers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveUserToFirestore(user: User) {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id.toString()), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(id: number) {
  const path = `users/${id}`;
  try {
    await deleteDoc(doc(db, 'users', id.toString()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePatientToFirestore(patient: Patient) {
  const path = `patients/${patient.id}`;
  try {
    await setDoc(doc(db, 'patients', patient.id.toString()), patient);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAppointmentToFirestore(appointment: Appointment) {
  const path = `appointments/${appointment.id}`;
  try {
    await setDoc(doc(db, 'appointments', appointment.id.toString()), appointment);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeAppointmentFromFirestore(id: number) {
  const path = `appointments/${id}`;
  try {
    await deleteDoc(doc(db, 'appointments', id.toString()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveProfessionalToFirestore(professional: Professional) {
  const path = `professionals/${professional.id}`;
  try {
    await setDoc(doc(db, 'professionals', professional.id.toString()), professional);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProfessionalFromFirestore(id: number) {
  const path = `professionals/${id}`;
  try {
    await deleteDoc(doc(db, 'professionals', id.toString()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePriceLibraryItemToFirestore(item: PriceListItem) {
  const path = `priceListItems/${item.id}`;
  try {
    await setDoc(doc(db, 'priceListItems', item.id), item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePriceLibraryItemFromFirestore(id: string) {
  const path = `priceListItems/${id}`;
  try {
    await deleteDoc(doc(db, 'priceListItems', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveClinicSettingsToFirestore(centerId: string, settings: ClinicSettings) {
  const path = `clinicSettings/${centerId}`;
  try {
    await setDoc(doc(db, 'clinicSettings', centerId), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------------------------------------------
// Real-time Firestore Subscriptions setup
// ---------------------------------------------

export function subscribeCenters(onUpdate: (updatedCenters: MedicalCenter[]) => void) {
  return onSnapshot(
    collection(db, 'centers'),
    (snap) => {
      const items: MedicalCenter[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as MedicalCenter);
      });
      onUpdate(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'centers')
  );
}

export function subscribeUsers(onUpdate: (updatedUsers: User[]) => void) {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const items: User[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as User);
      });
      onUpdate(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'users')
  );
}

export function subscribePatients(centerId: string, onUpdate: (pats: Patient[]) => void) {
  const q = query(collection(db, 'patients'), where('centerId', '==', centerId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Patient[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as Patient);
      });
      onUpdate(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `patients?centerId=${centerId}`)
  );
}

export function subscribeAppointments(centerId: string, onUpdate: (apts: Appointment[]) => void) {
  const q = query(collection(db, 'appointments'), where('centerId', '==', centerId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Appointment[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as Appointment);
      });
      // Sort them by date and time
      const sorted = items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time));
      onUpdate(sorted);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `appointments?centerId=${centerId}`)
  );
}

export function subscribeProfessionals(centerId: string, onUpdate: (pros: Professional[]) => void) {
  // If the professional system is scoped to centerId, we filter. Otherwise load all.
  // We filter by checking centerId or loading all and resolving locally. To be safe, let's load all and let the client have them all, or filter if marked.
  return onSnapshot(
    collection(db, 'professionals'),
    (snap) => {
      const items: Professional[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as Professional);
      });
      onUpdate(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'professionals')
  );
}

export function subscribePriceList(centerId: string, onUpdate: (items: PriceListItem[]) => void) {
  return onSnapshot(
    collection(db, 'priceListItems'),
    (snap) => {
      const items: PriceListItem[] = [];
      snap.forEach(doc => {
        items.push(doc.data() as PriceListItem);
      });
      onUpdate(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'priceListItems')
  );
}

export function subscribeClinicSettings(centerId: string, onUpdate: (settings: ClinicSettings) => void) {
  return onSnapshot(
    doc(db, 'clinicSettings', centerId),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as ClinicSettings);
      } else {
        // Initial setup for this clinic settings
        const activeCenterObj = doc(db, 'centers', centerId);
        getDoc(activeCenterObj).then(centerSnap => {
          if (centerSnap.exists()) {
            const centerData = centerSnap.data() as MedicalCenter;
            const initialSettings: ClinicSettings = {
              name: centerData.name,
              logo: centerData.logo,
              address: centerData.address,
              cuil: centerData.cuil,
              phone: centerData.phone,
              consentTemplate: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO ODONTOLÓGICO\n\n...`
            };
            setDoc(doc(db, 'clinicSettings', centerId), initialSettings);
            onUpdate(initialSettings);
          }
        });
      }
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `clinicSettings/${centerId}`)
  );
}
