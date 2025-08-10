// CRUD de categorias usando Firestore
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const COLLECTION_NAME = "categories";

export async function getCategoriesFS(db) {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs.map(doc => doc.data().name);
}

export async function addCategoryFS(db, name) {
  // Garante unicidade pelo nome
  const cats = await getCategoriesFS(db);
  if (cats.includes(name)) throw new Error("Categoria já existe");
  await addDoc(collection(db, COLLECTION_NAME), { name });
}

export async function editCategoryFS(db, oldName, newName) {
  const catsRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(catsRef);
  let docId = null;
  snapshot.forEach(docSnap => {
    if (docSnap.data().name === oldName) docId = docSnap.id;
  });
  if (!docId) throw new Error("Categoria não encontrada");
  // Verifica se novo nome já existe
  if (snapshot.docs.some(d => d.data().name === newName)) throw new Error("Já existe categoria com esse nome");
  await updateDoc(doc(db, COLLECTION_NAME, docId), { name: newName });
}

export async function removeCategoryFS(db, name) {
  const catsRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(catsRef);
  let docId = null;
  snapshot.forEach(docSnap => {
    if (docSnap.data().name === name) docId = docSnap.id;
  });
  if (!docId) throw new Error("Categoria não encontrada");
  await deleteDoc(doc(db, COLLECTION_NAME, docId));
}
