// Facilitador: Envia cobrança (mensagem 2) para todos os pedidos pendentes ou parciais
window.enviarCobrancaTodosPendentes = function () {
  if (!window.ordersCache || !window.ordersCache.length) {
    Swal.fire("Nenhum pedido carregado!", "", "warning");
    return;
  }
  // Filtra pedidos com status financeiro pendente ou parcial
  const pendentes = window.ordersCache.filter(
    o =>
      String(o.paymentStatus).toLowerCase() === "pendente" ||
      String(o.paymentStatus).toLowerCase() === "parcial"
  );
  if (!pendentes.length) {
    Swal.fire("Nenhum pedido pendente encontrado!", "", "info");
    return;
  }
  Swal.fire({
    title: `Enviar cobrança para ${pendentes.length} clientes?`,
    text: "Isso abrirá uma aba do WhatsApp para cada cliente pendente.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, enviar",
    cancelButtonText: "Cancelar"
  }).then(result => {
    if (!result.isConfirmed) return;
    pendentes.forEach(order => {
      // Gera a mensagem 2 direto, sem abrir o modal de escolha
      // Copia a lógica de msg2 (cobrança) já existente
      const orderNumber = order.orderNumber || order._id?.substring(0, 8).toUpperCase();
      const customerName = order.customerName || order.customer?.name || "Cliente";
      const paymentMethod = order.paymentMethod || "";
      const paymentLabel = window.getPaymentMethodLabel ? window.getPaymentMethodLabel(paymentMethod) : paymentMethod;
      const total = Number(order.total) || 0;
      const items = Array.isArray(order.items) ? order.items : [];
      const agreement = order.paymentAgreement || null;
      const pending = Array.isArray(order.payments)
        ? total - order.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        : total;
      const formattedTotal = total.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      let msg2 = `Olá, ${customerName} 🌸\n\nLembrando sobre o pagamento do pedido *#${orderNumber}*.`;
      if (order && order.items && order.items.length > 0) {
        msg2 += "\n\n🛍 Itens do pedido:";
        order.items.forEach((item) => {
          const itemTotal = (item.quantity * item.price).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          });
          msg2 += `\n- ${item.name} x${item.quantity} (R$ ${itemTotal})`;
        });
      }
      if (agreement && agreement.installments > 1) {
        const valorParcela = Math.round((total / agreement.installments) * 100) / 100;
        const valorFormatado = valorParcela.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        });
        msg2 += `\n\n💳 Acordo: ${agreement.installments}x de R$ ${valorFormatado}`;
        msg2 += "\n📅 Próximas parcelas:";
        (agreement.dates || []).forEach((date, idx) => {
          const [ano, mes, dia] = date.split("-");
          const dataFormatada = `${dia}/${mes}/${ano}`;
          const parcelaPagamentos = (order.payments || []).filter(
            (p) => p.installmentIndex === idx
          );
          const totalPagoParcela = parcelaPagamentos.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          );
          const statusParcela =
            totalPagoParcela >= valorParcela ? "Pago" : "Pendente";
          msg2 += `\n${idx + 1}ª parcela: R$ ${valorFormatado} - ${statusParcela}`;
          if (statusParcela === "Pendente") {
            msg2 += `\n   Vencimento: ${dataFormatada}`;
            msg2 += `\n   Valor: R$ ${valorFormatado}`;
          }
        });
      }
      msg2 += `\n\n💰 Valor total: R$ ${formattedTotal}`;
      msg2 += `\n💳 Forma de pagamento: ${paymentLabel}`;
      if (paymentMethod && paymentMethod.toLowerCase().includes("pix")) {
        msg2 += `\n🔑 Chave PIX: 71991427989`;
      }
      if (pending > 0) {
        msg2 += `\n⚠️ Valor em aberto: R$ ${pending.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`;
      }
      msg2 +=
        "\n\nSe já realizou o pagamento, por favor desconsidere esta mensagem. 💛\nEm caso de dúvida, estamos à disposição!\n\n🌻 Essenza — Cuidar de si é um ato de amor\nhttps://essenzasite.vercel.app/";
      // Abre WhatsApp
      let phoneNumber = (order.customerPhone || order.customer?.phone || "").replace(/\D/g, "");
      if (phoneNumber.length < 10) return;
      if (phoneNumber.length === 10) {
        phoneNumber = phoneNumber.substring(0, 2) + "9" + phoneNumber.substring(2);
      }
      const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(msg2)}`;
      window.open(whatsappUrl, "_blank");
    });
  });
};
