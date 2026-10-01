import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, auth, ensureAdminFirebaseAuth } from '../firebase';
import { Lead } from '../data/leadsData';

const LEADS_COLLECTION = 'leads';

/**
 * Cleanly serializes a Lead object so that it contains no undefined values,
 * strictly matching the Firestore Lead entity schema.
 */
export function sanitizeLeadData(lead: Lead): Record<string, any> {
  return {
    id: String(lead.id || `lead-${Date.now()}`),
    fullName: String(lead.fullName || '').trim(),
    email: String(lead.email || '').trim(),
    phone: String(lead.phone || '').trim(),
    province: String(lead.province || 'Luanda').trim(),
    address: String(lead.address || '').trim(),
    format: lead.format === 'fisico' ? 'fisico' : 'ebook',
    formatLabel: String(lead.formatLabel || (lead.format === 'fisico' ? 'Livro Físico' : 'E-book Digital')),
    amountKz: Number(lead.amountKz) || (lead.format === 'fisico' ? 10000 : 5000),
    amountFormatted: String(lead.amountFormatted || (lead.format === 'fisico' ? '10.000 Kz' : '5.000 Kz')),
    paymentMethod: String(lead.paymentMethod || 'Multicaixa Express'),
    status: (['novo', 'contactado', 'pago', 'concluido', 'cancelado'].includes(lead.status) ? lead.status : 'novo'),
    statusLabel: String(lead.statusLabel || 'Novo Lead'),
    createdAt: String(lead.createdAt || 'Agora mesmo'),
    timestamp: Number(lead.timestamp) || Date.now(),
    notes: String(lead.notes || '').trim(),
    whatsappMessageSent: Boolean(lead.whatsappMessageSent),
    wantsPhysicalAlert: Boolean(lead.wantsPhysicalAlert),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Saves a lead to Cloud Firestore.
 * Ensures the payload is 100% clean and compatible across all mobile and desktop devices.
 */
export async function saveLeadToFirestore(lead: Lead): Promise<boolean> {
  try {
    const cleanLead = sanitizeLeadData(lead);
    const leadRef = doc(db, LEADS_COLLECTION, cleanLead.id);
    await setDoc(leadRef, cleanLead);
    console.info(`✓ Lead sincronizado com sucesso no Cloud Firestore: ${cleanLead.id} (${cleanLead.fullName})`);
    return true;
  } catch (error) {
    console.error('Falha ao gravar lead no Cloud Firestore:', error);
    return false;
  }
}

/**
 * Direct one-time fetch of all leads from Cloud Firestore.
 */
export async function loadAllLeadsFromFirestore(): Promise<Lead[]> {
  try {
    await ensureAdminFirebaseAuth();
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(leadsRef);
    const firestoreLeads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.fullName) {
        firestoreLeads.push(data as Lead);
      }
    });
    firestoreLeads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return firestoreLeads;
  } catch (err) {
    console.warn('Aviso ao carregar leads do Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to leads in Cloud Firestore.
 * Automatically ensures an active admin session is present to satisfy security rules.
 */
export function subscribeToFirestoreLeads(
  onData: (leads: Lead[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isUnsubscribed = false;
  let unsubscribeSnapshot: (() => void) | null = null;

  const startSubscription = () => {
    if (isUnsubscribed) return;

    try {
      const leadsRef = collection(db, LEADS_COLLECTION);
      unsubscribeSnapshot = onSnapshot(
        leadsRef,
        (snapshot) => {
          const firestoreLeads: Lead[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.fullName) {
              firestoreLeads.push(data as Lead);
            }
          });

          // Sort by timestamp desc
          firestoreLeads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          onData(firestoreLeads);
        },
        (error) => {
          console.warn('Aviso no listener de leads em tempo real:', error);
          if (onError) onError(error);
        }
      );
    } catch (err) {
      console.warn('Erro ao configurar listener do Firestore:', err);
    }
  };

  // Ensure admin auth, then listen
  if (!auth.currentUser) {
    ensureAdminFirebaseAuth().then(() => {
      startSubscription();
    });
  } else {
    startSubscription();
  }

  return () => {
    isUnsubscribed = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
}

export async function updateLeadInFirestore(leadId: string, updates: Partial<Lead>): Promise<void> {
  try {
    await ensureAdminFirebaseAuth();
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const cleanUpdates = Object.fromEntries(
      Object.entries({
        ...updates,
        updatedAt: new Date().toISOString()
      }).filter(([_, v]) => v !== undefined)
    );
    await updateDoc(leadRef, cleanUpdates);
  } catch (error) {
    console.warn('Falha ao atualizar lead no Firestore:', error);
  }
}

export async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  try {
    await ensureAdminFirebaseAuth();
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(leadRef);
  } catch (error) {
    console.warn('Falha ao eliminar lead no Firestore:', error);
  }
}

export async function clearAllLeadsFromFirestore(): Promise<void> {
  try {
    await ensureAdminFirebaseAuth();
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(leadsRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Falha ao limpar todos os leads no Firestore:', error);
  }
}
