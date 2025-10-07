import { collection, getDocs, query, where, updateDoc, doc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

async function carregarClientes() {
  if (!window.db) {
    console.error('Firestore não inicializado');
    return [];
  }
  try {
    const clientesCol = collection(window.db, 'clientes');
    const snapshot = await getDocs(clientesCol);
    const clientes = [];
    snapshot.forEach(doc => {
      const dados = doc.data();
      clientes.push({
        id: doc.id,
        nome: dados.nome || '',
        sobrenome: dados.sobrenome || '',
        email: dados.email || '',
        celular: dados.celular || '',
        genero: dados.genero || '',
        dataNascimento: dados.dataNascimento || '',
        cpf: doc.id,
        endereco: dados.endereco || null // <-- adiciona o campo endereço
      });
    });
    return clientes;
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
    return [];
  }
}

window.renderClientesAdmin = async function() {
  // Buscar todos os pedidos uma vez e mapear por clienteCpf
  let pedidosPorCliente = {};
  if (window.db) {
    const ordersCol = collection(window.db, 'orders');
    const snapshot = await getDocs(ordersCol);
    snapshot.forEach(doc => {
      const data = doc.data();
      const cpf = data.clienteCpf;
      if (cpf) {
        if (!pedidosPorCliente[cpf]) pedidosPorCliente[cpf] = [];
        pedidosPorCliente[cpf].push({
          id: doc.id,
          orderNumber: data.orderNumber || doc.id
        });
      }
    });
  }
  const container = document.getElementById('clientesAdminContainer');
  if (!container) return;
  container.innerHTML = '<div style="padding:1.5em;text-align:center;font-size:1.2em;">Carregando clientes...</div>';
  const clientes = await carregarClientes();
  if (!clientes.length) {
    container.innerHTML = '<div style="padding:1.5em;text-align:center;font-size:1.2em;">Nenhum cliente cadastrado.</div>';
    return;
  }
  let html = `<table class="dashboard-table" style="width:100%;margin-top:1em;table-layout:fixed;">
    <thead>
      <tr>
        <th style="width:34%;min-width:220px;">Cliente</th>
        <th style="width:33%;min-width:160px;">Pedidos vinculados</th>
        <th style="width:33%;min-width:120px;">Ações</th>
      </tr>
    </thead>
    <tbody>`;
  clientes.forEach(c => {
    const pedidos = pedidosPorCliente[c.cpf] || [];
    // Função para mascarar CPF
    function mascararCpf(cpf) {
      if (!cpf || cpf.length < 3) return '***.***.***-**';
      return cpf.substring(0,3) + '.***.***-**';
    }
    html += `<tr>
      <td style="vertical-align:top;word-break:break-word;text-align:left;">
        <div style="font-weight:600;font-size:1.08em;">${c.nome} ${c.sobrenome}</div>
        <div style="font-size:0.95em;color:#555;"><span style='font-weight:bold;'>Nasc.:</span> ${c.dataNascimento ? c.dataNascimento : '-'} &nbsp;&nbsp;<span style='font-weight:bold;'>CPF:</span> ${c.cpf ? '<span style=\'letter-spacing:1px;\'>' + mascararCpf(c.cpf) + '</span>' : '-'}</div>
        <div style="font-size:0.95em;color:#555;"><span style='font-weight:bold;'>E-mail:</span> ${c.email}</div>
        <div style="font-size:0.95em;color:#555;"><span style='font-weight:bold;'>Telefone:</span> ${c.celular}</div>
    ${c.endereco ? `<div style="font-size:0.95em;color:#555;">
      <span style='font-weight:bold;'>Endereço:</span>
      ${c.endereco.rua || ''}, ${c.endereco.numero || ''}${c.endereco.complemento ? ' - ' + c.endereco.complemento : ''}<br>
      ${c.endereco.bairro || ''}, ${c.endereco.cidade || ''} - ${c.endereco.estado || ''} | CEP: ${c.endereco.cep || ''}
    </div>` : ''}
  </td>
      <td style="vertical-align:top;word-break:break-word;">${pedidos.length ? pedidos.map(p =>
        `<span style='white-space:nowrap;'>${p.orderNumber} <button class='btn btn-xs btn-unlink-order' data-order='${p.id}' title='Desvincular pedido' style='color:#fff;background:#e94b4b;font-size:1.08em;margin-left:4px;padding:0 8px 0 8px;border:none;border-radius:50%;font-weight:bold;line-height:1.4;box-shadow:0 1px 4px #0002;cursor:pointer;transition:background 0.18s;'>×</button></span>`
      ).join('<br>') : '<span style=\'color:#999\'>Nenhum</span>'}</td>
      <td style="vertical-align:top;"><button class='btn btn-link btn-vincular-pedidos' data-cpf='${c.cpf}' data-nome='${c.nome} ${c.sobrenome}' style='background:#f6f0fd;color:#8f4be9;font-weight:700;border:1.5px solid #8f4be9;border-radius:6px;padding:6px 14px;font-size:1em;transition:background 0.2s, color 0.2s;box-shadow:0 1px 4px #0001;cursor:pointer;'>Vincular Pedidos</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Adiciona evento aos botões
  container.querySelectorAll('.btn-vincular-pedidos').forEach(btn => {
    btn.addEventListener('click', function() {
      const cpf = this.getAttribute('data-cpf');
      const nome = this.getAttribute('data-nome');
      abrirModalVincularPedidos(cpf, nome);
    });
  });
}

// Função para buscar pedidos não vinculados (sem clienteCpf)
async function buscarPedidosNaoVinculados() {
  if (!window.db) return [];
  const ordersCol = collection(window.db, 'orders');
  const snapshot = await getDocs(ordersCol);
  const pedidos = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // Considera desvinculado se clienteCpf não existe ou está vazio
    if (!('clienteCpf' in data) || !data.clienteCpf) {
      pedidos.push({
        id: doc.id,
        orderNumber: data.orderNumber || doc.id,
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        status: data.status || '',
      });
    }
  });
  return pedidos;
}

// Função para abrir modal de vinculação de pedidos
window.abrirModalVincularPedidos = async function(cpf, nome) {
  const pedidos = await buscarPedidosNaoVinculados();
  if (!pedidos.length) {
    Swal.fire({
      icon: 'info',
      title: 'Nenhum pedido disponível',
      text: 'Não há pedidos sem vínculo para associar a este cliente.',
      confirmButtonColor: '#8f4be9'
    });
    return;
  }
  const options = pedidos.map(p => `<option value='${p.id}'>${p.orderNumber} - ${p.customerName} (${p.customerEmail})</option>`).join('');
  Swal.fire({
    title: `Vincular pedidos ao cliente`,
    html: `<div style='margin-bottom:1em;font-size:1.1em;'>Cliente: <b>${nome}</b><br>CPF: <b>${cpf}</b></div>
      <label for='pedidosVincularSelect'>Selecione pedidos para vincular:</label>
      <select id='pedidosVincularSelect' class='swal2-select' multiple size='6' style='width:95%;margin-top:0.5em;'>${options}</select>
      <div style='font-size:0.95em;color:#888;margin-top:0.5em;'>Segure Ctrl ou Cmd para selecionar múltiplos.</div>`,
    showCancelButton: true,
    confirmButtonText: 'Vincular',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#8f4be9',
    focusConfirm: false,
    preConfirm: () => {
      const select = document.getElementById('pedidosVincularSelect');
      const selected = Array.from(select.selectedOptions).map(opt => opt.value);
      if (!selected.length) {
        Swal.showValidationMessage('Selecione ao menos um pedido.');
        return false;
      }
      return selected;
    }
  }).then(async result => {
    if (result.isConfirmed && result.value && result.value.length) {
      await vincularPedidosAoCliente(cpf, result.value);
    }
  });
};

// Função para vincular pedidos ao cliente
async function vincularPedidosAoCliente(cpf, pedidos) {
  if (!window.db) return;
  // Garante que só IDs de pedidos (string) sejam salvos
  const pedidosIds = pedidos.map(p => typeof p === 'object' ? p.id : p).filter(Boolean);
  const batchPromises = pedidosIds.map(async (pedidoId) => {
    const pedidoRef = doc(window.db, 'orders', pedidoId);
    await updateDoc(pedidoRef, { clienteCpf: cpf });
  });
  try {
    await Promise.all(batchPromises);
    // Atualizar array de pedidos no cliente (clientes/{cpf})
    try {
      const clienteRef = doc(window.db, 'clientes', cpf);
      console.log('IDs para arrayUnion:', pedidosIds);
      await updateDoc(clienteRef, {
        pedidos: arrayUnion(...pedidosIds)
      });
    } catch (e) {
      console.warn('Não foi possível atualizar array de pedidos do cliente:', e);
    }
    Swal.fire({
      icon: 'success',
      title: 'Pedidos vinculados!',
      text: `Pedidos vinculados ao cliente com sucesso!`,
      confirmButtonColor: '#8f4be9',
      timer: 1800
    });
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro ao vincular',
      text: 'Ocorreu um erro ao vincular pedidos. Tente novamente.',
      confirmButtonColor: '#8f4be9'
    });
  }
  // Opcional: atualizar a tabela após vinculação
  if (typeof window.renderClientesAdmin === 'function') window.renderClientesAdmin();
}




document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('clientesAdminContainer')) {
    window.renderClientesAdmin();
  }
});

// Função para desvincular pedido do cliente
async function desvincularPedidoDoCliente(orderId) {
  if (!window.db) return;
  const pedidoRef = doc(window.db, 'orders', orderId);
  try {
    // Buscar o pedido para saber o CPF do cliente
    const pedidoSnap = await getDocs(query(collection(window.db, 'orders'), where('__name__', '==', orderId)));
    let cpf = '';
    pedidoSnap.forEach(docu => {
      const data = docu.data();
      cpf = data.clienteCpf || '';
    });
    // Desvincula o pedido
    await updateDoc(pedidoRef, { clienteCpf: '' });
    // Remove o ID do array pedidos do cliente
    if (cpf) {
      const clienteRef = doc(window.db, 'clientes', cpf);
      await updateDoc(clienteRef, {
        pedidos: arrayRemove(orderId)
      });
      console.log('Removido do array pedidos do cliente:', orderId, 'para CPF:', cpf);
    }
    Swal.fire({
      icon: 'success',
      title: 'Pedido desvinculado!',
      timer: 1200,
      showConfirmButton: false
    });
    if (typeof window.renderClientesAdmin === 'function') window.renderClientesAdmin();
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Erro ao desvincular',
      text: 'Ocorreu um erro ao desvincular o pedido. Tente novamente.',
      confirmButtonColor: '#e94b4b'
    });
    console.warn('Erro ao remover do array pedidos:', e);
  }
}


// Delegação de evento para botões de desvincular (fora do DOMContentLoaded)
document.addEventListener('click', function(e) {
  if (e.target && e.target.classList.contains('btn-unlink-order')) {
    const orderId = e.target.getAttribute('data-order');
    if (orderId) desvincularPedidoDoCliente(orderId);
  }
});
