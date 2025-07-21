// Gerenciamento de estoque

// Delegated event handler for Remove Gift buttons
if (!window._removeGiftBtnDelegationAttached) {
  document.addEventListener("click", async function (e) {
    const btn = e.target.closest(".btn-remove-gift");
    if (!btn) return;
    e.preventDefault();
    const orderId = btn.getAttribute("data-order-id");
    const itemId = btn.getAttribute("data-item-id");
    if (!orderId || !itemId) return;
    if (typeof window.StockModule?.removeGiftItem === "function") {
      await window.StockModule.removeGiftItem(orderId, itemId);
    } else {
      console.error(
        "removeGiftItem não está disponível em window.StockModule",
      );
      Swal.fire(
        "Erro",
        "Não foi possível remover o brinde: função não disponível.",
        "error",
      );
    }
  });
  window._removeGiftBtnDelegationAttached = true;
}

/**
 * Formata a descrição do produto, aplicando:
 * - Título: linha terminada com * (negrito, sublinhado colorido)
 * - Texto: justificado
 * @param {string} description Texto da descrição
 * @param {string} underlineColor Classe CSS do sublinhado (ex: 'underline-red')
 * @returns {string} HTML formatado
 */
function formatProductDescription(
  description,
  underlineColor = "underline-primary",
) {
  if (!description) return "";
  // Quebra em linhas
  const lines = description.split(/\r?\n/);
  let html = "";
  lines.forEach((line, idx) => {
    const titleMatch = line.trim().match(/^\*\*(.+)\*\*$/);
    if (titleMatch) {
      const cleanTitle = titleMatch[1].trim();
      html += `<span class="desc-title ${underlineColor}"><b>${escapeHtml(cleanTitle)}</b></span>`;
    } else if (line.trim()) {
      html += `<p class="desc-text">${escapeHtml(line.trim())}</p>`;
    }
    // Linhas em branco = espaçamento extra
    if (!line.trim() && idx !== 0) {
      html += '<div style="height:0.5em"></div>';
    }
  });
  return html;
}

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import "./print.js";

// Função para formatar número de telefone
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";

  // Remove todos os caracteres que não são dígitos
  const cleaned = ("" + phoneNumber).replace(/\D/g, "");

  // Verifica se é um número válido (10 ou 11 dígitos)
  const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  // Retorna o número original se não for possível formatar
  return phoneNumber;
}

// Função para escapar caracteres HTML
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Função auxiliar para formatar o método de pagamento
function getPaymentMethodLabel(method) {
  const methods = {
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    pix: "PIX",
    boleto: "Boleto Bancário",
    cash: "Dinheiro",
    bank_transfer: "Transferência Bancária",
  };
  return methods[method] || method || "Não informado";
}

// Tornar a função disponível globalmente
window.getPaymentMethodLabel = getPaymentMethodLabel;

// Função para alternar a visibilidade dos detalhes financeiros
function toggleFinancialDetails(button) {
  const content = button.nextElementSibling;
  const icon = button.querySelector("i");
  const labelSpan = button.querySelector("span");

  if (!content) return;
  if (!icon) return;
  if (!labelSpan) return;

  if (content.style.display === "none" || !content.style.display) {
    content.style.display = "block";
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
    labelSpan.textContent = "Ocultar detalhes financeiros";
  } else {
    content.style.display = "none";
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
    labelSpan.textContent = "Ver detalhes financeiros";
  }
}

// Tornar a função disponível globalmente
window.toggleFinancialDetails = toggleFinancialDetails;

// Função para normalizar textos para busca (remove acentos e caracteres especiais)
function normalizeSearchText(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .trim();
}

// Função para normalizar os status (remove acentos e caracteres especiais)
function normalizeStatus(status) {
  if (!status) return "";
  return status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .trim();
}

// Função para normalizar texto para comparação (remover acentos, converter para minúsculas e remover espaços)
const normalizeForComparison = (str) => {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

// Função para mapear status para valores consistentes
function getNormalizedStatus(status) {
  if (!status || status.trim() === "") return "Pendente";

  const normalizedInput = normalizeForComparison(status);

  // Mapa de status normalizados
  const statusMap = {
    concluido: "Concluído",
    concluir: "Concluído",
    finalizado: "Concluído",
    completo: "Concluído",
    entregue: "Concluído",
    cancelado: "Cancelado",
    cancelar: "Cancelado",
    pago: "Pago",
    pendente: "Pendente",
    processando: "Pendente",
    "em andamento": "Pendente",
    aguardando: "Pendente",
    "pendente de pagamento": "Pendente",
    "pendente pagamento": "Pendente",
    "pendente de pag": "Pendente",
    "pendente pag": "Pendente",
    novo: "Pendente",
    recebido: "Pendente",
  };

  // Verifica se o status normalizado está no mapa
  for (const [key, value] of Object.entries(statusMap)) {
    if (normalizeForComparison(key) === normalizedInput) {
      return value;
    }
  }

  // Se não encontrou no mapa, tenta encontrar por similaridade
  for (const [key, value] of Object.entries(statusMap)) {
    const normalizedKey = normalizeForComparison(key);
    if (
      normalizedInput.includes(normalizedKey) ||
      normalizedKey.includes(normalizedInput)
    ) {
      return value;
    }
  }

  // Retorna o status original com a primeira letra maiúscula
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

// Função para formatar data no formato YYYY-MM-DD
function formatDateForInput(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split("T")[0];
}

// Função para aplicar os filtros
export function applyFilters() {
  
  const searchTerm =
    document.getElementById("searchTerm")?.value?.trim().toLowerCase() || "";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const filterStatus = document.getElementById("filterStatus")?.value || "";

  // Atualizar a URL com os parâmetros de filtro
  const urlParams = new URLSearchParams();
  if (filterStatus) urlParams.set("status", filterStatus);
  if (searchTerm) urlParams.set("search", encodeURIComponent(searchTerm));
  if (filterDate) urlParams.set("date", filterDate);

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.pushState({}, "", newUrl);

  const orderCards = document.querySelectorAll(".order-card");

  // Verificar se existem cards
  if (orderCards.length === 0) {
    console.warn("Nenhum card de pedido encontrado na página!");
    const ordersList = document.getElementById("ordersList");
    if (ordersList) {

    } else {
      console.error("Elemento ordersList não encontrado!");
    }
  }

  let visibleCount = 0;
  let anyFilterActive = searchTerm || filterDate || filterStatus;

  // Log dos dados do primeiro pedido para debug
  if (orderCards.length > 0) {
    const firstCard = orderCards[0];
  }

  orderCards.forEach((card) => {
    const cardNumber =
      card.querySelector(".order-number")?.textContent?.trim() || "";
    // Busca pelo nome do cliente considerando múltiplas possibilidades
    let customerName =
      card.querySelector(".customer-name")?.textContent?.trim() || "";
    if (!customerName) {
      // Tenta buscar por outros campos se necessário (fallback)
      customerName = card.dataset.customerName || card.dataset.customer || "";
    }
    const orderDate =
      card.querySelector(".order-date")?.getAttribute("data-date")?.trim() ||
      "";
    const cardStatus = (card.dataset.status || "").trim();

    // 1. Normalizar status para comparação consistente
    const normalizedCardStatus = getNormalizedStatus(cardStatus || "Pendente");
    const normalizedFilterStatus = filterStatus
      ? getNormalizedStatus(filterStatus)
      : null;

    // 2. Verificar se o pedido corresponde ao filtro de status
    let statusMatches = !filterStatus; // Se não houver filtro de status, mostra todos

    if (filterStatus) {
      // Normalizar os status para comparação
      const cardStatusNormalized = normalizeForComparison(normalizedCardStatus);
      const filterStatusNormalized = normalizeForComparison(
        normalizedFilterStatus,
      );

      // Verificar se o status do card corresponde ao filtro
      statusMatches =
        cardStatusNormalized === filterStatusNormalized ||
        cardStatusNormalized.includes(filterStatusNormalized) ||
        filterStatusNormalized.includes(cardStatusNormalized);

      // Caso especial: se o filtro for 'Pendente', mostrar também pedidos sem status definido
      if (
        !statusMatches &&
        filterStatusNormalized === "pendente" &&
        (!cardStatus || cardStatus.trim() === "")
      ) {
        // Se o filtro for 'Pendente' e o card não tiver status, considerar como correspondência
        statusMatches = true;
      }
    }

    // 3. Verificar se o pedido corresponde ao filtro de data
    let dateMatches = !filterDate;
    if (filterDate && orderDate) {
      try {
        const cardDate = new Date(orderDate);
        const filterDateObj = new Date(filterDate);
        dateMatches = cardDate.toDateString() === filterDateObj.toDateString();
      } catch (e) {
        console.error("Erro ao processar datas:", e);
        dateMatches = true; // Em caso de erro, considera como se a data correspondesse
      }
    }

    // 4. Verificar se o pedido corresponde ao termo de busca
    let searchMatches = !searchTerm;
    if (searchTerm) {
      try {
        const normalizedSearch = normalizeSearchText(searchTerm);
        // Busca no número do pedido e nome do cliente
        // Busca tanto pelo número do pedido quanto por possíveis campos de nome do cliente
        searchMatches =
          normalizeSearchText(cardNumber).includes(normalizedSearch) ||
          normalizeSearchText(customerName).includes(normalizedSearch);

        // Se não encontrou no número ou nome, tenta encontrar nos itens do pedido
        if (!searchMatches) {
          const items = card.querySelectorAll(".order-item");
          searchMatches = Array.from(items).some((item) => {
            const itemName =
              item.querySelector(".product-name")?.textContent?.trim() || "";
            return normalizeSearchText(itemName).includes(normalizedSearch);
          });
        }
      } catch (e) {
        console.error("Erro na busca:", e);
        searchMatches = true; // Em caso de erro, considera como se a busca correspondesse
      }
    }
    // Lógica de decisão:
    // 1. Primeiro verifica se os filtros básicos estão atendidos (status e data)
    const basicFiltersMatch = statusMatches && dateMatches;

    // 2. Se houver termo de busca, deve corresponder à busca E aos filtros básicos
    // 3. Se não houver termo de busca, basta que os filtros básicos sejam atendidos
    const shouldShow = searchTerm
      ? searchMatches && basicFiltersMatch // Busca + Filtros
      : basicFiltersMatch; // Apenas Filtros

    // 4. Aplicar a decisão final de exibição
    if (shouldShow) {
      card.style.display = ""; // Remove qualquer display: none
      card.style.removeProperty("display"); // Garante que não há estilos inline sobrescrevendo
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  // Mostrar mensagem quando não houver resultados
  const noResultsMessage = document.getElementById("noResultsMessage");
  if (noResultsMessage) {
    noResultsMessage.style.display = visibleCount > 0 ? "none" : "block";
  }

  // Mostrar mensagem se não houver resultados
  const ordersList = document.getElementById("ordersList");
  const noResults = document.getElementById("noResultsMessage");

  if (visibleCount === 0) {
    if (!noResults) {
      const message = document.createElement("div");
      message.id = "noResultsMessage";
      message.style.textAlign = "center";
      message.style.padding = "40px 20px";
      message.style.color = "#666";
      message.style.fontSize = "1.1em";

      let messageText = "Nenhum pedido encontrado";
      const activeFilters = [];

      if (filterStatus) activeFilters.push(`status "${filterStatus}"`);
      if (filterDate)
        activeFilters.push(`data "${formatISODateToBR(filterDate)}"`);
      if (searchTerm) activeFilters.push(`termo de busca "${searchTerm}"`);

      if (activeFilters.length > 0) {
        messageText += ` com ${activeFilters.join(", ")}`;
      }

      message.innerHTML = `
        <i class="fas fa-inbox" style="font-size: 3em; opacity: 0.3; margin-bottom: 15px;"></i>
        <p>${messageText}</p>
        <div style="display: flex; justify-content: center; width: 100%;">
  <button onclick="clearFilters()" class="btn btn-primary" style="margin-top: 15px;">
    <i class="fas fa-undo"></i> Limpar filtros
  </button>
</div>
      `;
      ordersList.appendChild(message);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

// Função para limpar todos os filtros
export function clearFilters() {
  document.getElementById("searchTerm").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterStatus").value = "";
  applyFilters();
}

// Mantendo a função antiga para compatibilidade, mas redirecionando para a nova função
function filterOrdersByStatus(status) {
  document.getElementById("filterStatus").value = status || "";
  applyFilters();
}

// Torna as funções disponíveis globalmente
window.filterOrdersByStatus = filterOrdersByStatus;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

// Função para renderizar pedidos
export async function renderOrdersList() {
  console.log(
    "[DEBUG] typeof window.StockModule.removeGiftItem:",
    typeof window.StockModule?.removeGiftItem,
  );

  const ordersList = document.getElementById("ordersList");
  const ordersSummary = document.getElementById("ordersSummary");

  if (!ordersList) {
    console.error("Elemento ordersList não encontrado!");
    return;
  }

  // Mostrar indicador de carregamento
  ordersList.innerHTML = `
    <div class="loading-container" style="text-align: center; padding: 2rem;">
      <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #ff1493; border-radius: 50%; width: 40px; height: 40px; margin: 0 auto 1rem; animation: spin 1s linear infinite;"></div>
      <p>Carregando pedidos...</p>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>`;

  if (ordersSummary) {
    ordersSummary.style.display = "none";
  }

  try {
    // Buscar pedidos
    const ordersRef = collection(window.db, "orders");

    const ordersSnapshot = await getDocs(ordersRef);

    if (ordersSnapshot.empty) {
      ordersList.innerHTML = `
        <div class="no-orders" style="text-align: center; padding: 2rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
          <h3 style="color: #666; margin-bottom: 0.5rem;">Nenhum pedido encontrado</h3>
          <p style="color: #999;">Quando novos pedidos forem feitos, eles aparecerão aqui.</p>
        </div>`;
      return;
    }

    let html = "";
    let totalPedidos = 0;
    let totalVendido = 0;
    let totalCompra = 0;
    let totalLucro = 0;
    const orders = [];

    // Processar cada pedido
    ordersSnapshot.forEach((doc) => {
      try {
        const order = { ...doc.data(), _id: doc.id };

        // Garantir que os itens sejam um array
        if (!Array.isArray(order.items)) {
          order.items = [];
        }

        // Garantir que os pagamentos sejam um array
        if (!Array.isArray(order.payments)) {
          order.payments = [];
        }

        orders.push(order);
        totalPedidos++;
      } catch (error) {
        console.error(`Erro ao processar pedido ${doc.id}:`, error);
      }
    });

    // Ordenar pedidos por data (mais recentes primeiro)
    orders.sort((a, b) => {
      const dateA = a.createdAt
        ? a.createdAt.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt)
        : new Date(0);
      const dateB = b.createdAt
        ? b.createdAt.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt)
        : new Date(0);
      return dateB - dateA; // Ordem decrescente (mais recente primeiro)
    });

    // Atualiza cache global para handlers dos botões de acordo
    window.ordersCache = orders;
    console.log(
      "[DEBUG] window.ordersCache atualizado:",
      window.ordersCache.length,
      "pedidos",
    );

    // Gerar HTML dos cards
    html = orders
      .map((order) => {
        // Normalizar o status para garantir consistência
        const normalizedStatus = getNormalizedStatus(
          order.status || "Pendente",
        );

        const statusClass =
          normalizedStatus === "Concluído"
            ? "completed"
            : normalizedStatus === "Cancelado"
              ? "cancelled"
              : "";
        const statusLabel = normalizedStatus;

        // Formatar data do pedido
        let dataPedido = "Data não disponível";
        try {
          if (order.createdAt) {
            const dateObj = order.createdAt.toDate
              ? order.createdAt.toDate()
              : new Date(order.createdAt);
            dataPedido = dateObj.toLocaleString("pt-BR");
          }
        } catch (e) {
          console.error("Erro ao formatar data do pedido:", e);
        }

        // Calcular custo de compra
        let purchaseCost = 0;
        (order.items || []).forEach((item) => {
          const produto = Array.isArray(window.products)
            ? window.products.find(
                (p) => String(p.id) === String(item.productId),
              )
            : null;
          if (produto && produto.purchasePrice) {
            purchaseCost +=
              Number(produto.purchasePrice || 0) * Number(item.quantity || 1);
          }
        });

        order._purchaseCost = purchaseCost;

        // Calcular totais de pagamentos
        const payments = Array.isArray(order.payments) ? order.payments : [];
        const totalPago = payments.reduce((sum, payment) => {
          return sum + (Number(payment.amount) || 0);
        }, 0);

        const valorTotal = Number(order.total) || 0;
        const valorPendente = Math.max(0, valorTotal - totalPago);

        // Determinar status do pagamento
        let paymentStatus = order.paymentStatus || "Pendente";
        if (totalPago >= valorTotal) {
          paymentStatus = "Pago";
        } else if (totalPago > 0) {
          paymentStatus = "Parcial";
        }

        try {
          const orderNumber =
            order.orderNumber || order._id.substring(0, 8).toUpperCase();
          const customerName =
            order.customerName ||
            order.customer?.name ||
            "Cliente não identificado";
          let paymentMethodLabel = getPaymentMethodLabel(
            order.paymentMethod || "credit",
          );
          if (order.paymentMethod === "agreement") {
            paymentMethodLabel = "Acordo";
          } else if (
            order.paymentMethod === "credit" &&
            order.installments > 1
          ) {
            paymentMethodLabel = `Cartão de Crédito (${order.installments}x)`;
          } else if (order.paymentMethod === "pix") {
            paymentMethodLabel = "PIX";
          }
          const totalPedido = Number(order.total) || 0;
          const lucroEstimado = Math.max(0, totalPedido - purchaseCost);

          // Gerar HTML dos itens do pedido
          const itemsHtml = (order.items || [])
            .map((item, index) => {
              const precoUnitario =
  order.paymentMethod === "pix"
    ? Number(item.pixPrice ?? item.price) || 0
    : Number(item.price) || 0;
              const quantidade = Number(item.quantity) || 1;
              const subtotal = precoUnitario * quantidade;
              const isGift = item.isGift === true;

              return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 8px;">
                <div class="product-name" style="display: flex; justify-content: space-between; align-items: center;">
                  <span>
                    ${item.name || "Produto sem nome"}
                    ${isGift ? '<span style="margin-left: 8px; background: #e3f7e9; color: #0d6832; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">Brinde</span>' : ""}
                  </span>
                  ${
                    isGift
                      ? `
                    <button class="btn-remove-gift" data-order-id="${order._id}" data-item-id="${item.id || index}"
        style="background: #ff3860; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px;"
        title="Remover brinde">
  <i class="fas fa-trash"></i>
  <span>Remover</span>
</button>
                  `
                      : ""
                  }
                </div>
                ${
                  item.variant
                    ? `<div class="product-variant" style="font-size: 0.85em; color: #666; margin-top: 4px;">
                  ${item.variant}
                </div>`
                    : ""
                }
              </td>
              <td style="text-align: center; padding: 12px 8px; vertical-align: top;">${quantidade}</td>
              <td style="text-align: right; padding: 12px 8px; vertical-align: top; white-space: nowrap;">
                R$ ${precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="text-align: right; padding: 12px 8px; vertical-align: top; white-space: nowrap; font-weight: 500;">
                R$ ${subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `;
            })
            .join("");

          // Gerar HTML dos pagamentos realizados
          const paymentsHtml =
            payments.length > 0
              ? `
          <div class="payment-history" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <h4 style="font-size: 0.95em; color: #555; margin: 0 0 10px 0; display: flex; align-items: center;">
              <i class="fas fa-history" style="margin-right: 8px;"></i>
              Histórico de Pagamentos
            </h4>
            <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
              <table class="payment-table" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Data</th>
                    <th style="text-align: right; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Valor</th>
                    <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Forma</th>
                    <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments
                    .map((payment, idx) => {
                      const paymentDate = payment.date
                        ? payment.date.toDate
                          ? payment.date.toDate()
                          : new Date(payment.date)
                        : new Date();
                      const paymentStatus = payment.status || "Aprovado";
                      const statusClass =
                        paymentStatus.toLowerCase() === "aprovado"
                          ? "status-approved"
                          : paymentStatus.toLowerCase() === "pendente"
                            ? "status-pending"
                            : "status-rejected";

                      return `
    <tr style="border-bottom: 1px solid #f1f1f1;">
      <td style="padding: 8px; border-bottom: 1px solid #f1f1f1; white-space:nowrap;">${(() => {
        let dt = payment.createdAt
          ? new Date(payment.createdAt)
          : payment.date
            ? payment.date.toDate
              ? payment.date.toDate()
              : new Date(payment.date)
            : new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return (
          pad(dt.getDate()) +
          "/" +
          pad(dt.getMonth() + 1) +
          "/" +
          dt.getFullYear() +
          " " +
          pad(dt.getHours()) +
          ":" +
          pad(dt.getMinutes())
        );
      })()}</td>
      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #f1f1f1; font-weight: 500; white-space: nowrap;">
        R$ ${Number(payment.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #f1f1f1;">${getPaymentMethodLabel(payment.method)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #f1f1f1;">
        <span class="status-badge ${statusClass}" style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 500;${statusClass === "status-approved" ? "background: #e3f7e9; color: #0d6832; border: 1px solid #a3e6b8;" : ""}${statusClass === "status-pending" ? "background: #fffbe8; color: #d97706; border: 1px solid #ffeeba;" : ""}${statusClass === "status-rejected" ? "background: #fde2e1; color: #b91c1c; border: 1px solid #fca5a5;" : ""}">
          ${paymentStatus}
        </span>
        <button class="delete-payment-btn" data-order-id="${order._id}" data-payment-idx="${idx}" title="Excluir pagamento" style="margin-left:8px; background:#ff1493; color:white; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.9em;"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
              : `
          <div class="no-payments" style="margin-top: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; text-align: center; color: #6c757d;">
            <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
            Nenhum pagamento registrado para este pedido.
          </div>
        `;

          // --- Handler de exclusão de pagamento ---
          setTimeout(() => {
            document.querySelectorAll(".delete-payment-btn").forEach((btn) => {
              btn.onclick = async function (e) {
                e.preventDefault();
                const orderId = this.getAttribute("data-order-id");
                const paymentIdx = parseInt(
                  this.getAttribute("data-payment-idx"),
                );
                if (!orderId || isNaN(paymentIdx)) return;
                const result = await Swal.fire({
                  title: "Excluir pagamento?",
                  text: "Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#d33",
                  cancelButtonColor: "#3085d6",
                  confirmButtonText: "Sim, excluir",
                  cancelButtonText: "Cancelar",
                });
                if (result.isConfirmed) {
                  try {
                    const orderRef = doc(window.db, "orders", orderId);
                    const orderSnap = await getDoc(orderRef);
                    if (orderSnap.exists()) {
                      const orderData = orderSnap.data();
                      let paymentsArr = Array.isArray(orderData.payments)
                        ? [...orderData.payments]
                        : [];
                      paymentsArr.splice(paymentIdx, 1);
                      const valorTotal = Number(orderData.total) || 0;
                      const totalPago = paymentsArr.reduce(
                        (sum, payment) => sum + (Number(payment.amount) || 0),
                        0,
                      );
                      const valorPendente = Math.max(0, valorTotal - totalPago);
                      let paymentStatus = "Pendente";
                      if (valorPendente === 0 && valorTotal > 0) {
                        paymentStatus = "Pago";
                      } else if (totalPago > 0) {
                        paymentStatus = "Parcial";
                      }
                      await updateDoc(orderRef, {
                        payments: paymentsArr,
                        paymentStatus,
                        valorPendente,
                        updatedAt: new Date().toISOString(),
                      });
                      Swal.fire(
                        "Excluído!",
                        "O pagamento foi removido e o status financeiro foi atualizado.",
                        "success",
                      );
                      renderOrdersList();
                    }
                  } catch (err) {
                    Swal.fire(
                      "Erro",
                      "Não foi possível excluir o pagamento. Tente novamente.",
                      "error",
                    );
                  }
                }
              };
            });
          }, 100);
          // Fim do handler de exclusão

          
          // Gerar HTML do card do pedido
          // Utilitário para formatar data/hora no horário de Brasília (UTC-3)
          function formatDateToBRT(dateInput) {
            const date =
              typeof dateInput === "string" ? new Date(dateInput) : dateInput;
            // Converter para horário de Brasília (UTC-3)
            const brtDate = new Date(
              date.getTime() -
                date.getTimezoneOffset() * 60000 -
                3 * 60 * 60 * 1000,
            );
            const day = String(brtDate.getDate()).padStart(2, "0");
            const month = String(brtDate.getMonth() + 1).padStart(2, "0");
            const year = brtDate.getFullYear();
            const hours = String(brtDate.getHours()).padStart(2, "0");
            const minutes = String(brtDate.getMinutes()).padStart(2, "0");
            return `${day}/${month}/${year} ${hours}:${minutes}`;
          }
          const orderDate = order.createdAt
            ? order.createdAt.toDate
              ? order.createdAt.toDate()
              : new Date(order.createdAt)
            : new Date();
          const formattedDate = formatDateToBRT(orderDate);

          return `
          <div class="order-card" data-order-id="${order._id}" data-status="${normalizedStatus}" id="order-${order._id}" style="margin-bottom: 20px; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; transition: all 0.3s ease;">
            <!-- Cabeçalho do pedido -->
            <div class="order-header" style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center;">
                <span class="order-number" style="font-weight: 600; color: #2c3e50; font-size: 1.1em;">
  #${orderNumber}
</span>
<span class="status-badge ${statusClass}" style="margin-left: 12px; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 500; background-color: ${statusClass === "completed" ? "#e3f7e9" : statusClass === "cancelled" ? "#fee2e2" : "#fff3cd"}; color: ${statusClass === "completed" ? "#0d6832" : statusClass === "cancelled" ? "#b91c1c" : "#856404"}; border: 1px solid ${statusClass === "completed" ? "#a3e6b8" : statusClass === "cancelled" ? "#fecaca" : "#ffeeba"};">
  ${statusLabel}
</span>
<span class="status-badge payment-status-badge ${paymentStatus.toLowerCase()}" style="margin-left: 10px; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 500; background-color: ${paymentStatus === "Pago" ? "#e3f7e9" : paymentStatus === "Parcial" ? "#fff3cd" : "#fee2e2"}; color: ${paymentStatus === "Pago" ? "#0d6832" : paymentStatus === "Parcial" ? "#856404" : "#b91c1c"}; border: 1px solid ${paymentStatus === "Pago" ? "#a3e6b8" : paymentStatus === "Parcial" ? "#ffeeba" : "#fecaca"};">
  ${paymentStatus === "Pago" ? '<i class="fas fa-check-circle" style="margin-right: 4px;"></i>' : paymentStatus === "Parcial" ? '<i class="fas fa-hourglass-half" style="margin-right: 4px;"></i>' : '<i class="fas fa-exclamation-circle" style="margin-right: 4px;"></i>'}
  ${paymentStatus}
</span>
              </div>
              <div class="order-date" data-date="${orderDate.toISOString().split("T")[0]}" style="font-size: 0.9em; color: #666;">
                <i class="far fa-calendar-alt" style="margin-right: 5px; color: #6c757d;"></i>
                ${formattedDate}
              </div>
            </div>
            
            <!-- Corpo do pedido -->
            <div class="order-body" style="padding: 20px;">
              <!-- Informações do cliente -->
              <div class="customer-info" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0; display: block;">
                <style>
                  .customer-info > div { display: flex !important; align-items: center; margin-bottom: 8px; }
                  .customer-info i { display: inline-block; min-width: 18px; text-align: center; margin-right: 8px; color: #6c757d; }
                </style>
                <div style="margin-bottom: 8px;">
                  <i class="fas fa-user"></i>
                  <span class="customer-name" style="font-weight: 500; color: #2c3e50;">${escapeHtml(customerName)}</span>
                </div>
                ${
                  order.customerEmail
                    ? `
                  <div style="margin-bottom: 8px;">
                    <i class="fas fa-envelope"></i>
                    <span style="color: #555;">${escapeHtml(order.customerEmail)}</span>
                  </div>
                `
                    : ""
                }
                ${
                  order.customerPhone
                    ? `
                  <div style="margin-bottom: 8px;">
                    <i class="fas fa-phone"></i>
                    <span style="color: #555;">${formatPhoneNumber(order.customerPhone)}</span>
                  </div>
                `
                    : ""
                }
                ${
                  order.paymentMethod
                    ? `
  <div style="margin-bottom: 0;">
    <i class="fas ${order.paymentMethod === "pix" ? "fa-bolt" : order.paymentMethod === "credit" || order.paymentMethod === "debit" ? "fa-credit-card" : order.paymentMethod === "agreement" ? "fa-handshake" : "fa-credit-card"}"></i>
    <span style="color: #555; font-weight: 500;">${paymentMethodLabel}</span>
  </div>
`
                    : ""
                }
                ${
                  (order.paymentMethod === "credit" &&
                    order.installments > 1) ||
                  (order.paymentMethod === "agreement" &&
                    order.paymentAgreement &&
                    Number(order.paymentAgreement.installments) > 1)
                    ? `
  <div style="margin-bottom: 0;">
    <i class="fas fa-layer-group"></i>
    <span style="color: #555;">Parcelamento: ${order.paymentMethod === "credit" ? order.installments : order.paymentAgreement.installments}x de R$ ${(order.paymentMethod ===
    "credit"
      ? Number(order.total) / Number(order.installments)
      : order.paymentAgreement.installmentValue
        ? Number(order.paymentAgreement.installmentValue)
        : Number(order.total) / Number(order.paymentAgreement.installments)
    ).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}</span>
  </div>
`
                    : order.paymentMethod === "pix" ||
                        (order.paymentMethod === "credit" &&
                          order.installments === 1) ||
                        (order.paymentMethod === "agreement" &&
                          order.paymentAgreement &&
                          Number(order.paymentAgreement.installments) === 1)
                      ? `
  <div style="margin-bottom: 0;">
    <i class="fas fa-money-bill-wave"></i>
    <span style="color: #555;">Pagamento à vista: ${order.total ? `R$ ${Number(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}</span>
  </div>
`
                      : ""
                }
              </div>

              <!-- Itens do pedido -->
              <div class="order-products" style="margin-bottom: 20px;">
                <h4 style="font-size: 0.95em; color: #555; margin: 0 0 10px 0; display: flex; align-items: center;">
                  <i class="fas fa-box-open" style="margin-right: 8px;"></i>
                  Itens do Pedido
                </h4>
                <div class="table-responsive" style="overflow-x: auto;">
                  <table class="order-products-table" style="width: 100%; border-collapse: collapse; font-size: 0.95em;">
                    <thead>
                      <tr style="background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                        <th style="text-align: left; padding: 10px; font-weight: 500;">Produto</th>
                        <th style="text-align: center; padding: 10px; font-weight: 500; width: 80px;">Qtd</th>
                        <th style="text-align: right; padding: 10px; font-weight: 500; width: 120px;">Unitário</th>
                        <th style="text-align: right; padding: 10px; font-weight: 500; width: 120px;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
  ${
    order.coupon
      ? `
    <tr style="background-color: #f8f9fa;">
      <td colspan="3" style="text-align: right; padding: 8px 10px; color: #888; font-size: 0.96em;">Subtotal:</td>
      <td style="text-align: right; padding: 8px 10px; color: #888; font-size: 0.96em;">
        R$ ${(order.originalTotal || (order.coupon && order.coupon.type === "percent" ? Math.round(order.total / (1 - order.coupon.value / 100)) : order.total + (order.coupon?.value || 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td colspan="3" style="text-align: right; padding: 8px 10px; color: #2196f3; font-size: 0.97em;">Cupom aplicado${order.coupon.code ? ` (${order.coupon.code})` : ""}:</td>
      <td style="text-align: right; padding: 8px 10px; color: #2196f3; font-size: 0.97em;">
        ${order.coupon.type === "percent" ? `- ${order.coupon.value}%` : `- R$ ${(order.coupon.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </td>
    </tr>
  `
      : ""
  }
  <tr style="background-color: #f8f9fa; font-weight: 600; border-top: 2px solid #dee2e6;">
    <td colspan="3" style="text-align: right; padding: 12px 10px;">Total do Pedido:</td>
    <td style="text-align: right; padding: 12px 10px; font-size: 1.1em; color: #2c3e50;">
      R$ ${totalPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </td>
  </tr>
</tfoot>
                  </table>
                </div>
              </div>

              <!-- Seção de detalhes financeiros -->
              <div class="financial-details">
                <div class="financial-details-toggle" onclick="toggleFinancialDetails(this)" style="cursor: pointer; padding: 10px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; user-select: none;">
                  <i class="fas fa-chart-line" style="margin-right: 8px; color: #ff1493;"></i>
                  <span>Ver detalhes financeiros</span>
                  <i class="fas fa-chevron-down" style="margin-left: 8px; transition: transform 0.3s ease;"></i>
                </div>
                <div class="financial-details-content" style="display: none; padding: 15px; background-color: #fdfdfd; border: 1px solid #eee; border-radius: 6px; margin-top: -10px;">
                   <div class="financial-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
  <div class="financial-item" style="padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #4caf50;">
    <div style="font-size: 0.85em; color: #555; margin-bottom: 5px;">Valor Total</div>
    <div style="font-size: 1.2em; font-weight: 600; color: #2c3e50;">
      R$ ${totalPedido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  </div>
  <div class="financial-item" style="padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #f59e0b;">
    <div style="font-size: 0.85em; color: #555; margin-bottom: 5px;">Valor Pendente</div>
    <div style="font-size: 1.2em; font-weight: 600; color: #dc2626;">
      R$ ${valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  </div>
  <div class="financial-item" style="padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #9c27b0;">
    <div style="font-size: 0.85em; color: #555; margin-bottom: 5px;">Status do Pagamento</div>
    <div>
      <span class="status-badge ${paymentStatus.toLowerCase()}" style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.9em; font-weight: 500; background-color: ${paymentStatus === "Pago" ? "#e3f7e9" : paymentStatus === "Parcial" ? "#fff3cd" : "#fee2e2"}; color: ${paymentStatus === "Pago" ? "#0d6832" : paymentStatus === "Parcial" ? "#856404" : "#b91c1c"}; border: 1px solid ${paymentStatus === "Pago" ? "#a3e6b8" : paymentStatus === "Parcial" ? "#ffeeba" : "#fecaca"}">
        ${paymentStatus}
      </span>
    </div>
  </div>
  ${
    order.coupon
      ? `<div class="financial-item" style="padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #2196f3;">
    <div style="font-size: 0.85em; color: #2196f3; margin-bottom: 5px;">Cupom aplicado${order.coupon.code ? ` (${order.coupon.code})` : ""}</div>
    <div style="font-size: 1.1em; font-weight: 500; color: #2196f3;">
      ${order.coupon.type === "percent" ? `-${order.coupon.value}%` : `- R$ ${(order.coupon.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
    </div>
  </div>`
      : ""
  }
</div>



                  <!-- Exibir acordo de pagamento, se existir -->
  ${
    order.paymentAgreement
      ? `
   <div class="agreement-info" style="grid-column: 1/-1; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
     <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
       <i class="fas fa-file-contract" style="color: #2196f3;"></i>
       <span style="font-weight: 600; color: #1565c0;">Acordo de Pagamento (${order.paymentAgreement.installments}x):</span>
  <button class="edit-agreement-btn" data-order-id="${order._id}" title="Editar acordo" style="margin-left: 10px; background: #2196f3; color: white; border: none; border-radius: 4px; padding: 3px 9px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center;" onclick="window.openAgreementModal('${order._id}', true)"><i class="fas fa-edit"></i></button>
  <button class="delete-agreement-btn" data-order-id="${order._id}" title="Excluir acordo" style="margin-left: 5px; background: #e53935; color: white; border: none; border-radius: 4px; padding: 3px 9px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center;"><i class="fas fa-trash"></i></button>
     </div>
     <div style="margin-left: 30px;">
       <table style="width: 100%; font-size: 0.97em;">
         <thead>
           <tr>
             <th style="text-align:left;">Parcela</th>
             <th style="text-align:center;">Vencimento</th>
             <th style="text-align:right;">Valor</th>
             <th style="text-align:right;">Pago</th>
             <th style="text-align:right;">Status</th>
             <th style="text-align:center;">Ação</th>
           </tr>
         </thead>
         <tbody>
           ${order.paymentAgreement.dates
             .map((date, idx) => {
               const [ano, mes, dia] = date.split("-");
               const dataFormatada = `${dia}/${mes}/${ano}`;
               // Filtra pagamentos vinculados a esta parcela
               const parcelaPagamentos = (order.payments || []).filter(
                 (p) => p.installmentIndex === idx,
               );
               const valorParcela =
                 Math.round(
                   ((order.total || 0) / order.paymentAgreement.installments) *
                     100,
                 ) / 100;
               const totalPagoParcela = parcelaPagamentos.reduce(
                 (sum, p) => sum + (Number(p.amount) || 0),
                 0,
               );
               let status = "Pendente",
                 cor = "#fff3cd",
                 txt = "#856404",
                 borda = "#ffeeba";
               if (totalPagoParcela >= valorParcela) {
                 status = "Pago";
                 cor = "#e3f7e9";
                 txt = "#0d6832";
                 borda = "#a3e6b8";
               } else if (totalPagoParcela > 0) {
                 status = "Parcial";
                 cor = "#fffbe8";
                 txt = "#d97706";
                 borda = "#ffeeba";
               }
               return `
               <tr>
                 <td style="padding: 2px 6px;">${idx + 1} / ${order.paymentAgreement.installments}</td>
                 <td style="padding: 2px 6px; text-align:center;">${(() => {
                   const [ano, mes, dia] = date.split("-");
                   return `${dia}/${mes}/${ano}`;
                 })()}</td>
                 <td style="padding: 2px 6px; text-align:right;">R$ ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                 <td style="padding: 2px 6px; text-align:right;">R$ ${totalPagoParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                 <td style="padding: 2px 6px; text-align:right;">
                   <span style="padding: 2px 10px; border-radius: 10px; font-size: 0.9em; background: ${cor}; color: ${txt}; border: 1px solid ${borda};">
                     ${status}
                   </span>
                 </td>
                 <td style="padding: 2px 6px; text-align:center;">
                   <button class="btn-add-payment" onclick="window.openPaymentModal('${order._id}', ${valorParcela}, ${(valorParcela - totalPagoParcela).toFixed(2)}, ${idx})" style="background-color: #4caf50; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; display: inline-flex; align-items: center; gap: 4px;">
                     <i class='fas fa-plus'></i> Pagar Parcela
                   </button>
                 </td>
               </tr>
               ${
                 parcelaPagamentos.length > 0
                   ? `<tr><td colspan="6" style="padding: 0 0 8px 0; background: #f8f9fa; font-size: 0.92em; color: #555;">
                 ${parcelaPagamentos
                   .map((p) => {
                     const dt = p.createdAt
                       ? new Date(p.createdAt)
                       : p.date
                         ? p.date.toDate
                           ? p.date.toDate()
                           : new Date(p.date)
                         : new Date();
                     const pad = (n) => String(n).padStart(2, "0");
                     // Descobrir o índice global desse pagamento no array order.payments
                     const globalIdx = (order.payments || []).findIndex(
                       (pay) => pay === p,
                     );
                     return `<span style='margin-right:10px;'>Pagamento: R$ ${Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}
                     <button class="delete-payment-btn" data-order-id="${order._id}" data-payment-idx="${globalIdx}" title="Excluir pagamento" style="margin-left:8px; background:#ff1493; color:white; border:none; border-radius:4px; padding:2px 7px; cursor:pointer; font-size:0.85em;"><i class="fas fa-trash"></i></button></span>`;
                   })
                   .join("<br>")}
               </td></tr>`
                   : ""
               }
             `;
             })
             .join("")}
         </tbody>
       </table>
     </div>
   </div>
   `
      : ""
  }
                  <!-- Histórico de pagamentos -->
                  <!-- Pagamentos avulsos (sem vínculo de parcela) -->
${(() => {
  const avulsos = (order.payments || []).filter(
    (p) =>
      typeof p.installmentIndex === "undefined" || p.installmentIndex === null,
  );
  if (!avulsos.length) return "";
  return `<div class='payment-history' style='margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;'>
    <h4 style='font-size: 0.95em; color: #555; margin: 0 0 10px 0; display: flex; align-items: center;'>
      <i class="fas fa-history" style="margin-right: 8px;"></i>
      Pagamentos Avulsos
    </h4>
    <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
      <table class="payment-table" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Data</th>
            <th style="text-align: right; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Valor</th>
            <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Forma</th>
            <th style="text-align: left; padding: 8px; font-weight: 500; border-bottom: 1px solid #dee2e6;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${avulsos
            .map((payment, idx) => {
              const paymentDate = payment.date
                ? payment.date.toDate
                  ? payment.date.toDate()
                  : new Date(payment.date)
                : new Date();
              const paymentStatus = payment.status || "Aprovado";
              const statusClass =
                paymentStatus.toLowerCase() === "aprovado"
                  ? "status-approved"
                  : paymentStatus.toLowerCase() === "pendente"
                    ? "status-pending"
                    : "status-rejected";
              return `
              <tr style="border-bottom: 1px solid #f1f1f1;">
                <td style="padding: 8px; border-bottom: 1px solid #f1f1f1; white-space:nowrap;">${(() => {
                  let dt = payment.createdAt
                    ? new Date(payment.createdAt)
                    : payment.date
                      ? payment.date.toDate
                        ? payment.date.toDate()
                        : new Date(payment.date)
                      : new Date();
                  const pad = (n) => String(n).padStart(2, "0");
                  return (
                    pad(dt.getDate()) +
                    "/" +
                    pad(dt.getMonth() + 1) +
                    "/" +
                    dt.getFullYear() +
                    " " +
                    pad(dt.getHours()) +
                    ":" +
                    pad(dt.getMinutes())
                  );
                })()}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #f1f1f1; font-weight: 500; white-space: nowrap;">
                  R$ ${Number(payment.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f1f1;">${getPaymentMethodLabel(payment.method)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f1f1;">
                  <span class="status-badge ${statusClass}" style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 500;${statusClass === "status-approved" ? "background: #e3f7e9; color: #0d6832; border: 1px solid #a3e6b8;" : ""}${statusClass === "status-pending" ? "background: #fffbe8; color: #d97706; border: 1px solid #ffeeba;" : ""}${statusClass === "status-rejected" ? "background: #fde2e1; color: #b91c1c; border: 1px solid #fca5a5;" : ""}">
                    ${paymentStatus}
                  </span>
                  <button class="delete-payment-btn" data-order-id="${order._id}" data-payment-idx="${idx}" title="Excluir pagamento" style="margin-left:8px; background:#ff1493; color:white; border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.9em;"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;
})()}


                  <!-- Ações de pagamento -->
                  <div class="payment-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-add-payment" onclick="console.log('Clicou em Registrar Pagamento:', '${order._id}', ${totalPedido}, ${valorPendente}); window.openPaymentModal('${order._id}', ${totalPedido}, ${valorPendente})" style="background-color: #4caf50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;">
                      <i class="fas fa-plus"></i>
                      Registrar Pagamento
                    </button>
                    <button class="btn-add-agreement" onclick="console.log('Clicou em Criar Acordo:', '${order._id}'); window.openAgreementModal('${order._id}')" style="background-color: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;${order.paymentAgreement ? " opacity: 0.6;" : " cursor: pointer;"}" ${order.paymentAgreement ? "disabled" : ""}>
                      <i class="fas fa-file-contract"></i>
                      ${order.paymentAgreement ? "Acordo Criado" : "Criar Acordo"}
                    </button>
                    <button class="btn-add-gift" onclick="window.openGiftModal('${order._id}')" style="background-color: #9c27b0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;">
                      <i class="fas fa-gift"></i>
                      Brinde/Nota
                    </button>


                    <button class="btn-print" onclick="window.printOrder('${order._id}')" style="background-color: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s; margin-left: auto;">
                      <i class="fas fa-print"></i>
                      Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rodapé do pedido com ações -->
            <div class="order-footer" style="padding: 12px 20px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div style="font-size: 0.9em; color: #666;">
                <span style="font-weight: 500; margin-right: 5px;">ID:</span>
                <span style="font-family: monospace;">${order._id}</span>
              </div>
              <div class="order-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${
                  order.status !== "Cancelado"
                    ? `
                  <button class="order-action-btn complete" data-action="toggle-complete" data-order-id="${order._id}" style="background-color: #4caf50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;">
                    <i class="fas fa-check"></i>
                    ${order.status === "Concluído" ? "Desfazer Conclusão" : "Marcar como Concluído"}
                  </button>
                `
                    : ""
                }
                
                ${
                  order.status !== "Cancelado"
                    ? `
                  <span class="cancel-btn-tooltip-wrapper" style="position: relative; display: inline-block;">
  <button class="order-action-btn cancel" data-action="cancel" data-order-id="${order._id}" style="background-color: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;${order.status === 'Concluído' ? ' opacity: 0.6; cursor: not-allowed;' : ''}" ${order.status === 'Concluído' ? 'disabled' : ''}>
    <i class="fas fa-times"></i>
    Cancelar Pedido
  </button>
  ${order.status === 'Concluído' ? `<span class="custom-tooltip bs-tooltip-top show" style="visibility: hidden; opacity: 0; transition: opacity 0.2s; position: absolute; left: 50%; top: -40px; transform: translateX(-50%); background: #343a40; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 0.85em; box-shadow: 0 2px 8px rgba(0,0,0,0.12); z-index: 100; max-width: 250px; white-space: normal; text-align: center; pointer-events: none;">Desfaça a conclusão para cancelar.</span>` : ''}
</span>
                `
                    : ""
                }
                
                <button class="order-action-btn delete" data-action="delete" data-order-id="${order._id}" style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;">
                  <i class="fas fa-trash"></i>
                  Excluir
                </button>
                
                <button class="order-action-btn whatsapp" onclick='window.openWhatsAppModal(JSON.parse(this.getAttribute("data-order")))' data-order='${JSON.stringify(order).replace(/'/g, "&#39;")}' style="background-color: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em; display: inline-flex; align-items: center; gap: 5px; transition: background-color 0.2s;">
  <i class="fab fa-whatsapp"></i>
  WhatsApp
</button>
              </div>
            </div>
          </div>
        `;
        } catch (error) {
          console.error("Erro ao gerar HTML do pedido:", error);
          return `
          <div class="order-card error" style="padding: 20px; background: #fff8f8; border: 1px solid #ffdddd; border-radius: 8px; margin-bottom: 20px; color: #721c24;">
            <h3 style="margin-top: 0; color: #721c24;">Erro ao carregar pedido</h3>
            <p>Ocorreu um erro ao carregar os dados deste pedido. Por favor, tente novamente mais tarde.</p>
            <p style="font-size: 0.9em; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
              <i class="fas fa-exclamation-triangle"></i> ID do Pedido: ${order._id || "Desconhecido"}
            </p>
          </div>
        `;
        }
      })
      .join("");

    // 2. Só depois, calcule os totalizadores:
    totalVendido = 0;
    totalCompra = 0;
    totalLucro = 0;
    orders.forEach((order) => {
      // Só adiciona ao total se o pedido não estiver cancelado
      if (order.status !== "Cancelado") {
        totalVendido += order.total ?? 0;
        totalCompra += order._purchaseCost || 0;
        totalLucro += (order.total ?? 0) - (order._purchaseCost || 0);
      }
    });

    // Atualizar resumo
    if (ordersSummary) {
      ordersSummary.style.display = "block";
      ordersSummary.innerHTML = `
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">Total de Pedidos</span>
            <span class="summary-value">${totalPedidos}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Vendido</span>
            <span class="summary-value">R$ ${totalVendido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Custo Total</span>
            <span class="summary-value">R$ ${totalCompra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div class="summary-item highlight">
            <span class="summary-label">Lucro Estimado</span>
            <span class="summary-value">R$ ${totalLucro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      `;
    }
    // Garante que todos os cards são concatenados e inseridos de uma vez
    ordersList.innerHTML =
      html && html.trim().length > 0
        ? html
        : "<p>Nenhum pedido encontrado.</p>";
    console.log("HTML atualizado no DOM");

    // Event delegation para editar/excluir acordo
    if (ordersList) {
      // Delegação para botões de ação de pedido (concluir/desfazer conclusão e cancelar)
      if (window._orderActionBtnDelegation) {
        ordersList.removeEventListener("click", window._orderActionBtnDelegation, true);
      }
      // Tooltip customizado Bootstrap-like para botão cancelar desativado
      ordersList.addEventListener('mouseover', function(e) {
        const wrapper = e.target.closest('.cancel-btn-tooltip-wrapper');
        if (wrapper && wrapper.querySelector('.custom-tooltip')) {
          const btn = wrapper.querySelector('button.order-action-btn.cancel');
          if (btn && btn.disabled) {
            const tooltip = wrapper.querySelector('.custom-tooltip');
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
          }
        }
      });
      ordersList.addEventListener('mouseout', function(e) {
        const wrapper = e.target.closest('.cancel-btn-tooltip-wrapper');
        if (wrapper && wrapper.querySelector('.custom-tooltip')) {
          const tooltip = wrapper.querySelector('.custom-tooltip');
          tooltip.style.visibility = 'hidden';
          tooltip.style.opacity = '0';
        }
      });
      ordersList.addEventListener('focusin', function(e) {
        const wrapper = e.target.closest('.cancel-btn-tooltip-wrapper');
        if (wrapper && wrapper.querySelector('.custom-tooltip')) {
          const btn = wrapper.querySelector('button.order-action-btn.cancel');
          if (btn && btn.disabled) {
            const tooltip = wrapper.querySelector('.custom-tooltip');
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
          }
        }
      });
      ordersList.addEventListener('focusout', function(e) {
        const wrapper = e.target.closest('.cancel-btn-tooltip-wrapper');
        if (wrapper && wrapper.querySelector('.custom-tooltip')) {
          const tooltip = wrapper.querySelector('.custom-tooltip');
          tooltip.style.visibility = 'hidden';
          tooltip.style.opacity = '0';
        }
      });
      window._orderActionBtnDelegation = async function (event) {
        const btnComplete = event.target.closest(".order-action-btn.complete");
        const btnCancel = event.target.closest(".order-action-btn.cancel");
        if (btnComplete) {
          event.preventDefault();
          const orderId = btnComplete.getAttribute("data-order-id");
          if (!orderId) return;
          // Buscar pedido atual do cache
          const order = (window.ordersCache || []).find(o => o._id === orderId);
          if (!order) return Swal.fire("Erro", "Pedido não encontrado no cache.", "error");
          if (order.status === "Concluído") {
            // Desfazer conclusão
            const result = await Swal.fire({
              title: "Desfazer conclusão?",
              text: "Deseja realmente reverter o status deste pedido para Pendente?",
              icon: "question",
              showCancelButton: true,
              confirmButtonColor: "#f59e0b",
              cancelButtonColor: "#3085d6",
              confirmButtonText: "Sim, desfazer",
              cancelButtonText: "Cancelar",
            });
            if (result.isConfirmed) {
              const orderRef = doc(window.db, "orders", orderId);
              await setDoc(orderRef, { status: "Pendente" }, { merge: true });
              Swal.fire("Revertido!", "O pedido voltou para o status Pendente.", "success");
              renderOrdersList();
            }
          } else if (order.status !== "Cancelado") {
            // Marcar como concluído
            const result = await Swal.fire({
              title: "Marcar como concluído?",
              text: "Deseja realmente marcar este pedido como Concluído?",
              icon: "success",
              showCancelButton: true,
              confirmButtonColor: "#4caf50",
              cancelButtonColor: "#3085d6",
              confirmButtonText: "Sim, concluir",
              cancelButtonText: "Cancelar",
            });
            if (result.isConfirmed) {
              if (typeof window.StockModule?.completeOrder === "function") {
                await window.StockModule.completeOrder(orderId);
              } else {
                // fallback direto
                const orderRef = doc(window.db, "orders", orderId);
                await setDoc(orderRef, { status: "Concluído" }, { merge: true });
                renderOrdersList();
              }
            }
          }
          return;
        }
        if (btnCancel) {
          event.preventDefault();
          const orderId = btnCancel.getAttribute("data-order-id");
          if (!orderId) return;
          // Buscar pedido atual do cache
          const order = (window.ordersCache || []).find(o => o._id === orderId);
          if (!order) return Swal.fire("Erro", "Pedido não encontrado no cache.", "error");
          if (order.status === "Concluído") {
            await Swal.fire({
              icon: "info",
              title: "Não é possível cancelar um pedido concluído!",
              text: "Desfaça a conclusão antes de cancelar o pedido.",
              confirmButtonText: "OK",
              confirmButtonColor: "#f59e0b"
            });
            return;
          }
          const result = await Swal.fire({
            title: "Cancelar pedido?",
            text: "Deseja realmente cancelar este pedido? O estoque será restaurado.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#f44336",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sim, cancelar",
            cancelButtonText: "Não",
          });
          if (result.isConfirmed) {
            if (typeof window.StockModule?.cancelOrder === "function") {
              await window.StockModule.cancelOrder(orderId);
            } else {
              Swal.fire("Erro", "Função de cancelamento não encontrada.", "error");
            }
          }
        }
      };
      ordersList.addEventListener("click", window._orderActionBtnDelegation, true);

      ordersList.removeEventListener(
        "click",
        window._agreementBtnDelegation,
        true,
      );
      window._agreementBtnDelegation = async function (event) {
        const target = event.target.closest(
          ".edit-agreement-btn, .delete-agreement-btn",
        );
        if (!target) return;
        const orderId = target.getAttribute("data-order-id");
        if (!orderId) return;
        if (target.classList.contains("delete-agreement-btn")) {
          console.log(
            "[DEBUG] Clique em .delete-agreement-btn para pedido",
            orderId,
          );
          const result = await Swal.fire({
            title: "Excluir acordo?",
            text: "Deseja realmente remover este acordo? Os pagamentos já registrados serão excluídos.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sim, excluir",
            cancelButtonText: "Cancelar",
          });
          if (result.isConfirmed) {
            try {
              const orderRef = doc(window.db, "orders", orderId);
              // Buscar o pedido atualizado para recalcular pagamentos
              const orderSnap = await getDoc(orderRef);
              let orderData = orderSnap.exists() ? orderSnap.data() : {};
              let payments = Array.isArray(orderData.payments)
                ? orderData.payments
                : [];
              // Remove pagamentos vinculados ao acordo (com installmentIndex definido)
              payments = payments.filter(
                (p) =>
                  typeof p.installmentIndex === "undefined" ||
                  p.installmentIndex === null,
              );
              const valorTotal = Number(orderData.total) || 0;
              const totalPago = payments.reduce(
                (sum, payment) => sum + (Number(payment.amount) || 0),
                0,
              );
              const valorPendente = Math.max(0, valorTotal - totalPago);
              let paymentStatus = "Pendente";
              if (valorPendente === 0 && valorTotal > 0) {
                paymentStatus = "Pago";
              } else if (totalPago > 0) {
                paymentStatus = "Parcial";
              }
              await updateDoc(orderRef, {
                paymentAgreement: null,
                payments: payments,
                paymentStatus,
                valorPendente,
                updatedAt: new Date().toISOString(),
              });
              Swal.fire(
                "Acordo excluído!",
                "O acordo de pagamento foi removido e o status financeiro foi atualizado.",
                "success",
              );
              renderOrdersList();
            } catch (err) {
              Swal.fire(
                "Erro",
                "Não foi possível excluir o acordo. Tente novamente.",
                "error",
              );
            }
          }
        } else if (target.classList.contains("edit-agreement-btn")) {
          console.log(
            "[DEBUG] Clique em .edit-agreement-btn para pedido",
            orderId,
          );
          const order = (window.ordersCache || []).find(
            (o) => o._id === orderId,
          );
          if (!order || !order.paymentAgreement) return;
          Swal.fire({
            title: "Editar Acordo de Pagamento",
            html: (() => {
              let html = `<div class='form-group'><label for='swalEditInstallments'>Número de Parcelas</label><select id='swalEditInstallments' class='form-control' required>`;
              for (let i = 1; i <= 12; i++)
                html += `<option value='${i}' ${order.paymentAgreement.installments === i ? "selected" : ""}>${i}x</option>`;
              html += `</select></div><div class='form-group'><div id='swalEditPaymentSchedule' style='margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;'><p><strong>Datas das Parcelas:</strong></p><div id='swalEditScheduleInputs' style='display: flex; flex-direction: column; gap: 10px;'></div></div></div>`;
              return html;
            })(),
            showCancelButton: true,
            confirmButtonText: "Salvar",
          });
        }
      };
      ordersList.addEventListener(
        "click",
        window._agreementBtnDelegation,
        true,
      );
    }

    // Aplica os filtros após carregar os pedidos
    setTimeout(() => {
      applyFilters();
    }, 0);

    // Atualiza totalizadores (resumo limpo para implementação futura)
    if (ordersSummary) {
      ordersSummary.innerHTML = `
        <div class="summary-notice">
          <p>Resumo de pedidos em desenvolvimento</p>
          <small>Novo resumo com mais detalhes em breve</small>
        </div>
      `;

      // Configura o toggle do resumo
      setTimeout(() => {
        const summaryHeader = document.getElementById("summaryHeader");
        const summaryCollapsible = summaryHeader?.parentElement;

        if (summaryHeader && summaryCollapsible) {
          // Remove event listener antigo se existir
          const newHeader = summaryHeader.cloneNode(true);
          summaryHeader.parentNode.replaceChild(newHeader, summaryHeader);

          // Inicia recolhido
          summaryCollapsible.classList.add("collapsed");

          // Adiciona o evento de clique
          newHeader.addEventListener("click", (e) => {
            e.stopPropagation();
            summaryCollapsible.classList.toggle("collapsed");
            const icon = newHeader.querySelector(".toggle-icon");
            if (icon) {
              icon.textContent = summaryCollapsible.classList.contains(
                "collapsed",
              )
                ? "+"
                : "-";
            }
          });
        }

        // Configura os filtros
        const filterStatus = document.getElementById("filterStatus");
        const searchInput = document.getElementById("searchTerm");
        const filterDate = document.getElementById("filterDate");
        const applyFiltersBtn = document.getElementById("applyFilters");
        const clearFiltersBtn = document.getElementById("clearFilters");

        // Função para aplicar os filtros
        const applyFilter = (e) => {
          if (e) e.preventDefault();
          applyFilters();
        };

        if (filterStatus && applyFiltersBtn && clearFiltersBtn) {
          // Adiciona os event listeners
          applyFiltersBtn.addEventListener("click", applyFilter);
          clearFiltersBtn.addEventListener("click", clearFilters);

          // Aplica o filtro ao pressionar Enter no campo de busca
          searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              applyFilter(e);
            }
          });

          // Aplica o filtro ao mudar a seleção de status ou data
          filterStatus.addEventListener("change", applyFilter);
          filterDate.addEventListener("change", applyFilter);

          // Aplica o filtro inicial se houver parâmetros na URL
          const urlParams = new URLSearchParams(window.location.search);
          const statusParam = urlParams.get("status");
          const searchParam = urlParams.get("search");
          const dateParam = urlParams.get("date");

          if (statusParam || searchParam || dateParam) {
            // Pequeno atraso para garantir que o DOM esteja pronto
            setTimeout(() => {
              if (statusParam) {
                filterStatus.value = statusParam;
              }
              if (searchParam) {
                searchInput.value = decodeURIComponent(searchParam);
              }
              if (dateParam) {
                filterDate.value = dateParam;
              }
              applyFilters();
            }, 100);
          }
        }
      }); // Fecha o setTimeout
    }
  } catch (err) {
    ordersList.innerHTML = "<p>Erro ao carregar pedidos.</p>";
    if (ordersSummary) ordersSummary.style.display = "none";
    console.error("Erro ao carregar pedidos:", err);
  }
}

// Função para criar um acordo de pagamento
window.createPaymentAgreement = async function (
  orderId,
  installments,
  datesOrFirstPaymentDate,
) {
  try {
    if (!orderId || !installments || !datesOrFirstPaymentDate) {
      throw new Error("Dados do acordo de pagamento inválidos");
    }

    let paymentDates = [];
    // Se receber um array, usa as datas fornecidas (novo fluxo SweetAlert2)
    if (Array.isArray(datesOrFirstPaymentDate)) {
      paymentDates = datesOrFirstPaymentDate.map((d) => d);
    } else {
      // Compatibilidade: gera as datas automaticamente a partir da primeira data
      const date = new Date(datesOrFirstPaymentDate);
      for (let i = 0; i < installments; i++) {
        if (i > 0) {
          date.setMonth(date.getMonth() + 1);
        }
        paymentDates.push(date.toISOString().split("T")[0]);
      }
    }

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      paymentAgreement: {
        installments: parseInt(installments),
        dates: paymentDates,
      },
      updatedAt: new Date().toISOString(),
    });

    // Recarregar a lista de pedidos
    await renderOrdersList();
    return true;
  } catch (error) {
    console.error("Erro ao criar acordo de pagamento:", error);
    throw error;
  }
};

// Função para excluir um pedido
window.deleteOrder = async function (orderId) {
  try {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Esta ação não pode ser desfeita! O pedido será removido permanentemente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      // Obter o pedido antes de excluir para devolver ao estoque
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const order = orderSnap.data();

        // Devolver itens ao estoque se o pedido não estiver cancelado
        if (order.status !== "Cancelado") {
          const batch = writeBatch(db);

          for (const item of order.items || []) {
            const productRef = doc(db, "products", item.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              batch.update(productRef, {
                stock: currentStock + (item.quantity || 1),
              });
            }
          }

          await batch.commit();
        }

        // Excluir o pedido
        await deleteDoc(orderRef);

        // Recarregar a lista de pedidos
        await renderOrdersList();

        Swal.fire("Excluído!", "O pedido foi excluído com sucesso.", "success");
      }
    }
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    Swal.fire("Erro!", "Ocorreu um erro ao excluir o pedido.", "error");
  }
};

// Garante que StockModule existe sem sobrescrever funções existentes
if (!window.StockModule) {
  window.StockModule = {};
}

// Função para abrir o WhatsApp com mensagem pré-definida
window.openWhatsApp = function (phone, orderId) {
  // (Função original mantida para compatibilidade)
  // Recomenda-se usar window.openWhatsAppModal para mensagens personalizadas.
};

// Função para abrir o modal de brinde/nota
window.openGiftModal = async function (orderId) {
  try {
    // Busca o pedido diretamente do Firestore
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error("Pedido não encontrado");
      Swal.fire("Erro", "Pedido não encontrado.", "error");
      return null;
    }

    const order = { id: orderDoc.id, ...orderDoc.data() };

    // Carrega os produtos do estoque se ainda não estiverem carregados
    if (!window.stockProducts) {
      try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        window.stockProducts = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        Swal.fire(
          "Erro",
          "Não foi possível carregar a lista de produtos.",
          "error",
        );
        return null;
      }
    }

    // Cria o HTML do modal
    const modalHtml = `
      <div style="text-align: left;">
        <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;">Adicionar Brinde/Nota</h4>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500;">Selecione um produto do estoque (opcional):</label>
          <select id="giftProductSelect" class="form-control" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 10px;">
            <option value="">Selecione um produto...</option>
            ${window.stockProducts
              .filter((p) => (p.quantity || p.stock || 0) > 0)
              .map(
                (p) =>
                  `<option value="${p.id}">${p.name} (${p.quantity || p.stock || 0} em estoque)</option>`,
              )
              .join("")}
          </select>
          <div style="display: flex; gap: 10px; margin-top: 5px;">
            <input type="number" id="giftQuantity" min="1" value="1" style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <span style="line-height: 30px;">quantidade</span>
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500;">Ou adicione uma nota (opcional):</label>
          <textarea id="giftNote" class="form-control" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="Ex: Brinde de cortesia"></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button id="cancelGiftBtn" class="btn btn-secondary" style="padding: 8px 16px;">Cancelar</button>
          <button id="saveGiftBtn" class="btn btn-primary" style="padding: 8px 16px; background-color: #9c27b0; border-color: #9c27b0;">
            <i class="fas fa-gift"></i> Adicionar
          </button>
        </div>
      </div>
    `;

    // Mostra o modal
    const modal = Swal.fire({
      html: modalHtml,
      showConfirmButton: false,
      width: "500px",
      padding: "20px",
      didOpen: () => {
        // Adiciona os event listeners após o modal ser aberto
        document
          .getElementById("saveGiftBtn")
          .addEventListener("click", async () => {
            const productSelect = document.getElementById("giftProductSelect");
            const quantityInput = document.getElementById("giftQuantity");
            const noteInput = document.getElementById("giftNote");

            const giftData = {
              productId: productSelect.value,
              quantity: parseInt(quantityInput.value, 10) || 1,
              note: noteInput.value.trim(),
              date: new Date().toISOString(),
            };

            // Validação básica
            if (
              (productSelect.value && isNaN(giftData.quantity)) ||
              giftData.quantity < 1
            ) {
              Swal.fire(
                "Atenção",
                "Por favor, insira uma quantidade válida maior que zero.",
                "warning",
              );
              return;
            }

            // Validação
            if (!giftData.productId && !giftData.note) {
              Swal.fire(
                "Atenção",
                "Selecione um produto ou adicione uma nota.",
                "warning",
              );
              return;
            }

            try {
              // Cria o batch fora do bloco condicional
              const batch = writeBatch(db);

              // Atualiza o pedido com o brinde/nota
              if (!order.gifts) {
                order.gifts = [];
              }

              // Se for um produto, verifica o estoque
              if (giftData.productId) {
                const product = window.stockProducts.find(
                  (p) =>
                    p.id === giftData.productId ||
                    p.id.toString() === giftData.productId.toString(),
                );
                if (!product) {
                  Swal.fire(
                    "Erro",
                    "Produto não encontrado no estoque.",
                    "error",
                  );
                  return;
                }

                const availableQuantity = Number(
                  product.quantity || product.stock || 0,
                );
                const requestedQuantity = Number(giftData.quantity) || 1;

                if (availableQuantity < requestedQuantity) {
                  Swal.fire(
                    "Erro",
                    `Quantidade em estoque insuficiente para este produto. Disponível: ${availableQuantity}`,
                    "error",
                  );
                  return;
                }

                // Adiciona o produto como brinde (preço zero)
                const giftItem = {
                  ...product,
                  price: 0,
                  originalPrice: product.price, // Mantém o preço original para referência
                  quantity: giftData.quantity,
                  isGift: true,
                  note: giftData.note || "Brinde de cortesia",
                  productId: product.id, // Garante que o productId está definido
                };

                // Adiciona o item ao pedido
                if (!order.items) order.items = [];
                order.items.push(giftItem);

                // Atualiza o estoque usando o batch já criado
                const productRef = doc(db, "products", product.id.toString());
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                  const productData = productSnap.data();
                  const currentQuantity = Number(
                    productData.quantity || productData.stock || 0,
                  );
                  const newQuantity = Math.max(
                    0,
                    currentQuantity - giftData.quantity,
                  );

                  batch.update(productRef, {
                    quantity: newQuantity,
                    stock: newQuantity,
                    updatedAt: new Date().toISOString(),
                  });

                  // Atualiza o produto na lista local
                  const productIndex = window.stockProducts.findIndex(
                    (p) =>
                      p.id === product.id ||
                      p.id.toString() === product.id.toString(),
                  );

                  if (productIndex !== -1) {
                    window.stockProducts[productIndex].quantity = newQuantity;
                    window.stockProducts[productIndex].stock = newQuantity;
                  }
                }
              }

              // Adiciona a nota se existir
              if (giftData.note) {
                order.gifts.push({
                  type: "note",
                  note: giftData.note,
                  date: new Date().toISOString(),
                });
              }

              // Atualiza o pedido no banco de dados
              const orderRef = doc(db, "orders", orderId.toString());

              // Se for um produto, já temos um batch iniciado
              if (giftData.productId) {
                // Adiciona a atualização do pedido ao batch existente
                batch.update(orderRef, {
                  items: order.items || [],
                  gifts: order.gifts || [],
                  updatedAt: new Date().toISOString(),
                });

                // Executa todas as operações em lote
                await batch.commit();
              } else {
                // Se for apenas uma nota, cria um novo batch
                const noteBatch = writeBatch(db);
                noteBatch.update(orderRef, {
                  gifts: order.gifts || [],
                  updatedAt: new Date().toISOString(),
                });
                await noteBatch.commit();
              }

              // Fecha o modal e mostra mensagem de sucesso
              Swal.close();
              Swal.fire(
                "Sucesso!",
                "Brinde/nota adicionado com sucesso!",
                "success",
              );

              // Atualiza a lista de pedidos
              await renderOrdersList();
            } catch (error) {
              console.error("Erro ao adicionar brinde/nota:", error);
              Swal.fire(
                "Erro",
                "Ocorreu um erro ao adicionar o brinde/nota.",
                "error",
              );
            }
          });

        // Fecha o modal ao clicar em cancelar
        document
          .getElementById("cancelGiftBtn")
          .addEventListener("click", () => {
            Swal.close();
          });
      },
    });

    return modal;
  } catch (error) {
    console.error("Erro ao abrir o modal de brinde:", error);
    Swal.fire("Erro", "Não foi possível carregar os dados do pedido.", "error");
    return null;
  }
};

// Função para abrir o modal SweetAlert2 com modelos de mensagem WhatsApp
window.openWhatsAppModal = async function (order) {
  // Extrai dados do pedido
  const orderNumber =
    order.orderNumber || order._id?.substring(0, 8).toUpperCase();
  const customerName = order.customerName || order.customer?.name || "Cliente";
  const customerPhone = order.customerPhone || order.customer?.phone || "";
  const customerEmail = order.customerEmail || order.customer?.email || "";
  const paymentMethod = order.paymentMethod || "";
  let paymentLabel = window.getPaymentMethodLabel
    ? window.getPaymentMethodLabel(paymentMethod)
    : paymentMethod;
  // Normalize 'agreement' to 'Acordo' in the payment label
  paymentLabel = paymentLabel === "agreement" ? "Acordo" : paymentLabel;
  const total = Number(order.total) || 0;
  const items = Array.isArray(order.items) ? order.items : [];
  const agreement = order.paymentAgreement || null;
  const pending = Array.isArray(order.payments)
    ? total -
      order.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : total;
  const formattedTotal = total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Lista de itens
  const itemsList = items
    .map(
      (item) =>
        `- ${item.name || "Produto"} x${item.quantity} (R$ ${(Number(item.price) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
    )
    .join("\n");

  // Modelo 1: Agradecimento
  // Modelo 1: Agradecimento/Confirmação de entrega
  let msg1 = `PEDIDO ENTREGUE #${orderNumber}\n\nCliente: ${customerName}`;
  if (customerPhone) msg1 += `\nTelefone: ${formatPhoneNumber(customerPhone)}`;
  if (customerEmail) msg1 += `\nE-mail: ${customerEmail}`;

  msg1 += `\n\nItens do Pedido:\n${itemsList.replace(/\n/g, "\n- ").replace(/^- /, "")}`;

  if (agreement && agreement.installments > 1) {
    const valorParcela =
      Math.round((total / agreement.installments) * 100) / 100;
    const valorFormatado = valorParcela.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
    msg1 += `\n\nPagamento: em ${agreement.installments}x de R$ ${valorFormatado} sem juros`;
  }

  msg1 += `\nValor Total: R$ ${formattedTotal}`;

  if (agreement && agreement.installments > 1) {
    msg1 += "\n\nAcordo:";
    agreement.dates.forEach((date, idx) => {
      const [ano, mes, dia] = date.split("-");
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const valorParcela =
        Math.round((total / agreement.installments) * 100) / 100;
      const valorFormatado = valorParcela.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      });
      msg1 += `\n${idx + 1}ª Parcela em ${dataFormatada} - R$${valorFormatado}`;
    });
  }

  msg1 +=
    "\n\nEssenza agradece pela comprinha! Aproveite o máximo do cuidado!🌻Deus te abençoe!\n\nhttps://essenzasite.vercel.app/";

  // Modelo 2: Cobrança/lembrança de pagamento
  // Modelo 2: Cobrança/lembrança de pagamento
  let msg2 = `Olá ${customerName}!\n\nLembrando sobre o pagamento do pedido #${orderNumber}.`;

  if (agreement && agreement.installments > 1) {
    const valorParcela =
      Math.round((total / agreement.installments) * 100) / 100;
    const valorFormatado = valorParcela.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });

    msg2 += `\n\nAcordo: ${agreement.installments}x de R$ ${valorFormatado}`;
    msg2 += "\nPróximas parcelas:";

    (agreement.dates || []).forEach((date, idx) => {
      const [ano, mes, dia] = date.split("-");
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const parcelaPagamentos = (order.payments || []).filter(
        (p) => p.installmentIndex === idx,
      );
      const totalPagoParcela = parcelaPagamentos.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );
      const statusParcela =
        totalPagoParcela >= valorParcela ? "Pago" : "Pendente";

      msg2 += `\n${idx + 1}ª parcela: R$ ${valorFormatado} - ${statusParcela}`;

      if (statusParcela === "Pendente") {
        msg2 += `\n   Vencimento: ${dataFormatada}`;
        msg2 += `\n   Valor: R$ ${valorFormatado}`;
      }
    });

    msg2 += `\n\nValor total: R$ ${formattedTotal}`;
  } else {
    msg2 += `\n\nValor: R$ ${formattedTotal}`;
  }
  msg2 += `\nForma de pagamento: ${paymentLabel}`;
  if (pending > 0)
    msg2 += `\nValor em aberto: R$ ${pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  msg2 += `\n\nSe já realizou o pagamento, por favor desconsidere. Em caso de dúvida, estamos à disposição.`;

  // SweetAlert2 Modal
  const { value: selectedMsg } = await Swal.fire({
    title: "Enviar mensagem por WhatsApp",
    html: `<div style='text-align:left;font-size:1em;'>
      <b>Escolha o modelo de mensagem:</b><br><br>
      <label style='display:block;margin-bottom:10px;'>
        <input type='radio' name='waMsg' value='msg1' checked>
        <span style='margin-left:8px;'>Agradecimento/Confirmação de entrega</span>
        <pre style='background:#f8f9fa;padding:8px;border-radius:5px;margin-top:4px;white-space:pre-wrap;font-size:0.95em;'>${msg1}</pre>
      </label>
      <label style='display:block;'>
        <input type='radio' name='waMsg' value='msg2'>
        <span style='margin-left:8px;'>Cobrança/Lembrete de pagamento</span>
        <pre style='background:#f8f9fa;padding:8px;border-radius:5px;margin-top:4px;white-space:pre-wrap;font-size:0.95em;'>${msg2}</pre>
      </label>
    </div>`,
    showCancelButton: true,
    confirmButtonText: "Abrir WhatsApp",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    preConfirm: () => {
      const selected = document.querySelector("input[name=waMsg]:checked");
      return selected ? selected.value : null;
    },
    width: 600,
  });

  if (!selectedMsg) return;

  // Formatar telefone
  let phoneNumber = customerPhone.replace(/\D/g, "");
  if (phoneNumber.length < 10) {
    Swal.fire("Erro", "Número de telefone inválido.", "error");
    return;
  }
  if (phoneNumber.length === 10) {
    phoneNumber = phoneNumber.substring(0, 2) + "9" + phoneNumber.substring(2);
  }

  // Mensagem escolhida
  const message = selectedMsg === "msg1" ? msg1 : msg2;
  const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
};

// Função para abrir o modal de pagamento
function openPaymentModal(orderId, orderTotal, pendingAmount) {
  // Usa SweetAlert2 para exibir o modal de pagamento
  const formatCurrency = (value) =>
    parseFloat(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  Swal.fire({
    title: "Registrar Pagamento",
    html: `
      <div class="form-group">
        <label>Valor Total do Pedido</label>
        <input type="text" class="form-control" value="R$ ${formatCurrency(orderTotal)}" disabled>
      </div>
      <div class="form-group">
        <label>Valor Pendente</label>
        <input type="text" class="form-control" value="R$ ${formatCurrency(pendingAmount)}" disabled>
      </div>
      ${
        window.lastOrderForPayment &&
        window.lastOrderForPayment.paymentAgreement
          ? `
      <div class="form-group">
        <label for="swalInstallmentSelect">Selecione a Parcela do Acordo *</label>
        <select id="swalInstallmentSelect" class="form-control" required>
          <option value="">Escolha a parcela...</option>
          ${window.lastOrderForPayment.paymentAgreement.dates
            .map((date, idx) => {
              // Format date to DD/MM/YYYY
              let brDate = "";
              if (date) {
                const d = new Date(date);
                if (!isNaN(d)) {
                  const day = String(d.getDate()).padStart(2, "0");
                  const month = String(d.getMonth() + 1).padStart(2, "0");
                  const year = d.getFullYear();
                  brDate = `${day}/${month}/${year}`;
                } else {
                  // fallback if not a valid date
                  brDate = date;
                }
              }
              const valor = window.lastOrderForPayment.paymentAgreement
                .amountPerInstallment
                ? `R$ ${formatCurrency(window.lastOrderForPayment.paymentAgreement.amountPerInstallment)}`
                : "";
              return `<option value="${idx}">${idx + 1}ª parcela - ${brDate} ${valor}</option>`;
            })
            .join("")}
        </select>
      </div>
      `
          : ""
      }
      <div class="form-group">
        <label for="swalPaymentAmount">Valor do Pagamento *</label>
        <div class="input-with-prefix">
          <span>R$</span>
          <input type="number" id="swalPaymentAmount" step="0.01" min="0.01" max="${pendingAmount}" class="form-control" placeholder="0,00" required>
        </div>
      </div>
      <div class="form-group">
        <label for="swalPaymentMethod">Forma de Pagamento *</label>
        <select id="swalPaymentMethod" class="form-control" required>
          <option value="">Selecione...</option>
          <option value="pix">PIX</option>
          <option value="credit">Cartão de Crédito</option>
          <option value="debit">Cartão de Débito</option>
          <option value="boleto">Boleto</option>
          <option value="cash">Dinheiro</option>
          <option value="bank_transfer">Transferência Bancária</option>
        </select>
      </div>
      <div class="form-group">
        <label for="swalPaymentDate">Data do Pagamento</label>
        <input type="date" id="swalPaymentDate" class="form-control" value="${new Date().toISOString().split("T")[0]}">
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="swalSetAsPaid" ${pendingAmount <= orderTotal ? "checked" : ""}>
          Marcar como totalmente pago
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Salvar Pagamento",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    customClass: {
      popup: "swal2-modal swal2-payment-modal",
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
    },
    preConfirm: () => {
      const amount = parseFloat(
        document.getElementById("swalPaymentAmount").value,
      );
      const method = document.getElementById("swalPaymentMethod").value;
      const date = document.getElementById("swalPaymentDate").value;
      const setAsPaid = document.getElementById("swalSetAsPaid").checked;
      let installmentIndex = null;
      if (
        window.lastOrderForPayment &&
        window.lastOrderForPayment.paymentAgreement
      ) {
        installmentIndex = document.getElementById(
          "swalInstallmentSelect",
        ).value;
        if (installmentIndex === "") {
          Swal.showValidationMessage("Selecione a parcela do acordo.");
          return false;
        }
        installmentIndex = parseInt(installmentIndex);
      }
      if (!amount || amount <= 0) {
        Swal.showValidationMessage(
          "Por favor, informe um valor válido para o pagamento.",
        );
        return false;
      }
      if (!method) {
        Swal.showValidationMessage(
          "Por favor, selecione uma forma de pagamento.",
        );
        return false;
      }
      return { amount, method, date, setAsPaid, installmentIndex };
    },
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      window.savePayment(
        orderId,
        result.value.amount,
        result.value.method,
        result.value.date,
        result.value.setAsPaid,
        result.value.installmentIndex,
      );
    }
  });

  setTimeout(() => {
    const amountInput = document.getElementById("swalPaymentAmount");
    if (amountInput) amountInput.focus();
  }, 150);
}

window.openPaymentModal = function (orderId, orderTotal, pendingAmount) {
  // Busca o pedido para saber se tem acordo e passar para o modal
  const orders = window.ordersCache || [];
  const order = orders.find((o) => o._id === orderId);
  window.lastOrderForPayment = order || null;
  try {
    return openPaymentModal.apply(this, [orderId, orderTotal, pendingAmount]);
  } catch (e) {
    alert("Erro ao abrir modal de pagamento. Veja o console.");
    console.error("openPaymentModal erro:", e);
  }
};

// Função para abrir o modal de acordo de pagamento
function openAgreementModal(orderId, isEdit = false) {
  // Buscar dados do pedido se for edição
  let agreementData = null;
  if (isEdit && window.ordersCache) {
    const order = window.ordersCache.find((o) => o._id === orderId);
    if (order && order.paymentAgreement) {
      agreementData = order.paymentAgreement;
    }
  }
  const today = new Date().toISOString().split("T")[0];

  Swal.fire({
    title: isEdit ? "Editar Acordo de Pagamento" : "Criar Acordo de Pagamento",
    html: `
      <div class="form-group">
        <label for="swalInstallments">Número de Parcelas</label>
        <select id="swalInstallments" class="form-control" required>
          ${[...Array(12)].map((_, i) => `<option value="${i + 1}"${agreementData && agreementData.installments === i + 1 ? " selected" : ""}>${i + 1}x${i === 0 ? " (À vista)" : ""}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Datas das Parcelas</label>
        <div id="swalScheduleInputs" style="display: flex; flex-direction: column; gap: 10px;"></div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Salvar Acordo",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    customClass: {
      popup: "swal2-modal swal2-agreement-modal",
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
    },
    didOpen: () => {
      const today = new Date().toISOString().split("T")[0];
      // Função para gerar inputs de data para cada parcela
      const updateScheduleInputs = () => {
        const installments = parseInt(
          document.getElementById("swalInstallments").value,
        );
        const container = document.getElementById("swalScheduleInputs");
        container.innerHTML = "";
        let lastDate = today;
        for (let i = 0; i < installments; i++) {
          let value = "";
          if (
            agreementData &&
            Array.isArray(agreementData.dates) &&
            agreementData.dates[i]
          ) {
            value = agreementData.dates[i];
          } else if (i === 0) {
            value = today;
          } else {
            // Sugere mês seguinte à anterior
            const prevInput =
              container.querySelectorAll("input[type=date]")[i - 1];
            let baseDate =
              prevInput && prevInput.value
                ? new Date(prevInput.value)
                : new Date(today);
            baseDate.setMonth(baseDate.getMonth() + 1);
            value = baseDate.toISOString().split("T")[0];
          }
          const label = document.createElement("label");
          label.innerText = `Parcela ${i + 1}`;
          label.style.fontWeight = "500";
          label.style.marginBottom = "2px";
          const input = document.createElement("input");
          input.type = "date";
          input.className = "form-control";
          input.required = true;
          input.min = today;
          input.value = value;
          input.id = `swalInstallmentDate${i + 1}`;
          container.appendChild(label);
          container.appendChild(input);
        }
      };
      document
        .getElementById("swalInstallments")
        .addEventListener("change", updateScheduleInputs);
      updateScheduleInputs();
    },
    preConfirm: () => {
      const installments = parseInt(
        document.getElementById("swalInstallments").value,
      );
      const dates = [];
      for (let i = 0; i < installments; i++) {
        const input = document.getElementById(`swalInstallmentDate${i + 1}`);
        if (!input || !input.value) {
          Swal.showValidationMessage(`Preencha a data da parcela ${i + 1}.`);
          return false;
        }
        dates.push(input.value);
      }
      return { installments, dates };
    },
  }).then(async (result) => {
    if (result.isConfirmed && result.value) {
      if (isEdit) {
        // Atualizar o acordo no Firestore
        try {
          const orderRef = doc(window.db, "orders", orderId);
          await updateDoc(orderRef, {
            paymentAgreement: {
              installments: parseInt(result.value.installments),
              dates: result.value.dates,
            },
            updatedAt: new Date().toISOString(),
          });
          await renderOrdersList();
          Swal.fire(
            "Acordo atualizado!",
            "O acordo de pagamento foi editado com sucesso.",
            "success",
          );
        } catch (err) {
          Swal.fire(
            "Erro",
            "Não foi possível atualizar o acordo. Tente novamente.",
            "error",
          );
        }
      } else {
        window.saveAgreement(
          orderId,
          result.value.installments,
          result.value.dates,
        );
      }
    }
  });
}

window.openAgreementModal = function (...args) {
  try {
    return openAgreementModal.apply(this, args);
  } catch (e) {
    alert("Erro ao abrir modal de acordo. Veja o console.");
    console.error("openAgreementModal erro:", e);
  }
};

// Função para salvar o acordo de pagamento
window.saveAgreement = async function (orderId, installments, dates) {
  try {
    // Compatibilidade: se não vierem por parâmetro, tenta pegar do DOM antigo
    if (!installments || !dates) {
      const domInstallments =
        document.getElementById("installments")?.value || 1;
      const domFirstPaymentDate =
        document.getElementById("firstPaymentDate")?.value;
      if (!domInstallments || !domFirstPaymentDate) {
        alert("Por favor, preencha todos os campos do acordo.");
        return;
      }
      installments = domInstallments;
      dates = [domFirstPaymentDate];
    }
    // Validação extra
    if (
      !orderId ||
      !installments ||
      !dates ||
      !Array.isArray(dates) ||
      dates.length === 0
    ) {
      alert("Por favor, preencha todos os campos do acordo.");
      return;
    }
    // Chama a função que salva o acordo, passando todas as datas
    await window.createPaymentAgreement(orderId, installments, dates);

    // Fechar o modal SweetAlert2 (se aberto)
    if (Swal.isVisible()) Swal.close();
    // Fechar o modal antigo se existir
    const modal = document.getElementById("agreementModal");
    if (modal) document.body.removeChild(modal);

    // Atualizar a lista de pedidos
    await renderOrdersList();

    // Mostrar mensagem de sucesso
    alert("Acordo de pagamento criado com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar acordo:", error);
    alert(
      "Ocorreu um erro ao criar o acordo de pagamento. Por favor, tente novamente.",
    );
  }
};

// Função para salvar um novo pagamento
window.savePayment = async function (
  orderId,
  amount,
  method,
  date,
  setAsPaid,
  installmentIndex,
) {
  try {
    // Permitir chamada tanto pelo SweetAlert2 quanto pelo DOM antigo (fallback)
    if (typeof amount === "undefined") {
      amount = parseFloat(document.getElementById("paymentAmount")?.value);
    }
    if (typeof method === "undefined") {
      method = document.getElementById("paymentMethod")?.value;
    }
    if (typeof date === "undefined") {
      date = document.getElementById("paymentDate")?.value;
    }
    if (typeof setAsPaid === "undefined") {
      setAsPaid = document.getElementById("setAsPaid")?.checked;
    }

    if (!amount || amount <= 0) {
      alert("Por favor, informe um valor válido para o pagamento.");
      return;
    }

    if (!method) {
      alert("Por favor, selecione uma forma de pagamento.");
      return;
    }

    // Obter dados atuais do pedido
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);
    const orderData = orderDoc.data();

    // Preparar atualização
    const payment = {
      amount,
      method,
      // Salva a data do pagamento exatamente como informada (YYYY-MM-DD)
      date: date,
      // Salva o momento do registro do pagamento (data/hora local completa)
      createdAt: new Date().toLocaleString("sv-SE", {
        timeZone: "America/Sao_Paulo",
      }),
    };

    if (typeof installmentIndex !== "undefined" && installmentIndex !== null) {
      payment.installmentIndex = installmentIndex;
    }

    const currentPayments = orderData.payments || [];
    const updatedPayments = [...currentPayments, payment];
    const totalPaid = updatedPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0,
    );

    // Determinar o novo status
    let paymentStatus = "Pendente";
    if (totalPaid >= (orderData.total || 0)) {
      paymentStatus = "Pago";
    } else if (totalPaid > 0) {
      paymentStatus = "Parcial";
    }

    // Atualizar o pedido
    await updateDoc(orderRef, {
      payments: updatedPayments,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    });

    // Fechar o modal
    const modal = document.getElementById("paymentModal");
    if (modal) document.body.removeChild(modal);

    // Recarregar a lista de pedidos
    await renderOrdersList();

    // Mostrar mensagem de sucesso
    alert("Pagamento registrado com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    alert(
      "Ocorreu um erro ao registrar o pagamento. Por favor, tente novamente.",
    );
  }
};

// Definição das funções de pedidos

window.StockModule.completeOrder = async function (orderId) {
  console.debug("[Pedidos] Clique em Concluído para orderId:", orderId);

  try {
    const orderRef = doc(window.db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists())
      return Swal.fire("Erro", "Pedido não encontrado!", "error");
    const order = orderSnap.data();
    if (order.status === "Concluído") return;
    await setDoc(orderRef, { status: "Concluído" }, { merge: true });
    Swal.fire(
      "Pedido concluído!",
      "O status do pedido foi atualizado para Concluído.",
      "success",
    );
    renderOrdersList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível atualizar o pedido.", "error");
    console.error("Erro ao consumir pedido:", e);
  }
};
window.StockModule.cancelOrder = async function (orderId) {
  console.debug("[Pedidos] Clique em Cancelar para orderId:", orderId);

  try {
    const orderRef = doc(window.db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists())
      return Swal.fire("Erro", "Pedido não encontrado!", "error");
    const order = orderSnap.data();
    if (order.status === "Concluído") {
      await Swal.fire(
        "Aviso",
        "Não é possível cancelar um pedido já concluído. Desfaça a conclusão antes de cancelar.",
        "info"
      );
      return;
    }
    if (order.status === "Cancelado") {
      await Swal.fire(
        "Aviso",
        "Este pedido já foi cancelado.",
        "info"
      );
      return;
    }
    // Retornar saldo dos produtos ao estoque
    if (Array.isArray(order.items)) {
      const batch = writeBatch(window.db);
      for (const item of order.items) {
        const prodRef = doc(window.db, "products", String(item.id));
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          const newQty = (prodData.quantity || 0) + (item.quantity || 0);
          batch.set(prodRef, { quantity: newQty }, { merge: true });
        }
      }
      await batch.commit();
    }
    await setDoc(orderRef, { status: "Cancelado" }, { merge: true });
    Swal.fire(
      "Pedido cancelado!",
      "O pedido foi cancelado e o estoque atualizado.",
      "success",
    );
    renderOrdersList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível cancelar o pedido.", "error");
    console.error("Erro ao cancelar pedido:", e);
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
    renderStockList();
    // Carregar dados da lista de espera
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
  // Carregar produtos atualizados do Firestore
  try {
    // Forçar leitura do servidor para evitar cache
    const querySnapshot = await getDocs(collection(window.db, "products"), {
      source: "server",
    });
    const products = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
        category: typeof data.category === "string" ? data.category : "", // fallback para garantir campo
      });
    });
    window.products = products;
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

  // Carregar dados da lista de espera
  const waitlist = JSON.parse(localStorage.getItem("waitlist") || "{}");

  // Iterar sobre os produtos
  window.products.forEach((product) => {
    const quantity = product.quantity || 0;
    const active = product.active !== false;
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
  ${product.description ? `<div class="product-description">${formatProductDescription(product.description, product.descUnderlineColor)}</div>` : ""}
  <div class="product-category-label">
    ${typeof product.category === "string" && product.category.trim() ? product.category : '<span style="color:#bbb;">Sem categoria</span>'}
  </div>
  <div class="offer-prices">
    <div style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 0.5em; gap: 0.2em;">
  <div>
    <span style="font-size:0.97em;color:#666;">Compra:</span>
    <span style="font-weight:600; color:#227a2a;">R$ ${(product.purchasePrice ?? 0).toFixed(2).replace(".", ",")}</span>
  </div>
  <div>
    <span style="font-size:0.97em;color:#666;">Lucro:</span>
    <span style="font-weight:600; color:${product.price - (product.purchasePrice ?? 0) > 0 ? "#1bc700" : "#c62828"};">
      R$ ${(product.price - (product.purchasePrice ?? 0)).toFixed(2).replace(".", ",")}
    </span>
    <span style="font-size:0.97em;color:#444; margin-left:0.5em;">
      (${product.purchasePrice > 0 ? Math.round(((product.price - product.purchasePrice) / product.purchasePrice) * 100) : 0}%)
    </span>
  </div>
  <div>
    <span style="font-size:0.97em;color:#666;">Lucro PIX:</span>
    <span style="font-weight:600; color:${product.pixPrice - (product.purchasePrice ?? 0) > 0 ? "#1bc700" : "#c62828"};">
      R$ ${product.pixPrice && product.purchasePrice !== undefined ? (product.pixPrice - product.purchasePrice).toFixed(2).replace(".", ",") : "0,00"}
    </span>
    <span style="font-size:0.97em;color:#444; margin-left:0.5em;">
      (${product.purchasePrice > 0 && product.pixPrice ? Math.round(((product.pixPrice - product.purchasePrice) / product.purchasePrice) * 100) : 0}%)
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
                  <div class="product-stock-bar-inner ${quantity <= 2 ? "critico" : ""}" style="width: ${Math.min((quantity / 20) * 100, 100)}%;" title="${quantity} unidades em estoque"></div>
                </div>
                ${
                  !active || quantity === 0
                    ? `<div class="stock-alert-wrapper"><span class="stock-alert unavailable"><i class='fas fa-ban'></i>Indisponível</span></div>`
                    : quantity <= 2
                      ? `<div class="stock-alert-wrapper"><span class="stock-alert low"><i class='fas fa-exclamation-triangle'></i>${quantity === 1 ? "Última unidade!" : "Apenas 2 unidades!"}</span></div>`
                      : ""
                }

        `;
    fragment.appendChild(stockItem);
  });

  // Adicionar fragmento ao DOM
  stockList.appendChild(fragment);

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
    // Verifica se a quantidade é válida
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
      <input id="productName" class="swal2-input" style="flex:1;" placeholder="Nome do produto" value="${product.name || ""}" required>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productDescription" style="min-width: 120px;">Descrição</label>
      <textarea id="productDescription" class="swal2-textarea" style="flex:1;" placeholder="Descrição">${product.description || ""}</textarea>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPurchasePrice" style="min-width: 120px;">Preço de Compra</label>
      <input id="productPurchasePrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço de Compra" min="0" step="0.01" value="${product.purchasePrice !== undefined && product.purchasePrice !== null && product.purchasePrice !== "" ? product.purchasePrice : 0}">
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productOldPrice" style="min-width: 120px;">Preço Antigo</label>
      <input id="productOldPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço Antigo" min="0" step="0.01" value="${product.oldPrice !== undefined ? product.oldPrice : ""}">
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPrice" style="min-width: 120px;">Preço Atual</label>
      <input id="productPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço Atual" min="0" step="0.01" value="${product.price}" required>
    </div>
    <div style="display: flex; align-items: center; gap: 0.7rem;">
      <label for="productPixPrice" style="min-width: 120px;">Preço PIX</label>
      <input id="productPixPrice" type="number" class="swal2-input" style="flex:1;" placeholder="Preço PIX" min="0" step="0.01" value="${product.pixPrice !== undefined ? product.pixPrice : ""}">
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
        purchasePrice: document.getElementById("productPurchasePrice").value
          ? parseFloat(document.getElementById("productPurchasePrice").value)
          : null,
        price: parseFloat(document.getElementById("productPrice").value),
        oldPrice: document.getElementById("productOldPrice").value
          ? parseFloat(document.getElementById("productOldPrice").value)
          : null,
        pixPrice: document.getElementById("productPixPrice").value
          ? parseFloat(document.getElementById("productPixPrice").value)
          : null,
        quantity: parseInt(document.getElementById("productQuantity").value),
        active: document.getElementById("productActive").checked,
      };
    },
  });

  if (formValues) {
    try {
      // Pegar valores diretamente do DOM
      const form = document.getElementById("editProductForm");
      if (!form) {
        throw new Error("Formulário não encontrado");
      }

      const productName = form.querySelector("#productName").value;
      const productDescription = form.querySelector(
        "#productDescription",
      ).value;
      const productPurchasePrice = form.querySelector(
        "#productPurchasePrice",
      ).value;
      const productPrice = form.querySelector("#productPrice").value;
      const productOldPrice = form.querySelector("#productOldPrice").value;
      const productPixPrice = form.querySelector("#productPixPrice").value;
      const productQuantity = form.querySelector("#productQuantity").value;
      const productActive = form.querySelector("#productActive").checked;
      const productCategory = form.querySelector("#productCategory")
        ? form.querySelector("#productCategory").value
        : "";

      // Garantir que os campos obrigatórios existam
      if (!productName || !productPrice || productQuantity === undefined) {
        throw new Error(
          "Campos obrigatórios faltando: nome, preço ou quantidade",
        );
      }

      // Converter valores numéricos
      const updatedProduct = {
        ...product,
        name: productName,
        description: productDescription,
        purchasePrice: productPurchasePrice
          ? parseFloat(productPurchasePrice)
          : null,
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
      },
    });
    try {
      // Excluir do Firestore
      await deleteDoc(doc(window.db, "products", String(productId)));
      deletedIds.add(String(productId));
      localStorage.removeItem("products");
      localStorage.removeItem("specialOffers");

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
        console.log(
          "Nenhuma entrada da lista de espera para marcar como órfã.",
        );
      }

      // Atualizar UI
      await renderStockList();
      await renderSpecialOffers();
      await renderWaitlistList();
      if (window.products && Array.isArray(window.products)) {
        const stillExists = window.products.some(
          (p) => String(p.id) === String(productId),
        );
        console.log(
          `Produto id ${productId} ainda existe após exclusão?`,
          stillExists,
        );
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
        parseFloat(
          Swal.getPopup().querySelector("#productPurchasePrice").value,
        ) || 0;
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
        title: "Adicionando produto...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
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
        showConfirmButton: false,
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
  } else {
    console.error(`Elemento ${tabName}Tab não encontrado`);
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

  // Renderizar conteúdo específico
  try {
    switch (tabName) {
      case "stock":
        console.log("Renderizando lista de estoque...");
        await renderStockList();
        break;
      case "specialOffers":
        console.log("Renderizando ofertas especiais...");
        await renderSpecialOffers();
        break;
      case "waitlist":
        console.log("Renderizando lista de espera...");
        await renderWaitlistList();
        break;
      case "orders":
        console.log("Renderizando lista de pedidos...");
        await renderOrdersList();
        break;
      case "metrics":
        console.log("Renderizando métricas de vendas...");
        if (typeof renderSalesMetrics === "function") {
          await renderSalesMetrics();
        } else {
          console.error("Função renderSalesMetrics não encontrada");
        }
        break;
    }
  } catch (error) {
    console.error(`Erro ao renderizar a aba ${tabName}:`, error);
  }
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
                    ${product.description ? `<div class="product-description" style="margin: 0.2em 0 0.5em 0;">${formatProductDescription(product.description, product.underlineColor || 'underline-primary')}</div>` : ""}
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
              <div class="product-stock-bar-inner ${quantity <= 2 ? "critico" : ""}" style="width: ${Math.min((quantity / 20) * 100, 100)}%;" title="${quantity} unidades em estoque"></div>
            </div>
            ${
              !active || quantity === 0
                ? `<div class="stock-alert-wrapper"><span class="stock-alert unavailable"><i class='fas fa-ban'></i>Indisponível</span></div>`
                : quantity <= 2
                  ? `<div class="stock-alert-wrapper"><span class="stock-alert low"><i class='fas fa-exclamation-triangle'></i>Estoque Baixo!</span></div>`
                  : ""
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
  console.debug("[Pedidos] Clique em Concluído para orderId:", orderId);
  try {
    const orderRef = doc(window.db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists())
      return Swal.fire("Erro", "Pedido não encontrado!", "error");
    const order = orderSnap.data();

    // Verifica se o pedido já está concluído ou cancelado
    if (order.status === "Concluído") {
      return Swal.fire(
        "Aviso",
        "Este pedido já foi marcado como Concluído.",
        "info",
      );
    }
    if (order.status === "Cancelado") {
      return Swal.fire(
        "Erro",
        "Não é possível marcar um pedido cancelado como Concluído.",
        "error",
      );
    }
    await setDoc(orderRef, { status: "Concluído" }, { merge: true });
    Swal.fire(
      "Pedido concluído!",
      "O status do pedido foi atualizado para Concluído.",
      "success",
    );
    renderOrdersList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível atualizar o pedido.", "error");
    console.error("Erro ao consumir pedido:", e);
  }
}

async function cancelOrder(orderId) {
  console.debug("[Pedidos] Clique em Cancelar para orderId:", orderId);
  try {
    const orderRef = doc(window.db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists())
      return Swal.fire("Erro", "Pedido não encontrado!", "error");

    const order = orderSnap.data();

    // Verifica se o pedido já está concluído ou cancelado
    
    if (order.status === "Cancelado") {
      return Swal.fire("Aviso", "Este pedido já foi cancelado.", "info");
    }

    // Retornar saldo dos produtos ao estoque
    if (Array.isArray(order.items)) {
      const batch = writeBatch(window.db);
      for (const item of order.items) {
        const prodRef = doc(window.db, "products", String(item.productId));
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          const newQty = (prodData.quantity || 0) + (item.quantity || 0);
          batch.set(prodRef, { quantity: newQty }, { merge: true });
        }
      }
      await batch.commit();
    }

    await setDoc(orderRef, { status: "Cancelado" }, { merge: true });
    Swal.fire(
      "Pedido cancelado!",
      "O pedido foi cancelado e o estoque atualizado.",
      "success",
    );
    renderOrdersList();
  } catch (e) {
    Swal.fire("Erro", "Não foi possível cancelar o pedido.", "error");
    console.error("Erro ao cancelar pedido:", e);
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
  cancelOrder,
});

// Salva todas as alterações pendentes
export async function savePendingChanges() {
  const quantityChanges = Object.keys(pendingChanges).length;
  const offerChanges = Object.keys(pendingSpecialOffers).length;
  const totalChanges = quantityChanges + offerChanges;

  if (totalChanges === 0) {
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
  const modal = document.querySelector(".modal-content");
  if (!modal) {
    console.error("Modal não encontrado");
    return;
  }
  modal.closest(".modal").classList.remove("active");
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

    // Configurar listeners para os filtros de pedidos
    const searchInput = document.getElementById("searchTerm");
    const dateFilter = document.getElementById("filterDate");
    const statusFilter = document.getElementById("filterStatus");
    const applyFiltersBtn = document.getElementById("applyFilters");
    const clearFiltersBtn = document.getElementById("clearFilters");

    if (searchInput) {
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") applyFilters();
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener("change", applyFilters);
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", applyFilters);
    }

    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", applyFilters);
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearFilters);
    }

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

    // Adiciona event listener para o botão de métricas
    const metricsTabBtn = document.getElementById("metricsTabBtn");
    if (metricsTabBtn) {
      metricsTabBtn.addEventListener("click", () => showTab("metrics"));
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

    // Toggle collapsible summary
    function setupSummaryToggle() {
      const summaryHeader = document.getElementById("summaryHeader");
      const summaryCollapsible = summaryHeader?.parentElement;

      if (summaryHeader && summaryCollapsible) {
        // Start collapsed
        summaryCollapsible.classList.add("collapsed");

        summaryHeader.addEventListener("click", () => {
          summaryCollapsible.classList.toggle("collapsed");
          const icon = summaryHeader.querySelector(".toggle-icon");
          if (icon) {
            icon.textContent = summaryCollapsible.classList.contains(
              "collapsed",
            )
              ? "+"
              : "-";
          }
        });
      }
    }

    // Inicialização
    document.addEventListener("DOMContentLoaded", async function () {
      // Setup summary toggle
      setupSummaryToggle();
    });

    // Configuração dos eventos de clique nos botões de ação dos pedidos
    document.addEventListener("click", async (e) => {
      const target = e.target.closest(".order-action-btn");
      if (!target) return;

      const action = target.dataset.action;
      const orderId = target.dataset.orderId;

      if (action === "complete") {
        await completeOrder(orderId);
      } else if (action === "cancel") {
        await cancelOrder(orderId);
      } else if (action === "delete") {
        await window.deleteOrder(orderId);
      }
    });

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

// Função para atualizar a lista manualmente
const refreshStock = async () => {
  const refreshBtn = document.getElementById("refreshStock");
  const originalText = refreshBtn ? refreshBtn.innerHTML : "";

  try {
    // Mostrar loading
    if (refreshBtn) {
      refreshBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
      refreshBtn.disabled = true;
    }

    // Forçar atualização dos produtos do Firestore
    const productsCollection = collection(window.db, "products");
    const snapshot = await getDocs(productsCollection);

    // Atualizar lista de produtos local
    window.products = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      window.products.push({
        id: doc.id,
        ...data,
      });
    });

    // Re-renderizar a aba atual
    const activeTab = document
      .querySelector(".tab-button.active")
      ?.getAttribute("data-tab");
    if (activeTab) {
      switch (activeTab) {
        case "stock":
          await renderStockList();
          break;
        case "specialOffers":
          await renderSpecialOffers();
          break;
        case "waitlist":
          await renderWaitlistList();
          break;
        case "orders":
          await renderOrdersList();
          break;
      }
    }

    // Feedback visual de sucesso
    if (refreshBtn) {
      const originalColor = refreshBtn.style.backgroundColor;
      refreshBtn.style.backgroundColor = "#4CAF50";
      refreshBtn.innerHTML = '<i class="fas fa-check"></i> Atualizado!';

      // Resetar após 2 segundos
      setTimeout(() => {
        if (refreshBtn) {
          refreshBtn.innerHTML = originalText;
          refreshBtn.style.backgroundColor = originalColor;
          refreshBtn.disabled = false;
        }
      }, 2000);
    }

    return true;
  } catch (error) {
    console.error("Erro ao atualizar lista:", error);

    // Feedback visual de erro
    if (refreshBtn) {
      const originalColor = refreshBtn.style.backgroundColor;
      refreshBtn.style.backgroundColor = "#f44336";
      refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro';

      // Resetar após 2 segundos
      setTimeout(() => {
        if (refreshBtn) {
          refreshBtn.innerHTML = originalText;
          refreshBtn.style.backgroundColor = originalColor;
          refreshBtn.disabled = false;
        }
      }, 2000);
    }

    return false;
  }
};

// Garante que StockModule existe sem sobrescrever funções existentes
if (!window.StockModule) {
  window.StockModule = {};
}

// Função para remover um item de brinde
async function removeGiftItem(orderId, itemId, isGiftNote = false) {
  try {
    const result = await Swal.fire({
      title: "Remover item",
      text: "Tem certeza que deseja remover este item?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ff3860",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Pedido não encontrado");
    }

    const order = { id: orderSnap.id, ...orderSnap.data() };
    const batch = writeBatch(db);
    let itemToRemove;

    if (isGiftNote) {
      // Remove nota de brinde
      const giftIndex = (order.gifts || []).findIndex(
        (_, idx) => idx.toString() === itemId,
      );
      if (giftIndex === -1) throw new Error("Nota de brinde não encontrada");

      const updatedGifts = [...(order.gifts || [])];
      updatedGifts.splice(giftIndex, 1);

      batch.update(orderRef, {
        gifts: updatedGifts,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Remove item de brinde e restaura o estoque
      const itemIndex = (order.items || []).findIndex(
        (item) =>
          (item.id && item.id.toString() === itemId) ||
          (item._id && item._id.toString() === itemId),
      );

      if (itemIndex === -1) throw new Error("Item de brinde não encontrado");

      itemToRemove = order.items[itemIndex];
      const updatedItems = [...order.items];
      updatedItems.splice(itemIndex, 1);

      // Restaura o estoque
      if (itemToRemove && itemToRemove.productId) {
        const productRef = doc(
          db,
          "products",
          itemToRemove.productId.toString(),
        );
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();
          const currentQuantity = Number(productData.quantity || 0);
          const quantityToRestore = Number(itemToRemove.quantity || 1);

          batch.update(productRef, {
            quantity: currentQuantity + quantityToRestore,
            stock: currentQuantity + quantityToRestore,
            updatedAt: new Date().toISOString(),
          });

          // Atualiza o cache local
          if (window.stockProducts) {
            const productIndex = window.stockProducts.findIndex(
              (p) =>
                p &&
                p.id &&
                p.id.toString() === itemToRemove.productId.toString(),
            );

            if (productIndex !== -1) {
              window.stockProducts[productIndex].quantity += quantityToRestore;
              window.stockProducts[productIndex].stock += quantityToRestore;
            }
          }
        }
      }

      // Atualiza o pedido com os itens restantes
      batch.update(orderRef, {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    renderOrdersList();

    Swal.fire({
      title: "Sucesso!",
      text: "Item removido com sucesso!",
      icon: "success",
      confirmButtonColor: "#4caf50",
      timer: 2000,
      timerProgressBar: true,
    });
  } catch (error) {
    console.error("Erro ao remover item:", error);
    Swal.fire({
      title: "Erro!",
      text: "Não foi possível remover o item: " + error.message,
      icon: "error",
      confirmButtonColor: "#f44336",
    });
  }
}

// Garante que o objeto StockModule existe SEM sobrescrever funções já anexadas
if (typeof window !== 'undefined') {
  window.StockModule = window.StockModule || {};
}

// Exponha todas as funções públicas de uma vez, sem sobrescrever o objeto
Object.assign(window.StockModule, {
  renderOrdersList,
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
  refreshStock,
  removeGiftItem, // garante que a função está disponível
  completeOrder,
  cancelOrder,
  openPaymentModal,
  openAgreementModal,
  saveAgreement,
  savePayment,
});
