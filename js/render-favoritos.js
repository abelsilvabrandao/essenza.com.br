// Renderizador de favoritos para minha-conta.html
// Este script deve ser incluído após window.products estar disponível

function renderFavoritosConta() {
  const section = document.getElementById('sectionFavoritos');
  if (!section) return;
  const box = section.querySelector('.account-data-box');
  if (!box) return;

  let essenzaUser = null;
  try {
    essenzaUser = JSON.parse(localStorage.getItem('essenzaUser'));
  } catch {}
  const favoritos = (essenzaUser && Array.isArray(essenzaUser.favoritos)) ? essenzaUser.favoritos : [];

  if (!window.products || window.products.length === 0) {
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Nenhum produto disponível no momento.</span>';
    return;
  }
  if (!favoritos.length) {
    box.innerHTML = '<span style="color:#888;font-size:1.13em;">Você ainda não favoritou nenhum produto.</span>';
    return;
  }

  // Filtrar produtos favoritos
  const favProducts = window.products.filter(p => favoritos.includes(p.id));
  if (!favProducts.length) {
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
    btn.onclick = function() {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!essenzaUser || !Array.isArray(essenzaUser.favoritos)) return;
      essenzaUser.favoritos = essenzaUser.favoritos.filter(fid => fid !== id);
      localStorage.setItem('essenzaUser', JSON.stringify(essenzaUser));
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
    setTimeout(renderFavoritosConta, 60);
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
      } else if (++tentativas < 30) {
        setTimeout(tryInit, 150);
      }
    };
    tryInit();
  }
});
