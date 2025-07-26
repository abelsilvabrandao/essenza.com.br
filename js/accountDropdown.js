// Dropdown interativo para 'Minha Conta' no cabeçalho

document.addEventListener('DOMContentLoaded', function () {
  const dropdown = document.getElementById('accountDropdown');
  const btn = document.getElementById('accountBtn');
  const menu = document.getElementById('accountMenu');

  if (!dropdown || !btn || !menu) return;

  // Toggle dropdown
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
    dropdown.classList.toggle('open', !expanded);
    if (!expanded) {
      menu.querySelector('button, a')?.focus();
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target)) {
      btn.setAttribute('aria-expanded', 'false');
      dropdown.classList.remove('open');
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      btn.setAttribute('aria-expanded', 'false');
      dropdown.classList.remove('open');
      btn.focus();
    }
  });

  // Acessibilidade: fechar com Tab fora do menu
  menu.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      setTimeout(() => {
        if (!menu.contains(document.activeElement)) {
          btn.setAttribute('aria-expanded', 'false');
          dropdown.classList.remove('open');
        }
      }, 10);
    }
  });
});
