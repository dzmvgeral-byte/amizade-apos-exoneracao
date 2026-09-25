import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Lead } from '../data/leadsData';

const LEADS_COLLECTION = 'leads';

export async function saveLeadToFirestore(lead: Lead): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, lead.id);
    await setDoc(leadRef, {
      ...lead,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Firestore offline or permission notice, fallback handled:', error);
    // Even if firestore offline, the local state continues
  }
}

export function subscribeToFirestoreLeads(
  onData: (leads: Lead[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    return onSnapshot(
      leadsRef,
      (snapshot) => {
        const firestoreLeads: Lead[] = [];
        snapshot.forEach((docSnap) => {
          firestoreLeads.push(docSnap.data() as Lead);
        });
        if (firestoreLeads.length > 0) {
          // Sort by timestamp desc
          firestoreLeads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          onData(firestoreLeads);
        }
      },
      (error) => {
        console.warn('Realtime subscription notice:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribe initial warning:', err);
    return () => {};
  }
}

export async function updateLeadInFirestore(leadId: string, updates: Partial<Lead>): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Failed to update lead in Firestore:', error);
  }
}

export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(leadRef);
  } catch (error) {
    console.warn('Failed to delete lead from Firestore:', error);
  }
}

export async function clearAllLeadsFromFirestore(): Promise<void> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(leadsRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Failed to clear leads from Firestore:', error);
  }
}
