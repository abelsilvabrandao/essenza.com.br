// vendas-clientes.js
// Funções para aprimorar o formulário de cliente do vendas.html

// Máscara de telefone (formato brasileiro)
export function maskPhone(input) {
  input.addEventListener('input', function(e) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    } else {
      v = v.replace(/(\d{0,2})/, '($1');
    }
    input.value = v;
  });
}

// Sugestão de domínio de e-mail
export function suggestEmail(input) {
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br'];
  input.addEventListener('input', function(e) {
    const val = input.value;
    if (val.includes('@')) {
      const [user, domain] = val.split('@');
      if (domain && !domains.some(d => d.startsWith(domain))) {
        input.setCustomValidity('Confira o domínio do e-mail');
      } else {
        input.setCustomValidity('');
      }
    } else {
      input.setCustomValidity('');
    }
  });
  input.addEventListener('blur', function(e) {
    const val = input.value;
    if (val && !val.includes('@')) {
      input.value = val + '@gmail.com';
    }
  });
}

// Validação automática dos campos
export function validateClienteForm(form) {
  form.addEventListener('submit', function(e) {
    if (!form.nome.value.trim()) {
      form.nome.focus();
      e.preventDefault();
      return false;
    }
    if (!/^\([1-9]{2}\)\s?9?\d{4}-\d{4}$/.test(form.cel.value)) {
      form.cel.focus();
      form.cel.setCustomValidity('Celular inválido. Use o formato (99) 99999-9999');
      e.preventDefault();
      return false;
    } else {
      form.cel.setCustomValidity('');
    }
    if (form.email.value && !/^\S+@\S+\.\S+$/.test(form.email.value)) {
      form.email.focus();
      form.email.setCustomValidity('E-mail inválido');
      e.preventDefault();
      return false;
    } else {
      form.email.setCustomValidity('');
    }
    return true;
  });
}

// Busca e preenchimento automático de cliente recorrente
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';
export async function buscarClientePorTelefoneOuEmail(cel, email) {
  const db = window.db || getFirestore();
  let cliente = null;
  if (cel) {
    const q = query(collection(db, 'clientes'), where('celular', '==', cel));
    const snap = await getDocs(q);
    if (!snap.empty) cliente = snap.docs[0].data();
  }
  if (!cliente && email) {
    const q = query(collection(db, 'clientes'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) cliente = snap.docs[0].data();
  }
  return cliente;
}
