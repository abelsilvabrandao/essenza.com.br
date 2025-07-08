// Gerenciamento de estoque
import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Função para renderizar pedidos
export async function renderOrdersList() {
  const ordersList = document.getElementById('ordersList');
  const ordersSummary = document.getElementById('ordersSummary');
  if (!ordersList) return;
  ordersList.innerHTML = '<p>Carregando pedidos...</p>';
  if (ordersSummary) ordersSummary.style.display = 'none';

  try {
    const ordersSnapshot = await getDocs(collection(window.db, 'orders'));
    let html = '';
    let totalPedidos = 0;
    let totalVendido = 0;
    let totalCompra = 0;
    let totalLucro = 0;
    const orders = [];

    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      order._id = doc.id;
      orders.push(order);
      totalPedidos++;
      // Não calcular totalVendido aqui!
    });

    // 1. Gerar HTML dos cards e calcular _purchaseCost
    html = orders.map(order => {
      const statusClass = order.status === 'Concluído' ? 'completed' : order.status === 'Cancelado' ? 'cancelled' : '';
      const statusLabel = order.status || 'Pendente';

      // Corrigir data do pedido para evitar Invalid Date
      let dataPedido = '';
      if (order.createdAt) {
        if (typeof order.createdAt.toDate === 'function') {
          dataPedido = order.createdAt.toDate().toLocaleString('pt-BR');
        } else if (typeof order.createdAt === 'number') {
          dataPedido = new Date(order.createdAt).toLocaleString('pt-BR');
        } else if (typeof order.createdAt === 'string') {
          dataPedido = new Date(order.createdAt).toLocaleString('pt-BR');
        }
      }

      // Calcular custo de compra real do pedido (robusto)
      let purchaseCost = 0;
      (order.items || []).forEach(item => {
        const produto = window.products?.find(p => String(p.id) === String(item.productId));
        if (produto && produto.purchasePrice) {
          purchaseCost += Number(produto.purchasePrice) * Number(item.quantity || 1);
        }
      });
      order._purchaseCost = purchaseCost; // Salva para uso no resumo

      return `
        <div class="order-card" data-order-id="${order._id}">
          <div class="order-header">
            <div><b>Pedido:</b> ${order.orderNumber || order._id}</div>
            <span class="order-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="order-meta"><b>Cliente:</b> ${order.customerName || '-'}<br><span class="order-date">${dataPedido}</span></div>
          <div class="order-products">
            <b>Produtos:</b>
            <ul>
              ${(order.items || []).map(item => `<li>${item.name} (${item.quantity}x)</li>`).join('')}
            </ul>
          </div>
          <div class="order-total"><b>Total:</b> R$ ${(order.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="order-meta"><b>Custo de compra:</b> R$ ${purchaseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><b>Lucro estimado:</b> R$ ${((order.total ?? 0)-purchaseCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="order-actions">
            <button class="order-action-btn complete" data-action="complete" data-order-id="${order._id}" ${order.status === 'Concluído' || order.status === 'Cancelado' ? 'disabled' : ''}><i class='fas fa-check'></i> Concluído</button>
            <button class="order-action-btn cancel" data-action="cancel" data-order-id="${order._id}" ${order.status === 'Cancelado' || order.status === 'Concluído' ? 'disabled' : ''}><i class='fas fa-times'></i> Cancelar</button>
          </div>
        </div>
      `;
    }).join('');

    // 2. Só depois, calcule os totalizadores:
    totalVendido = 0;
    totalCompra = 0;
    totalLucro = 0;
    orders.forEach(order => {
      // Só adiciona ao total se o pedido não estiver cancelado
      if (order.status !== 'Cancelado') {
        totalVendido += order.total ?? 0;
        totalCompra += order._purchaseCost || 0;
        totalLucro += (order.total ?? 0) - (order._purchaseCost || 0);
      }
    });

    // Renderizar cards
    html = orders.map(order => {
  const statusClass = order.status === 'Concluído' ? 'completed' : order.status === 'Cancelado' ? 'cancelled' : '';
  const statusLabel = order.status || 'Pendente';

  // Corrigir data do pedido para evitar Invalid Date
  let dataPedido = '';
  if (order.createdAt) {
    if (typeof order.createdAt.toDate === 'function') {
      dataPedido = order.createdAt.toDate().toLocaleString('pt-BR');
    } else if (typeof order.createdAt === 'number') {
      dataPedido = new Date(order.createdAt).toLocaleString('pt-BR');
    } else if (typeof order.createdAt === 'string') {
      dataPedido = new Date(order.createdAt).toLocaleString('pt-BR');
    }
  }

  // Calcular custo de compra real do pedido (robusto)
  let purchaseCost = 0;
  (order.items || []).forEach(item => {
    const produto = window.products?.find(p => String(p.id) === String(item.productId));
    if (produto && produto.purchasePrice) {
      purchaseCost += Number(produto.purchasePrice) * Number(item.quantity || 1);
    }
  });
  order._purchaseCost = purchaseCost; // Salva para uso no resumo

  return `
    <div class="order-card" data-order-id="${order._id}">
      <div class="order-header">
        <div><b>Pedido:</b> ${order.orderNumber || order._id}</div>
        <span class="order-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="order-meta"><b>Cliente:</b> ${order.customerName || '-'}<br><span class="order-date">${dataPedido}</span></div>
      <div class="order-products">
        <b>Produtos:</b>
        <ul>
          ${(order.items || []).map(item => `<li>${item.name} (${item.quantity}x)</li>`).join('')}
        </ul>
      </div>
      <div class="order-total"><b>Total:</b> R$ ${(order.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="order-meta"><b>Custo de compra:</b> R$ ${purchaseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><b>Lucro estimado:</b> R$ ${((order.total ?? 0)-purchaseCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="order-actions">
        <button class="order-action-btn complete" data-action="complete" data-order-id="${order._id}" ${order.status === 'Concluído' ? 'disabled' : ''}><i class='fas fa-check'></i> Concluído</button>
        <button class="order-action-btn cancel" data-action="cancel" data-order-id="${order._id}" ${order.status === 'Cancelado' ? 'disabled' : ''}><i class='fas fa-times'></i> Cancelar</button>
      </div>
    </div>
  `;
}).join('');

    ordersList.innerHTML = html || '<p>Nenhum pedido encontrado.</p>';

    // Delegação de eventos para ações dos pedidos
    ordersList.removeEventListener('__orders_action__', window.__ordersActionHandler__); // Remove antigo, se existir
    window.__ordersActionHandler__ = function(e) {
      const btn = e.target.closest('.order-action-btn');
      if (!btn || btn.disabled) return;
      const orderId = btn.getAttribute('data-order-id');
      const action = btn.getAttribute('data-action');
      if (action === 'complete') {
        window.StockModule.completeOrder(orderId);
      } else if (action === 'cancel') {
        // Chama a função para cancelar o pedido
        window.StockModule.cancelOrder(orderId);
      }
    };
    ordersList.addEventListener('click', window.__ordersActionHandler__, false);
    ordersList.__orders_action__ = true;

    // Atualiza totalizadores
    if (ordersSummary) {
      ordersSummary.innerHTML = `
        <div class="summary-item">
          <span class="summary-label">Total de Pedidos</span>
          <span class="summary-value">${totalPedidos}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Valor Vendido</span>
          <span class="summary-value">R$ ${totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Valor de Compra</span>
          <span class="summary-value">R$ ${totalCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Lucro Estimado</span>
          <span class="summary-value">R$ ${totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      `;
      ordersSummary.style.display = 'flex';
    }
  } catch (err) {
    ordersList.innerHTML = '<p>Erro ao carregar pedidos.</p>';
    if (ordersSummary) ordersSummary.style.display = 'none';
    console.error('Erro ao carregar pedidos:', err);
  }
}

// Funções globais para ações dos pedidos
window.StockModule = window.StockModule || {};
// Definição das funções de pedidos

window.StockModule.completeOrder = async function(orderId) {

  console.debug('[Pedidos] Clique em Concluído para orderId:', orderId);

  try {
    const orderRef = doc(window.db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return Swal.fire('Erro', 'Pedido não encontrado!', 'error');
    const order = orderSnap.data();
    if (order.status === 'Concluído') return;
    await setDoc(orderRef, { status: 'Concluído' }, { merge: true });
    Swal.fire('Pedido concluído!', 'O status do pedido foi atualizado para Concluído.', 'success');
    renderOrdersList();
  } catch (e) {
    Swal.fire('Erro', 'Não foi possível atualizar o pedido.', 'error');
    console.error('Erro ao consumir pedido:', e);
  }
};
window.StockModule.cancelOrder = async function(orderId) {

  console.debug('[Pedidos] Clique em Cancelar para orderId:', orderId);

  try {
    const orderRef = doc(window.db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return Swal.fire('Erro', 'Pedido não encontrado!', 'error');
    const order = orderSnap.data();
    if (order.status === 'Cancelado') return;
    // Retornar saldo dos produtos ao estoque
    if (Array.isArray(order.items)) {
      const batch = writeBatch(window.db);
      for (const item of order.items) {
        const prodRef = doc(window.db, 'products', String(item.id));
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          const newQty = (prodData.quantity || 0) + (item.quantity || 0);
          batch.set(prodRef, { quantity: newQty }, { merge: true });
        }
      }
      await batch.commit();
    }
    await setDoc(orderRef, { status: 'Cancelado' }, { merge: true });
    Swal.fire('Pedido cancelado!', 'O pedido foi cancelado e o estoque atualizado.', 'success');
    renderOrdersList();
  } catch (e) {
    Swal.fire('Erro', 'Não foi possível cancelar o pedido.', 'error');
    console.error('Erro ao cancelar pedido:', e);
  }
};


import { loadProducts, saveProduct } from "../js/products.js";

// Dados dos produtos
let products = [];
let waitlist = JSON.parse(localStorage.getItem("waitlist") || "{}");
let stockData = {};
let deletedIds = new Set(); // Para armazenar IDs de produtos deletados

// Função global para obter próximo ID disponível
function getNextProductId() {
  const existingIds = products.map((p) => parseInt(p.id));
  let id = 1;
  while (true) {
    if (!existingIds.includes(id) && !deletedIds.has(id)) {
      return id.toString();
    }
    id++;
  }
}


// Função auxiliar para atualizar o DOM quando necessário
function updateUI() {
  const currentTab = document.querySelector(".tab-button.active");
  if (currentTab) {
    const tabId = currentTab.id;
    switch (tabId) {
      case "stockTabBtn":
        renderStockList();
        break;
      case "specialOffersTabBtn":
        // Só renderizar ofertas especiais quando na aba de ofertas
        renderSpecialOffers();
        break;
      case "waitlistTabBtn":
        renderWaitlistList();
        break;
      case "ordersTabBtn":
        renderOrdersList();
        break;
    }
  }
  // Não renderizar ofertas especiais automaticamente quando houver alterações pendentes
  // Isso será tratado pela renderização da aba atual
}

// Inicializar dados do estoque
async function initializeStock() {
  try {
    if (!window.db) {
      throw new Error("Firestore não está inicializado");
    }

    // Carregar produtos primeiro
    products = []; // zera para evitar duplicação

    // Configurar listener em tempo real para produtos
    const productsCollection = collection(window.db, "products");

    onSnapshot(
      productsCollection,
      async (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();

          // Garantir que todos os produtos tenham quantity e active
          if (change.type === "added" || change.type === "modified") {
            if (typeof data.quantity === "undefined") {
              // Inicializar quantity se não existir
              const productRef = doc(
                window.db,
                "products",
                String(change.doc.id),
              );
              setDoc(productRef, { quantity: 0 }, { merge: true });
              data.quantity = 0;
            }
            if (typeof data.active === "undefined") {
              // Inicializar active se não existir
              const productRef = doc(
                window.db,
                "products",
                String(change.doc.id),
              );
              setDoc(productRef, { active: true }, { merge: true });
              data.active = true;
            }
          }

          // Atualizar produto na lista local
          const index = products.findIndex((p) => p.id === change.doc.id);
          if (index > -1) {
            if (change.type === "removed") {
              products.splice(index, 1);
            } else {
              products[index] = { id: change.doc.id, ...data };
            }
          } else if (change.type !== "removed") {
            products.push({ id: change.doc.id, ...data });
          }
        });

        // Atualizar UI se houver mudanças
        if (snapshot.docChanges().length > 0) {
          // Atualizar UI apenas se não estivermos na aba de ofertas especiais
          const currentTab = document.querySelector(".tab-button.active");
          if (currentTab?.id !== "specialOffersTabBtn") {
            updateUI();
            // saveStockData(); // Não chamar automaticamente! Salve apenas alterações pendentes.
          }
        } else {
          console.log("Nenhuma mudança detectada no snapshot");
        }
      },
      (error) => {
        console.error("Erro ao observar mudanças no estoque:", error);
        Swal.fire({
          title: "Erro",
          text: "Erro ao monitorar mudanças no estoque: " + error.message,
          icon: "error",
          confirmButtonColor: "#ff1493",
        });
      },
    );

    // Renderizar lista inicial
    console.log("Renderizando lista inicial com", products.length, "produtos");
    renderStockList();

    console.log("Estoque inicializado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao inicializar estoque:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao carregar dados do estoque: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
    return false;
  }
}

async function saveStockData(showFeedback = false) {
  try {
    console.log("Salvando dados do estoque...");
    const batch = writeBatch(window.db);

    // Salvar dados do estoque
    for (const product of products) {
      const productRef = doc(window.db, "products", String(product.id));
      batch.set(
        productRef,
        {
          ...product,
          quantity: product.quantity || 0,
          active: product.active !== false,
        },
        { merge: true },
      );
    }

    await batch.commit();
    console.log("Dados do estoque salvos com sucesso!");

    if (showFeedback) {
      Swal.fire({
        title: "Sucesso!",
        text: "Dados do estoque salvos com sucesso!",
        icon: "success",
        confirmButtonColor: "#4CAF50",
      });
    }

    return true;
  } catch (error) {
    console.error("Erro ao salvar dados do estoque:", error);
    if (showFeedback) {
      Swal.fire({
        title: "Erro",
        text: "Erro ao salvar dados do estoque: " + error.message,
        icon: "error",
        confirmButtonColor: "#ff1493",
      });
    }
    return false;
  }
}

async function renderStockList() {
  console.log("Iniciando renderStockList...");

  // Carregar produtos atualizados do Firestore
  try {
    // Forçar leitura do servidor para evitar cache
    const querySnapshot = await getDocs(collection(window.db, "products"), { source: "server" });
    const products = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
        category: typeof data.category === 'string' ? data.category : '', // fallback para garantir campo
      });
    });
    window.products = products;
    console.log("Produtos atualizados do Firestore:", products.length);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    return;
  }

  const stockList = document.getElementById("stockList");
  if (!stockList) {
    console.error("Elemento stockList não encontrado");
    return;
  }

  // Limpar lista atual
  stockList.innerHTML = "";

  // Criar um fragmento para melhor performance
  const fragment = document.createDocumentFragment();
  console.log("Fragmento criado para manipulação do DOM");

  // Carregar dados da lista de espera
  const waitlist = JSON.parse(localStorage.getItem("waitlist") || "{}");

  console.log("Iniciando iteração dos produtos...");
  window.products.forEach((product) => {
    console.log("Renderizando produto:", product.id, product.name);
    const quantity = product.quantity || 0;
    const active = product.active !== false;
    console.log(
      `Renderizando produto ${product.id} - quantity: ${quantity}, active: ${active}`,
    );
    const stockItem = document.createElement("div");
    stockItem.className = "stock-item";
    stockItem.setAttribute("data-product-id", product.id);

    // Processar imagem do produto
    const imagePath = product.imageUrl || "/img/placeholder.png";

    // Garantir que é uma URL válida
    const validUrl =
      imagePath.startsWith("http") || imagePath.startsWith("data:image/")
        ? imagePath
        : window.location.origin + imagePath;

    stockItem.innerHTML = `
            <div class="product-image-container">
                <img src="${validUrl}" alt="${product.name}" onerror="this.onerror=null; this.src='/img/placeholder.png'" />
                <button class="update-image-btn" onclick="StockModule.updateProductImage('${product.id}')">
                    <i class="fas fa-camera"></i> Atualizar Imagem
                </button>
            </div>
            <div class="stock-item-content">
                <div class="stock-item-info">
  <h3>${product.name}</h3>
  ${product.description ? `<div class="product-description" style="color:#666; font-size:0.9em; margin: 0.2em 0 0.5em 0;">${product.description}</div>` : ''}
  <div class="product-category-label">
    ${typeof product.category === 'string' && product.category.trim() ? product.category : '<span style=\"color:#bbb;\">Sem categoria</span>'}
  </div>
  <div class="offer-prices">
    <div style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 0.5em; gap: 0.2em;">
  <div>
    <span style="font-size:0.97em;color:#666;">Compra:</span>
    <span style="font-weight:600; color:#227a2a;">R$ ${(product.purchasePrice ?? 0).toFixed(2).replace('.', ',')}</span>
  </div>
  <div>
    <span style="font-size:0.97em;color:#666;">Lucro:</span>
    <span style="font-weight:600; color:${(product.price - (product.purchasePrice ?? 0)) > 0 ? '#1bc700' : '#c62828'};">
      R$ ${(product.price - (product.purchasePrice ?? 0)).toFixed(2).replace('.', ',')}
    </span>
    <span style="font-size:0.97em;color:#444; margin-left:0.5em;">
      (${(product.purchasePrice > 0 ? Math.round(((product.price - product.purchasePrice) / product.purchasePrice) * 100) : 0)}%)
    </span>
  </div>
  <div>
    <span style="font-size:0.97em;color:#666;">Lucro PIX:</span>
    <span style="font-weight:600; color:${(product.pixPrice - (product.purchasePrice ?? 0)) > 0 ? '#1bc700' : '#c62828'};">
      R$ ${(product.pixPrice && product.purchasePrice !== undefined ? (product.pixPrice - product.purchasePrice).toFixed(2).replace('.', ',') : '0,00')}
    </span>
    <span style="font-size:0.97em;color:#444; margin-left:0.5em;">
      (${(product.purchasePrice > 0 && product.pixPrice ? Math.round(((product.pixPrice - product.purchasePrice) / product.purchasePrice) * 100) : 0)}%)
    </span>
  </div>
</div>
                        ${
                          product.oldPrice
                            ? `
                            <div class="offer-price-old">
                                <i class="fas fa-tag"></i>
                                <span>De: R$ ${product.oldPrice.toFixed(2).replace(".", ",")}</span>
                            </div>
                        `
                            : ""
                        }
                        <div class="offer-price-current">
                            <i class="fas fa-tag"></i>
                            <span>
                                Por: R$ ${product.price.toFixed(2).replace(".", ",")}
                                ${
                                  product.oldPrice
                                    ? `
                                    <span class="discount-percentage">${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF</span>
                                `
                                    : ""
                                }
                            </span>
                        </div>
                        ${
                          product.pixPrice
                            ? `
                            <div class="offer-price-pix">
                                <i class="fas fa-bolt"></i>
                                <span class="pix-label">PIX:</span>
                                <span class="pix-price-value">R$ ${product.pixPrice.toFixed(2).replace(".", ",")}</span>
                                ${product.oldPrice ? `<span class="discount-percentage">${Math.round(((product.price - product.pixPrice) / product.price) * 100)}% OFF</span>` : ""}
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
                <div class="stock-actions-row">
                  <div class="stock-actions-left">
                    <input type="number" 
                      min="0" 
                      value="${quantity}" 
                      oninput="updateQuantity(${product.id}, this.value)"
                      onchange="updateQuantity(${product.id}, this.value)"
                      class="stock-quantity">
                  </div>
                  <div class="stock-actions-right">
                    <button class="product-action-btn" title="Editar" onclick="window.StockModule.editProduct('${product.id}')">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="product-action-btn" title="Excluir" onclick="window.StockModule.deleteProduct('${product.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="stock-actions-center" style="margin-bottom: 6px;">              
                  <label class="switch">
                      <input type="checkbox" ${active ? "checked" : ""} onchange="updateStock(${product.id}, ${quantity}, this.checked)">
                      <span class="slider round"></span>
                  </label>
                  <span class="stock-status-label-text" style="margin-left:12px;margin-right:4px;font-weight:500;color:#888">Status:</span>
                  <span class="stock-status">
                    ${active ? `<i class="fas fa-check stock-status-icon stock-status-active-icon"></i> <i class="fas fa-unlock stock-status-icon stock-status-active-unlock"></i> <span class="stock-status-label stock-status-active-label">Ativo</span>` : `<i class="fas fa-times stock-status-icon stock-status-inactive-x"></i> <i class="fas fa-lock stock-status-icon stock-status-inactive-icon"></i> <span class="stock-status-label stock-status-inactive-label">Inativo</span>`}
                  </span>
                </div>
                <!-- Barra de Progresso de Estoque -->
                <div class="product-stock-bar">
                  <div class="product-stock-bar-inner ${quantity <= 2 ? 'critico' : ''}" style="width: ${Math.min((quantity / 20) * 100, 100)}%;" title="${quantity} unidades em estoque"></div>
                </div>
                ${
                  !active || quantity === 0
                    ? `<div class="stock-alert-wrapper"><span class="stock-alert unavailable"><i class='fas fa-ban'></i>Indisponível</span></div>`
                    : (quantity <= 2 ? `<div class="stock-alert-wrapper"><span class="stock-alert low"><i class='fas fa-exclamation-triangle'></i>${quantity === 1 ? "Última unidade!" : "Apenas 2 unidades!"}</span></div>` : '')
                }

        `;

    // ...
    console.log("Adicionando item ao DOM:", product.id);
    fragment.appendChild(stockItem);
    console.log("Item adicionado ao fragmento:", product.id);
  });

  // Adicionar fragmento ao DOM
  console.log("Adicionando fragmento ao DOM...");
  stockList.appendChild(fragment);
  console.log("Fragmento adicionado com sucesso!");

  // Atualizar badge da lista de espera
  updateWaitlistBadge();
}

export async function updateWaitlistBadge() {
  const waitlistData = await loadWaitlistFromFirestore();
  const badge = document.getElementById("waitlistBadge");
  if (badge) {
    // Sempre esconder o badge antes de processar
    badge.textContent = "";
    badge.style.display = "none";
    // Só mostrar se houver dados carregados e pendentes
    if (waitlistData && typeof waitlistData === "object") {
      const pendingCount = Object.values(waitlistData)
        .flat()
        .filter((item) => !item.notified).length;
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = "flex";
      }
    }
  }
}

async function loadWaitlistFromFirestore() {
  const waitlistCol = collection(window.db, "waitlist");
  const snapshot = await getDocs(waitlistCol);
  const waitlistData = {};
  snapshot.forEach((doc) => {
    if (doc.id === "data") return; // Ignora documento 'data' legado
    const entry = doc.data();
    // Adiciona docId ao entry para facilitar ações únicas
    entry._docId = doc.id;
    if (!waitlistData[entry.productId]) {
      waitlistData[entry.productId] = [];
    }
    waitlistData[entry.productId].push(entry);
  });
  return waitlistData;
}

async function renderWaitlistList(retryCount = 0) {
  const waitlistItems = document.getElementById("waitlistItems");
  if (!waitlistItems) {
    console.error("Elemento waitlistItems não encontrado");
    return;
  }

  // Buscar a lista mais recente do Firestore
  const waitlistData = await loadWaitlistFromFirestore();
  window.latestWaitlistData = waitlistData;
  const productFilter = document.getElementById("waitlistProductFilter")?.value;
  const statusFilter = document.getElementById("waitlistStatusFilter")?.value;
  const nameFilter = document
    .getElementById("waitlistNameFilter")
    ?.value?.toLowerCase()
    .trim();

  // Debug: Log current state
  console.log("[Waitlist] renderWaitlistList called", {
    retryCount,
    productsLoaded: Array.isArray(window.products) ? window.products.length : 0,
    waitlistKeys: Object.keys(waitlistData).length,
  });

  // Guard: Retry if products not loaded
  if (!window.products || window.products.length === 0) {
    if (retryCount < 10) {
      setTimeout(() => renderWaitlistList(retryCount + 1), 200);
      console.warn(
        "[Waitlist] window.products not loaded. Retrying renderWaitlistList...",
      );
    } else {
      console.error(
        "[Waitlist] window.products still not loaded after retries",
      );
    }
    return;
  }

  // Efeito fade-out para suavizar a transição
  waitlistItems.classList.add("fade-out");
  await new Promise((resolve) => setTimeout(resolve, 180));
  waitlistItems.innerHTML = "";
  // Cabeçalho sempre presente
  waitlistItems.innerHTML += `
        <tr>
            <th>Produto</th>
            <th>Preços</th>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Data/Hora</th>
            <th>Status</th>
            <th>Ações</th>
        </tr>
    `;
  waitlistItems.classList.remove("fade-out");
  waitlistItems.classList.add("fade-in");
  setTimeout(() => waitlistItems.classList.remove("fade-in"), 200);

  // Atualizar filtro de produtos
  const productFilterSelect = document.getElementById("waitlistProductFilter");
  if (productFilterSelect && productFilterSelect.children.length <= 1) {
    window.products.forEach((product) => {
      if (
        waitlistData[String(product.id)] &&
        waitlistData[String(product.id)].length > 0
      ) {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name;
        productFilterSelect.appendChild(option);
      }
    });
  }

  // Inicializar totalizadores de ganhos
  let totalGanhoAtual = 0;
  let totalGanhoPix = 0;

  // Renderizar itens filtrados
  const orphanRows = [];
  let countDataRows = 0;
  Object.entries(waitlistData).forEach(([productId, customers]) => {
    if (productFilter && productId !== productFilter) return;

    const product = window.products.find(
      (p) => String(p.id) === String(productId),
    );
    customers.forEach((customer) => {
      // FILTRO POR NOME DO CLIENTE
      if (
        nameFilter &&
        (!customer.name || !customer.name.toLowerCase().includes(nameFilter))
      )
        return;
      // FILTRO DE STATUS
      // statusFilter pode ser: '', 'pendentes', 'notificados'
      // Corrigido: valores do select são 'pending' e 'notified'
      if (statusFilter === "pending" && customer.notified) return;
      if (statusFilter === "notified" && !customer.notified) return;
      // Adicionar docId ao cliente se não existir (caso legado)
      let docId = customer._docId || customer.docId;
      if (!docId && customer.id) docId = customer.id;
      if (!docId && customer.phone && customer.productId) {
        // fallback: construir um id fake, mas não recomendado
        docId = `${customer.productId}_${customer.phone}`;
      }
      let isOrphan = false;
      let displayProduct = product;
      // Se não existe produto, usar snapshot e marcar como órfão
      if (!product) {
        isOrphan = true;
        if (customer.productSnapshot) {
          displayProduct = customer.productSnapshot;
        } else {
          displayProduct = {
            name: "(Desconhecido)",
            imageUrl: "",
            price: null,
            oldPrice: null,
            pixPrice: null,
          };
        }
      }

      // Acumular ganhos
      if (displayProduct.price) totalGanhoAtual += Number(displayProduct.price);
      if (displayProduct.pixPrice)
        totalGanhoPix += Number(displayProduct.pixPrice);

      const imageUrl = displayProduct.imageUrl
        ? displayProduct.imageUrl
        : displayProduct.image
          ? displayProduct.image.startsWith("http")
            ? displayProduct.image
            : displayProduct.image.startsWith("img/")
              ? "../" + displayProduct.image
              : "../img/" + displayProduct.image
          : "https://via.placeholder.com/56";
      const tr = document.createElement("tr");
      if (isOrphan) tr.classList.add("waitlist-orphan-row");
      tr.innerHTML = `
                <td style="white-space:normal;text-align:center;">
  <div class="waitlist-product-info" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
    <img src="${imageUrl}" alt="${displayProduct.name}" class="waitlist-product-img-mini">
    <span class="waitlist-product-name" style="margin-top:4px;">${displayProduct.name}</span>
    ${isOrphan ? '<span class="waitlist-orphan-badge" style="margin-top:2px;"><i class="fas fa-unlink" style="color:#ff9800"></i> Órfão</span>' : ""}
  </div>
</td>
                <td>
                    <div class="waitlist-product-prices">
                        ${displayProduct.oldPrice ? `<span class="waitlist-price-old">R$ ${Number(displayProduct.oldPrice).toFixed(2).replace(".", ",")}</span>` : ""}
                        <span class="waitlist-price-current">R$ ${displayProduct.price ? Number(displayProduct.price).toFixed(2).replace(".", ",") : "--"}</span>
                        ${displayProduct.pixPrice ? `<span class="waitlist-price-pix"><i class="fas fa-bolt" style="color:#ff1493"></i>PIX R$ ${Number(displayProduct.pixPrice).toFixed(2).replace(".", ",")}</span>` : ""}
                    </div>
                </td>
                <td>${customer.name}</td>
                <td style="white-space:normal;text-align:center;">
  <div><a href="tel:${customer.phone}">${customer.phone}</a></div>
  ${customer.email ? `<div><a href="mailto:${customer.email}">${customer.email}</a></div>` : ""}
</td>
                <td style="white-space:normal;text-align:center;">
  <div>${new Date(customer.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</div>
  <div style="font-size:0.95em;color:#888;">${new Date(customer.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
</td>
                <td>
                    <span class="status-badge waitlist-status ${customer.notified ? "notified" : "pending"}">
                        ${customer.notified ? "Notificado" : "Pendente"}
                    </span>
                </td>
                <td class="waitlist-action-group">
                    <button 
                        onclick="notifyClientById('${docId}')"
                        class="btn-notify waitlist-action-btn ${customer.notified ? "disabled" : ""}"
                        ${customer.notified ? "disabled" : ""}
                        title="Notificar Cliente via WhatsApp">
                        ${customer.notified ? "<i class='fas fa-check'></i> Enviado" : "<i class='fab fa-whatsapp'></i>"}
                    </button>
                    <button 
                        onclick="toggleWaitlistStatusById('${docId}')"
                        class="waitlist-action-btn btn-secondary btn-toggle-status"
                        title="Alterar Status">
                        <i class='fas fa-exchange-alt'></i>
                    </button>
                    <button 
                        onclick="deleteWaitlistEntryById('${docId}')"
                        class="waitlist-action-btn delete-button btn-delete-entry"
                        title="Excluir Cliente da Lista">
                        <i class='fas fa-trash-alt'></i>
                    </button>
                </td>
            `;
      if (isOrphan) {
        orphanRows.push(tr);
      } else {
        waitlistItems.appendChild(tr);
      }
      countDataRows++;
    });
  });
  // Adicionar órfãos ao final
  orphanRows.forEach((tr) => {
    waitlistItems.appendChild(tr);
    countDataRows++;
  });

  // Mostrar mensagem se não houver itens de dados
  if (countDataRows === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td colspan="7" class="empty-message" style="text-align:center;padding:2.5em 1em;color:#b36caa;font-size:1.13em;font-weight:500;background:rgba(255,105,180,0.07);border-radius:0 0 12px 12px;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;">
                    <i class="fas fa-search fa-2x" style="color:#ff1493;opacity:0.7;"></i>
                    <span>Nenhum resultado encontrado.<br><span style='font-size:0.98em;font-weight:400;color:#888;'>Tente ajustar os filtros ou buscar outro termo.</span></span>
                </div>
            </td>
        `;
    waitlistItems.appendChild(tr);
  }

  // Atualizar badge
  updateWaitlistBadge();

  // Ao final, atualizar o botão "Notificar Todos" se existir
  if (typeof window.updateNotifyAllBtn === "function") {
    window.updateNotifyAllBtn();
  }
  // Renderizar totalizador de ganhos
  let totalizerHtml = `
        <div class="waitlist-totals-box">
            <span class="waitlist-total-label"><i class="fas fa-coins" style="color:#ff1493"></i> Ganho Potencial:</span>
            <span class="waitlist-total-current"><i class="fas fa-credit-card" style="color:#ff1493"></i>Parcelado: R$ ${totalGanhoAtual.toFixed(2).replace(".", ",")}</span>
            <span class="waitlist-total-pix"><i class="fas fa-bolt" style="color:#ff1493"></i>PIX: R$ ${totalGanhoPix.toFixed(2).replace(".", ",")}</span>
        </div>
    `;
  let totalsDiv = document.getElementById("waitlistTotals");
  if (!totalsDiv) {
    // Fallback: criar e inserir após a tabela
    const table = waitlistItems.closest("table");
    totalsDiv = document.createElement("div");
    totalsDiv.id = "waitlistTotals";
    table.parentNode.insertBefore(totalsDiv, table.nextSibling);
    console.warn("[Waitlist] Criado #waitlistTotals dinamicamente");
  }
  totalsDiv.innerHTML = totalizerHtml;
  console.log("[Waitlist] Totalizador atualizado:", {
    totalGanhoAtual,
    totalGanhoPix,
  });
}

// Alternar status de notificado/pendente no Firestore
window.toggleWaitlistStatusById = async function (docId) {
  try {
    if (!docId)
      return Swal.fire("Erro", "ID do documento não informado.", "error");
    const docRef = doc(window.db, "waitlist", docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists())
      return Swal.fire("Erro", "Cliente não encontrado.", "error");
    const entry = docSnap.data();
    await setDoc(docRef, { notified: !entry.notified }, { merge: true });
    Swal.fire("Status alterado!", "", "success");
    renderWaitlistList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível alterar o status.", "error");
  }
};

// Excluir cliente da lista de espera no Firestore
window.deleteWaitlistEntryById = async function (docId) {
  try {
    // Confirmação profissional antes de excluir
    const result = await Swal.fire({
      title: "Excluir da lista de espera?",
      text: "Tem certeza que deseja remover este cliente da lista de espera? Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    await deleteDoc(doc(window.db, "waitlist", docId));
    Swal.fire("Removido!", "Cliente removido da lista de espera.", "success");
    renderWaitlistList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível remover o cliente.", "error");
  }
};

window.notifyClientById = async function (docId) {
  try {
    if (!docId)
      return Swal.fire("Erro", "ID do documento não informado.", "error");
    const docRef = doc(window.db, "waitlist", docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists())
      return Swal.fire("Erro", "Cliente não encontrado.", "error");
    const entry = docSnap.data();
    let productName = "";
    const product = window.products.find(
      (p) => String(p.id) === String(entry.productId),
    );
    if (!product) {
      if (entry && entry.productSnapshot && entry.productSnapshot.name) {
        productName = entry.productSnapshot.name;
      } else if (entry && entry.productName) {
        productName = entry.productName;
      } else if (entry && entry.name) {
        productName = entry.name;
      } else {
        productName = "(Produto removido)";
      }
    } else {
      productName = product.name;
    }
    const defaultMessage = `Olá, *${entry.name}*! O produto *${productName}* já está disponível em nossa loja. Acesse o link da nossa loja para efetuar seu pedido: ${window.location.origin}`;
    let sanitizedPhone = String(entry.phone || "").replace(/\D/g, "");
    if (sanitizedPhone.length === 11 && !sanitizedPhone.startsWith("55")) {
      sanitizedPhone = "55" + sanitizedPhone;
    }
    if (!sanitizedPhone) {
      return Swal.fire(
        "Erro",
        "Telefone do cliente inválido ou ausente.",
        "error",
      );
    }
    // Monta HTML com dados do cliente e produto
    let productImg = "";
    if (product && product.imageUrl) {
      productImg = `<img src="${product.imageUrl}" alt="Imagem Produto" style="width:86px;height:86px;object-fit:cover;border-radius:14px;box-shadow:0 2px 8px #0002;display:block;">`;
    } else if (entry.productSnapshot && entry.productSnapshot.imageUrl) {
      productImg = `<img src="${entry.productSnapshot.imageUrl}" alt="Imagem Produto" style="width:86px;height:86px;object-fit:cover;border-radius:14px;box-shadow:0 2px 8px #0002;display:block;">`;
    } else {
      productImg = `<div style='width:86px;height:86px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:14px;box-shadow:0 2px 8px #0002;font-size:2em;color:#bbb;'><i class="fas fa-box"></i></div>`;
    }
    const summaryHtml = `
            <div style="max-width:440px;margin:0 auto 14px auto;background:#fff;border-radius:18px;box-shadow:0 2px 12px #0001;padding:18px 16px 12px 16px;display:flex;align-items:center;gap:18px;">
                <div style="flex-shrink:0;">${productImg}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:1.18em;line-height:1.2;margin-bottom:2px;color:#222;">${entry.name}</div>
                    <div style="font-size:1em;color:#666;">Cliente</div>
                    <div style="margin-top:6px;font-size:1.06em;font-weight:600;color:#ff1493;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${productName}</div>
                    <div style="font-size:0.97em;color:#888;">Produto</div>
                </div>
            </div>
            <div style="margin-bottom:6px;"></div>
        `;
    const { value: customMessage, isConfirmed } = await Swal.fire({
      title: "Editar mensagem",
      html: `
                <div style="display:flex;flex-direction:column;align-items:center;max-width:440px;margin:0 auto;">
                    ${summaryHtml}
                    <div style="width:100%;max-width:400px;display:flex;flex-direction:column;align-items:center;">
                        <div style="width:100%;display:flex;justify-content:center;align-items:center;margin-bottom:3px;">
                            <span style="font-weight:500;font-size:1.04em;display:inline-flex;align-items:center;gap:6px;">
                                Mensagem do WhatsApp
                                <i class='fab fa-whatsapp' style='color:#25d366;font-size:1.25em;vertical-align:middle;'></i>
                            </span>
                        </div>
                        <textarea id='customWhatsappMsg' class='swal2-textarea' maxlength='350' style='min-height:120px;width:100%;max-width:100%;resize:vertical;box-sizing:border-box;text-align:left;'>${defaultMessage}</textarea>
                    </div>
                </div>
            `,
      showCancelButton: true,
      confirmButtonText: "Enviar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#4CAF50",
      cancelButtonColor: "#ff1493",
      preConfirm: () => {
        const val = document.getElementById("customWhatsappMsg").value;
        if (!val || val.trim().length < 5) {
          Swal.showValidationMessage(
            "A mensagem deve ter pelo menos 5 caracteres",
          );
          return false;
        }
        return val;
      },
    });
    if (!isConfirmed) return;
    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(customMessage)}`;
    console.log("Abrindo WhatsApp URL:", whatsappUrl);
    window.open(whatsappUrl, "_blank");
    await setDoc(docRef, { ...entry, notified: true }, { merge: true });
    renderWaitlistList();
    Swal.fire({
      title: "Cliente Notificado!",
      text: "O WhatsApp foi aberto com a mensagem pronta para envio.",
      icon: "success",
      confirmButtonColor: "#4CAF50",
    });
  } catch (e) {
    Swal.fire("Erro", "Não foi possível notificar o cliente.", "error");
  }
};

// Compatibiliza notifyClient antigo com o novo padrão por docId
defineNotifyClientCompat();

function defineNotifyClientCompat() {
  // Para retrocompatibilidade de botões antigos
  window.notifyClient = function (productId, phone) {
    // Busca o docId correspondente usando os dados mais recentes
    const waitlistData = window.latestWaitlistData || {};
    let docId = null;
    Object.values(waitlistData).forEach((clientes) => {
      clientes.forEach((entry) => {
        if (
          String(entry.productId) === String(productId) &&
          entry.phone === phone
        ) {
          docId = entry._docId;
        }
      });
    });
    if (!docId) {
      Swal.fire("Erro", "Cliente não encontrado para notificação.", "error");
      return;
    }
    window.notifyClientById(docId);
  };
  // Garante que a função nova também está global
  window.notifyClientById = window.notifyClientById;
}

if (window.StockModule) {
  window.StockModule.notifyClient = notifyClient;
} else {
  window.StockModule = { notifyClient };
}

async function updateStock(productId, quantity, active) {
  try {
    const product = products.find((p) => p.id === productId);
    const prevActive = product ? product.active !== false : false;

    // Atualiza imediatamente o status local
    if (product) {
      product.active = active;
    }

    // Se está mudando status de ativo para inativo ou vice-versa, mostra feedback
    if (product && prevActive !== active) {
      Swal.fire({
        title: active ? "Produto Ativado!" : "Produto Desativado!",
        text: active
          ? "O produto foi ativado com sucesso."
          : "O produto foi desativado e removido das ofertas especiais.",
        icon: active ? "success" : "warning",
        confirmButtonColor: active ? "#4CAF50" : "#ff1493",
        timer: 1800,
      });
      // Se desativou, remove das ofertas especiais e atualiza ambos os campos no Firestore
      if (!active) {
        if (product.specialOffer) {
          product.specialOffer = false;
          if (pendingSpecialOffers[productId]) {
            delete pendingSpecialOffers[productId];
          }
        }
        const productRef = doc(window.db, "products", String(productId));
        await setDoc(
          productRef,
          { active: false, specialOffer: false },
          { merge: true },
        );
        renderSpecialOffers && renderSpecialOffers();
        if (typeof updateUI === "function") updateUI();
        return; // já atualizou tudo necessário
      }
    }
  } catch (e) {
    console.error("Erro ao atualizar status ativo/inativo:", e);
  }

  try {
    console.log("Atualizando estoque:", { productId, quantity, active });

    const newQuantity = parseInt(quantity) || 0;
    if (newQuantity < 0) {
      Swal.fire({
        title: "Erro",
        text: "A quantidade não pode ser negativa.",
        icon: "error",
        confirmButtonColor: "#ff1493",
      });
      renderStockList();
      return;
    }

    // Atualiza objeto auxiliar de controle
    stockData[productId] = {
      quantity: newQuantity,
      active: active,
    };

    // Se zerar o estoque, remove das ofertas especiais
    const product = products.find((p) => p.id === productId);
    if (product && newQuantity === 0 && product.specialOffer) {
      product.specialOffer = false;
      // Atualiza no Firestore imediatamente
      const productRef = doc(window.db, "products", String(productId));
      await setDoc(productRef, { specialOffer: false }, { merge: true });
      // Atualiza UI se necessário
      if (pendingSpecialOffers[productId]) {
        delete pendingSpecialOffers[productId];
      }
      renderSpecialOffers && renderSpecialOffers();
      // Atualiza também a lista de estoque se estiver visível
      if (typeof updateUI === "function") {
        updateUI();
      }
    }

    // ✅ Atualiza também o array principal de produtos
    const index = products.findIndex((p) => p.id === productId);
    if (index > -1) {
      products[index].quantity = newQuantity;
      products[index].active = active;
    }

    // Atualiza status ativo/inativo no Firestore imediatamente
    if (active) {
      const productRef = doc(window.db, "products", String(productId));
      await setDoc(productRef, { active: true }, { merge: true });
    }
    console.log("Novo estado do estoque:", stockData[productId]);

    // Atualizar interface
    const stockItem = document.querySelector(
      `[data-product-id="${productId}"]`,
    );
    if (stockItem) {
      const statusEl = stockItem.querySelector(".status-indicator");
      if (statusEl) {
        statusEl.className = `status-indicator status-${active ? "active" : "inactive"}`;
        statusEl.textContent = `Status: ${active ? "Ativo" : "Inativo"}`;
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao atualizar estoque: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
  }
}

export async function notifyAllCustomers(productId) {
  // Buscar clientes da lista de espera no Firestore
  const waitlistCol = collection(window.db, "waitlist");
  const snapshot = await getDocs(waitlistCol);
  // Montar mapa produtoId -> clientes pendentes
  const waitlistMap = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.notified) {
      if (!waitlistMap[data.productId]) waitlistMap[data.productId] = [];
      waitlistMap[data.productId].push({ ...data, _docId: docSnap.id });
    }
  });
  // Se não passar productId, abrir seleção múltipla
  if (!productId) {
    // Listar apenas produtos com clientes pendentes
    const productOptions = Object.keys(waitlistMap)
      .map((pid) => {
        const prod = window.products.find((p) => String(p.id) === String(pid));
        return {
          id: pid,
          name: prod
            ? prod.name
            : waitlistMap[pid][0]?.productSnapshot?.name ||
              "(Produto removido)",
          count: waitlistMap[pid].length,
        };
      })
      .filter((opt) => opt.count > 0);
    if (!productOptions.length) {
      return Swal.fire(
        "Nenhum cliente pendente",
        "Não há clientes pendentes para notificação.",
        "info",
      );
    }
    // Montar HTML para SweetAlert2
    const html = `<div style='text-align:left;max-height:300px;overflow:auto;'>${productOptions
      .map(
        (opt) =>
          `<label style='display:block;margin-bottom:6px;'><input type='checkbox' value='${opt.id}' style='margin-right:6px;'>${opt.name} <span style='color:#888;font-size:0.92em;'>(${opt.count} cliente${opt.count > 1 ? "s" : ""})</span></label>`,
      )
      .join("")}</div>`;
    const { value: confirmed } = await Swal.fire({
      title: "Selecionar Produtos",
      html,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Notificar Selecionados",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ff1493",
      focusConfirm: false,
      preConfirm: () => {
        const checked = Array.from(
          document.querySelectorAll(
            ".swal2-container input[type=checkbox]:checked",
          ),
        ).map((cb) => cb.value);
        if (!checked.length) {
          Swal.showValidationMessage("Selecione pelo menos um produto");
          return false;
        }
        return checked;
      },
    });
    if (!confirmed) return;
    // Confirmação única para todos os produtos
    const nomesSelecionados = confirmed.map((pid) => {
      const prod = window.products.find((p) => String(p.id) === String(pid));
      return prod
        ? prod.name
        : waitlistMap[pid][0]?.productSnapshot?.name || "(Produto removido)";
    });
    const { isConfirmed } = await Swal.fire({
      title: "Confirmar Notificação",
      html: `<div>Deseja notificar todos os clientes dos produtos selecionados?<ul style='text-align:left;margin-top:10px;'>${nomesSelecionados.map((n) => `<li>${n}</li>`).join("")}</ul></div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, notificar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ff1493",
    });
    if (!isConfirmed) return;
    // Notificar todos os produtos selecionados (sem abrir novo alerta)
    for (const pid of confirmed) {
      await notifyAllCustomers(pid);
    }
    return;
  }
  // Fluxo padrão para productId único
  const customers = waitlistMap[productId] || [];
  if (!customers.length) {
    return Swal.fire(
      "Nenhum cliente pendente",
      "Não há clientes pendentes para este produto.",
      "info",
    );
  }
  const prod = window.products.find((p) => String(p.id) === String(productId));
  const prodName = prod
    ? prod.name
    : customers[0]?.productSnapshot?.name || "(Produto removido)";
  Swal.fire({
    title: "Notificar Clientes",
    text: `Deseja notificar ${customers.length} cliente(s) sobre a disponibilidade do produto ${prodName}?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#ff1493",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, notificar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      // Criar array entriesToUpdate local
      const entriesToUpdate = customers.map((cust) => ({
        docId: cust._docId,
        entry: cust,
      }));
      for (const { docId, entry } of entriesToUpdate) {
        // Mensagem personalizada
        let productName = prodName;
        if (!prod && entry.productSnapshot && entry.productSnapshot.name) {
          productName = entry.productSnapshot.name;
        }
        const message = `Olá, ${entry.name}! O produto ${productName} já está disponível em nosso estoque. Acesse nossa loja para fazer sua compra: ${window.location.origin}`;
        window.open(
          `https://wa.me/${entry.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
          "_blank",
        );
        const docRef = doc(window.db, "waitlist", docId);
        await setDoc(docRef, { notified: true }, { merge: true });
      }
      renderWaitlistList();
      Swal.fire({
        title: "Notificações Enviadas!",
        text: "Os clientes foram notificados com sucesso.",
        icon: "success",
        confirmButtonColor: "#ff1493",
        timer: 3000,
        timerProgressBar: true,
      });
    }
  });
}

export async function editProduct(productId) {
  console.log("Editando produto:", productId);
  const product = products.find((p) => String(p.id) === String(productId));
  if (!product) {
    console.error("Produto não encontrado:", productId);
    return;
  }

  const { value: formValues } = await Swal.fire({
    title: "Editar Produto",
    html: `
            <form id="editProductForm" class="edit-product-form">
  <div class="form-group" style="display: flex; flex-direction: column; gap: 0.7rem;">
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productName" style="min-width: 120px;">Nome</label>
      <input id="productName" class="swal2-input" style="flex:1;" placeholder="Nome do produto" value="${product.name || ''}" required>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productDescription" style="min-width: 120px;">Descrição</label>
      <textarea id="productDescription" class="swal2-textarea" style="flex:1;" placeholder="Descrição">${product.description || ''}</textarea>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPurchasePrice" style="min-width: 120px;">Preço de Compra</label>
      <input id="productPurchasePrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço de Compra" min="0" step="0.01" value="${product.purchasePrice !== undefined && product.purchasePrice !== null && product.purchasePrice !== '' ? product.purchasePrice : 0}">
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productOldPrice" style="min-width: 120px;">Preço Antigo</label>
      <input id="productOldPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço Antigo" min="0" step="0.01" value="${product.oldPrice !== undefined ? product.oldPrice : ''}">
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPrice" style="min-width: 120px;">Preço Atual</label>
      <input id="productPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço Atual" min="0" step="0.01" value="${product.price}" required>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPixPrice" style="min-width: 120px;">Preço PIX</label>
      <input id="productPixPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço PIX" min="0" step="0.01" value="${product.pixPrice !== undefined ? product.pixPrice : ''}">
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productQuantity" style="min-width: 120px;">Quantidade</label>
      <input id="productQuantity" type="number" class="swal2-input" style="flex:1;" placeholder="Quantidade" min="0" value="${product.quantity || 0}" required>
    </div>
    <div class="price-field-row">
        <label for="productCategory">Categoria:</label>
        <select id="productCategory" class="swal2-input">
          <option value="Cuidados Capilares" ${product.category === "Cuidados Capilares" ? "selected" : ""}>Cuidados Capilares</option>
          <option value="Tratamentos" ${product.category === "Tratamentos" ? "selected" : ""}>Tratamentos</option>
          <option value="Kits" ${product.category === "Kits" ? "selected" : ""}>Kits</option>
          <option value="Outros" ${product.category === "Outros" ? "selected" : ""}>Outros</option>
        </select>
      </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productActive" style="min-width: 120px;">Ativo</label>
      <input id="productActive" type="checkbox" style="width: 20px; height: 20px;" ${product.active !== false ? "checked" : ""}>
    </div>
  </div>
</form>
        `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Salvar",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
      const form = document.getElementById("editProductForm");
      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }
      return {
        name: document.getElementById("productName").value,
        description: document.getElementById("productDescription").value,
        purchasePrice: document.getElementById("productPurchasePrice").value ? parseFloat(document.getElementById("productPurchasePrice").value) : null,
        price: parseFloat(document.getElementById("productPrice").value),
        oldPrice: document.getElementById("productOldPrice").value ? parseFloat(document.getElementById("productOldPrice").value) : null,
        pixPrice: document.getElementById("productPixPrice").value ? parseFloat(document.getElementById("productPixPrice").value) : null,
        quantity: parseInt(document.getElementById("productQuantity").value),
        active: document.getElementById("productActive").checked,
      };
    },
  });

  if (formValues) {
    try {
      console.log("Salvando alterações do produto:", productId);
      console.log("Form values:", formValues);

      // Pegar valores diretamente do DOM
      const form = document.getElementById("editProductForm");
      if (!form) {
        throw new Error("Formulário não encontrado");
      }

      const productName = form.querySelector("#productName").value;
      const productDescription = form.querySelector("#productDescription").value;
      const productPurchasePrice = form.querySelector("#productPurchasePrice").value;
      const productPrice = form.querySelector("#productPrice").value;
      const productOldPrice = form.querySelector("#productOldPrice").value;
      const productPixPrice = form.querySelector("#productPixPrice").value;
      const productQuantity = form.querySelector("#productQuantity").value;
      const productActive = form.querySelector("#productActive").checked;
      const productCategory = form.querySelector("#productCategory") ? form.querySelector("#productCategory").value : '';

      // Garantir que os campos obrigatórios existam
      if (!productName || !productPrice || productQuantity === undefined) {
        throw new Error("Campos obrigatórios faltando: nome, preço ou quantidade");
      }

      // Converter valores numéricos
      const updatedProduct = {
        ...product,
        name: productName,
        description: productDescription,
        purchasePrice: productPurchasePrice ? parseFloat(productPurchasePrice) : null,
        price: parseFloat(productPrice),
        oldPrice: productOldPrice ? parseFloat(productOldPrice) : null,
        pixPrice: productPixPrice ? parseFloat(productPixPrice) : null,
        quantity: parseInt(productQuantity),
        active: productActive,
        category: productCategory,
      };

      // Salvar no Firestore
      const success = await saveProduct(updatedProduct);
      if (success) {
        console.log("Produto atualizado com sucesso!");

        // Atualizar dados locais
        const index = products.findIndex((p) => p.id === productId);
        if (index > -1) {
          products[index] = updatedProduct;
          window.products = products;
        }

        // Atualizar UI
        const alertPromise = Swal.fire({
          title: "Sucesso!",
          text: "Produto atualizado com sucesso!",
          icon: "success",
          confirmButtonColor: "#4CAF50",
        });

        // Atualizar a interface após o alerta
        alertPromise.then(() => {
          // Atualizar o item específico editado
          const stockItem = document.querySelector(
            `[data-product-id="${productId}"]`,
          );
          if (stockItem) {
            // Atualizar valores específicos do item
            const quantityInput = stockItem.querySelector(".stock-quantity");
            const statusSwitch = stockItem.querySelector(
              '.switch input[type="checkbox"]',
            );
            const statusIndicator =
              stockItem.querySelector(".status-indicator");
            const priceCurrent = stockItem.querySelector(".price-current");
            const priceOld = stockItem.querySelector(".price-old");
            const pricePix = stockItem.querySelector(".price-pix");
            const productName = stockItem.querySelector("h3");
            const productDescription = stockItem.querySelector(
              ".product-description",
            );

            // Atualizar valores
            quantityInput.value = updatedProduct.quantity;
            statusSwitch.checked = updatedProduct.active;
            statusIndicator.textContent = `Status: ${updatedProduct.active ? "Ativo" : "Inativo"}`;
            statusIndicator.className = `status-indicator status-${updatedProduct.active ? "active" : "inactive"}`;
            priceCurrent.textContent = `Por: R$ ${updatedProduct.price.toFixed(2)}`;

            if (updatedProduct.oldPrice) {
              priceOld.textContent = `De: R$ ${updatedProduct.oldPrice.toFixed(2)}`;
              priceOld.style.display = "block";
            } else {
              priceOld.style.display = "none";
            }

            if (updatedProduct.pixPrice) {
              pricePix.textContent = `PIX: R$ ${updatedProduct.pixPrice.toFixed(2)}`;
              pricePix.style.display = "block";
            } else {
              pricePix.style.display = "none";
            }

            productName.textContent = updatedProduct.name;
            productDescription.textContent = updatedProduct.description || "";

            // Atualizar alertas de estoque
            const stockAlert = stockItem.querySelector(".stock-alert");
            if (stockAlert) {
              if (updatedProduct.active && updatedProduct.quantity === 1) {
                stockAlert.innerHTML = `
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Última unidade em estoque!
                                `;
                stockAlert.style.display = "block";
              } else if (
                updatedProduct.active &&
                updatedProduct.quantity === 2
              ) {
                stockAlert.innerHTML = `
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Apenas 2 em estoque!
                                `;
                stockAlert.style.display = "block";
              } else {
                stockAlert.style.display = "none";
              }
            }
          }

          // Atualizar outras listas
          renderStockList();
          renderSpecialOffers();
          renderWaitlistList();
          updateWaitlistBadge();
        });
      }
      console.log("Produto atualizado com sucesso!");
      Swal.fire({
        title: "Sucesso!",
        text: "Produto atualizado com sucesso!",
        icon: "success",
        confirmButtonColor: "#4CAF50",
      });

      // Renderizar listas
      renderStockList();
      renderSpecialOffers();
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      Swal.fire({
        title: "Erro",
        text: "Erro ao atualizar produto: " + error.message,
        icon: "error",
        confirmButtonColor: "#ff1493",
      });
    }
  }
}

export async function deleteProduct(productId) {
  console.log("Solicitando confirmação para excluir produto:", productId);
  let product = null; // Declarar a variável no escopo da função

  // Primeiro verificar no Firestore
  try {
    const docRef = doc(window.db, "products", productId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.error("Produto não encontrado no Firestore:", productId);
      return;
    }

    // Se chegou aqui, o produto existe no Firestore
    product = docSnap.data(); // Atribuir o valor à variável
    product.id = productId;

    // Atualizar o array local se necessário
    const localProduct = window.products.find((p) => p.id === productId);
    if (!localProduct) {
      // Adicionar ao array local se não existir
      window.products.push(product);
    }
  } catch (error) {
    console.error("Erro ao verificar produto no Firestore:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao verificar produto: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
    return;
  }

  // Mostrar alerta de confirmação com o nome do produto
  const result = await Swal.fire({
    title: "Confirmar Exclusão",
    text: `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    // Mostrar loading IMEDIATAMENTE
    Swal.fire({
      title: "Excluindo produto...",
      text: "Por favor, aguarde enquanto excluímos o produto.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    try {
      // Excluir do Firestore
      console.log("Chamando deleteDoc para produto:", productId);
      await deleteDoc(doc(window.db, "products", String(productId)));
      console.log("deleteDoc concluído sem erro");
      deletedIds.add(String(productId));
      localStorage.removeItem("products");
      localStorage.removeItem("specialOffers");
      console.log("Cache local de produtos e ofertas limpo após exclusão.");

      // Marcar clientes da waitlist como órfãos (orphaned) para este produto
      const waitlistCol = collection(window.db, "waitlist");
      const snapshot = await getDocs(waitlistCol);
      const batch = writeBatch(window.db);
      const timestamp = Date.now();
      let orphanCount = 0;
      snapshot.forEach((docSnap) => {
        const entry = docSnap.data();
        if (String(entry.productId) === String(productId) && !entry.orphaned) {
          const orphanId = `orphaned_${productId}_${timestamp}_${orphanCount}`;
          orphanCount++;
          const docRef = doc(window.db, "waitlist", docSnap.id);
          batch.set(
            docRef,
            {
              ...entry,
              productId: orphanId,
              orphaned: true,
              orphanOriginalProductId: productId,
              orphanedAt: timestamp,
            },
            { merge: true },
          );
        }
      });
      if (orphanCount > 0) {
        await batch.commit();
        console.log(
          `Marcadas ${orphanCount} entradas da lista de espera como órfãs para o produto ${productId}`,
        );
      } else {
        console.log("Nenhuma entrada da lista de espera para marcar como órfã.");
      }

      // Atualizar UI
      await renderStockList();
      await renderSpecialOffers();
      await renderWaitlistList();
      if (window.products && Array.isArray(window.products)) {
        const stillExists = window.products.some(p => String(p.id) === String(productId));
        console.log(`Produto id ${productId} ainda existe após exclusão?`, stillExists);
      }
      // Mostrar sucesso
      Swal.fire({
        title: "Sucesso!",
        text: "Produto excluído com sucesso!",
        icon: "success",
        confirmButtonColor: "#4CAF50",
      });
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      Swal.fire({
        title: "Erro",
        text: "Erro ao excluir produto: " + error.message,
        icon: "error",
        confirmButtonColor: "#ff1493",
      });
    }
  }
}

export async function showAddProductModal() {
  console.log("Abrindo modal para adicionar produto");

  // Função para processar imagem
  async function processImage(file) {
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Por favor, selecione um arquivo de imagem válido");
      }

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      return await fileToBase64(compressedFile);
    } catch (error) {
      throw new Error("Erro ao processar imagem: " + error.message);
    }
  }

  // Função para configurar preview da imagem
  function setupPreview() {
    const imageInput = document.getElementById("productImage");
    const previewDiv = document.getElementById("imagePreview");

    if (!imageInput || !previewDiv) {
      console.error("Elementos do preview não encontrados");
      return;
    }

    imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        const imageUrl = URL.createObjectURL(file);
        previewDiv.innerHTML = `
                    <img src="${imageUrl}" alt="Preview" class="preview-image" />
                    <p class="image-info">${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
                `;
        previewDiv.style.display = "block";
      }
    });
  }

  // Criar elementos do formulário
  const formContainer = document.createElement("div");
  formContainer.className = "add-product-form";
  formContainer.innerHTML = `
    <div class="image-upload-preview-center">
      <div id="imagePreview" class="image-preview">
        <div class="preview-placeholder">
          <i class="fas fa-image"></i>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label for="productName">Nome do Produto</label>
      <input type="text" id="productName" class="swal2-input" required>
    </div>
    <div class="form-group">
      <label for="productDescription">Descrição</label>
      <textarea id="productDescription" class="swal2-textarea" rows="3" required></textarea>
    </div>
    <div class="form-group">
      <div class="price-field-row">
        <label for="productPurchasePrice">Preço de Compra:</label>
        <input type="number" id="productPurchasePrice" class="swal2-input" step="0.01" min="0">
      </div>
      <div class="price-field-row">
        <label for="productOldPrice">Preço Antigo:</label>
        <input type="number" id="productOldPrice" class="swal2-input" step="0.01" min="0">
      </div>
      <div class="price-field-row">
        <label for="productPrice">Preço Atual:</label>
        <input type="number" id="productPrice" class="swal2-input" step="0.01" min="0" required>
      </div>
      <div class="price-field-row">
        <label for="productPixPrice">Preço PIX:</label>
        <input type="number" id="productPixPrice" class="swal2-input" step="0.01" min="0">
      </div>
    </div>
    <div class="form-group">
      <div class="price-field-row">
        <label for="productQuantity">Quantidade:</label>
        <input type="number" id="productQuantity" class="swal2-input" value="0" min="0" required>
      </div>
      <div class="price-field-row">
        <label for="productCategory">Categoria:</label>
        <select id="productCategory" class="swal2-input">
          <option value="Cuidados Capilares">Cuidados Capilares</option>
          <option value="Tratamentos">Tratamentos</option>
          <option value="Kits">Kits</option>
          <option value="Outros">Outros</option>
        </select>
      </div>
      <div class="price-field-row">
        <label for="productActive">Ativo:</label>
        <input type="checkbox" id="productActive" checked>
      </div>
    </div>
    <div class="form-group">
      <label for="productImage">Imagem do Produto</label>
      <input type="file" id="productImage" accept="image/*">
    </div>
  `;

  setupImagePreview();

  const { value: formValues } = await Swal.fire({
    title: "Adicionar Novo Produto",
    html: formContainer,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Adicionar",
    cancelButtonText: "Cancelar",
    customClass: {
      popup: "swal2-modal-product",
    },
    didOpen: () => {
      // Garante que o preview funcione dentro do contexto do SweetAlert2
      const swalPopup = Swal.getPopup();
      const imageInput = swalPopup.querySelector("#productImage");
      const preview = swalPopup.querySelector("#imagePreview");
      if (imageInput && preview) {
        imageInput.addEventListener("change", function (e) {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
              preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image" style="max-width:110px;max-height:110px;display:block;margin:auto;">`;
            };
            reader.readAsDataURL(file);
          } else {
            preview.innerHTML = `<div class='preview-placeholder'><i class='fas fa-image'></i></div>`;
          }
        });
      }
    },
    preConfirm: async () => {
      const name = Swal.getPopup().querySelector("#productName").value.trim();
      const description = Swal.getPopup()
        .querySelector("#productDescription")
        .value.trim();
      const file = Swal.getPopup().querySelector("#productImage").files[0];
      const purchasePrice =
        parseFloat(Swal.getPopup().querySelector("#productPurchasePrice").value) || 0;
      const oldPrice =
        parseFloat(Swal.getPopup().querySelector("#productOldPrice").value) ||
        0;
      const pixPrice =
        parseFloat(Swal.getPopup().querySelector("#productPixPrice").value) ||
        0;
      const price = parseFloat(
        Swal.getPopup().querySelector("#productPrice").value,
      );
      const quantity = parseInt(
        Swal.getPopup().querySelector("#productQuantity").value,
      );
      const category = Swal.getPopup().querySelector("#productCategory").value;
      const active = Swal.getPopup().querySelector("#productActive").checked;

      // Validar campos obrigatórios
      if (
        !name ||
        !description ||
        isNaN(price) ||
        price <= 0 ||
        isNaN(quantity) ||
        quantity < 0 ||
        !category
      ) {
        Swal.showValidationMessage(
          "Preencha todos os campos obrigatórios corretamente",
        );
        return false;
      }

      // Validar relacionamento entre os preços
      if (pixPrice > 0 && pixPrice >= price) {
        Swal.showValidationMessage(
          "O preço PIX deve ser menor que o preço normal",
        );
        return false;
      }

      if (oldPrice > 0 && oldPrice <= price) {
        Swal.showValidationMessage(
          "O preço antigo deve ser maior que o preço atual",
        );
        return false;
      }

      if (!file || !file.type.startsWith("image/")) {
        Swal.showValidationMessage("Selecione uma imagem válida");
        return false;
      }

      try {
        const imageUrl = await processImage(file);

        return {
          name,
          description,
          imageUrl,
          price,
          purchasePrice,
          oldPrice,
          pixPrice,
          quantity,
          category,
          active,
          specialOffer: false,
          createdAt: new Date().toISOString(),
          // Garante que o id será sempre number
          id: Number(getNextProductId()),
        };
      } catch (error) {
        Swal.showValidationMessage(
          "Erro ao processar imagem: " + error.message,
        );
        return false;
      }
    },
  });

   if (formValues) {
    try {
      // Mostrar loading imediato
      Swal.fire({
        title: 'Adicionando produto...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Função para obter próximo ID disponível
      const getNextProductId = () => {
        const existingIds = products.map((p) => parseInt(p.id));
        let id = 1;
        while (true) {
          if (!existingIds.includes(id) && !deletedIds.has(id)) {
            return id.toString();
          }
          id++;
        }
      };

      const productId = getNextProductId();
      const productRef = doc(window.db, "products", productId);
      const productData = {
        id: productId,
        ...formValues,
      };

      await setDoc(productRef, productData);

      // Só agora atualiza local
      products.push(productData);
      renderStockList();
      renderSpecialOffers();

      // Feedback de sucesso
      Swal.fire({
        title: "Sucesso!",
        text: "Produto adicionado com sucesso!",
        icon: "success",
        confirmButtonColor: "#4CAF50",
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      Swal.fire({
        title: "Erro",
        text: "Erro ao adicionar produto: " + error.message,
        icon: "error",
        confirmButtonColor: "#ff1493",
      });
    }
  }
}

async function showTab(tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-button");

  // Garantir que todas as abas comecem ocultas
  tabs.forEach((tab) => {
    tab.style.display = "none";
    tab.classList.remove("active");
  });

  // Mostrar a aba selecionada
  const selectedTab = document.getElementById(tabName + "Tab");
  if (selectedTab) {
    selectedTab.style.display = "block";
    selectedTab.classList.add("active");
  }

  // Atualizar botões
  buttons.forEach((button) => {
    if (button.getAttribute("data-tab") === tabName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  // Atualizar URL
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tabName);
  window.history.pushState({}, "", url);

  // Função para formatar valores com vírgula
  function formatCurrency(value) {
    return value.toFixed(2).replace(".", ",");
  }

  // Renderizar conteúdo específico
  switch (tabName) {
    case "stock":
      renderStockList();
      break;
    case "specialOffers":
      renderSpecialOffers();
      break;
    case "waitlist":
      renderWaitlistList();
      break;
    case "orders":
      renderOrdersList();
      break;
  }

  // Log do estado
  console.log("Estado das abas após mudança:");
  tabs.forEach((tab) => {
    console.log(
      `${tab.id}: display=${tab.style.display}, active=${tab.classList.contains("active")}`,
    );
  });
}

function renderSpecialOffers() {
  const specialOffersList = document.getElementById("specialOffersList");
  if (!specialOffersList) {
    return;
  }

  // Limpar lista e remover todos os elementos existentes
  specialOffersList.innerHTML = "";

  // Criar fragmento para melhor performance
  const fragment = document.createDocumentFragment();

  // Criar um mapa de IDs para verificar duplicatas
  const renderedProducts = new Set();

  products.forEach((product) => {
    // Verificar se o produto já foi renderizado
    if (renderedProducts.has(product.id)) {
      return;
    }

    renderedProducts.add(product.id);
    const quantity = product.quantity || 0;
    const active = product.active !== false;
    const specialOffers = JSON.parse(
      localStorage.getItem("specialOffers") || "[]",
    );
    const isSpecialOffer = product.specialOffer !== false;

    const offerItem = document.createElement("div");
    // Preservar estilo de alteração pendente se existir
    const className = `offer-item ${isSpecialOffer ? "selected" : ""}`;
    offerItem.className = pendingSpecialOffers[product.id]
      ? `${className} has-pending-changes`
      : className;
    offerItem.setAttribute("data-product-id", product.id);
    offerItem.innerHTML = `
            <div class="offer-item-header">
                <div class="offer-image-container">
  <img src="${product.imageUrl || "/img/placeholder.png"}" alt="${product.name}">
</div>
                <div class="offer-item-info">
                    <h3>${product.name}</h3>
                    <div class="offer-prices">
                        ${
                          product.oldPrice
                            ? `
                            <div class="offer-price-old">
                                <i class="fas fa-tag"></i>
                                <span>De: R$ ${product.oldPrice.toFixed(2).replace(".", ",")}</span>
                            </div>
                        `
                            : ""
                        }
                        <div class="offer-price-current">
                            <i class="fas fa-tag"></i>
                            <span>
                                Por: R$ ${product.price.toFixed(2).replace(".", ",")}
                                ${
                                  product.oldPrice
                                    ? `
                                    <span class="discount-percentage">${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF</span>
                                `
                                    : ""
                                }
                            </span>
                        </div>
                        ${
                          product.pixPrice
                            ? `
                            <div class="offer-price-pix">
                                <i class="fas fa-bolt"></i>
                                <span class="pix-label">PIX:</span>
                                <span class="pix-price-value">R$ ${product.pixPrice.toFixed(2).replace(".", ",")}</span>
                                ${product.oldPrice ? `<span class="discount-percentage">${Math.round(((product.price - product.pixPrice) / product.price) * 100)}% OFF</span>` : ""}
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div class="stock-info">
    <div class="quantity-container">
        <span class="quantity-label">Em Estoque:</span>
        <span class="quantity-value ${quantity <= 2 ? "low-stock" : ""}">${quantity}</span>
    </div>
</div>
                    <div class="status-container">
                        <span class="stock-status-label-text" style="margin-left:12px;margin-right:4px;font-weight:500;color:#888">Status:</span>
                  <span class="stock-status">
                    ${active ? `<i class="fas fa-check stock-status-icon stock-status-active-icon"></i> <i class="fas fa-unlock stock-status-icon stock-status-active-unlock"></i> <span class="stock-status-label stock-status-active-label">Ativo</span>` : `<i class="fas fa-times stock-status-icon stock-status-inactive-x"></i> <i class="fas fa-lock stock-status-icon stock-status-inactive-icon"></i> <span class="stock-status-label stock-status-inactive-label">Inativo</span>`}
                  </span>
                    </div>
                </div>
            </div>
            <div class="offer-controls">
                <label class="checkbox-container">
                <label class="offer-toggle">
                    <input type="checkbox" 
                           ${isSpecialOffer ? "checked" : ""} 
                           onchange="window.StockModule.toggleSpecialOffer(${product.id})">
                    Exibir em Ofertas Especiais
                </label>
            </div>
            <!-- Barra de Progresso de Estoque -->
            <div class="product-stock-bar">
              <div class="product-stock-bar-inner ${quantity <= 2 ? 'critico' : ''}" style="width: ${Math.min((quantity / 20) * 100, 100)}%;" title="${quantity} unidades em estoque"></div>
            </div>
            ${
              (!active || quantity === 0)
                ? `<div class="stock-alert-wrapper"><span class="stock-alert unavailable"><i class='fas fa-ban'></i>Indisponível</span></div>`
                : (quantity <= 2 ? `<div class="stock-alert-wrapper"><span class="stock-alert low"><i class='fas fa-exclamation-triangle'></i>Estoque Baixo!</span></div>` : '')
            }
        `;

    // Adicionar o elemento ao fragment
    fragment.appendChild(offerItem);
  });

  // Adicionar todos os elementos do fragment ao DOM de uma vez
  specialOffersList.appendChild(fragment);
}

// Armazenamento temporário de alterações de ofertas especiais
let pendingSpecialOffers = {};

// Atualiza o estado de oferta especial temporariamente
export function toggleSpecialOffer(productId) {
  const product = products.find((p) => p.id === productId);

  if (!product) {
    console.error("Produto não encontrado:", productId);
    return;
  }

  const quantity = product.quantity || 0;
  const active = product.active !== false;

  if (!active || quantity === 0) {
    Swal.fire({
      title: "Produto Indisponível",
      text: "Não é possível adicionar um produto inativo ou sem estoque às ofertas especiais.",
      icon: "warning",
      confirmButtonColor: "#ff1493",
    }).then(() => {
      // Limpa o tick visualmente
      const checkbox = document.querySelector(
        `input[type='checkbox'][onchange*='toggleSpecialOffer(${productId})']`,
      );
      if (checkbox) checkbox.checked = false;
    });
    return;
  }

  // Inverter o estado atual
  const isSpecialOffer = product.specialOffer !== false;
  const newSpecialOffer = !isSpecialOffer;

  // Armazenar alteração pendente
  pendingSpecialOffers[productId] = {
    specialOffer: newSpecialOffer,
  };

  // Atualizar o produto localmente
  product.specialOffer = newSpecialOffer;

  // Adicionar classe de alteração pendente
  const offerItem = document.querySelector(
    `.offer-item[data-product-id="${productId}"]`,
  );

  if (offerItem) {
    offerItem.classList.add("has-pending-changes");
    // Adicionar animação de pulso para chamar atenção
    offerItem.style.animation = "pulse 1s ease-in-out";
    // Adicionar classe de animação
    offerItem.classList.add("animated");
    // Remover animação após 1 segundo
    setTimeout(() => {
      offerItem.style.animation = "";
      offerItem.classList.remove("animated");
    }, 1000);
  } else {
    // Aguardar um pouco para garantir que o elemento esteja no DOM
    setTimeout(() => {
      const offerItem = document.querySelector(
        `.offer-item[data-product-id="${productId}"]`,
      );
      if (offerItem) {
        offerItem.classList.add("has-pending-changes");
        offerItem.style.animation = "pulse 1s ease-in-out";
        setTimeout(() => {
          offerItem.style.animation = "";
        }, 1000);
      }
    }, 100); // Pequena espera para garantir que o elemento esteja no DOM
  }

  // Atualizar botão de salvar
  const saveButton = document.getElementById("saveChanges");
  if (saveButton) {
    saveButton.classList.add("has-changes");
  }

  // Re-renderizar apenas a lista de ofertas especiais
  renderSpecialOffers();

  // Mostrar feedback visual
  Swal.fire({
    title: "Alteração Pendente",
    text: `Status de oferta especial do produto ${product.name} foi alterado e aguarda salvamento.`,
    icon: "info",
    confirmButtonColor: "#4CAF50",
    timer: 2000,
  });
}

// Armazenamento temporário de alterações de quantidade
let pendingChanges = {};

// Atualiza a quantidade temporariamente
export function updateQuantity(productId, quantity) {
  console.log(
    "Atualizando quantidade temporariamente para produto:",
    productId,
  );
  const parsedQuantity = parseInt(quantity);

  // Validar quantidade
  if (isNaN(parsedQuantity) || parsedQuantity < 0) {
    console.error("Quantidade inválida:", quantity);
    return;
  }

  // Atualizar estado de alterações pendentes
  pendingChanges[productId] = {
    quantity: parsedQuantity,
  };

  // Atualizar o produto local temporariamente
  const product = products.find((p) => p.id === productId);
  if (product) {
    product.quantity = parsedQuantity;

    // Atualizar o input específico
    const inputElement = document.querySelector(
      `[data-product-id="${productId}"] .stock-quantity`,
    );
    if (inputElement) {
      inputElement.value = parsedQuantity;
    }

    // Adicionar classe de alteração pendente
    const stockItem = document.querySelector(
      `[data-product-id="${productId}"]`,
    );
    if (stockItem) {
      stockItem.classList.add("has-pending-changes");
    }
  }

  // Atualizar botão de salvar
  const saveButton = document.getElementById("saveChanges");
  if (saveButton) {
    saveButton.classList.add("has-changes");
  }
}

// Atualiza a imagem do produto
export async function updateProductImage(productId) {
  try {
    // Criar modal para upload de imagem
    const { value: file } = await Swal.fire({
      title: "Atualizar Imagem do Produto",
      html: `
                <div class="form-group">
                    <label for="newImage">Nova Imagem</label>
                    <input type="file" id="newImage" accept="image/*">
                    <div id="imagePreview" class="image-preview"></div>
                </div>
            `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const fileInput = document.getElementById("newImage");
        if (!fileInput.files.length) {
          Swal.showValidationMessage("Por favor, selecione uma imagem");
          return false;
        }
        return fileInput.files[0];
      },
    });

    if (file) {
      try {
        // Opções de compressão
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };

        // Comprimir imagem
        const compressedFile = await imageCompression(file, options);

        // Converter para base64
        const imageUrl = await fileToBase64(compressedFile);

        // Atualizar no Firestore
        const productRef = doc(window.db, "products", productId);
        await setDoc(productRef, { imageUrl }, { merge: true });

        // Atualizar no array local
        const product = products.find((p) => p.id === productId);
        if (product) {
          product.imageUrl = imageUrl;

          // Atualizar UI
          updateUI();
        }

        // Mostrar feedback de sucesso
        Swal.fire({
          title: "Sucesso!",
          text: "Imagem atualizada com sucesso",
          icon: "success",
          confirmButtonColor: "#4CAF50",
        });
      } catch (error) {
        console.error("Erro na compressão ou upload:", error);
        Swal.fire({
          title: "Erro",
          text: "Erro ao processar a imagem: " + error.message,
          icon: "error",
          confirmButtonColor: "#ff1493",
        });
      }
    }
  } catch (error) {
    console.error("Erro no modal:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao abrir o modal: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
  }
}

// Definições explícitas para evitar ReferenceError
async function completeOrder(orderId) {
  console.debug('[Pedidos] Clique em Concluído para orderId:', orderId);
  try {
    const orderRef = doc(window.db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return Swal.fire('Erro', 'Pedido não encontrado!', 'error');
    const order = orderSnap.data();
    
    // Verifica se o pedido já está concluído ou cancelado
    if (order.status === 'Concluído') {
      return Swal.fire('Aviso', 'Este pedido já foi marcado como Concluído.', 'info');
    }
    if (order.status === 'Cancelado') {
      return Swal.fire('Erro', 'Não é possível marcar um pedido cancelado como Concluído.', 'error');
    }
    await setDoc(orderRef, { status: 'Concluído' }, { merge: true });
    Swal.fire('Pedido concluído!', 'O status do pedido foi atualizado para Concluído.', 'success');
    renderOrdersList();
  } catch (e) {
    Swal.fire('Erro', 'Não foi possível atualizar o pedido.', 'error');
    console.error('Erro ao consumir pedido:', e);
  }
}

async function cancelOrder(orderId) {
  console.debug('[Pedidos] Clique em Cancelar para orderId:', orderId);
  try {
    const orderRef = doc(window.db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return Swal.fire('Erro', 'Pedido não encontrado!', 'error');
    
    const order = orderSnap.data();
    
    // Verifica se o pedido já está concluído ou cancelado
    if (order.status === 'Concluído') {
      return Swal.fire('Aviso', 'Não é possível cancelar um pedido já concluído.', 'error');
    }
    if (order.status === 'Cancelado') {
      return Swal.fire('Aviso', 'Este pedido já foi cancelado.', 'info');
    }
    
    // Retornar saldo dos produtos ao estoque
    if (Array.isArray(order.items)) {
      const batch = writeBatch(window.db);
      for (const item of order.items) {
        const prodRef = doc(window.db, 'products', String(item.productId));
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          const newQty = (prodData.quantity || 0) + (item.quantity || 0);
          batch.set(prodRef, { quantity: newQty }, { merge: true });
        }
      }
      await batch.commit();
    }
    
    await setDoc(orderRef, { status: 'Cancelado' }, { merge: true });
    Swal.fire('Pedido cancelado!', 'O pedido foi cancelado e o estoque atualizado.', 'success');
    renderOrdersList();
  } catch (e) {
    Swal.fire('Erro', 'Não foi possível cancelar o pedido.', 'error');
    console.error('Erro ao cancelar pedido:', e);
  }
}

// Adicionando funções ao StockModule
window.StockModule = {
  updateQuantity,
  savePendingChanges,
  showAddProductModal,
  editProduct,
  updateProductImage,
  toggleSpecialOffer,
  updateStock,
  notifyClient, // Torna notifyClient disponível globalmente
};
// Corrige sobrescrita: sempre reatribui funções de pedidos
Object.assign(window.StockModule, {
  completeOrder,
  cancelOrder
});

// Salva todas as alterações pendentes
export async function savePendingChanges() {
  const quantityChanges = Object.keys(pendingChanges).length;
  const offerChanges = Object.keys(pendingSpecialOffers).length;
  const totalChanges = quantityChanges + offerChanges;

  if (totalChanges === 0) {
    console.log("Nenhuma alteração pendente para salvar");
    Swal.fire({
      title: "Nada para salvar",
      text: "Nenhuma alteração pendente encontrada.",
      icon: "info",
      confirmButtonColor: "#4CAF50",
      timer: 1400,
    });
    return;
  }

  try {
    const batch = writeBatch(window.db);

    // Salvar alterações de quantidade
    Object.entries(pendingChanges).forEach(([productId, changes]) => {
      const product = products.find((p) => String(p.id) === String(productId));
      if (product) {
        product.quantity = changes.quantity;
        const productRef = doc(window.db, "products", String(productId));
        batch.set(productRef, { quantity: changes.quantity }, { merge: true });
        // Se zerou o estoque, remove de ofertas especiais
        if (changes.quantity === 0 && product.specialOffer) {
          product.specialOffer = false;
          batch.set(productRef, { specialOffer: false }, { merge: true }); // sempre booleano
          if (pendingSpecialOffers[productId]) {
            delete pendingSpecialOffers[productId];
          }
        }
      }
    });

    // Salvar alterações de ofertas especiais
    Object.entries(pendingSpecialOffers).forEach(
      ([productId, isSpecialOffer]) => {
        const product = products.find(
          (p) => String(p.id) === String(productId),
        );
        if (product) {
          product.specialOffer = isSpecialOffer;
          const productRef = doc(window.db, "products", String(productId));
          batch.set(
            productRef,
            { specialOffer: !!isSpecialOffer },
            { merge: true },
          ); // sempre booleano
        }
      },
    );

    await batch.commit();
    console.log("Alterações salvas com sucesso!");

    // Limpar alterações pendentes
    pendingChanges = {};
    pendingSpecialOffers = {};

    // Atualizar listas
    await renderStockList();
    await renderSpecialOffers();

    Swal.fire({
      title: "Sucesso!",
      text: `Salvadas ${totalChanges} alterações com sucesso!`,
      icon: "success",
      confirmButtonColor: "#4CAF50",
      timer: 1800,
    });
  } catch (error) {
    console.error("Erro ao salvar alterações:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao salvar alterações: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (!modal) {
    console.error("Modal não encontrado");
    return;
  }
  modal.classList.remove("active");
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const mode = form.dataset.mode;
  const productId = form.dataset.productId
    ? parseInt(form.dataset.productId)
    : Date.now();
  const imageFile = document.getElementById("productImage").files[0];

  if (!imageFile) {
    Swal.fire({
      title: "Erro",
      text: "Por favor, selecione uma imagem para o produto",
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
    return;
  }

  try {
    // Converter imagem para base64
    const base64Image = await imageToBase64(imageFile);

    // ...

    // Atualizar interface
    stockList.innerHTML = "";
    stockList.appendChild(fragment);

    renderWaitlistList();
    renderSpecialOffers();

    // Verificar lista de espera
    const waitlistData = JSON.parse(localStorage.getItem("waitlist") || "{}");
    const customers = waitlistData[productId] || [];

    if (customers.length > 0 && quantity > 0 && active) {
      Swal.fire({
        title: "Lista de Espera",
        text: `Existem ${customers.length} clientes aguardando este produto. Deseja notificá-los?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sim, notificar",
        cancelButtonText: "Não",
        confirmButtonColor: "#4CAF50",
      }).then((result) => {
        if (result.isConfirmed) {
          notifyAllCustomers(productId);
        }
      });
    }
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao salvar produto: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
  }
}

// Função para converter imagem em base64
async function imageToBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}

// Adicionar preview da imagem quando selecionada
function setupImagePreview() {
  const imageInput = document.getElementById("productImage");
  if (imageInput) {
    imageInput.addEventListener("change", function (e) {
      const preview = document.getElementById("imagePreview");
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          // Remove placeholder se existir
          preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image" style="max-width:110px;max-height:110px;display:block;margin:auto;">`;
        };
        reader.readAsDataURL(file);
      } else {
        // Volta o placeholder se não houver arquivo
        preview.innerHTML = `<div class='preview-placeholder'><i class='fas fa-image'></i></div>`;
      }
    });
  }
}

async function setupEventListeners() {
  try {
    // Botões das abas
    const stockTabBtn = document.getElementById("stockTabBtn");
    const specialOffersTabBtn = document.getElementById("specialOffersTabBtn");

    const waitlistTabBtn = document.getElementById("waitlistTabBtn");

    if (stockTabBtn) {
      stockTabBtn.addEventListener("click", () => showTab("stock"));
    }

    if (specialOffersTabBtn) {
      specialOffersTabBtn.addEventListener("click", () =>
        showTab("specialOffers"),
      );
    }

    if (waitlistTabBtn) {
      waitlistTabBtn.addEventListener("click", () => showTab("waitlist"));
    }

    // Adiciona event listener para o botão de pedidos
    const ordersTabBtn = document.getElementById("ordersTabBtn");
    if (ordersTabBtn) {
      ordersTabBtn.addEventListener("click", () => showTab("orders"));
    }

    // Botão de adicionar produto
    const addProductBtn = document.getElementById("addProductBtn");
    if (addProductBtn) {
      addProductBtn.addEventListener("click", showAddProductModal);
    }

    // Botão de salvar
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      // Agora salva apenas alterações pendentes para evitar excesso de writes
      saveButton.addEventListener("click", () => savePendingChanges());
    }

    // Event listeners para filtros da lista de espera
    const waitlistFilters = document.querySelectorAll(".waitlist-filter");
    waitlistFilters.forEach((filter) => {
      filter.addEventListener("change", renderWaitlistList);
    });
    // Event listener para campo de busca por nome
    const nameInput = document.getElementById("waitlistNameFilter");
    if (nameInput) {
      nameInput.addEventListener("input", renderWaitlistList);
    }
    // Event listener para botão Limpar Filtros
    const clearBtn = document.getElementById("waitlistClearFilters");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        // Limpar todos os filtros
        if (nameInput) nameInput.value = "";
        const prodFilter = document.getElementById("waitlistProductFilter");
        if (prodFilter) prodFilter.value = "";
        const statusFilter = document.getElementById("waitlistStatusFilter");
        if (statusFilter) statusFilter.value = "";
        renderWaitlistList();
      });
    }
  } catch (error) {
    console.error("Erro ao configurar event listeners:", error);
    Swal.fire({
      title: "Erro",
      text: "Erro ao configurar event listeners: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
    throw error;
  }
}

// Exportar funções principais
export {
  initializeStock,
  setupEventListeners,
  renderStockList,
  renderSpecialOffers,
  renderWaitlistList,
  saveStockData,
  updateStock,
};

const imageCompression = window.imageCompression;

// Função para converter arquivo em base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

window.updateStock = updateStock;

// Definir funções no objeto StockModule global
if (!window.StockModule) {
  window.StockModule = {};
}

// Função para atualizar a lista manualmente
window.StockModule.refreshStock = async () => {
  try {
    // Mostrar loading
    const refreshBtn = document.getElementById("refreshStock");
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    refreshBtn.disabled = true;

    // Limpar cache local
    localStorage.removeItem("products");
    localStorage.removeItem("specialOffers");

    // Forçar nova consulta ao Firestore
    const productsCollection = collection(window.db, "products");
    const snapshot = await getDocs(productsCollection);

    // Atualizar produtos localmente
    products = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
      });
    });

    // Re-renderizar todas as listas
    renderStockList();
    renderSpecialOffers();

    // Restaurar botão antes de mostrar o SweetAlert
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;

    // Mostrar feedback de sucesso
    Swal.fire({
      title: "Atualizado!",
      text: "Lista atualizada com sucesso.",
      icon: "success",
      confirmButtonColor: "#4CAF50",
    });
  } catch (error) {
    console.error("Erro ao atualizar lista:", error);

    // Restaurar botão antes de mostrar o erro
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;

    Swal.fire({
      title: "Erro",
      text: "Erro ao atualizar lista: " + error.message,
      icon: "error",
      confirmButtonColor: "#ff1493",
    });
  }
};

Object.assign(window.StockModule, {
  showAddProductModal,
  closeProductModal,
  editProduct,
  deleteProduct,
  handleProductSubmit,
  updateStock,
  notifyClient,
  notifyAllCustomers,
  showTab,
  toggleSpecialOffer,
  updateProductImage,
});
