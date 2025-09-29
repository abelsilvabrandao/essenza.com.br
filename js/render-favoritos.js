// Renderizador de favoritos para uma-conta.html
// Este script deve ser incluído após window.products estar disponível

async function renderFavoritosConta() {
  console.log('[Favoritos][DEBUG] Iniciando renderFavoritosConta');
  const box = document.querySelector('#sectionFavoritos .account-data-box');
  if (!box) return;
  let essenzaUser = null;
  try {
    essenzaUser = JSON.parse(localStorage.getItem('essenzaUser'));
    console.log('[Favoritos][DEBUG] essenzaUser lido do localStorage:', essenzaUser);
  } catch (e) {
    console.log('[Favoritos][DEBUG] Erro ao ler essenzaUser do localStorage:', e);
  }
  let favoritos = [];
  if (essenzaUser && essenzaUser.cpf) {
    try {
      let clienteDoc, data;
      const isModular = typeof collection === 'function' && typeof getDoc === 'function' && window.db && typeof window.db === 'object' && typeof window.db.app !== 'undefined';
      if (isModular) {
        console.log('[Favoritos][DEBUG] Usando modo modular Firestore');
        const db = window.db;
        const docRef = doc(db, 'clientes', essenzaUser.cpf);
        clienteDoc = await getDoc(docRef);
        console.log('[Favoritos][DEBUG] Documento Firestore (modular):', clienteDoc);
        if (clienteDoc.exists()) {
          console.log('[Favoritos][DEBUG] Dados Firestore (modular):', clienteDoc.data());
          data = clienteDoc.data();
          favoritos = Array.isArray(data.favoritos) ? data.favoritos : [];
          essenzaUser.favoritos = favoritos;
          localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
        } else {
          favoritos = Array.isArray(essenzaUser.favoritos) ? essenzaUser.favoritos : [];
        }
      } else {
        const db = firebase.firestore();
        clienteDoc = await db.collection('clientes').doc(essenzaUser.cpf).get();
        console.log('[Favoritos][DEBUG] Documento Firestore (compat):', clienteDoc);
        if (clienteDoc.exists && Array.isArray(clienteDoc.data().favoritos)) {
          console.log('[Favoritos][DEBUG] Dados Firestore (compat):', clienteDoc.data());
          favoritos = clienteDoc.data().favoritos;
          essenzaUser.favoritos = favoritos;
          localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
        } else {
          favoritos = Array.isArray(essenzaUser.favoritos) ? essenzaUser.favoritos : [];
        }
      }
    } catch (e) {
      favoritos = Array.isArray(essenzaUser.favoritos) ? essenzaUser.favoritos : [];
    }
  } else {
    favoritos = [];
  }
  console.log('[Favoritos][DEBUG] Favoritos finais lidos:', favoritos);
  console.log('[Favoritos][DEBUG] Produtos carregados:', window.products ? window.products.map(p => p.id) : window.products);
  if (!window.products || window.products.length === 0) {
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Nenhum produto disponível no momento.</span>';
    return;
  }
  const favProducts = window.products.filter(p => favoritos.map(String).includes(String(p.id)));
  console.log('[Favoritos][DEBUG] Produtos favoritos encontrados:', favProducts.map(p => p.id));
  if (!favoritos.length || !favProducts.length) {
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Você ainda não favoritou nenhum produto.</span>';
    return;
  }
  let html = '<div class="favoritos-grid" style="display:flex;flex-wrap:wrap;gap:1.6em;justify-content:center;">';
  favProducts.forEach(prod => {
    html += `
      <div class="favorito-card" style="background:#fff;border-radius:12px;box-shadow:0 2px 16px #ff69b41a;padding:1.3em 1em 1.1em 1em;width:260px;max-width:96vw;display:flex;flex-direction:column;align-items:center;gap:0.6em;">
        <img src="${prod.imageUrl || prod.image || '/img/placeholder.png'}" alt="${prod.name}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;margin-bottom:0.5em;">
        <div style="font-size:1.13em;font-weight:600;color:#8f4be9;text-align:center;">${prod.name}</div>
        <div style="color:#222;font-size:1.09em;text-align:center;margin-bottom:0.2em;">R$ ${Number(prod.price).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        ${prod.pixPrice && prod.pixPrice < prod.price ? `<div style='color:#ff69b4;font-size:0.98em;'>PIX: R$ ${Number(prod.pixPrice).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>` : ''}
        <button class="favorito-remover-btn" data-id="${prod.id}" style="background:none;border:none;color:#ff69b4;font-size:1.5em;cursor:pointer;margin-top:0.5em;" title="Remover dos favoritos"><i class="fa-solid fa-heart"></i></button>
      </div>
    `;
  });
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll('.favorito-remover-btn').forEach(btn => {
    console.log('[Favoritos][DEBUG] Adicionando listener de remoção para favorito:', btn.getAttribute('data-id'));
    btn.onclick = async function() {
      const id = btn.getAttribute('data-id');
      if (!id) {
        console.log('[Favoritos][DEBUG] Botão de remoção sem id, ignorado');
        return;
      }
      if (essenzaUser && essenzaUser.cpf) {
        console.log('[Favoritos][DEBUG] Removendo favorito do Firestore, id:', id);
        try {
          const db = window.db || firebase.firestore();
          await db.collection('clientes').doc(essenzaUser.cpf).update({ favoritos: essenzaUser.favoritos.filter(fid => fid !== id) });
        } catch (e) {}
      }
      essenzaUser.favoritos = essenzaUser.favoritos.filter(fid => fid !== id);
      localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
      console.log('[Favoritos][DEBUG] Favorito removido localmente, id:', id);
      renderFavoritosConta();
      if (typeof toggleFavorite === 'function') toggleFavorite(id);
    };
  });
}

function monitorTabFavoritos() {
  const tabBtn = document.getElementById('tabFavoritosBtn');
  if (!tabBtn) return;
  tabBtn.addEventListener('click', () => {
    renderFavoritosConta();
  });
  if (window.location.search.includes('aba=favoritos')) {
    setTimeout(renderFavoritosConta, 120);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.products && window.products.length) {
    monitorTabFavoritos();
  } else {
    let tentativas = 0;
    const tryInit = () => {
      if (window.products && window.products.length) {
        monitorTabFavoritos();
        const section = document.getElementById('sectionFavoritos');
        if (section && section.style.display !== 'none' && typeof renderFavoritosConta === 'function') {
          renderFavoritosConta();
        }
      } else if (++tentativas < 30) {
        setTimeout(tryInit, 150);
      }
    };
    tryInit();
  }
});

window.renderFavoritosConta = renderFavoritosConta;
