// Função global para imprimir apenas o card do pedido selecionado
window.printOrder = function(orderId) {
  const orderCard = document.getElementById(`order-${orderId}`);
  if (!orderCard) {
    alert('Pedido não encontrado para impressão.');
    return;
  }

  // Salva o conteúdo original da página
  const originalContent = document.body.innerHTML;

  // Cria um novo conteúdo apenas com o card do pedido
  const printContent = `
    <html>
      <head>
        <title>Imprimir Pedido #${orderId}</title>
        <link rel="stylesheet" href="/admin/stock.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
        <style>
          body { background: #fff !important; }
          .order-card { box-shadow: none !important; border: 1px solid #ccc !important; margin: 0 !important; }
          .order-footer, .order-actions, .btn-print, .btn-add-payment, .btn-add-agreement { display: none !important; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(function(){ window.close(); }, 100);">
        <div style="max-width: 700px; margin: 0 auto;">
          ${orderCard.outerHTML}
        </div>
      </body>
    </html>
  `;

  // Abre uma nova janela para imprimir
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
};
