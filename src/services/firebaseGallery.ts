import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GalleryImage, DEFAULT_GALLERY, getStoredGallery, saveStoredGallery } from '../data/bookData';

const SETTINGS_COLLECTION = 'settings';
const GALLERY_DOC_ID = 'gallery';

/**
 * Saves full gallery order and list to Firestore and local cache
 */
export async function saveGalleryToFirestore(images: GalleryImage[]): Promise<void> {
  // Always update local cache first for instant UI response
  saveStoredGallery(images);

  try {
    const galleryRef = doc(db, SETTINGS_COLLECTION, GALLERY_DOC_ID);
    await setDoc(
      galleryRef,
      {
        images,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Failed to sync gallery to Firestore (running with local cache):', error);
  }
}

/**
 * Loads the latest gallery from Firestore, with fallback to local storage and defaults
 */
export async function loadGalleryFromFirestore(): Promise<GalleryImage[]> {
  try {
    const galleryRef = doc(db, SETTINGS_COLLECTION, GALLERY_DOC_ID);
    const snap = await getDoc(galleryRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.images) && data.images.length > 0) {
        saveStoredGallery(data.images);
        return data.images;
      }
    }

    // Also check if any documents were written in a 'gallery' collection
    const collectionRef = collection(db, 'gallery');
    const colSnap = await getDocs(collectionRef);
    if (!colSnap.empty) {
      const items: GalleryImage[] = [];
      colSnap.forEach((d) => {
        const itemData = d.data() as GalleryImage;
        items.push({ ...itemData, id: d.id });
      });
      if (items.length > 0) {
        saveStoredGallery(items);
        return items;
      }
    }
  } catch (err) {
    console.warn('Could not read gallery from Firestore, using local cache:', err);
  }

  return getStoredGallery();
}

/**
 * Subscribes to real-time changes of the gallery in Firestore
 */
export function subscribeToGallery(onData: (images: GalleryImage[]) => void): () => void {
  try {
    const galleryRef = doc(db, SETTINGS_COLLECTION, GALLERY_DOC_ID);
    const unsubscribe = onSnapshot(
      galleryRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.images) && data.images.length > 0) {
            saveStoredGallery(data.images);
            onData(data.images);
          }
        }
      },
      (error) => {
        console.warn('Gallery real-time listener error, using local state:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to establish gallery listener:', err);
    return () => {};
  }
}
