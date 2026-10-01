import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, ensureAdminFirebaseAuth } from '../firebase';
import { BankingConfig, DEFAULT_BANKING_CONFIG, getStoredBankingConfig, saveStoredBankingConfig } from '../data/bookData';

const SETTINGS_COLLECTION = 'settings';
const BANKING_DOC_ID = 'banking';

export const BANKING_UPDATE_EVENT = 'dzmv:banking_updated';

/**
 * Cleanly serializes a BankingConfig object without any undefined fields.
 */
export function sanitizeBankingConfig(config: Partial<BankingConfig>): BankingConfig {
  return {
    bank: (config.bank || DEFAULT_BANKING_CONFIG.bank).trim(),
    iban: (config.iban || DEFAULT_BANKING_CONFIG.iban).trim(),
    mcxPhone: (config.mcxPhone || DEFAULT_BANKING_CONFIG.mcxPhone).trim(),
    beneficiary: (config.beneficiary || DEFAULT_BANKING_CONFIG.beneficiary).trim(),
    kwikAccountName: (config.kwikAccountName || DEFAULT_BANKING_CONFIG.kwikAccountName).trim(),
    kwikNibOrPhone: (config.kwikNibOrPhone || DEFAULT_BANKING_CONFIG.kwikNibOrPhone).trim(),
    kwikBank: (config.kwikBank || DEFAULT_BANKING_CONFIG.kwikBank).trim(),
    instructions: (config.instructions || DEFAULT_BANKING_CONFIG.instructions).trim(),
    redirectWhatsAppPhone: (config.redirectWhatsAppPhone || config.mcxPhone || DEFAULT_BANKING_CONFIG.redirectWhatsAppPhone || '').trim(),
  };
}

/**
 * Saves banking and payment coordinates to Cloud Firestore and updates local cache.
 */
export async function saveBankingToFirestore(config: BankingConfig): Promise<boolean> {
  const cleanConfig = sanitizeBankingConfig(config);

  // 1. Save to local storage for immediate offline/local availability
  saveStoredBankingConfig(cleanConfig);

  // 2. Dispatch event for all listeners in the current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BANKING_UPDATE_EVENT, { detail: cleanConfig }));
  }

  // 3. Persist to Cloud Firestore
  try {
    await ensureAdminFirebaseAuth();
    const bankingRef = doc(db, SETTINGS_COLLECTION, BANKING_DOC_ID);
    await setDoc(
      bankingRef,
      {
        ...cleanConfig,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    console.info('✓ Coordenadas bancárias sincronizadas com sucesso no Cloud Firestore!');
    return true;
  } catch (error) {
    console.warn('Aviso: Falha ao sincronizar coordenadas bancárias no Firestore:', error);
    return false;
  }
}

/**
 * Loads the latest banking coordinates from Cloud Firestore.
 */
export async function loadBankingFromFirestore(): Promise<BankingConfig> {
  try {
    const bankingRef = doc(db, SETTINGS_COLLECTION, BANKING_DOC_ID);
    const snap = await getDoc(bankingRef);
    if (snap.exists()) {
      const data = snap.data();
      const merged = sanitizeBankingConfig(data as Partial<BankingConfig>);
      saveStoredBankingConfig(merged);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BANKING_UPDATE_EVENT, { detail: merged }));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Aviso ao carregar coordenadas do Firestore, usando cache local:', err);
  }

  return getStoredBankingConfig();
}

/**
 * Subscribes in real-time to changes in banking and payment coordinates from Cloud Firestore.
 */
export function subscribeToBanking(onData: (config: BankingConfig) => void): () => void {
  let isUnsubscribed = false;
  let unsubscribeSnapshot: (() => void) | null = null;

  // Local window event listener
  const handleLocalUpdate = (event: Event) => {
    const customEvt = event as CustomEvent<BankingConfig>;
    if (customEvt.detail) {
      onData(customEvt.detail);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(BANKING_UPDATE_EVENT, handleLocalUpdate);
  }

  try {
    const bankingRef = doc(db, SETTINGS_COLLECTION, BANKING_DOC_ID);
    unsubscribeSnapshot = onSnapshot(
      bankingRef,
      (snap) => {
        if (isUnsubscribed) return;
        if (snap.exists()) {
          const data = snap.data();
          const merged = sanitizeBankingConfig(data as Partial<BankingConfig>);
          saveStoredBankingConfig(merged);
          onData(merged);
        }
      },
      (error) => {
        console.warn('Aviso no listener de coordenadas bancárias:', error);
      }
    );
  } catch (err) {
    console.warn('Erro ao registrar listener de coordenadas:', err);
  }

  return () => {
    isUnsubscribed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener(BANKING_UPDATE_EVENT, handleLocalUpdate);
    }
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
}
