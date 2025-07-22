// stock-movements.js
// Renderiza entradas e saídas de estoque na interface
import { fetchStockEntries } from './stock-entries.js';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

let lastMovementsData = { entries: [], saidas: [] };

export async function renderStockMovements(filters = null) {
  // Garantir que window.products está carregado
  if (!window.products || !Array.isArray(window.products) || !window.products.length) {
    if (window.StockModule && typeof window.StockModule.refreshStock === 'function') {
      await window.StockModule.refreshStock();
    }
  }
  const container = document.getElementById('stockMovementsContent');
  if (!container) return;
  container.innerHTML = `<div class="loading" style="text-align:center;padding:2em;">Carregando movimentos...</div>`;

  // Entradas
  const entries = await fetchStockEntries();

  // Saídas: garantir ordersCache populado
  let orders = window.ordersCache;
  if (!orders || !orders.length) {
    // Tenta buscar pedidos diretamente do Firestore se necessário
    try {
      const snapshot = await window.db ? window.getDocs(window.collection(window.db, "orders")) : [];
      orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        orders.push({ ...data, _id: doc.id });
      });
      window.ordersCache = orders;
    } catch (e) { orders = []; }
  }
  let saidas = [];
  orders.forEach(order => {
    // Mostrar apenas pedidos concluídos
    if ((order.status || '').toLowerCase() !== 'concluído') return;
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        saidas.push({
          date: order.createdAt || order.date || order.timestamp || '',
          client: order.customerName || order.customer?.name || '',
          productId: item.productId || item.id,
          productName: item.name,
          quantity: item.quantity,
          orderId: order._id || order.id || '',
          orderNumber: order.orderNumber || '',
        });
      });
    }
  });

  // Aplicar filtros se fornecidos
  if (filters) {
    if (filters.startDate) {
      saidas = saidas.filter(s => s.date && (new Date(s.date) >= new Date(filters.startDate)));
    }
    if (filters.endDate) {
      saidas = saidas.filter(s => s.date && (new Date(s.date) <= new Date(filters.endDate)));
    }
    if (filters.product) {
      const prod = filters.product.trim().toLowerCase();
      saidas = saidas.filter(s =>
        (s.productName && s.productName.toLowerCase().includes(prod)) ||
        (s.productId && String(s.productId).toLowerCase().includes(prod))
      );
    }
    if (filters.client) {
      const cli = filters.client.trim().toLowerCase();
      saidas = saidas.filter(s => s.client && s.client.toLowerCase().includes(cli));
    }
  }

  // Salva dados para exportação
  lastMovementsData = { entries, saidas };

  // Renderização
  let html = `<h3 style="margin-top:0">Entradas de Estoque</h3>`;
  if (entries.length === 0) {
    html += `<div style="color:#888;margin-bottom:1.5em;">Nenhuma entrada registrada.</div>`;
  } else {
    html += `<table class="dashboard-table" style="width:100%;margin-bottom:2em;">
      <thead><tr>
        <th>Data</th><th>Fornecedor</th><th>Código</th><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th><th>Ação</th>
      </tr></thead><tbody>`;
    entries.forEach((entry, entryIdx) => {
      entry.products.forEach((prod, prodIdx) => {
        // Buscar descrição do produto
        let desc = '';
        if (window.products && Array.isArray(window.products)) {
          const found = window.products.find(p => String(p.id) === String(prod.productId));
          desc = found ? found.name : '';
        }
        html += `<tr>
          <td>${formatDateCell(entry.date || entry.createdAt, true)}</td>
          <td>${entry.supplier||'-'}</td>
          <td>${prod.productId}</td>
          <td>${desc}</td>
          <td>${prod.quantity}</td>
          <td>R$ ${Number(prod.unitPrice).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
          <td>R$ ${(Number(prod.unitPrice) * Number(prod.quantity)).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
          <td><button class="btn btn-danger btn-sm delete-stock-entry" data-entry-idx="${entryIdx}" title="Deletar entrada"><i class="fas fa-trash"></i></button></td>
        </tr>`;
      });
    });
    html += `</tbody></table>`;
  }

  html += `<h3 style="margin-top:2em">Saídas de Estoque</h3>`;
  if (saidas.length === 0) {
    html += `<div style="color:#888;margin-bottom:1.5em;">Nenhuma saída registrada.</div>`;
  } else {
    html += `<table class="dashboard-table" style="width:100%;margin-bottom:2em;">
      <thead><tr>
        <th>Data</th><th>Cliente</th><th>Código</th><th>Produto</th><th>Qtd</th><th>Pedido</th>
      </tr></thead><tbody>`;
    saidas.forEach(s => {
      // Data no formato DD/MM/AAAA
      let dataFormatada = '';
      if (s.date) {
        const d = new Date(s.date.seconds ? s.date.seconds * 1000 : s.date);
        dataFormatada = d.toLocaleDateString('pt-BR');
      }
      // Número do pedido
      let pedidoNum = s.orderNumber || s.orderId || '-';
      html += `<tr>
        <td>${dataFormatada}</td>
        <td>${s.client||'-'}</td>
        <td>${s.productId||'-'}</td>
        <td>${s.productName||s.productId}</td>
        <td>${s.quantity}</td>
        <td>${pedidoNum}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }
  container.innerHTML = html;

  // Handler de exclusão de entrada
  const deleteBtns = container.querySelectorAll('.delete-stock-entry');
  deleteBtns.forEach(btn => {
    btn.onclick = async function() {
      const entryIdx = this.getAttribute('data-entry-idx');
      const entry = entries[entryIdx];
      if (!entry) return;
      const result = await Swal.fire({
        title: 'Excluir entrada?',
        text: 'Esta ação irá remover a entrada e abater as quantidades do estoque. Deseja continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ff3860',
      });
      if (!result.isConfirmed) return;
      try {
        // Estornar estoque
        const batch = writeBatch(window.db);
        for (const prod of entry.products) {
          const prodRef = doc(window.db, 'products', String(prod.productId));
          const prodSnap = await getDoc(prodRef);
          if (!prodSnap.exists()) continue;
          const prodData = prodSnap.data();
          const newQty = (parseInt(prodData.quantity)||0) - (parseInt(prod.quantity)||0);
          if (batch) {
            batch.update(prodRef, { quantity: newQty >= 0 ? newQty : 0, updatedAt: new Date().toISOString() });
          } else {
            await updateDoc(prodRef, { quantity: newQty >= 0 ? newQty : 0, updatedAt: new Date().toISOString() });
          }
        }
        // Deletar entrada
        if (batch) {
          const entryRef = doc(window.db, 'stockEntries', entry.id);
          batch.delete(entryRef);
          await batch.commit();
        } else {
          const entryRef = doc(window.db, 'stockEntries', entry.id);
          await deleteDoc(entryRef);
        }
        Swal.fire({ icon:'success', title:'Entrada excluída!', text:'Estoque revertido com sucesso.', timer:1800 });
        if (window.StockModule.refreshStock) await window.StockModule.refreshStock();
        await renderStockMovements();
      } catch (e) {
        Swal.fire({ icon:'error', title:'Erro', text:'Erro ao excluir entrada: '+e.message });
      }
    };
  });
}

// Se for entradas, use formato dd/mm/aaaa (param true)
function formatDateCell(val, brFormat = false) {
  if (!val) return '';
  if (typeof val === 'string') {
    // YYYY-MM-DD ou ISO
    if (brFormat) {
      const d = new Date(val);
      return d.toLocaleDateString('pt-BR');
    }
    return val.slice(0,10);
  }
  if (val.seconds) {
    // Firestore Timestamp
    const d = new Date(val.seconds * 1000);
    if (brFormat) return d.toLocaleDateString('pt-BR');
    return d.toISOString().slice(0,10);
  }
  if (val instanceof Date) {
    if (brFormat) return val.toLocaleDateString('pt-BR');
    return val.toISOString().slice(0,10);
  }
  try {
    const d = new Date(val);
    if (brFormat) return d.toLocaleDateString('pt-BR');
    return d.toISOString().slice(0,10);
  } catch {
    return '';
  }
}


// Handlers de filtro e exportação
if (typeof window._stockMovementsFiltersInit === 'undefined') {
  window._stockMovementsFiltersInit = true;
  document.addEventListener('DOMContentLoaded', () => {
    const applyBtn = document.getElementById('applyStockMovementsFilters');
    const clearBtn = document.getElementById('clearStockMovementsFilters');
    const exportBtn = document.getElementById('exportStockMovementsXlsx');
    if (applyBtn) {
      applyBtn.onclick = async () => {
        const filters = {
          startDate: document.getElementById('stockFilterStart').value,
          endDate: document.getElementById('stockFilterEnd').value,
          product: document.getElementById('stockFilterProduct').value,
          client: document.getElementById('stockFilterClient').value
        };
        await renderStockMovements(filters);
      };
    }
    if (clearBtn) {
      clearBtn.onclick = async () => {
        document.getElementById('stockFilterStart').value = '';
        document.getElementById('stockFilterEnd').value = '';
        document.getElementById('stockFilterProduct').value = '';
        document.getElementById('stockFilterClient').value = '';
        await renderStockMovements();
      };
    }
    if (exportBtn) {
      exportBtn.onclick = () => {
        if (!window.XLSX) {
          alert('SheetJS não carregado!');
          return;
        }
        // Exportar entradas e saídas em abas separadas
        const wb = window.XLSX.utils.book_new();
        // Entradas
        const entriesSheet = window.XLSX.utils.json_to_sheet(lastMovementsData.entries.flatMap(e => e.products.map(prod => {
          let desc = '';
          if (window.products && Array.isArray(window.products)) {
            const found = window.products.find(p => String(p.id) === String(prod.productId));
            desc = found ? found.name : '';
          }
          return {
            Data: formatDateCell(e.date || e.createdAt, true),
            Fornecedor: e.supplier||'-',
            Código: prod.productId,
            Descrição: desc,
            Qtd: prod.quantity,
            'Preço Unit.': Number(prod.unitPrice).toLocaleString('pt-BR',{minimumFractionDigits:2}),
            Subtotal: (Number(prod.unitPrice) * Number(prod.quantity)).toLocaleString('pt-BR',{minimumFractionDigits:2})
          }
        })));
        window.XLSX.utils.book_append_sheet(wb, entriesSheet, 'Entradas');
        // Saídas
        const saidasSheet = window.XLSX.utils.json_to_sheet(lastMovementsData.saidas.map(s => ({
          Data: formatDateCell(s.date),
          Cliente: s.client||'-',
          Produto: s.productName||s.productId,
          Qtd: s.quantity,
          Pedido: s.orderId||'-'
        })));
        window.XLSX.utils.book_append_sheet(wb, saidasSheet, 'Saidas');
        window.XLSX.writeFile(wb, 'movimentos-estoque.xlsx');
      };
    }
  });
}

