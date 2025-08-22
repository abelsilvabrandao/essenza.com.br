// Patch para feedback visual de cupom e finalização de pedido no vendas.html
(function(){
  function waitSwal(cb) {
    if (window.Swal) return cb();
    setTimeout(()=>waitSwal(cb), 100);
  }

  // Patch feedbackCupom para usar Swal
  const oldFeedbackCupom = window.feedbackCupom;
  window.feedbackCupom = function(msg, success = true) {
    if (window.Swal) {
      window.Swal.fire({
        toast: true,
        position: 'top-end',
        icon: success ? 'success' : 'error',
        title: msg,
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true
      });
    }
    if (oldFeedbackCupom) oldFeedbackCupom(msg, success);
  };

  // Implementação global de window.finalize para express.html
  window.finalize = async function finalize() {
    console.log('[vendas-feedback] Entrou em window.finalize');
    // Utilitários e helpers
    const el = (sel)=> document.querySelector(sel);
    const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    function formatBRL(n){ return BRL.format(n || 0); }
    function uid(){ return 'P'+Date.now().toString(36)+Math.random().toString(36).slice(2,6).toUpperCase(); }

    // Variáveis globais já existentes
    let products = window.products || [];
    let cart = window.cart || [];
    let appliedCoupon = (window.getAppliedCoupon && window.getAppliedCoupon()) || null;
    // Padronizar formaSelecionada para os mesmos valores do index.html
    let formaSelecionada = (window.formaSelecionada || 'pix').toLowerCase();
    if (formaSelecionada === 'cartão') formaSelecionada = 'credit';
    if (formaSelecionada === 'acordo') formaSelecionada = 'agreement';
    const db = window.db;
    const user = (window.currentUser || null);
    let essenzaUser = null;
    try { essenzaUser = JSON.parse(localStorage.getItem('essenzaUser')); } catch {}

    // Validação
    if(cart.length===0){
      console.warn('[vendas-feedback] Carrinho vazio ao tentar finalizar pedido');
      if(window.Swal) await Swal.fire({icon:'warning',title:'Carrinho vazio',text:'Adicione itens ao carrinho.'});
      return false;
    }
    const nome = el('#nome')?.value.trim();
    const cel = el('#cel')?.value.trim();
    const email = el('#email')?.value.trim() || null;
    const cpf = el('#cpf')?.value.trim() || (essenzaUser?.cpf || null);
    if(!nome){ console.warn('[vendas-feedback] Nome não informado'); if(window.Swal) await Swal.fire({icon:'warning',title:'Informe o nome completo'}); return false; }
    if(!cel){ console.warn('[vendas-feedback] Celular não informado'); if(window.Swal) await Swal.fire({icon:'warning',title:'Informe o celular'}); return false; }
    for(const it of cart){
      const p = products.find(x=>x.id===it.id);
      if(!p || it.qty > p.estoque){
        console.warn('[vendas-feedback] Estoque insuficiente para', it.nome);
        if(window.Swal) await Swal.fire({icon:'error',title:'Estoque insuficiente',text:'Produto: '+it.nome}); return false; }
    }

    // Montar objeto do pedido detalhado (padrão index.html)
    function generateOrderNumber() {
  const date = new Date();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PEDEXPRESS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${random}`;
}
const orderNumber = generateOrderNumber();
    const now = new Date();
    // === Parcelamento: construir paymentAgreement se for cartão ou acordo ===
    let paymentAgreement = null;
    if (formaSelecionada === 'credit' || formaSelecionada === 'agreement') {
      const nParcelas = window.selectedInstallments || 1;
      const total = +cart.reduce((s,x)=> {
        const p = products.find(prod=>prod.id===x.id);
        let price = p ? (formaSelecionada==='pix' && p.precoPix && p.precoPix<p.preco ? p.precoPix : p.preco) : x.preco;
        if (appliedCoupon) {
          if (appliedCoupon.type==='percent') price = price - (price*(appliedCoupon.value/100));
        }
        return s + price * x.qty;
      }, 0).toFixed(2);
      const valorParcela = +(total / nParcelas).toFixed(2);
      const today = new Date();
      const installmentsArr = [];
      const datesArr = [];
      for (let i = 0; i < nParcelas; i++) {
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
        const dueDateStr = dueDate.toISOString().split('T')[0];
        installmentsArr.push({
          number: i + 1,
          dueDate: dueDateStr,
          amount: valorParcela,
          status: 'Pendente'
        });
        datesArr.push(dueDateStr);
      }
      paymentAgreement = {
        installments: installmentsArr,
        dates: datesArr,
        total: total
      };
    }
    const order = {
      orderNumber,
      items: cart.map(it=> {
        const p = products.find(prod=>prod.id===it.id);
        let price = p ? (formaSelecionada==='pix' && p.precoPix && p.precoPix<p.preco ? p.precoPix : p.preco) : it.preco;
        if (appliedCoupon && appliedCoupon.type==='percent') {
          price = price - (price*(appliedCoupon.value/100));
        }
        return {
          id: String(it.id),
          productId: String(it.id), // Compatível com admin/stock.js
          name: it.nome,
          price: Number(price),
          quantity: Number(it.qty),
          subtotal: +(price*it.qty).toFixed(2)
        };
      }),
      total: +cart.reduce((s,x)=> {
        const p = products.find(prod=>prod.id===x.id);
        let price = p ? (formaSelecionada==='pix' && p.precoPix && p.precoPix<p.preco ? p.precoPix : p.preco) : x.preco;
        if (appliedCoupon) {
          if (appliedCoupon.type==='percent') price = price - (price*(appliedCoupon.value/100));
        }
        return s + price * x.qty;
      }, 0).toFixed(2),
      paymentMethod: formaSelecionada,
      installments: (formaSelecionada === 'credit' || formaSelecionada === 'agreement') ? (window.selectedInstallments || 1) : 1,
      payment: {
        method: formaSelecionada,
        cashReceived: null,
        change: 0
      },
      customerName: nome,
      customerPhone: cel,
      customerEmail: email,
      clienteCpf: cpf,
      customerUid: user?.uid || null,
      status: 'Pendente',
      source: 'vendas',
      createdAt: new Date(),
      updatedAt: new Date(),
      cupom: appliedCoupon ? { code: appliedCoupon.code, type: appliedCoupon.type, value: appliedCoupon.value } : null,
      ...(paymentAgreement ? { paymentAgreement } : {})
    };


    // Firestore transaction: atualizar estoque + salvar pedido + atualizar cliente
    try {
      console.log('[vendas-feedback] Iniciando transação Firestore para finalizar pedido');
      await window.runTransaction(db, async (transaction) => {
        // 1. Verificar estoque e baixar
        for (const it of cart) {
          const productRef = window.doc(db, 'products', String(it.id));
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists) throw new Error('Produto não encontrado: ' + it.nome);
          const prodData = productSnap.data();
          if (prodData.quantity < it.qty) throw new Error('Estoque insuficiente para ' + it.nome);
          transaction.update(productRef, { quantity: prodData.quantity - it.qty });
        }
        // 2. Salvar pedido
        const ordersRef = window.collection(db, 'orders');
        const orderDocRef = window.doc(ordersRef);
        transaction.set(orderDocRef, {
          ...order,
          createdAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        });
        // 3. Atualizar array de pedidos do cliente
        if (cpf) {
          const clienteRef = window.doc(db, 'clientes', cpf);
          transaction.set(clienteRef, { pedidos: window.arrayUnion(orderNumber) }, { merge: true });
        }
      });
    } catch(e){
      console.error('[vendas-feedback] Erro na transação Firestore:', e);
      if(window.Swal) await Swal.fire({icon:'error',title:'Erro ao finalizar pedido',text:e.message});
      return false;
    }

    // Limpar carrinho e resetar UI
    cart.length = 0;
    window.cart = [];
    cart = window.cart;
    el('#orderForm')?.reset();
    window.formaSelecionada = 'Pix';
    if(window.renderPayChips) window.renderPayChips();
    if(window.renderCart) window.renderCart();
    if(window.renderList) window.renderList(el('#q')?.value||'');
    console.log('[vendas-feedback] Carrinho limpo, UI resetada');

    // Mensagem WhatsApp e SweetAlert customizado
    let whatsappMsg = '';
    try {
      const linhas = [];
      // Cabeçalho com destaque
      linhas.push(`*NOVO PEDIDO #${orderNumber}*`);
      linhas.push(`*Data:* ${now.toLocaleString('pt-BR')}`);
      linhas.push('');
      linhas.push(`*Cliente:* ${nome} • ${cel}`);
      linhas.push('');
      linhas.push(`*Itens do Pedido:*`);
      for(const it of order.items){
  if (formaSelecionada === 'Pix') {
    const prod = products.find(p => p.id == it.id);
    if (prod && prod.precoPix && prod.precoPix < prod.preco) {
      const descontoPercent = Math.round(((prod.preco - prod.precoPix) / prod.preco) * 100);
      linhas.push(`- ${it.quantity}x ${it.name} - ${formatBRL(prod.preco)} (valor normal)`);
      linhas.push(`  ➔ ${formatBRL(prod.precoPix)} (${descontoPercent}% de desconto no PIX)`);
    } else {
      linhas.push(`- ${it.quantity}x ${it.name} - ${formatBRL(it.price)}`);
    }
  } else {
    linhas.push(`- ${it.quantity}x ${it.name} - ${formatBRL(it.price)}`);
  }
}
      linhas.push('');
      // Pagamento
      let descontoPix = '';
      if (formaSelecionada === 'Pix') {
        // Calcular desconto Pix percentual
        let totalNormal = 0, totalPix = 0;
        for(const it of order.items){
          const prod = products.find(p => p.id == it.id);
          if (prod) {
            totalNormal += (prod.preco || it.price) * it.quantity;
            totalPix += (prod.precoPix && prod.precoPix < prod.preco ? prod.precoPix : prod.preco) * it.quantity;
          }
        }
        if (totalNormal > 0 && totalPix < totalNormal) {
          const percent = Math.round(((totalNormal - totalPix) / totalNormal) * 100);
          if (percent > 0) descontoPix = ` (${percent}% de desconto)`;
        }
      }
      if (formaSelecionada === 'credit' || formaSelecionada === 'agreement') {
  const nParcelas = window.selectedInstallments || 1;
  const valorParcela = order.total / nParcelas;
  linhas.push(`*Pagamento:* ${formaSelecionada === 'credit' ? 'Cartão de Crédito' : 'Acordo'} (${nParcelas}x de ${formatBRL(valorParcela)})`);
} else {
  let percentPix = '';
  if (descontoPix && descontoPix.match(/\((\d+)%/)) {
    percentPix = ` (${descontoPix.match(/\((\d+)%/)[1]}% de desconto)`;
  }
  linhas.push(`*Pagamento:* 💠 PIX${percentPix}`);
}
linhas.push(`*Valor Total:* ${formatBRL(order.total)}`);
linhas.push('');
if (formaSelecionada === 'credit' || formaSelecionada === 'agreement') {
  linhas.push('Essenza agradece pela comprinha! Aproveite o máximo do cuidado!🌻Deus te abençoe!');
  linhas.push('https://essenzasite.vercel.app/');
} else {
  linhas.push(`*Chave Pix:* (71)99142-7989`);
}
      whatsappMsg = linhas.join('\n');
      console.log('[vendas-feedback] Mensagem WhatsApp gerada:', whatsappMsg);
    } catch(e){ console.error('[vendas-feedback] Erro ao gerar mensagem WhatsApp:', e); whatsappMsg = ''; }

    // SweetAlert customizado igual index.html
    if(window.Swal) {
      console.log('[vendas-feedback] Exibindo SweetAlert de sucesso');
      let resumoHtml = `<div style='text-align:left;font-size:1.07em;padding:0 6px 0 6px;'>`;
resumoHtml += `<b>Número do Pedido:</b> #${orderNumber}<br>`;
resumoHtml += `<b>Data:</b> ${now.toLocaleString('pt-BR')}<br>`;
resumoHtml += `<b>Cliente:</b> ${nome} • ${cel}<br>`;
resumoHtml += `<b>Itens:</b><ul style='margin:4px 0 4px 16px;'>`;
order.items.forEach(it => {
  resumoHtml += `<li>${it.quantity}x ${it.name} - ${formatBRL(it.price)}</li>`;
});
resumoHtml += `</ul>`;
if (formaSelecionada === 'credit' || formaSelecionada === 'agreement') {
  const nParcelas = window.selectedInstallments || 1;
  const valorParcela = order.total / nParcelas;
  resumoHtml += `<b>Pagamento:</b> ${formaSelecionada === 'credit' ? 'Cartão de Crédito' : 'Acordo'} (${nParcelas}x de ${formatBRL(valorParcela)})<br>`;
} else {
  resumoHtml += `<b>Pagamento:</b> 💠 PIX`;
  let descontoPix = '';
  let totalNormal = 0, totalPix = 0;
  for(const it of order.items){
    const prod = products.find(p => p.id == it.id);
    if (prod) {
      totalNormal += (prod.preco || it.price) * it.quantity;
      totalPix += (prod.precoPix && prod.precoPix < prod.preco ? prod.precoPix : prod.preco) * it.quantity;
    }
  }
  if (totalNormal > 0 && totalPix < totalNormal) {
    const percent = Math.round(((totalNormal - totalPix) / totalNormal) * 100);
    if (percent > 0) descontoPix = ` (${percent}% de desconto)`;
  }
  resumoHtml += descontoPix + '<br>';
}
resumoHtml += `<b>Total:</b> ${formatBRL(order.total)}<br>`;
if (formaSelecionada === 'pix' || formaSelecionada === 'Pix') {
  resumoHtml += `<b>Chave Pix:</b> (71)99142-7989<br>`;
  resumoHtml += `<button id='copyPixBtn' style='background:#ff1493;color:#fff;border:none;padding:10px 18px;border-radius:5px;font-size:16px;cursor:pointer;transition:background 0.2s;margin-top:8px;'>💠 Copiar Chave PIX</button>`;
}
resumoHtml += `</div>`;
await Swal.fire({
  title: 'Pedido realizado com sucesso!',
  html: resumoHtml,
  icon: 'success',
  showCancelButton: true,
  confirmButtonColor: '#4CAF50',
  confirmButtonText: 'Abrir WhatsApp',
  cancelButtonText: 'Sair',
  allowOutsideClick: false,
  allowEscapeKey: false,
  focusConfirm: false,
  preConfirm: () => {
    const url = `https://wa.me/5571991427989?text=${encodeURIComponent(whatsappMsg)}`;
    window.open(url, '_blank');
    return false; // Impede o fechamento do modal
  },
  didOpen: () => {
    const btn = document.getElementById('copyPixBtn');
    if(btn) btn.onclick = async () => {
      const pixCopiaCola = '00020126570014br.gov.bcb.pix0114+55719914279890217Comprinha Essenza5204000053039865802BR5924Jose Abel Silva De Jesus6009Sao Paulo62130509abelsilva6304FFDF';
      btn.style.transition = 'background 0.2s';
      try {
        await navigator.clipboard.writeText(pixCopiaCola);
        btn.textContent = '💠✔ Chave PIX Copiada!';
        btn.style.background = '#4CAF50';
        setTimeout(() => {
          btn.textContent = '💠 Copiar Chave PIX';
          btn.style.background = '#ff1493';
        }, 2000);
      } catch (e) {
        btn.textContent = 'Erro ao copiar';
        btn.style.background = '#b71c1c';
        setTimeout(() => {
          btn.textContent = '💠 Copiar Chave PIX';
          btn.style.background = '#ff1493';
        }, 2000);
      }
    };
  }
}).then((result) => {
  // Só fechará ao clicar em Cancelar
  if (result.dismiss === Swal.DismissReason.cancel) {
    // Limpa tudo e recarrega a página para garantir tela limpa
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
    return;
  } else if (result.dismiss) {
    // Se Swal fechar por outro motivo (ESC, click fora, perder foco), reabrir imediatamente
    setTimeout(() => window.finalize && window.finalize(), 100);
  }
});
setTimeout(() => {
  const swalBtn = document.querySelector('.swal2-confirm');
  if(swalBtn) {
    swalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Desabilita o botão temporariamente para evitar duplo clique
      swalBtn.disabled = true;
      const url = `https://wa.me/5571991427989?text=${encodeURIComponent(whatsappMsg)}`;
      window.open(url, '_blank');
      setTimeout(() => {
        swalBtn.disabled = false;
        const activeSwal = document.querySelector('.swal2-popup');
        if(activeSwal) activeSwal.focus();
      }, 500);
      return false;
    }, true);
  }
}, 500);
    }
    console.log('[vendas-feedback] Finalização de pedido concluída com sucesso');
    return true;
  };


  // Patch finalize para feedback visual
  const finishBtn = document.getElementById('finish');
  if (finishBtn) {
    finishBtn.onclick = function(e) {
      console.log('[vendas-feedback] Clique no botão Encerrar Pedido');
      e.preventDefault();
      waitSwal(async function() {
        try {
          console.log('[vendas-feedback] Chamando window.finalize()');
          await window.finalize();
          console.log('[vendas-feedback] window.finalize() executado com sucesso');
        } catch (err) {
          console.error('[vendas-feedback] Erro ao executar window.finalize:', err);
          if (window.Swal) {
            window.Swal.fire({
              icon: 'error',
              title: 'Erro ao finalizar pedido',
              text: err && err.message ? err.message : 'Tente novamente.',
              showConfirmButton: true
            });
          }
        }
      });
    };
  }
})();
