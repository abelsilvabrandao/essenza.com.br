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

  // Gerar orderNumber padronizado para vendas.html
  // Formato: PEDEXPRESS + yyyyMMddHHmmss + NNN
  function genOrderNumber() {
    const d = new Date();
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    const y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const rnd = pad(Math.floor(Math.random() * 1000), 3);
    return `PEDEXPRESS${y}${M}${D}${h}${m}${s}${rnd}`;
  }

  // Normalizar estrutura para a coleção 'orders' usada no site/app.js
  const normalized = {
    // Número do pedido diferenciado do fluxo vendas.html
    orderNumber: order.orderNumber || genOrderNumber(),
    // Itens no formato padrão
    items: (order.itens || []).map(it => ({
      id: String(it.id),
      name: it.nome,
      price: Number(it.preco) || 0,
      quantity: Number(it.qtd) || 1,
      subtotal: Number(it.subtotal) || Number(it.preco) * Number(it.qtd) || 0
    })),
    // Totais e pagamento
    total: Number(order.total) || 0,
    paymentMethod: (order.pagamento && order.pagamento.forma) || 'Pix',
    payment: {
      method: (order.pagamento && order.pagamento.forma) || 'Pix',
      cashReceived: order.pagamento?.recebido ?? null,
      change: order.pagamento?.troco ?? 0
    },
    // Cliente
    customerName: order.cliente?.nome || '',
    customerPhone: order.cliente?.cel || '',
    customerEmail: order.cliente?.email || '',
    clienteCpf: order.cliente?.cpf || null,
    // Metadados
    status: 'Concluído',
    source: 'vendas',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ordersRef = collection(db, 'orders');
  const docRef = await addDoc(ordersRef, normalized);
  return { id: docRef.id, orderNumber: normalized.orderNumber };
}
