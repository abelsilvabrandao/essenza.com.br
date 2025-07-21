// Função para renderizar o painel de métricas de vendas
async function renderSalesMetrics() {
  try {
    // Carrega os pedidos do cache ou do servidor
    const orders = window.ordersCache || [];
    
    // 1. Cálculos básicos
    const totalPedidos = orders.length;
    const pedidosPagos = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status.includes('pago') || status.includes('paid') || 
             (o.paymentStatus && (o.paymentStatus.toLowerCase().includes('pago') || o.paymentStatus.toLowerCase().includes('paid')));
    }).length;
    const pedidosPendentes = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      const paymentStatus = (o.paymentStatus || '').toLowerCase();
      const isPago = status.includes('pago') || status.includes('paid') ||
                     paymentStatus.includes('pago') || paymentStatus.includes('paid');
      const isCancelado = status.includes('cancelado') || status.includes('cancelled') ||
                          paymentStatus.includes('cancelado') || paymentStatus.includes('cancelled');
      return !isPago && !isCancelado;
    }).length;
    const pedidosCancelados = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status.includes('cancelado') || status.includes('cancelled');
    }).length;
    
    // 2. Cálculos financeiros
    const totalBruto = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calcula o total pago somando os pagamentos concluídos
    const totalPago = orders.reduce((sum, order) => {
      if (!order.payments || !Array.isArray(order.payments)) {
        console.log('Order without payments array:', order.orderNumber);
        return sum;
      }
      
      console.log('Processing order:', order.orderNumber, 'with payments:', order.payments);
      
      const pagamentosConcluidos = order.payments.filter(p => {
        if (!p || p.amount <= 0) return false;
        
        // Get status from payment or order level
        let status = String(p.status || order.paymentStatus || '').toLowerCase()
          .normalize('NFD').replace(/[^\w\s]/gi, '')
          .trim();
          
        // Check for common completed statuses
        const isConcluido = 
          status.includes('concluido') || 
          status.includes('pago') || 
          status.includes('paid') ||
          status.includes('completed') ||
          status.includes('aprovado') ||
          status === 'success';
          
        console.log('Payment status check:', {
          paymentId: p.id || 'no-id',
          originalStatus: p.status,
          orderStatus: order.paymentStatus,
          normalizedStatus: status,
          isConcluido: isConcluido,
          amount: p.amount,
          method: p.method
        });
        
        return isConcluido;
      });
      
      console.log('Pagamentos concluídos para ordem', order.orderNumber, ':', pagamentosConcluidos);
      
      const totalPedido = pagamentosConcluidos.reduce((total, pagamento) => {
        const amount = parseFloat(pagamento.amount) || 0;
        console.log('Adding payment amount:', amount, 'from payment:', pagamento);
        return total + amount;
      }, 0);
      
      console.log('Total para ordem', order.orderNumber, ':', totalPedido);
      
      return sum + totalPedido;
    }, 0);
    
    console.log('Total pago calculado:', totalPago);
    
    // 3. Cálculos por forma de pagamento
    const pagamentos = {
      pix: 0,
      cartao: 0,
      acordo: 0,
      dinheiro: 0,
      outros: 0
    };
    
    orders.forEach(order => {
      const valor = order.total || 0;
      const metodo = (order.paymentMethod || '').toLowerCase();
      
      // Processar pagamentos do array de pagamentos, se existir
      if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
        order.payments.forEach(payment => {
          if (!payment || !payment.amount) return;
          
          const paymentMethod = String(payment.method || order.paymentMethod || '').toLowerCase()
            .normalize('NFD').replace(/[^\w\s]/gi, '')
            .trim();
            
          const paymentAmount = parseFloat(payment.amount) || 0;
          
          console.log('Processing payment:', {
            order: order.orderNumber,
            method: paymentMethod,
            amount: paymentAmount,
            status: payment.status
          });
          
          if (paymentMethod === 'pix' || paymentMethod.includes('pix')) {
            pagamentos.pix += paymentAmount;
          } else if (paymentMethod === 'credit' || 
                    paymentMethod.includes('cartao') || 
                    paymentMethod.includes('credito') || 
                    paymentMethod.includes('card')) {
            pagamentos.cartao += paymentAmount;
          } else if (paymentMethod.includes('acordo') || order.paymentAgreement) {
            pagamentos.acordo += paymentAmount;
          } else if (paymentMethod.includes('dinheiro') || paymentMethod.includes('money')) {
            pagamentos.dinheiro += paymentAmount;
          } else if (paymentMethod) {
            // Se chegou até aqui e tem um método, conta como 'outros'
            pagamentos.outros += paymentAmount;
          }
        });
      }
      // Se não houver array de pagamentos, usar o método de pagamento principal
      else {
        if (metodo === 'pix' || metodo.includes('pix')) {
          pagamentos.pix += valor;
        } else if (metodo === 'credit' || metodo === 'cartão de crédito' || 
                  metodo === 'cartao de credito' || metodo === 'cartão' || 
                  metodo === 'cartao' || metodo.includes('crédito') || 
                  metodo.includes('credito') || metodo.includes('cartão') || 
                  metodo.includes('cartao')) {
          pagamentos.cartao += valor;
        } else if (metodo.includes('acordo') || order.paymentAgreement) {
          pagamentos.acordo += valor;
        } else if (metodo.includes('dinheiro') || metodo === 'money') {
          pagamentos.dinheiro += valor;
        }
      }
    });
    
    // 4. Cálculos de clientes
    const clientes = {};
    orders.forEach(order => {
      // Verifica se temos informações do cliente
      const customerName = order.customerName || 'Cliente não identificado';
      const customerEmail = order.customerEmail || '';
      const customerPhone = order.customerPhone || '';
      
      // Cria um ID único para o cliente usando nome, email ou telefone
      const clienteId = customerEmail || customerPhone || customerName;
      
      if (!clientes[clienteId]) {
        clientes[clienteId] = {
          nome: customerName,
          email: customerEmail,
          telefone: customerPhone,
          total: 0,
          pago: 0,
          pendente: 0,
          pedidos: 0,
          pedidosDetalhados: [], // Novo campo para armazenar detalhes dos pedidos
          formasPagamento: [] // Novo campo para armazenar formas de pagamento
        };
      }
      
      // Atualiza o total gasto
      const valorPedido = parseFloat(order.total) || 0;
      clientes[clienteId].total += valorPedido;
      clientes[clienteId].pedidos += 1;

      // Adiciona detalhes do pedido
      clientes[clienteId].pedidosDetalhados.push({
        numero: order.orderNumber || '',
        itens: Array.isArray(order.items) ? order.items.map(item => ({
          nome: item.name,
          quantidade: item.quantity || 1,
          isGift: !!item.isGift,
          price: item.price,
          pixPrice: item.pixPrice
        })) : []
      });

      // Adiciona forma de pagamento (com status)
      let formasPedido = [];
      let pedidoPago = false;
      // Determina se o pedido está pago
      if (order.payments && Array.isArray(order.payments)) {
        pedidoPago = order.payments.some(p => {
          if (!p || !p.amount) return false;
          let statusPag = String(p.status || order.paymentStatus || '').toLowerCase()
            .normalize('NFD').replace(/[^\w\s]/g, '').trim();
          return statusPag.includes('concluido') || statusPag.includes('pago') || statusPag.includes('paid') || statusPag.includes('completed') || statusPag.includes('aprovado') || statusPag === 'success';
        });
        order.payments.forEach(p => {
          if (!p || !p.method) return;
          let metodo = String(p.method || '').toLowerCase();
          let nomeMetodo = '';
          if (metodo.includes('pix')) nomeMetodo = 'Pix';
          else if (metodo.includes('cartao') || metodo.includes('credito') || metodo.includes('card') || metodo === 'credit') nomeMetodo = 'Cartão de Crédito';
          else if (metodo.includes('acordo') || metodo.includes('agreement') || order.paymentAgreement) nomeMetodo = 'Acordo';
          else if (metodo.includes('dinheiro') || metodo.includes('money')) nomeMetodo = 'Dinheiro';
          else if (metodo) nomeMetodo = metodo.charAt(0).toUpperCase() + metodo.slice(1);
          if (nomeMetodo) formasPedido.push({ nome: nomeMetodo, pago: pedidoPago });
        });
      } else if (order.paymentMethod) {
        let metodo = String(order.paymentMethod).toLowerCase();
        let nomeMetodo = '';
        if (metodo.includes('pix')) nomeMetodo = 'Pix';
        else if (metodo.includes('cartao') || metodo.includes('credito') || metodo.includes('card') || metodo === 'credit') nomeMetodo = 'Cartão de Crédito';
        else if (metodo.includes('acordo') || metodo.includes('agreement') || order.paymentAgreement) nomeMetodo = 'Acordo';
        else if (metodo.includes('dinheiro') || metodo.includes('money')) nomeMetodo = 'Dinheiro';
        else nomeMetodo = metodo.charAt(0).toUpperCase() + metodo.slice(1);
        // Considera pago se status do pedido for pago
        const status = (order.paymentStatus || '').toLowerCase();
        pedidoPago = status.includes('pago') || status.includes('paid') || status.includes('concluido') || status.includes('completed') || status.includes('aprovado') || status === 'success';
        if (nomeMetodo) formasPedido.push({ nome: nomeMetodo, pago: pedidoPago });
      }
      // Adiciona 'Acordo' explicitamente se houver paymentAgreement
      if (order.paymentAgreement) {
        const jaTemAcordo = formasPedido.some(fp => fp.nome === 'Acordo');
        if (!jaTemAcordo) {
          // Status de pagamento do pedido
          let pagoAcordo = false;
          if (order.payments && Array.isArray(order.payments)) {
            pagoAcordo = order.payments.some(p => {
              if (!p || !p.amount) return false;
              let statusPag = String(p.status || order.paymentStatus || '').toLowerCase()
                .normalize('NFD').replace(/[^\w\s]/g, '').trim();
              return statusPag.includes('concluido') || statusPag.includes('pago') || statusPag.includes('paid') || statusPag.includes('completed') || statusPag.includes('aprovado') || statusPag === 'success';
            });
          } else {
            const status = (order.paymentStatus || '').toLowerCase();
            pagoAcordo = status.includes('pago') || status.includes('paid') || status.includes('concluido') || status.includes('completed') || status.includes('aprovado') || status === 'success';
          }
          formasPedido.push({ nome: 'Acordo', pago: pagoAcordo });
        }
      }
      formasPedido.forEach(fp => {
        if (!fp.nome) return;
        // Só adiciona se não existir igual (nome+status)
        if (!clientes[clienteId].formasPagamento.some(f => f.nome === fp.nome && f.pago === fp.pago)) {
          clientes[clienteId].formasPagamento.push(fp);
        }
      });

      // Corrige cálculo do valor realmente pago e pendente por cliente
      let valorPagoNoPedido = 0;
      if (order.payments && Array.isArray(order.payments)) {
        order.payments.forEach(p => {
          if (!p || !p.amount) return;
          
          let statusPag = String(p.status || order.paymentStatus || '').toLowerCase()
            .normalize('NFD').replace(/[^\w\s]/g, '').trim();
          const isPago = statusPag.includes('concluido') || statusPag.includes('pago') || statusPag.includes('paid') || statusPag.includes('completed') || statusPag.includes('aprovado') || statusPag === 'success' || statusPag.includes('parcial');
          if (isPago) {
            valorPagoNoPedido += parseFloat(p.amount) || 0;
          }
        });
      }
      // Se não houver array de pagamentos, mas o status do pedido for pago, considera tudo pago
      else {
        const status = (order.paymentStatus || '').toLowerCase();
        if (status.includes('pago') || status.includes('paid')) {
          valorPagoNoPedido = valorPedido;
        }
      }
      clientes[clienteId].pago += valorPagoNoPedido;
      clientes[clienteId].pendente += Math.max(0, valorPedido - valorPagoNoPedido);

    });
    
    // 5. Ordena clientes por valor total gasto
    const topClientes = Object.values(clientes)
      .sort((a, b) => b.total - a.total); // Todos os clientes ordenados por valor total
    
    // 6. Cálculo de produtos mais vendidos
    const produtos = {};
    orders.forEach(order => {
      if (!order.items) return;
      
      order.items.forEach(item => {
        if (item.isGift) return; // Ignora brindes
        if (!produtos[item.id || item.name]) {
          produtos[item.id || item.name] = {
            nome: item.name,
            quantidade: 0,
            total: 0
          };
        }
        produtos[item.id || item.name].quantidade += item.quantity || 0;
        // Usa o valor do item registrado no pedido
        produtos[item.id || item.name].total += (item.price || 0) * (item.quantity || 0);
      });
    });
    
    // Ordena todos os produtos por quantidade vendida (do maior para o menor)
    const produtosMaisVendidos = Object.values(produtos)
      .sort((a, b) => b.quantidade - a.quantidade);
    
    // Renderiza o HTML
    const container = document.getElementById('metricsContainer');
    if (!container) return;
    
    // Adiciona evento de clique para mostrar/ocultar detalhes de pagamento
    setTimeout(() => {
      const clientRows = container.querySelectorAll('.client-row');
      clientRows.forEach(row => {
        row.addEventListener('click', function() {
          this.classList.toggle('active');
        });
      });
    }, 100);
    
    container.innerHTML = `
      <div class="metrics-grid">
        <!-- Cartões de Resumo -->
        <div class="metric-card">
          <h3>📦 Total de Pedidos</h3>
          <div class="metric-value">${totalPedidos}</div>
          <div class="metric-description">pedidos registrados</div>
        </div>
        
        <div class="metric-card">
          <h3>💰 Total Vendido (Bruto)</h3>
          <div class="metric-value">R$ ${totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        
        <div class="metric-card">
          <h3>💵 Total Pago</h3>
          <div class="metric-value">R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div class="metric-description">Valor total recebido</div>
        </div>
        
        <div class="side-by-side-container">
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div class="metric-card">
              <h3>✅ Pedidos Pagos</h3>
              <div class="metric-value">${pedidosPagos}</div>
              <div class="metric-description">${((pedidosPagos / totalPedidos) * 100 || 0).toFixed(1)}% do total</div>
            </div>
            <div class="metric-card">
              <h3>⏳ Pedidos Pendentes</h3>
              <div class="metric-value">${pedidosPendentes}</div>
              <div class="metric-description">${((pedidosPendentes / totalPedidos) * 100 || 0).toFixed(1)}% do total</div>
            </div>
          </div>
          <div class="metric-card" style="height:100%; display:flex; flex-direction:column;">
            <h3>💳 Formas de Pagamento</h3>
            <div class="payment-methods" style="flex:1;">
              <div class="payment-method">
                <span>PIX:</span>
                <span>R$ ${pagamentos.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="payment-method">
                <span>Cartão de Crédito:</span>
                <span>R$ ${pagamentos.cartao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="payment-method">
                <span>Acordo:</span>
                <span>R$ ${pagamentos.acordo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="payment-method">
                <span>Dinheiro:</span>
                <span>R$ ${pagamentos.dinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="payment-method">
                <span>Outros:</span>
                <span>R$ ${pagamentos.outros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stack container for Top Clientes and Produtos Vendidos -->
        <div class="stacked-metrics-container">
          <!-- Top Clientes -->
          <div class="metric-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0;">👥 Top Clientes</h3>
              <span class="badge" style="background: #4a6cf7; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                ${topClientes.length} clientes
              </span>
            </div>
            <div class="clients-header" style="display: grid; grid-template-columns: 1.7fr 1.3fr 1fr 1fr; padding: 8px 15px; background: #f0f2f5; font-weight: 500; border-radius: 6px; margin-bottom: 8px; font-size: 0.9em;">
              <span>Cliente</span>
              <span style="text-align: center;">Pedidos</span>
              <span style="text-align: right;">Pago</span>
              <span style="text-align: right; color: #d32f2f;">Pendente</span>
            </div>
            <div class="top-list scrollable" style="max-height: 600px; overflow-y: auto;">
              ${topClientes.length > 0 ? 
                topClientes.map((cliente, index) => `
                  <div class="client-row" style="display: grid; grid-template-columns: 1.7fr 1.3fr 1fr 1fr; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee; font-size: 0.92em; cursor: pointer; transition: background-color 0.2s;">
                    <div class="client-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; font-size: 0.95em;">
                      ${index + 1}. ${cliente.nome}
                      ${cliente.email ? `<div style="font-size: 0.85em; color: #666; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class='fa fa-envelope' style='margin-right:4px;'></i>${cliente.email}</div>` : ''}
                      ${cliente.telefone ? `<div style="font-size: 0.85em; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class='fa fa-phone' style='margin-right:4px;'></i>${cliente.telefone}</div>` : ''}
                      ${cliente.formasPagamento.length > 0 ? `<div style="font-size: 0.83em; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cliente.formasPagamento.map(fp => {
  let icon = '';
  if (fp.nome === 'Pix') icon = '<i class="fa fa-qrcode" style="margin-right:3px;"></i>';
  else if (fp.nome === 'Cartão de Crédito') icon = '<i class="fa fa-credit-card" style="margin-right:3px;"></i>';
  else if (fp.nome === 'Dinheiro') icon = '<i class="fa fa-money-bill-wave" style="margin-right:3px;"></i>';
  else if (fp.nome === 'Acordo') icon = '<i class="fa fa-handshake" style="margin-right:3px;"></i>';
  else icon = '<i class="fa fa-question-circle" style="margin-right:3px;"></i>';
  return `<span class='badge-pagamento ${fp.pago ? "pago" : "nao-pago"}'>${icon}${fp.nome}</span>`;
}).join(' ')}</div>` : ''}
                    </div>
                    <div class="client-orders" style="text-align: left; font-weight: 500; font-size: 0.95em; min-width: 220px;">
                      ${cliente.pedidosDetalhados.map(pedido => `
                        <div style="margin-bottom: 6px;">
                          <span style="font-weight: 600; color: #4a6cf7;">#${pedido.numero}</span>
                          <div style="font-size: 0.92em; color: #444; margin-top: 2px;">
                            ${pedido.itens.map(item => {
  let valor = item.price;
  if (pedido.metodoPagamento && pedido.metodoPagamento.toLowerCase().includes('pix') && item.pixPrice !== undefined) {
    valor = item.pixPrice;
  }
  return `<div>${item.nome} <span style='color:#888;'>(x${item.quantidade})</span> - R$${(valor !== undefined ? Number(valor).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00')}${item.isGift ? " <span class='badge-gift'>Brinde</span>" : ''}</div>`;
}).join('')}

                          </div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="client-total" style="text-align: right; font-weight: 600; color: #2e7d32; font-size: 0.95em; padding-right: 10px;">
                      R$ ${cliente.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div class="client-pending" style="text-align: right; font-weight: 600; color: #d32f2f; font-size: 0.95em; padding-right: 10px;">
                      R$ ${cliente.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div class="payment-details" style="grid-column: 1 / -1; background: #f8f9fa; margin: 8px -15px -10px; padding: 10px 15px; border-radius: 0 0 6px 6px; display: none; font-size: 0.9em;">
                      <div style="display: flex; justify-content: space-between; color: #555; font-size: 0.9em; padding-top: 5px; margin-bottom: 10px;">
                        <span>Ticket Médio:</span>
                        <span>R$ ${(cliente.total / cliente.pedidos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                `).join('')
                : '<div style="padding: 15px; text-align: center; color: #666;">Nenhum cliente encontrado</div>'
              }
              ${topClientes.length > 0 ? `
                <div style="display: grid; grid-template-columns: 1.7fr 1.3fr 1fr 1fr; align-items: center; padding: 12px 15px; background: #f8f9fa; border-top: 2px solid #e0e0e0; font-weight: 600; font-size: 0.95em;">
                  <div>Total</div>
                  <div style="text-align: center;">${topClientes.reduce((sum, c) => sum + c.pedidos, 0).toLocaleString('pt-BR')}</div>
                  <div style="text-align: right; color: #2e7d32; padding-right: 10px;">
                    R$ ${topClientes.reduce((sum, c) => sum + c.pago, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style="text-align: right; color: #d32f2f; padding-right: 10px;">
                    R$ ${topClientes.reduce((sum, c) => sum + c.pendente, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Produtos Vendidos -->
          <div class="metric-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0;">🏆 Produtos Vendidos</h3>
              <span class="badge" style="background: #4a6cf7; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                ${produtosMaisVendidos.length} itens
              </span>
            </div>
            <div class="product-list-header" style="display: grid; grid-template-columns: 30px 1.5fr 1fr 1fr; padding: 8px 15px; background: #f0f2f5; font-weight: 500; border-radius: 6px; margin-bottom: 8px; font-size: 0.9em;">
              <span>#</span>
              <span>Produto</span>
              <span style="text-align: right;">Qtd</span>
              <span style="text-align: right;">Total</span>
            </div>
            <div class="top-list scrollable" style="max-height: 500px; overflow-y: auto;">
              ${produtosMaisVendidos.length > 0 ? 
                produtosMaisVendidos.map((produto, index) => `
                  <div class="product-row" style="display: grid; grid-template-columns: 30px 1.5fr 1fr 1fr; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee; font-size: 0.95em;">
                    <span class="rank" style="color: #666; font-weight: 500;">${index + 1}</span>
                    <span class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px;">
                      ${produto.nome}
                    </span>
                    <span class="quantity" style="text-align: right; font-weight: 500;">
                      ${produto.quantidade} un
                    </span>
                    <span class="total" style="text-align: right; font-weight: 500; color: #2e7d32;">
                      R$ ${produto.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                `).join('')
                : '<div style="padding: 15px; text-align: center; color: #666;">Nenhum produto vendido</div>'
              }
            </div>
            ${produtosMaisVendidos.length > 0 ? `
              <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #eee; font-size: 0.95em; text-align: right;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Total de itens vendidos:</span>
                  <span style="font-weight: 500;">
                    ${produtosMaisVendidos.reduce((sum, p) => sum + p.quantidade, 0).toLocaleString('pt-BR')} un
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.1em;">
                  <span>Valor total:</span>
                  <span style="font-weight: 700; color: #2e7d32;">
                    R$ ${produtosMaisVendidos.reduce((sum, p) => sum + p.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <style>
        .stacked-metrics-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          grid-column: 1 / -1;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        
        /* Layout for side-by-side sections */
        .side-by-side-container {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
        }
        
        @media (max-width: 1024px) {
          .side-by-side-container {
            grid-template-columns: 1fr;
          }
        }
        
        .metric-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .metric-card.span-2 {
          grid-column: span 2;
        }
        
        .metric-card h3 {
          margin-top: 0;
          color: #444;
          font-size: 1.1em;
        }
        
        .metric-value {
          font-size: 2em;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .metric-description {
          color: #666;
          font-size: 0.9em;
        }
        
        .payment-methods {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        
        .payment-method {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .clients-header {
          display: grid;
          grid-template-columns: 2.5fr 0.8fr 1fr 1fr;
          padding: 10px 15px;
          background: #f0f2f5;
          font-weight: bold;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        
        .top-list.scrollable {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 5px;
        }
        
        .client-row {
          display: grid;
          grid-template-columns: 2.5fr 0.8fr 1fr 1fr;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .badge-gift {
          display: inline-block;
          background: #43a047;
          color: #fff;
          font-size: 0.78em;
          font-weight: 600;
          padding: 1px 8px;
          border-radius: 10px;
          margin-left: 6px;
          vertical-align: middle;
        }
        .badge-pagamento {
          display: inline-block;
          font-size: 0.78em;
          font-weight: 600;
          padding: 1px 8px;
          border-radius: 10px;
          margin-right: 5px;
          vertical-align: middle;
        }
        .badge-pagamento.pago {
          background: #43a047;
          color: #fff;
        }
        .badge-pagamento.nao-pago {
          background: #d32f2f;
          color: #fff;
        }
        
        .client-row:hover {
          background-color: #f8f9fa;
        }
        
        .client-name {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 10px;
        }
        
        .client-orders {
          text-align: center;
          color: #6c757d;
        }
        
        .client-total {
          text-align: right;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .payment-details {
          grid-column: 1 / -1;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #e0e0e0;
          display: none;
        }
        
        .client-row.active .payment-details {
          display: block;
        }
        
        .payment-amount {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 0.9em;
        }
        
        .payment-amount.paid {
          color: #28a745;
        }
        
        .payment-amount.pending {
          color: #ffc107;
        }
        
        .no-data {
          text-align: center;
          color: #6c757d;
          padding: 20px;
          font-style: italic;
        }
      </style>
    `;
    
  } catch (error) {
    console.error('Erro ao carregar métricas:', error);
    const container = document.getElementById('metricsContainer');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <p>Ocorreu um erro ao carregar as métricas. Por favor, tente novamente.</p>
          <button onclick="renderSalesMetrics()" class="btn btn-primary">Tentar novamente</button>
        </div>
      `;
    }
  }
}

// Adiciona a função ao escopo global
window.renderSalesMetrics = renderSalesMetrics;
