// stock-entries.js
// Gerencia registro e exibição de entradas de estoque
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

export async function registerStockEntry(entry) {
  // Estrutura: { supplier, date, products: [{productId, quantity, unitPrice}] }
  const entryData = {
    ...entry,
    createdAt: new Date().toISOString(),
    timestamp: Timestamp.now()
  };
  await addDoc(collection(window.db, "stockEntries"), entryData);
}

export async function fetchStockEntries() {
  const entries = [];
  const q = query(collection(window.db, "stockEntries"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    entries.push({ id: docSnap.id, ...data });
  });
  return entries;
}
