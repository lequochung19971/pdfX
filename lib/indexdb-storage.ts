import type { Annotation, Highlight, Screenshot } from '@/lib/types';

// Database configurations
const DB_NAME = 'pdfx-storage';
const DB_VERSION = 2; // Increment version to add screenshot store
const HIGHLIGHT_STORE = 'highlights';
const ANNOTATION_STORE = 'annotations';
const SCREENSHOT_STORE = 'screenshots';

// Initialize the database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(HIGHLIGHT_STORE)) {
        const highlightStore = db.createObjectStore(HIGHLIGHT_STORE, { keyPath: 'id' });
        highlightStore.createIndex('pdfId', 'pdfId', { unique: false });
      }

      if (!db.objectStoreNames.contains(ANNOTATION_STORE)) {
        const annotationStore = db.createObjectStore(ANNOTATION_STORE, { keyPath: 'id' });
        annotationStore.createIndex('pdfId', 'pdfId', { unique: false });
      }

      if (!db.objectStoreNames.contains(SCREENSHOT_STORE)) {
        const screenshotStore = db.createObjectStore(SCREENSHOT_STORE, { keyPath: 'id' });
        screenshotStore.createIndex('pdfId', 'pdfId', { unique: false });
      }
    };
  });
};

// Save highlights to IndexedDB
export const saveHighlightsToIndexedDB = async (
  pdfId: string,
  highlights: Highlight[]
): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(HIGHLIGHT_STORE, 'readwrite');
    const store = transaction.objectStore(HIGHLIGHT_STORE);

    // Delete existing highlights for this PDF
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);
    const request = index.openKeyCursor(keyRange);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        // After deleting, add all current highlights
        highlights.forEach((highlight) => {
          store.add({ ...highlight, pdfId });
        });
      }
    };

    // Return a promise that resolves when the transaction completes
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save highlights to IndexedDB'));
    });
  } catch (error) {
    console.error('Error saving highlights to IndexedDB:', error);
    throw error;
  }
};

// Retrieve highlights from IndexedDB
export const getHighlightsFromIndexedDB = async (pdfId: string): Promise<Highlight[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(HIGHLIGHT_STORE, 'readonly');
    const store = transaction.objectStore(HIGHLIGHT_STORE);
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);

    return new Promise((resolve, reject) => {
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const highlights = request.result.map((item) => {
          // Remove the pdfId property as it's not needed in the component
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pdfId, ...highlight } = item;
          return highlight as Highlight;
        });
        resolve(highlights);
      };

      request.onerror = () => reject(new Error('Failed to retrieve highlights from IndexedDB'));
    });
  } catch (error) {
    console.error('Error retrieving highlights from IndexedDB:', error);
    return [];
  }
};

// Save annotations to IndexedDB
export const saveAnnotationsToIndexedDB = async (
  pdfId: string,
  annotations: Annotation[]
): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(ANNOTATION_STORE, 'readwrite');
    const store = transaction.objectStore(ANNOTATION_STORE);

    // Delete existing annotations for this PDF
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);
    const request = index.openKeyCursor(keyRange);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        // After deleting, add all current annotations
        annotations.forEach((annotation) => {
          store.add({ ...annotation, pdfId });
        });
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save annotations to IndexedDB'));
    });
  } catch (error) {
    console.error('Error saving annotations to IndexedDB:', error);
    throw error;
  }
};

// Retrieve annotations from IndexedDB
export const getAnnotationsFromIndexedDB = async (pdfId: string): Promise<Annotation[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(ANNOTATION_STORE, 'readonly');
    const store = transaction.objectStore(ANNOTATION_STORE);
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);

    return new Promise((resolve, reject) => {
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const annotations = request.result.map((item) => {
          // Remove the pdfId property as it's not needed in the component
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pdfId, ...annotation } = item;
          return annotation as Annotation;
        });
        resolve(annotations);
      };

      request.onerror = () => reject(new Error('Failed to retrieve annotations from IndexedDB'));
    });
  } catch (error) {
    console.error('Error retrieving annotations from IndexedDB:', error);
    return [];
  }
};

// Save screenshots to IndexedDB
export const saveScreenshotsToIndexedDB = async (
  pdfId: string,
  screenshots: Screenshot[]
): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(SCREENSHOT_STORE, 'readwrite');
    const store = transaction.objectStore(SCREENSHOT_STORE);

    // Delete existing screenshots for this PDF
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);
    const request = index.openKeyCursor(keyRange);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        // After deleting, add all current screenshots
        screenshots.forEach((screenshot) => {
          store.add({ ...screenshot, pdfId });
        });
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to save screenshots to IndexedDB'));
    });
  } catch (error) {
    console.error('Error saving screenshots to IndexedDB:', error);
    throw error;
  }
};

// Retrieve screenshots from IndexedDB
export const getScreenshotsFromIndexedDB = async (pdfId: string): Promise<Screenshot[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(SCREENSHOT_STORE, 'readonly');
    const store = transaction.objectStore(SCREENSHOT_STORE);
    const index = store.index('pdfId');
    const keyRange = IDBKeyRange.only(pdfId);

    return new Promise((resolve, reject) => {
      const request = index.getAll(keyRange);

      request.onsuccess = () => {
        const screenshots = request.result.map((item) => {
          // Remove the pdfId property as it's not needed in the component
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pdfId, ...screenshot } = item;
          return {
            ...screenshot,
            timestamp: new Date(screenshot.timestamp), // Convert back to Date object
          } as Screenshot;
        });
        resolve(screenshots);
      };

      request.onerror = () => reject(new Error('Failed to retrieve screenshots from IndexedDB'));
    });
  } catch (error) {
    console.error('Error retrieving screenshots from IndexedDB:', error);
    return [];
  }
};

// Save highlights, annotations, and screenshots
export const saveAllToIndexedDB = async (
  pdfId: string,
  data: { highlights: Highlight[]; annotations: Annotation[]; screenshots: Screenshot[] }
): Promise<void> => {
  await Promise.all([
    saveHighlightsToIndexedDB(pdfId, data.highlights),
    saveAnnotationsToIndexedDB(pdfId, data.annotations),
    saveScreenshotsToIndexedDB(pdfId, data.screenshots),
  ]);
};

// Get highlights, annotations, and screenshots
export const getAllFromIndexedDB = async (pdfId: string) => {
  const [highlights, annotations, screenshots] = await Promise.all([
    getHighlightsFromIndexedDB(pdfId),
    getAnnotationsFromIndexedDB(pdfId),
    getScreenshotsFromIndexedDB(pdfId),
  ]);

  return { highlights, annotations, screenshots };
};
