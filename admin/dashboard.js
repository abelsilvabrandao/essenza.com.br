// Dashboard de Análise Geral do Estoque
// Este módulo renderiza indicadores, gráficos e tabela-resumo na div #stockDashboard
// Requer Chart.js (CDN)

export function renderStockDashboard(products, options = {}) {
  console.log(products)
  products.forEach((p, i) => {
    console.log(`Produto ${i+1}:`, p, 'Categoria:', products[i].category);
  });
  // Separa as renderizações por seção
  renderIndicadoresEstoque(products, options);
  renderLucroPorProduto(products);
  renderDistribuicaoPorCategoria(products);

  // Mantém compatibilidade: se alguém chamar renderStockDashboard esperando o dashboard antigo, mostra só indicadores
  // (opcional: pode remover se não precisar mais)
}

// Indicadores gerais
export function renderIndicadoresEstoque(products, options = {}) {
  const dashboard = document.getElementById('stockDashboard');
  if (!dashboard) return;
  const ativos = products.filter(p => p.active !== false);
  const totalAtivos = ativos.length;
  const totalUnidades = ativos.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalInvestido = ativos.reduce((sum, p) => sum + ((Number(p.purchasePrice)||0) * (Number(p.quantity)||0)), 0);
  const totalVenda = ativos.reduce((sum, p) => sum + ((Number(p.price)||0) * (Number(p.quantity)||0)), 0);
  const lucroTotal = totalVenda - totalInvestido;
  const estoqueCritico = ativos.filter(p => (Number(p.quantity)||0) <= (options.estoqueCritico || 5));
  dashboard.innerHTML = `
    <h2 class="dashboard-title"><i class="fas fa-chart-bar"></i> Análise Geral do Estoque</h2>
    <div class="dashboard-section">
      <div class="dashboard-indicadores dashboard-indicadores-sm">
        <div class="indicador-card card-ativos">
          <div class="indicador-icone"><i class="fas fa-boxes"></i></div>
          <div class="indicador-titulo">Produtos Ativos</div>
          <div class="indicador-valor">${ativos.length}</div>
        </div>
        <div class="indicador-card card-unidades">
          <div class="indicador-icone"><i class="fas fa-cubes"></i></div>
          <div class="indicador-titulo">Unidades em Estoque</div>
          <div class="indicador-valor">${totalUnidades}</div>
        </div>
        <div class="indicador-card card-investido">
          <div class="indicador-icone"><i class="fas fa-wallet"></i></div>
          <div class="indicador-titulo">Valor Investido</div>
          <div class="indicador-valor">R$ ${totalInvestido.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div class="indicador-card card-venda">
          <div class="indicador-icone"><i class="fas fa-coins"></i></div>
          <div class="indicador-titulo">Valor Potencial Venda</div>
          <div class="indicador-valor">R$ ${totalVenda.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div class="indicador-card card-lucro">
          <div class="indicador-icone"><i class="fas fa-chart-line"></i></div>
          <div class="indicador-titulo">Lucro Estimado</div>
          <div class="indicador-valor">R$ ${lucroTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div class="indicador-card card-critico">
          <div class="indicador-icone"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="indicador-titulo">Estoque Crítico</div>
          <div class="indicador-valor">${estoqueCritico.length}</div>
        </div>
      </div>
      <h2 class="dashboard-title lucro-produto-title"><i class="fas fa-chart-bar"></i> Lucro por Produto</h2>
      <div class="lucro-produto-wrapper" style="background:none;box-shadow:none;padding:0;max-width:none;">
        <canvas id="lucroBarChart" style="max-width:800px;min-width:220px;width:100%;height:340px;"></canvas>
      </div>
    </div>
    <hr class="dashboard-divider"/>
  `;
}

// Gráfico de Lucro por Produto
export function renderLucroPorProduto(products) {
  // Agora o gráfico é renderizado dentro da análise geral, não precisa de div separada
  if (window.Chart) {
    const ativos = products.filter(p => p.active !== false);
    const ctxBar = document.getElementById('lucroBarChart');
    if (!ctxBar) return;
    if (window.lucroBarChart && typeof window.lucroBarChart.destroy === 'function') window.lucroBarChart.destroy();
    window.lucroBarChart = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ativos.map(p=>p.name),
        datasets: [
          { 
            label: 'Lucro Normal', 
            backgroundColor: 'rgba(255, 20, 147, 0.75)', // pink
            borderColor: 'rgba(255, 20, 147, 1)',
            borderWidth: 2,
            borderRadius: 8,
            data: ativos.map(p=>((Number(p.price)||0)-(Number(p.purchasePrice)||0))*(Number(p.quantity)||0)) 
          },
          { 
            label: 'Lucro PIX', 
            backgroundColor: 'rgba(156, 39, 176, 0.75)', // purple
            borderColor: 'rgba(156, 39, 176, 1)',
            borderWidth: 2,
            borderRadius: 8,
            data: ativos.map(p=>((Number(p.pixPrice)||0)-(Number(p.purchasePrice)||0))*(Number(p.quantity)||0)) 
          },
        ]
      },
      options: {responsive:true, plugins:{legend:{position:'top'}}}
    });
  }
}


// Gráfico de Distribuição por Categoria
export function renderDistribuicaoPorCategoria(products) {
  const catDiv = document.getElementById('categoryDistribution');
  if (!catDiv) return;
  catDiv.innerHTML = `
    <div class="dashboard-chart-title"><i class="fas fa-chart-pie"></i> Distribuição por Categoria</div>
    <canvas id="categoriaPieChart" style="max-width:320px;min-width:220px;"></canvas>
  `;
  if (window.Chart) {
    const ativos = products.filter(p => p.active !== false);
    const categorias = [...new Set(ativos.map(p=>p.category||'Sem Categoria'))];
    const ctxPie = document.getElementById('categoriaPieChart').getContext('2d');
    if (window.categoriaPieChart && typeof window.categoriaPieChart.destroy === 'function') window.categoriaPieChart.destroy();
    window.categoriaPieChart = new Chart(ctxPie, {
      type: 'pie',
      data: {
        labels: categorias,
        datasets: [{
          label: 'Produtos',
          backgroundColor: [
            '#4CAF50','#009688','#FF9800','#FF5722','#3F51B5','#00BCD4','#8BC34A','#FFC107','#E91E63','#607D8B'
          ],
          data: categorias.map(cat => ativos.filter(p=> (p.category||'Sem Categoria')===cat).length)
        }]
      },
      options: {responsive:true}
    });
  }
}

  // --- Filtro da tabela ---
  const dashboardFilterInput = document.getElementById('dashboardFilterInput');
  const dashboardTableBody = document.getElementById('dashboardTableBody');
  window.renderDashboardTable = function renderDashboardTable(ativos, filter = '', options = {}) {
    const filtro = filter.trim().toLowerCase();
    dashboardTableBody.innerHTML = ativos
      .filter(p => {
        if (!filtro) return true;
        return (
          (p.name && p.name.toLowerCase().includes(filtro)) ||
          (p.category && p.category.toLowerCase().includes(filtro))
        );
      })
      .map(p => {
        const inv = (Number(p.purchasePrice)||0)*(Number(p.quantity)||0);
        const vend = (Number(p.price)||0)*(Number(p.quantity)||0);
        const pix = (Number(p.pixPrice)||0)*(Number(p.quantity)||0);
        const lucro = vend-inv;
        const lucroPix = pix-inv;
        const margem = inv>0 ? (lucro/inv)*100 : 0;
        return `<tr class="${(p.quantity||0)<=((options && options.estoqueCritico)||5)?'estoque-baixo':''} ${lucro<0?'lucro-negativo':''}">
           <td class="produto">${p.name}</td>
           <td class="categoria">${(typeof p.category === 'string' && p.category.trim()) 
  ? (p.category.trim().charAt(0).toUpperCase() + p.category.trim().slice(1)) 
  : '<span style="color:#bbb;">Sem categoria</span>'}</td>
           <td>${p.quantity||0}</td>
           <td>R$ ${(Number(p.purchasePrice) * Number(p.quantity || 0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
           <td>R$ ${(p.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
           <td>R$ ${(p.pixPrice||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
           <td style="color:${lucro>=0?'#4CAF50':'#dc3545'}">R$ ${lucro.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
           <td style="color:${lucroPix>=0?'#4CAF50':'#dc3545'}">R$ ${lucroPix.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
           <td style="font-weight:bold;${margem<0?'color:#dc3545':'color:#4CAF50'}">${margem.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</td>
           <td class="status">${p.active!==false?'<span class="badge badge-ativo">Ativo</span>':'<span class="badge badge-inativo">Inativo</span>'}${(p.quantity||0)<=(options.estoqueCritico||5)?'<span class="badge badge-critico">Crítico</span>':''}${lucro<0?'<span class="badge badge-negativo">Lucro Neg.</span>':''}</td>
        </tr>`;
      }).join('');
  }
  // Chama renderDashboardTable com os produtos ativos
  if (typeof products !== "undefined" && products) {
    const ativos = products.filter(p => p.active !== false);
    renderDashboardTable(ativos);
    if (dashboardFilterInput) {
      dashboardFilterInput.addEventListener('input', e => {
        renderDashboardTable(ativos, e.target.value);
      });
    }
  }
// Exportação Xlsx
  const exportBtn = document.getElementById('exportDashboardCsv');
  if (exportBtn) {
    exportBtn.onclick = () => {
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
    }
  }

