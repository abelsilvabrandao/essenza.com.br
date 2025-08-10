// Lista inicial de categorias para gerenciamento
// No futuro, pode ser migrado para Firestore
const DEFAULT_CATEGORIES = [
  "Bebidas",
  "Doces",
  "Salgados",
  "Laticínios",
  "Padaria",
  "Higiene",
  "Limpeza",
  "Congelados",
  "Cuidados Capilares",
  "Tratamentos",
  "Kits",
  "Outros"
];

import { getCategoriesFS, addCategoryFS, editCategoryFS, removeCategoryFS } from './categories-firestore.js';

function getCategories() {
  // Retorna uma Promise com as categorias do Firestore
  return getCategoriesFS(window.db);
}

// saveCategories não é mais usado, pois agora o armazenamento é no Firestore

async function addCategory(name) {
  await addCategoryFS(window.db, name);
}

async function editCategory(oldName, newName) {
  await editCategoryFS(window.db, oldName, newName);
}

async function removeCategory(name) {
  await removeCategoryFS(window.db, name);
}

export { getCategories, addCategory, editCategory, removeCategory };
