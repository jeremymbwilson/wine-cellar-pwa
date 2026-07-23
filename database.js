const WineDB = (() => {
  const DB_NAME = "wine-cellar-db";
  const DB_VERSION = 1;
  const STORE = "wines";

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("barcode", "barcode", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      const request = action(store);

      transaction.oncomplete = () => {
        db.close();
        resolve(request?.result);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  const getAll = () => withStore("readonly", store => store.getAll());
  const get = id => withStore("readonly", store => store.get(id));
  const put = wine => withStore("readwrite", store => store.put(wine));
  const remove = id => withStore("readwrite", store => store.delete(id));
  const clear = () => withStore("readwrite", store => store.clear());

  async function replaceAll(wines) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      store.clear();
      wines.forEach(wine => store.put(wine));
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  return { getAll, get, put, remove, clear, replaceAll };
})();
