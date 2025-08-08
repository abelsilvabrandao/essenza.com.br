// Removido import do SDK modular. Usando apenas compat (window.db ou firebase.firestore()).

// Renderiza os pedidos do cliente logado na área "Meus Pedidos"
export async function renderPedidosConta() {
  const section = document.getElementById('sectionPedidos');
  if (!section) return;
  const box = section.querySelector('.account-data-box');
  if (!box) return;

  let essenzaUser = null;
  try {
    essenzaUser = JSON.parse(localStorage.getItem('essenzaUser'));
  } catch {}

  // Buscar identificadores possíveis
  const cpf = essenzaUser && essenzaUser.cpf ? String(essenzaUser.cpf).replace(/\D/g, '') : null;
  const uid = essenzaUser && essenzaUser.uid ? essenzaUser.uid : (window.currentUser && window.currentUser.uid ? window.currentUser.uid : null);
  const email = essenzaUser && essenzaUser.email ? essenzaUser.email : (window.currentUser && window.currentUser.email ? window.currentUser.email : null);

  if (!cpf && !uid && !email) {
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Faça login para visualizar seus pedidos.</span>';
    return;
  }

  const db = window.db || firebase.firestore();
  const pedidosCol = db.collection('orders');
  box.innerHTML = `<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:220px;width:100%;padding:40px 0 20px 0;'>
  <img src='img/logo.png' alt='Logo' style='width:64px;height:64px;animation:spinLogoY 1.2s linear infinite;display:block;margin-bottom:18px;' />
  <span style='color:#7b1fa2;font-size:1.22em;font-weight:700;margin-top:0.5em;letter-spacing:0.04em;text-shadow:0 2px 8px #e1bee7;'>Carregando Pedidos...</span>
  <style>@keyframes spinLogoY{0%{transform:rotateY(0deg);}100%{transform:rotateY(360deg);}}</style>
</div>`;

  try {
    // Monta todas as queries possíveis
    const queries = [];
    if (cpf) queries.push(pedidosCol.where('clienteCpf', '==', cpf).get());
    if (uid) queries.push(pedidosCol.where('clienteUid', '==', uid).get());
    if (email) queries.push(pedidosCol.where('clienteEmail', '==', email).get());
    // Executa todas em paralelo
    const results = await Promise.all(queries);
    // Unifica os pedidos por id (evita duplicidade)
    const pedidosMap = new Map();
    results.forEach(snap => {
      snap.forEach(doc => {
        if (!pedidosMap.has(doc.id)) pedidosMap.set(doc.id, doc.data());
      });
    });
    if (pedidosMap.size === 0) {
      box.innerHTML = '<span style="color:#888;font-size:1.13em;">Nenhum pedido encontrado para seu perfil.</span>';
      return;
    }
    // Ordena por data de criação (mais recente primeiro)
    const pedidosArray = Array.from(pedidosMap.values()).sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.seconds - a.createdAt.seconds;
    });
    let html = '<div class="pedidos-cards-container" style="display:flex;flex-direction:column;gap:1.3em;width:100%;">';
    pedidosArray.forEach(pedido => {
      // Forma de pagamento
      let formaPagamento = '-';
      if (pedido.installments === 1) {
        if (pedido.pixKey || pedido.chavePix) {
          formaPagamento = 'PIX';
        } else {
          formaPagamento = 'Cartão (à vista)';
        }
      } else if (pedido.installments > 1) {
        formaPagamento = `Cartão (${pedido.installments}x)`;
      } else {
        formaPagamento = '-';
      }
      // Status do pedido (para o cliente)
      let statusPedido = (pedido.status && pedido.status.toLowerCase() === 'concluído') ? 'Entregue' : (pedido.status || '-');
      // Status de pagamento
      let statusPagamento = 'Pendente';
      const method = (pedido.paymentMethod || pedido.formaPagamento || '').toLowerCase();
      if (pedido.paymentAgreement && Array.isArray(pedido.paymentAgreement.dates) && pedido.paymentAgreement.installments) {
         // Lógica para acordo/parcelamento (igual admin)
         const agr = pedido.paymentAgreement;
         const totalPedido = Number(pedido.total || 0);
         const qtdParcelas = Number(agr.installments);
         const valorParcela = qtdParcelas > 0 ? Math.round((totalPedido / qtdParcelas) * 100) / 100 : 0;
         const pagamentos = Array.isArray(pedido.payments) ? pedido.payments : [];
         let totalParcelasPagas = 0;
         let totalParcelasParciais = 0;
         if (qtdParcelas > 0 && Array.isArray(agr.dates)) {
           agr.dates.forEach((dt, idx) => {
             const parcelaPagamentos = pagamentos.filter(p => p.installmentIndex === idx);
             const totalPagoParcela = parcelaPagamentos.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
             if (totalPagoParcela >= valorParcela) totalParcelasPagas++;
             else if (totalPagoParcela > 0) totalParcelasParciais++;
           });
         }
         if (totalParcelasPagas === qtdParcelas) statusPagamento = 'Pago';
         else if (totalParcelasPagas > 0 || totalParcelasParciais > 0) statusPagamento = 'Parcial';
         else statusPagamento = 'Pendente';
      } else if (
        (method.includes('crédito') || method.includes('credit') || method.includes('débito') || method.includes('debit') || method.includes('pix') || method.includes('boleto') || method.includes('dinheiro') || method.includes('cash'))
        && pedido.status === 'Concluído'
      ) {
        statusPagamento = 'Pago';
      } else {
        statusPagamento = 'Pendente';
      }
      // Parcelas
      let parcelasHtml = '-';
      if (pedido.installments > 1) {
        // Se não há controle de pagas, exibe 0/total
        parcelasHtml = `0/${pedido.installments} pagas`;
      } else if (pedido.installments === 1) {
        parcelasHtml = statusPagamento === 'Pago' ? '1/1 paga' : '0/1 paga';
      }
      // Botão cancelar
      let acaoHtml = '-';
      if (pedido.status && pedido.status.toLowerCase() !== 'concluído') {
        acaoHtml = `<button class="btn btn-danger btn-sm" onclick="cancelarPedido('${pedido.id || pedido.orderNumber}')">Cancelar</button>`;
      }
      // Chave PIX
      let pixHtml = '-';
      if (pedido.pixKey || pedido.chavePix) {
        const chave = pedido.pixKey || pedido.chavePix;
        pixHtml = `<span style="font-family:monospace;">${chave}</span> <button class="btn btn-outline-secondary btn-sm" onclick="copiarChavePix('${chave}')">Copiar</button>`;
      }
      // Itens (nome + quantidade)
      let itensHtml = '-';
      if (Array.isArray(pedido.items)) {
        itensHtml = pedido.items.map(i => `${i.name || i.nome || '-'} (${i.quantity || i.quantidade || 1})`).join(', ');
      }
      html += `<div class="pedido-card" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;padding:1.25em 1.5em;display:flex;flex-direction:column;gap:0.7em;max-width:600px;width:100%;margin:auto;">
        <div class="order-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1em;flex-wrap:wrap;margin-bottom:0.3rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;min-width:0;width:100%;gap:10px;">
  <span style="background:#f4f6fb;color:#223;border:1px solid #e0e4ee;font-size:1.07em;font-weight:800;padding:0.38em 1.2em;display:inline-block;border-radius:1em;letter-spacing:0.02em;max-width:100%;word-break:break-all;box-shadow:0 1px 4px #0001;">#${(pedido.orderNumber||pedido.id||'-').toString().padStart(4,'0')}</span>
  <span style="color:#888;font-size:0.98em;display:flex;align-items:center;gap:0.33em;min-width:110px;text-align:right;"><i class='fa fa-calendar' style='opacity:0.82;'></i> ${pedido.createdAt ? (() => {
    let d = pedido.createdAt.seconds ? new Date(pedido.createdAt.seconds*1000) : new Date(pedido.createdAt);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  })() : '-'}</span>
</div>
<div style="display:flex;flex-direction:row;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px;">
  <span style="display:inline-flex;align-items:center;padding:0.3em 1.1em;border-radius:1.3em;font-weight:700;font-size:0.98em;gap:0.38em;line-height:1.2;${pedido.status==='Concluído'?'background:#e6f9e6;color:#227a2a;border:1.5px solid #a0e7b2;':pedido.status==='Cancelado'?'background:#fdeaea;color:#c00;border:1.5px solid #ffb3b3;':'background:#fffbe6;color:#b38b00;border:1.5px solid #ffe082;'}margin-bottom:2px;">
    <i class="fa ${pedido.status==='Concluído'?'fa-truck':pedido.status==='Cancelado'?'fa-times-circle':'fa-box-open'}" style="opacity:0.85;"></i> ${pedido.status==='Concluído'?'Entregue':pedido.status==='Cancelado'?'Cancelado':'Pendente Entrega'}
  </span>
  <span style="display:inline-flex;align-items:center;padding:0.3em 1.1em;border-radius:1.3em;font-weight:700;font-size:0.98em;gap:0.38em;line-height:1.2;${statusPagamento==='Pago'?'background:#e3f7e9;color:#0d6832;border:1.5px solid #a3e6b8;':statusPagamento==='Parcial'?'background:#fffbe6;color:#d97706;border:1.5px solid #ffeeba;':'background:#fdeaea;color:#b91c1c;border:1.5px solid #fecaca;'}">
    <i class="fa fa-credit-card" style="opacity:0.85;"></i> ${statusPagamento}
  </span>
</div>
</div>
        <div style="display:flex;flex-direction:column;gap:3px 0;margin-bottom:5px;">
  <!-- Forma de pagamento -->
  <div style="display:flex;align-items:center;gap:8px;color:#555;font-size:1.02em;">
    ${(() => {
      // Preferir paymentMethod, fallback para formaPagamento
      const method = (pedido.paymentMethod || pedido.formaPagamento || '').toLowerCase();
      let icon = 'fa-question-circle';
      let label = 'Não informado';
      if (method === 'agreement' || pedido.paymentAgreement) {
        icon = 'fa-handshake';
        label = 'Acordo/Parcelamento';
      } else if (method.includes('pix')) {
        icon = 'fa-bolt';
        label = 'PIX';
      } else if (method.includes('crédito') || method.includes('credit')) {
        icon = 'fa-credit-card';
        label = 'Cartão de Crédito' + (pedido.installments > 1 ? ` (${pedido.installments}x)` : '');
      } else if (method.includes('débito') || method.includes('debit')) {
        icon = 'fa-credit-card';
        label = 'Cartão de Débito';
      } else if (method.includes('dinheiro') || method.includes('cash')) {
        icon = 'fa-money-bill-wave';
        label = 'Dinheiro';
      } else if (method.includes('boleto')) {
        icon = 'fa-barcode';
        label = 'Boleto Bancário';
      } else if (method.includes('transfer')) {
        icon = 'fa-university';
        label = 'Transferência Bancária';
      }
      return `<i class=\"fas ${icon}\" style=\"font-size:1.13em;opacity:0.74;\"></i><span style=\"color:#555;font-weight:500;\">${label}</span>`;
    })()}
  </div>
  <!-- Resumo do pagamento -->
  <div style="display:flex;align-items:center;gap:8px;color:#555;font-size:1.02em;">
    <i class="fas ${pedido.installments > 1 ? 'fa-layer-group' : 'fa-money-bill-wave'}" style="font-size:1.13em;opacity:0.74;"></i>
    <span style="color:#555;">
      ${pedido.installments > 1 ? `Parcelamento: ${pedido.installments}x de R$ ${(pedido.total/pedido.installments).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})}` : `Pagamento à vista: R$ ${(pedido.total||0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})}`}
    </span>
  </div>
</div>


            <div style="margin:18px 0 0 0;padding:15px 12px 12px 12px;background:#f8fafd;border-radius:10px;box-shadow:0 1px 4px #0001;">
              <b style='color:#7b1fa2;font-size:1.08em;'><i class="fa fa-shopping-bag" style="margin-right:6px;"></i>Itens do Pedido</b>
              ${(function(){
                let cupomCode = '';
                if (pedido.cupom && typeof pedido.cupom === 'object') cupomCode = pedido.cupom.code;
                else if (pedido.coupon && typeof pedido.coupon === 'object') cupomCode = pedido.coupon.code;
                else if (typeof pedido.cupom === 'string') cupomCode = pedido.cupom;
                else if (typeof pedido.coupon === 'string') cupomCode = pedido.coupon;
                let desconto = pedido.couponDiscount || (pedido.coupon && pedido.coupon.value) || pedido.valorDesconto || pedido.discountValue || '';
                if (!cupomCode && !desconto) return '';
                return `<span style="display:inline-flex;align-items:center;gap:0.5em;background:#f4f6fb;padding:0.32em 0.95em;border-radius:1.1em;font-size:0.99em;font-weight:600;color:#7b1fa2;box-shadow:0 1px 4px #0001;margin-left:10px;">
                  ${cupomCode ? `<i class='fa fa-tag' style='color:#e65100;margin-right:2px;'></i> ${cupomCode}` : ''}
                  ${cupomCode && desconto ? '<span style="color:#aaa;font-size:1.1em;">|</span>' : ''}
                  ${desconto ? `<span style='color:#c2185b;font-weight:700;'>- R$ ${Number(desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>` : ''}
                </span>`;
              })()}
              <div class="pedido-itens-scroll" style="width:100%;overflow-x:auto;">
                <table style="width:100%;margin-top:7px;background:none;border-collapse:collapse;font-size:0.99em;">
                  <thead>
                    <tr style="background:#f3e5f5;color:#7b1fa2;">
                      <th style="padding:11px 14px 11px 14px;font-weight:700;min-width:180px;width:45%;">PRODUTO</th>
                      <th style="padding:11px 8px;text-align:center;font-weight:700;min-width:45px;width:8%;">QTD</th>
                      <th style="padding:11px 8px;text-align:right;font-weight:700;min-width:90px;width:18%;">UNITÁRIO</th>
                      <th style="padding:11px 8px;text-align:right;font-weight:700;min-width:90px;width:18%;">SUBTOTAL</th>
                    </tr>
                  </thead>
    <tbody>
                  ${(Array.isArray(pedido.items) && pedido.items.length > 0) ? pedido.items.map(item => {
                    const img = item.image || item.img || item.foto || '';
                    const nome = item.name || item.nome || '-';
                    const qtd = item.quantity || item.quantidade || 1;
                    const price = item.price || 0;
                    const oldPrice = item.oldPrice || item.precoAntigo || null;
                    const pixPrice = item.pixPrice || item.precoPix || null;
                    let destaque = price;
                    let destaqueStyle = 'color:#555;font-weight:700;';
                    if ((pedido.formaPagamento || '').toLowerCase().includes('pix') && pixPrice) {
                      destaque = pixPrice;
                      destaqueStyle = 'color:#1c9c3c;font-weight:800;';
                    }
                    const subtotal = destaque * qtd;
                    return `<tr>
                      <td style="padding:7px 8px;vertical-align:middle;">
                        ${img ? `<img src="${img}" alt="${nome}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;border:1px solid #eee;margin-right:9px;vertical-align:middle;">` : ''}
                        <span>${nome}</span>
                      </td>
                      <td style="padding:7px 8px;vertical-align:middle;text-align:center;">${qtd}</td>
                       <td style="padding:7px 8px;vertical-align:middle;text-align:right;min-width:120px;">
                         ${(() => {
                           const method = (pedido.paymentMethod || pedido.formaPagamento || '').toLowerCase();
                           // Se for acordo ou cartão, mostrar apenas price
                           if (method === 'agreement' || pedido.paymentAgreement || method.includes('crédito') || method.includes('credit')) {
                             return `<div style='color:#555;font-weight:700;font-size:1.08em;'>R$ ${Number(price).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>`;
                           }
                           // Se for pix, mostrar apenas pixPrice
                           if (method.includes('pix') && pixPrice) {
                             return `<div style='color:#1c9c3c;font-weight:800;font-size:1.08em;'>R$ ${Number(pixPrice).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>`;
                           }
                           // fallback: se não identificado, mostra apenas price
                           return `<div style='color:#555;font-weight:700;font-size:1.08em;'>R$ ${Number(price).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>`;
                         })()}
                       </td>
                      <td style="padding:7px 8px;vertical-align:middle;font-weight:700;text-align:right;">R$ ${(subtotal).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    </tr>`;
                  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#aaa;">-</td></tr>'}
                </tbody>
                <tfoot>
                  ${(() => {
                    let cupomCode = '';
                    if (pedido.cupom && typeof pedido.cupom === 'object') cupomCode = pedido.cupom.code;
                    else if (pedido.coupon && typeof pedido.coupon === 'object') cupomCode = pedido.coupon.code;
                    else if (typeof pedido.cupom === 'string') cupomCode = pedido.cupom;
                    else if (typeof pedido.coupon === 'string') cupomCode = pedido.coupon;
                    let desconto = pedido.couponDiscount || (pedido.coupon && pedido.coupon.value) || pedido.valorDesconto || pedido.discountValue || 0;
                    if (desconto && Number(desconto) > 0) {
                      return `<tr>
                        <td colspan="3" style="text-align:right;padding:7px 8px;color:#c22;font-weight:600;">Desconto${cupomCode ? ` (${cupomCode})` : ''}:</td>
                        <td style="padding:7px 8px;color:#c22;font-weight:700;">- R$ ${Number(desconto).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      </tr>`;
                    }
                    return '';
                  })()}
                  <tr>
                    <td colspan="3" style="text-align:right;padding:9px 8px 6px 0;font-size:1.08em;font-weight:700;color:#222;">Total do Pedido:</td>
                    <td style="padding:9px 8px 6px 0;font-size:1.12em;font-weight:800;color:#1a2;">R$ ${(pedido.total || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
              <!-- Detalhes do acordo/parcelamento dentro do mesmo container -->
              ${(function(){
                if (pedido.paymentAgreement && Array.isArray(pedido.paymentAgreement.installments) && pedido.paymentAgreement.installments.length > 0) {
                  const parcelas = pedido.paymentAgreement.installments;
                  const totalAcordo = parcelas.reduce((soma, p) => soma + (Number(p.valor) || 0), 0);
                  const totalPagoAcordo = parcelas.reduce((soma, p) => soma + (Number(p.totalPagoParcela) || 0), 0);
                  const saldoPendente = Math.max(0, totalAcordo - totalPagoAcordo);
                  return `<div style='margin-top:18px;'>
                    <b style='color:#7b1fa2;font-size:1.08em;'><i class="fa fa-handshake" style="margin-right:6px;"></i>Detalhes do Acordo/Parcelamento</b>
                    <div class="pedido-itens-scroll" style="width:100%;overflow-x:auto;">
                      <table style="width:100%;margin-top:7px;background:none;border-collapse:collapse;font-size:0.99em;">
                        <thead>
                          <tr style="background:#f3e5f5;color:#7b1fa2;">
                            <th style="padding: 8px 6px; text-align:left;">Parcela</th>
                            <th style="padding: 8px 6px; text-align:center;">Vencimento</th>
                            <th style="padding: 8px 6px; text-align:right;">Valor</th>
                            <th style="padding: 8px 6px; text-align:right;">Pago</th>
                            <th style="padding: 8px 6px; text-align:right;">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${parcelas.map((p, idx) => {
                            const dataFormatada = p.vencimento ? new Date(p.vencimento).toLocaleDateString('pt-BR') : '-';
                            let linhasParciais = '';
                            if (Array.isArray(p.pagamentos) && p.pagamentos.length > 0) {
                              linhasParciais = p.pagamentos.map(pg => `<tr><td colspan='5' style='padding:2px 8px 2px 36px;font-size:0.97em;color:#888;'>Pagamento: R$ ${Number(pg.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})} em ${new Date(pg.data).toLocaleDateString('pt-BR')}</td></tr>`).join('');
                            }
                            return `<tr>
                              <td style="padding: 2px 6px;">${p.numero || (idx+1)} / ${parcelas.length}</td>
                              <td style="padding: 2px 6px; text-align:center;">${dataFormatada}</td>
                              <td style="padding: 2px 6px; text-align:right;">R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style="padding: 2px 6px; text-align:right;">R$ ${Number(p.totalPagoParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td style="padding: 2px 6px; text-align:right;">
                                <span style="padding: 2px 10px; border-radius: 10px; font-size: 0.9em; background: ${p.cor}; color: ${p.txt}; border: 1px solid ${p.borda};">
                                  ${p.status}
                                </span>
                              </td>
                            </tr>${linhasParciais}`;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                     <div style="margin-top:13px;text-align:right;font-size:1.08em;font-weight:700;color:#c2185b;background:#fffbe6;padding:8px 14px;border-radius:7px;display:inline-block;">
                       Saldo pendente: R$ ${saldoPendente.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                     </div>
                  </div>`;
                }
                return '';
              })()}
          
        </div>
        
  
  <!-- Detalhes do acordo/parcelamento -->
  ${(() => {
    if (pedido.paymentAgreement && Array.isArray(pedido.paymentAgreement.dates) && pedido.paymentAgreement.installments) {
       const agr = pedido.paymentAgreement;
       const totalPedido = Number(pedido.total || 0);
       const qtdParcelas = Number(agr.installments);
       const valorParcela = qtdParcelas > 0 ? Math.round((totalPedido / qtdParcelas) * 100) / 100 : 0;
       const pagamentos = Array.isArray(pedido.payments) ? pedido.payments : [];
       let parcelas = agr.dates.map((dt, idx) => {
         // Pagamentos vinculados a esta parcela
         const parcelaPagamentos = pagamentos.filter(p => p.installmentIndex === idx);
         const totalPagoParcela = parcelaPagamentos.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
         // Status visual
         let status = 'Pendente', cor = '#fff3cd', txt = '#856404', borda = '#ffeeba';
         if (totalPagoParcela >= valorParcela) {
           status = 'Pago'; cor = '#e3f7e9'; txt = '#0d6832'; borda = '#a3e6b8';
         } else if (totalPagoParcela > 0) {
           status = 'Parcial'; cor = '#fffbe8'; txt = '#d97706'; borda = '#ffeeba';
         }
         return {
           numero: `${idx+1} / ${qtdParcelas}`,
           vencimento: dt,
           valor: valorParcela,
           totalPagoParcela,
           status, cor, txt, borda,
           pagamentos: parcelaPagamentos
         };
       });
       if (parcelas.length) {
         // Calcular saldo pendente
         const totalAcordo = valorParcela * qtdParcelas;
         const totalPagoAcordo = parcelas.reduce((sum, p) => sum + (Number(p.totalPagoParcela) || 0), 0);
         const saldoPendente = Math.max(0, totalAcordo - totalPagoAcordo);
        return `<div style="margin:18px 0 0 0;padding:15px 12px 12px 12px;background:#f8fafd;border-radius:10px;box-shadow:0 1px 4px #0001;">
          <b style='color:#7b1fa2;font-size:1.08em;'><i class="fa fa-handshake" style="margin-right:6px;"></i>Detalhes do Acordo/Parcelamento</b>
          <div class="pedido-itens-scroll" style="width:100%;overflow-x:auto;">
          <table style="width:100%;margin-top:7px;background:none;border-collapse:collapse;font-size:0.99em;">
            <thead>
              <tr style="background:#f3e5f5;color:#7b1fa2;">
                <th style="padding:7px 8px;border-radius:7px 0 0 7px;">Parcela</th>
                <th style="padding:7px 8px;">Vencimento</th>
                <th style="padding:7px 8px;">Valor</th>
                <th style="padding:7px 8px;">Pago</th>
                <th style="padding:7px 8px;border-radius:0 7px 7px 0;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${parcelas.map((p, idx) => {
  // Data formatada
  let dataFormatada = '-';
  if (typeof p.vencimento === 'string' && p.vencimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [ano, mes, dia] = p.vencimento.split('-');
    dataFormatada = `${dia}/${mes}/${ano}`;
  } else if (p.vencimento instanceof Date) {
    dataFormatada = p.vencimento.toLocaleDateString('pt-BR');
  }
  // Pagamentos parciais
  let linhasParciais = '';
  if (Array.isArray(p.pagamentos) && p.pagamentos.length > 0) {
    linhasParciais = `<tr><td colspan="5" style="padding: 0 0 8px 0; background: #f8f9fa; font-size: 0.92em; color: #555;">` +
      p.pagamentos.map(pg => {
        const dt = pg.createdAt ? new Date(pg.createdAt) : pg.date ? (pg.date.toDate ? pg.date.toDate() : new Date(pg.date)) : new Date();
        const pad = n => String(n).padStart(2, '0');
        return `<span style='margin-right:10px;'>Pagamento: R$ ${Number(pg.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}</span>`;
      }).join('<br>') + `</td></tr>`;
  }
  return `<tr>
    <td style="padding: 2px 6px;">${p.numero}</td>
    <td style="padding: 2px 6px; text-align:center;">${dataFormatada}</td>
    <td style="padding: 2px 6px; text-align:right;">R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td style="padding: 2px 6px; text-align:right;">R$ ${Number(p.totalPagoParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td style="padding: 2px 6px; text-align:right;">
      <span style="padding: 2px 10px; border-radius: 10px; font-size: 0.9em; background: ${p.cor}; color: ${p.txt}; border: 1px solid ${p.borda};">
        ${p.status}
      </span>
    </td>
  </tr>${linhasParciais}`;
}).join('')}
            </tbody>
          </table>
          </div>
           <div style="margin-top:13px;text-align:right;font-size:1.08em;font-weight:700;color:#c2185b;background:#fffbe6;padding:8px 14px;border-radius:7px;display:inline-block;">
             Saldo pendente: R$ ${saldoPendente.toLocaleString('pt-BR', {minimumFractionDigits:2})}
           </div>
         </div>`;
      }
    }
    return '';
  })()}
  <div style="display:flex;flex-wrap:wrap;gap:1.1em 1.3em;align-items:center;justify-content:center;margin-top:0.7em;">
  <!-- Botão Cancelar Pedido -->
  ${pedido.status && pedido.status.toLowerCase() !== 'concluído' ? `<button class="btn" style="background:#ffe0f3;color:#c2185b;font-weight:700;padding:7px 18px;border-radius:7px;border:none;box-shadow:0 1px 4px #0001;cursor:pointer;display:flex;align-items:center;gap:7px;" onclick="cancelarPedido('${pedido.id || pedido.orderNumber}')"><i class='fa fa-times-circle'></i> Cancelar Pedido</button>` : ''}
  <!-- Linha única PIX e ações -->
  <div style="display:flex;align-items:center;gap:0.6em;background:#f4f6fb;padding:6px 14px 6px 11px;border-radius:8px;box-shadow:0 1px 4px #0001;">
    <b style="color:#555;margin-right:2px;">Pagar via PIX</b>
    <button class="btn btn-outline-secondary btn-sm" style="color:#7b1fa2;border:1.5px solid #e1bee7;padding:4px 10px;border-radius:7px;font-weight:600;margin-left:2px;" onclick="copiarChavePix('71991427989')"><i class='fa fa-copy'></i> Copiar</button>
    <button class="btn" style="background:#25d366;color:#fff;font-weight:600;padding:7px 18px;border-radius:7px;border:none;box-shadow:0 1px 4px #0001;cursor:pointer;display:flex;align-items:center;gap:10px;margin-left:7px;font-size:1.13em;letter-spacing:0.5px;" onclick="whatsappPedido('${pedido.orderNumber || pedido.id}')"><i class='fab fa-whatsapp' style='color:#fff;font-size:1.35em;'></i> <span style='color:#fff;font-weight:600;'>WhatsApp</span></button>
  </div>
</div>
      </div>`;
    });
    html += '</div>';
    box.innerHTML = html;

    // Função WhatsApp Pedido (global)
    window.whatsappPedido = function(orderNumber) {
      Swal.fire({
        title: 'Atendimento WhatsApp',
        text: 'Como deseja iniciar a conversa?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Enviar comprovante',
        denyButtonText: 'Dúvida sobre o pedido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#25d366',
        denyButtonColor: '#1e88e5',
        background: '#e0fbe7',
        color: '#222',
        customClass: {popup: 'swal2-border-radius'}
      }).then((result) => {
        let msg = '';
        if (result.isConfirmed) {
          msg = `Olá! Segue o comprovante do pedido #${orderNumber}.`;
        } else if (result.isDenied) {
          msg = `Olá! Tenho uma dúvida sobre o pedido #${orderNumber}.`;
        }
        if (msg) {
          const url = `https://wa.me/5571991427989?text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank');
        }
      });
    };

    // Função copiar chave PIX (global para funcionar no onclick)
    window.copiarChavePix = function(chave) {
      if (!navigator.clipboard) {
        // Fallback para browsers antigos
        const temp = document.createElement('input');
        temp.value = chave;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      } else {
        navigator.clipboard.writeText(chave);
      }
      Swal.fire({
        icon: 'success',
        title: 'Chave PIX copiada!',
        showConfirmButton: false,
        timer: 1200,
        background: '#fff0fa',
        color: '#c2185b',
        customClass: {popup: 'swal2-border-radius'}
      });
    };

    // Função cancelar pedido (placeholder)
    window.cancelarPedido = function(id) {
      Swal.fire({
        title: 'Cancelar pedido?',
        text: 'Tem certeza que deseja cancelar este pedido?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c2185b',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Sim, cancelar',
        cancelButtonText: 'Não',
        background: '#fff0fa',
        color: '#c2185b',
        customClass: {popup: 'swal2-border-radius'}
      }).then((result) => {
        if (result.isConfirmed) {
          // Aqui você pode integrar o cancelamento real (Firestore)
          Swal.fire({
            icon: 'success',
            title: 'Pedido cancelado!',
            showConfirmButton: false,
            timer: 1200,
            background: '#fff0fa',
            color: '#c2185b',
            customClass: {popup: 'swal2-border-radius'}
          });
        }
      });
    };

  } catch (e) {
    box.innerHTML = '<span style="color:#c00;font-size:1.13em;">Erro ao buscar pedidos. Tente novamente.</span>';
  }
}


// Inicialização automática ao trocar de aba
window.addEventListener('DOMContentLoaded', () => {
  const tabBtn = document.getElementById('tabPedidosBtn');
  if (tabBtn) {
    tabBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (window.renderPedidosConta) window.renderPedidosConta();
      }, 100);
    });
  }
  // Se a aba inicial for pedidos
  const params = new URLSearchParams(window.location.search);
  if (params.get('aba') === 'meus-pedidos') {
    setTimeout(() => {
      if (window.renderPedidosConta) window.renderPedidosConta();
    }, 100);
  }
});

// Disponibiliza globalmente
window.renderPedidosConta = renderPedidosConta;
