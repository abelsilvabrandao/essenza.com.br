// auth-protect.js
// Proteção de acesso para estoque.html usando Firebase Auth

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

const ADMIN_EMAIL = "abelsilvabrandao@gmail.com";

function showLoginOverlay() {
    let overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-modal">
        <div class="logo-row"><img src="../img/logo.png" alt="Essenza" class="login-logo"><span class="essenza-title essenza-login-title">ESSENZA</span></div>
        <form id="login-form">
  <input type="email" id="login-email" placeholder="E-mail" required autofocus autocomplete="username" />
  <div class="password-wrapper">
    <input type="password" id="login-password" placeholder="Senha" required autocomplete="current-password" />
    <button type="button" id="toggle-password" tabindex="-1" aria-label="Mostrar ou ocultar senha"><i class="fas fa-eye"></i></button>
  </div>
  <button type="submit">Entrar</button>
</form>
<div class="login-separator"><span>ou</span></div>
<button id="google-login-btn" class="google-login-btn" type="button"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="height:1.2em;vertical-align:middle;margin-right:0.6em;">Entrar com Google</button>
        <a href="#" id="forgot-password" class="forgot-link">Esqueci a senha</a>
        <div class="login-error" id="login-error"></div>
        <div class="login-success" id="login-success" style="display:none"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Mostrar/ocultar senha
    const pwInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('toggle-password');
    toggleBtn.onclick = (e) => {
        e.preventDefault();
        if (pwInput.type === 'password') {
            pwInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            pwInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    };

    // Login com Google
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
      googleBtn.onclick = async () => {
        try {
          const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js');
          const auth = getAuth();
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          // Se não for admin, faz logout e mostra erro
          if (result.user.email !== ADMIN_EMAIL) {
            await auth.signOut();
            document.getElementById('login-error').textContent = 'Apenas o administrador pode acessar.';
          }
        } catch (err) {
          document.getElementById('login-error').textContent = 'Erro ao autenticar com Google.';
        }
      };
    }

    // Esqueci a senha
    document.getElementById('forgot-password').onclick = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        if (!email) {
            document.getElementById('login-error').textContent = 'Digite seu e-mail para redefinir a senha.';
            return;
        }
        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            document.getElementById('login-success').style.display = 'block';
            document.getElementById('login-success').textContent = 'E-mail de redefinição enviado! Verifique sua caixa de entrada.';
            document.getElementById('login-error').textContent = '';
        } catch (err) {
            document.getElementById('login-error').textContent = 'Não foi possível enviar o e-mail de redefinição.';
        }
    };

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            document.getElementById('login-error').textContent = 'E-mail ou senha inválidos.';
        }
    };
}

function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
}

function showAccessDenied() {
    let overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-modal denied">
        <h2>Acesso Negado</h2>
        <p>Somente o administrador pode acessar esta área.</p>
        <button id="logout-btn">Sair</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.getElementById('logout-btn').onclick = () => {
        const auth = getAuth();
        signOut(auth);
    };
}

function setupAuthProtection() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            showLoginOverlay();
            document.getElementById('login-form').onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                } catch (err) {
                    document.getElementById('login-error').textContent = 'E-mail ou senha inválidos.';
                }
            };
        } else if (user.email !== ADMIN_EMAIL) {
            hideLoginOverlay();
            showAccessDenied();
        } else {
            hideLoginOverlay();
        }
    });
}

window.setupAuthProtection = setupAuthProtection;

// STATUS DE LOGIN NA PÁGINA
function updateLoginStatus(user) {
  const statusEl = document.getElementById('admin-login-status');
  if (!statusEl) return;
  if (user && user.email === ADMIN_EMAIL) {
    const nome = user.displayName || user.email.split('@')[0];
    const email = user.email;
    const foto = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp&s=60';
    statusEl.innerHTML = `
      <div class="login-status-box">
        <img src="${foto}" alt="Avatar" class="login-status-avatar" />
        <div class="login-status-info">
          <div class="login-status-name">${nome}</div>
          <div class="login-status-email">${email}</div>
        </div>
        <button id="logout-btn" class="login-status-logout">Sair</button>
      </div>
    `;
    document.getElementById('logout-btn').onclick = async () => {
      await getAuth().signOut();
      window.location.reload();
    };
  } else {
    statusEl.innerHTML = '';
  }
}


// Atualiza status ao autenticar/deslogar
try {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    updateLoginStatus(user);
    // Corrige bug: desbloqueia overlay se o admin logar após tentativa negada
    const overlay = document.getElementById('login-overlay');
    if (user && user.email === ADMIN_EMAIL && overlay) {
      hideLoginOverlay();
    }
  });
} catch(e) { /* ignora se não for página protegida */ }


// Estilos para o overlay
const style = document.createElement('style');
style.innerHTML = `
.admin-login-status, .login-status-box {
  display: flex; align-items: center; gap: 1.1em;
  background: #19191a; border: 1.5px solid #D4AF37; border-radius: 12px;
  padding: 0.6em 1.2em 0.6em 0.7em; margin: 0.8em 0 0.8em 2em;
  box-shadow: 0 2px 10px rgba(212,175,55,0.07);
  min-width: 260px; max-width: 350px;
}
.login-status-avatar {
  width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
  border: 2px solid #D4AF37; background: #232326;
}
.login-status-info {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
}
.login-status-name {
  color: #fff; font-weight: 700; font-size: 1.08rem; font-family: 'Playfair Display', serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.login-status-email {
  color: #D4AF37; font-size: 0.97rem; font-family: 'Poppins', serif; margin-top: 0.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.login-status-logout {
  background: #19191a; color: #D4AF37; border: 1.5px solid #D4AF37; border-radius: 7px;
  font-size: 0.97rem; font-weight: 600; padding: 0.35em 1.1em; margin-left: 1em; cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.login-status-logout:hover {
  background: #D4AF37; color: #19191a; border-color: #bfa14a;
}

.google-login-btn {
  width: 100%; background: #fff; color: #19191a; border: 1.5px solid #D4AF37;
  border-radius: 8px; font-size: 1.05rem; font-weight: 600;
  padding: 0.7rem 0; margin-top: 1rem; margin-bottom: 0.7rem;
  display: flex; align-items: center; justify-content: center;
  gap: 0.5em; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s;
  box-shadow: 0 2px 8px rgba(212,175,55,0.07);
}
.google-login-btn:hover {
  background: #fffbe7;
  border-color: #bfa14a;
  color: #a8891a;
}
.login-separator {
  display: flex; align-items: center; text-align: center; margin: 1rem 0 0.2rem 0;
}
.login-separator span {
  color: #fff; font-size: 0.93rem; font-family: 'Poppins', 'Playfair Display', serif;
  margin: 0 0.7em;
}
.login-separator:before, .login-separator:after {
  content: ""; flex: 1; border-bottom: 1.5px solid #D4AF37; opacity: 0.7;
}

#login-overlay {
  position: fixed; z-index: 9999; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10,10,10,0.98); display: flex; align-items: center; justify-content: center;
}
.login-modal {
  background: #19191a; border-radius: 18px; box-shadow: 0 8px 32px rgba(212,175,55,0.10);
  padding: 2.5rem 2rem; max-width: 360px; width: 100%; text-align: center;
  border: 2px solid #D4AF37;
  color: #fff;
}
.logo-row {
  display: flex; align-items: center; justify-content: center;
  gap: 1rem; margin-bottom: 1.5rem;
}
.login-logo {
  max-width: 56px; height: 56px; border-radius: 14px; box-shadow: 0 2px 8px rgba(255,20,147,0.10);
  margin-bottom: 0;
}
.essenza-title.essenza-login-title {
  font-family: 'Playfair Display', serif;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.7rem;
  letter-spacing: 0.18em;
  text-align: center;
  text-shadow: 0 2px 12px #000, 0 2px 8px #D4AF37;
  background: none;
  padding: 0 0.2em;
  display: flex; align-items: center;
}

.login-modal input {
  width: 100%; padding: 0.7rem 1.1rem; margin-bottom: 1.1rem;
  border: 1.5px solid #D4AF37; border-radius: 8px;
  font-size: 1.08rem; outline: none; transition: border 0.2s, box-shadow 0.2s;
  background: #fff; color: #19191a;
  box-shadow: 0 2px 10px rgba(212,175,55,0.08);
  font-family: 'Poppins', 'Playfair Display', serif;
}
.login-modal input:focus {
  border-color: #a8891a;
  box-shadow: 0 0 0 2px #d4af3722;
}
.login-modal input::placeholder {
  color: #bdbdbd;
  opacity: 1;
  font-family: 'Poppins', 'Playfair Display', serif;
}
.password-wrapper { position: relative; }
.password-wrapper input { padding-right: 2.5rem; }
#toggle-password {
  position: absolute; right: 12px; top: 0; bottom: 0;
  background: none; border: none; color: #D4AF37; font-size: 1.4rem; cursor: pointer; outline: none;
  padding: 0; margin: 0;
  width: 2.1rem; height: 100%; display: flex; align-items: center; justify-content: center;
  transition: color 0.2s;
}
#toggle-password:hover, #toggle-password:focus {
  color: #a8891a;
}


.login-modal input:focus { border-color: #D4AF37; }
.login-modal button[type="submit"] {
  width: 100%; background: linear-gradient(90deg,#D4AF37 0%, #bfa14a 100%); color: #19191a; border: none; border-radius: 12px;
  padding: 0.9rem; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: background 0.2s;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(212,175,55,0.10);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.login-modal button[type="submit"]:hover, .login-modal button[type="submit"]:active {
  background: linear-gradient(90deg,#a8891a 0%, #bfa14a 100%);
  color: #19191a;
  filter: brightness(0.95);
}

.login-modal button[type="submit"]:hover { background:rgb(111, 104, 7); }
.forgot-link {
  display: block; color: #D4AF37; text-decoration: underline; font-size: 1rem;
  margin-bottom: 0.8rem; margin-top: -0.6rem; cursor: pointer;
  transition: color 0.2s;
}
.forgot-link:hover {
  color: #a8891a;
}

.login-error, .login-success {
  color: #fff; background: #232326; border-radius: 8px; padding: 0.5rem 0.7rem; margin-top: 0.6rem; font-size: 1rem;
  border-left: 3px solid #D4AF37;
}
.login-error { color: #ffd6b3; }
.login-success { color: #fff8e1; }
.login-error { color: #D4AF37; margin-top: 0.5rem; font-size: 1rem; }
.login-success { color: #D4AF37; margin-top: 0.5rem; font-size: 1rem; }
.login-modal.denied { border-color: #D4AF37; }
.login-modal.denied h2 { color: #D4AF37; }
`;
document.head.appendChild(style);
