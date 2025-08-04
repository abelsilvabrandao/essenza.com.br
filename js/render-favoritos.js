// Renderizador de favoritos para minha-conta.html
// Este script deve ser incluído após window.products estar disponível

async function renderFavoritosConta(tentativas = 0) {
  console.log('[Essenza][DEBUG] Chamando renderFavoritosConta');
  console.log('[Essenza][DEBUG] window.products:', window.products);
  let essenzaUser = null;
  try {
    essenzaUser = JSON.parse(localStorage.getItem('essenzaUser'));
  } catch {}

  // Buscar favoritos do Firestore, se usuário autenticado e CPF disponível
  let favoritos = [];
  if (essenzaUser && essenzaUser.cpf) {
    console.log('[Essenza][DEBUG] EssenzaUser:', essenzaUser);
    console.log('[Essenza][DEBUG] Buscando favoritos do Firestore para CPF:', essenzaUser.cpf);

    try {
      let clienteDoc, data;
      // Detecta se está disponível a função 'collection' do modular (importada no escopo global)
      const isModular = typeof collection === 'function' && typeof getDoc === 'function';
      if (isModular) {
        // Modular
        const docRef = doc(window.db, 'clientes', essenzaUser.cpf);
        clienteDoc = await getDoc(docRef);
        if (clienteDoc.exists()) {
          data = clienteDoc.data();
          favoritos = Array.isArray(data.favoritos) ? data.favoritos : [];
          essenzaUser.favoritos = favoritos;
          localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
        } else {
          favoritos = Array.isArray(essenzaUser.favoritos) ? essenzaUser.favoritos : [];
        }
      } else {
        // Compat
        const db = window.db || firebase.firestore();
        clienteDoc = await db.collection('clientes').doc(essenzaUser.cpf).get();
        if (clienteDoc.exists && Array.isArray(clienteDoc.data().favoritos)) {
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
    favoritos = Array.isArray(essenzaUser && essenzaUser.favoritos) ? essenzaUser.favoritos : [];
  }

  // Aguarda até products estar carregado (até 30 tentativas)
  if (!window.products || window.products.length === 0) {
    if (tentativas < 30) {
      setTimeout(() => renderFavoritosConta(tentativas + 1), 150);
    } else {
      console.log('[Essenza][DEBUG] Nenhum produto disponível em window.products após várias tentativas:', window.products);
      box.innerHTML = '<span style="color:#888;font-size:1.13em;">Nenhum produto disponível no momento.</span>';
    }
    return;
  }
  console.log('[Essenza][DEBUG] Favoritos lidos:', favoritos);
  console.log('[Essenza][DEBUG] Produtos carregados:', window.products.map(p => p.id));
  if (!favoritos.length) {
    console.log('[Essenza][DEBUG] Nenhum favorito cadastrado para este usuário.');
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Você ainda não favoritou nenhum produto.</span>';
    return;
  }

  // Filtrar produtos favoritos (comparando como string para garantir match)
  const favProducts = window.products.filter(p => favoritos.map(String).includes(String(p.id)));
  console.log('[Essenza][DEBUG] Produtos favoritos encontrados:', favProducts.map(p => p.id));
  if (!favProducts.length) {
    console.log('[Essenza][DEBUG] Nenhum produto corresponde aos IDs favoritados!');
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Você ainda não favoritou nenhum produto.</span>';
    return;
  }
  // Renderizar grid de favoritos
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

  // Evento para remover dos favoritos
  box.querySelectorAll('.favorito-remover-btn').forEach(btn => {
    btn.onclick = async function() {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!essenzaUser || !Array.isArray(essenzaUser.favoritos)) return;
      essenzaUser.favoritos = essenzaUser.favoritos.filter(fid => fid !== id);
      localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
      // Atualizar favoritos no Firestore também
      if (essenzaUser && essenzaUser.cpf) {
        try {
          const db = window.db || firebase.firestore();
          await db.collection('clientes').doc(essenzaUser.cpf).update({ favoritos: essenzaUser.favoritos });
        } catch (e) {
          // opcional: mostrar erro
        }
      }
      renderFavoritosConta();
      // Opcional: chamar toggleFavorite(id) se quiser sincronizar com Firestore
      if (typeof toggleFavorite === 'function') toggleFavorite(id);
    };
  });
}

// Tenta rodar sempre que a aba Favoritos for exibida
function monitorTabFavoritos() {
  const tabBtn = document.getElementById('tabFavoritosBtn');
  if (!tabBtn) return;
  tabBtn.addEventListener('click', () => {
    renderFavoritosConta();
  });
  // Se abrir direto na aba favoritos
  if (window.location.search.includes('aba=favoritos')) {
    setTimeout(renderFavoritosConta, 120);
  }
}

// Aguarda DOM e products
window.addEventListener('DOMContentLoaded', () => {
  if (window.products && window.products.length) {
    monitorTabFavoritos();
  } else {
    // Espera products carregar
    let tentativas = 0;
    const tryInit = () => {
      if (window.products && window.products.length) {
        monitorTabFavoritos();
        // Garante renderização imediata se a aba Favoritos estiver visível
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
