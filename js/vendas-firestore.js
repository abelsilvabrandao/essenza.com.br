// vendas-firestore.js
// Script para integrar vendas.html ao estoque real do Firestore
import { loadProducts as loadProductsFromFirestore } from './products.js';
import { collection, doc, updateDoc, increment, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

// Carregar produtos reais do Firestore
export async function loadProducts() {
  const products = await loadProductsFromFirestore();
  // Mapeia para estrutura usada na UI de vendas.html
  return products.filter(p => p.active !== false).map(p => ({
    id: p.id,
    codigo: p.codigo || '',
    nome: p.name,
    preco: p.price,
    precoPix: p.pixPrice,
    estoque: p.quantity,
    imageUrl: p.imageUrl,
    categoria: p.category,
    descricao: p.description,
    oldPrice: p.oldPrice || null,
    specialOffer: p.specialOffer || false
  }));
}

// Atualizar estoque de um produto após venda
export async function baixarEstoque(productId, quantidade) {
  const db = window.db;
  const ref = doc(db, 'products', productId);
  await updateDoc(ref, { quantity: increment(-quantidade) });
}

// Salvar pedido no Firestore (opcional, pode ser adaptado)
export async function salvarPedidoFirestore(order) {
  const db = window.db;
  const pedidosRef = collection(db, 'pedidos');
  const docRef = await addDoc(pedidosRef, {
    ...order,
    status: 'Concluído',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}
