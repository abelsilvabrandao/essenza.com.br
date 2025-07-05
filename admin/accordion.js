// Accordion para admin/estoque.html

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', function() {
      const section = this.parentElement;
      const isOpen = section.classList.contains('open');
      // Fecha todos os outros
      document.querySelectorAll('.accordion-section').forEach(sec => sec.classList.remove('open'));
      // Abre/fecha a clicada
      if (!isOpen) {
        section.classList.add('open');

        // Se for a seção Produtos & Margens, renderiza a tabela
        if (this.textContent.includes('Produtos & Margens')) {
          // Aguarda produtos carregados
          let produtosAtivos = (window.products||[]).filter(p => p.active !== false);
          if (typeof window.renderDashboardTable === 'function') {
            window.renderDashboardTable(produtosAtivos);
          }

          // Filtro
          const filterInput = document.getElementById('dashboardFilterInput');
          if (filterInput && !filterInput._listenerSet) {
            filterInput.addEventListener('input', e => {
              if (typeof window.renderDashboardTable === 'function') {
                window.renderDashboardTable(produtosAtivos, e.target.value);
              }
            });
            filterInput._listenerSet = true;
          }

          // Exportação
          const exportBtn = document.getElementById('exportDashboardCsv');
          if (exportBtn && !exportBtn._listenerSet) {
            exportBtn.addEventListener('click', () => {
              const table = document.getElementById('dashboardTableBody');
              if (!table) return;
              let data = [];
              // Cabeçalhos
              data.push([
                "Produto", "Categoria", "Quantidade", "Compra", "Preço", "PIX", "Lucro", "Lucro PIX", "Margem", "Status"
              ]);
              // Linhas da tabela
              Array.from(table.rows).forEach(row => {
                let rowData = [];
                Array.from(row.cells).forEach(cell => {
                  rowData.push(cell.textContent.trim().replace(/(\r\n|\n|\r)/gm, " "));
                });
                data.push(rowData);
              });
              // Cria e exporta o XLSX usando SheetJS
              const ws = XLSX.utils.aoa_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Produtos");
              XLSX.writeFile(wb, "tabela_produtos.xlsx");
            });
            exportBtn._listenerSet = true;
          }
        }
      }
    });
  });
});

