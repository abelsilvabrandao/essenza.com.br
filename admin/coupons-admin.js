import { fetchCoupons, addCoupon, updateCoupon, deleteCoupon } from './coupons.js';

// Elements
const openAddCouponModalBtn = document.getElementById('openAddCouponModal');
const couponsTableBody = document.getElementById('couponsTableBody');

function clearForm() {
  couponForm.reset();
  couponForm.removeAttribute('data-edit-id');
  couponForm.querySelector('button[type="submit"]').textContent = 'Adicionar Cupom';
}

function renderCouponsTable(coupons) {
  couponsTableBody.innerHTML = '';
  coupons.forEach(coupon => {
    const start = coupon.startDate ? new Date(coupon.startDate).toLocaleDateString('pt-BR') : '-';
    const end = coupon.endDate ? new Date(coupon.endDate).toLocaleDateString('pt-BR') : '-';
    const today = new Date();
    let status = '';
    if (coupon.noExpiration || (!coupon.startDate && !coupon.endDate)) {
      status = '<span style="color:#007bff;font-weight:600">Sem expiração</span>';
    } else if (coupon.endDate) {
      const endDate = new Date(coupon.endDate);
      status = endDate < today ? '<span style="color:#ff1493;font-weight:600">Expirado</span>' : '<span style="color:#28a745;font-weight:600">Vigente</span>';
    } else {
      status = '<span style="color:#666">Indefinido</span>';
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${coupon.code}</td>
      <td>${coupon.type === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</td>
      <td>${coupon.type === 'percent' ? coupon.value + '%' : 'R$ ' + Number(coupon.value).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
      <td>${coupon.enableAgreement ? 'Sim' : 'Não'}</td>
      <td>${coupon.noExpiration || (!coupon.startDate && !coupon.endDate) ? 'Sem expiração' : (start + ' a ' + end)}</td>
      <td>${status}</td>
      <td>
        <div class="coupon-actions">
          <button class="btn-edit" data-edit="${coupon.id}"><i class="fas fa-edit"></i> Editar</button>
          <button class="delete-button" data-delete="${coupon.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
        </div>
      </td>
    `;
    couponsTableBody.appendChild(tr);
  });
}

let allCoupons = [];

async function refreshCoupons() {
  allCoupons = await fetchCoupons();
  renderCouponsTable(allCoupons);
}

function applyCouponFilters() {
  let filtered = [...allCoupons];
  const code = document.getElementById('filterCouponCode').value.trim().toUpperCase();
  const type = document.getElementById('filterCouponType').value;
  const minValue = parseFloat(document.getElementById('filterMinValue').value);
  const maxValue = parseFloat(document.getElementById('filterMaxValue').value);
  const agreement = document.getElementById('filterAgreement').checked;
  const validity = document.getElementById('filterValidity').value;
  const today = new Date();

  if (code) {
    filtered = filtered.filter(c => c.code.toUpperCase().includes(code));
  }
  if (type) {
    filtered = filtered.filter(c => c.type === type);
  }
  if (!isNaN(minValue)) {
    filtered = filtered.filter(c => Number(c.value) >= minValue);
  }
  if (!isNaN(maxValue)) {
    filtered = filtered.filter(c => Number(c.value) <= maxValue);
  }
  if (agreement) {
    filtered = filtered.filter(c => c.enableAgreement);
  }
  if (validity === 'active') {
    filtered = filtered.filter(c => {
      if (!c.endDate) return true;
      return new Date(c.endDate) >= today;
    });
  } else if (validity === 'expired') {
    filtered = filtered.filter(c => c.endDate && new Date(c.endDate) < today);
  } else if (validity === 'noexpiration') {
    filtered = filtered.filter(c => c.noExpiration || (!c.startDate && !c.endDate));
  }
  renderCouponsTable(filtered);
}

document.getElementById('applyCouponFilters').addEventListener('click', applyCouponFilters);
document.getElementById('clearCouponFilters').addEventListener('click', () => {
  document.getElementById('filterCouponCode').value = '';
  document.getElementById('filterCouponType').value = '';
  document.getElementById('filterMinValue').value = '';
  document.getElementById('filterMaxValue').value = '';
  document.getElementById('filterAgreement').checked = false;
  renderCouponsTable(allCoupons);
});

async function openCouponModal(initial = {}) {
  const {
    code = '',
    type = 'percent',
    value = '',
    enableAgreement = false,
    startDate = '',
    endDate = '',
    noExpiration = (typeof initial.noExpiration !== 'undefined' ? initial.noExpiration : false),
    id = null
  } = initial;
  const { value: formValues } = await Swal.fire({
    title: id ? 'Editar Cupom' : 'Adicionar Cupom',
    html:
      `<div class='coupon-form swal2-coupon-form' style='display:flex;flex-direction:column;gap:0.4rem;align-items:stretch;'>` +
        `<div class='form-group' style='display:flex;flex-direction:column;align-items:center;'>` +
          `<label for="swalCouponCode" style='color:#FF69B4;font-weight:600;margin-bottom:2px;text-align:center;'>Código</label>` +
          `<input id="swalCouponCode" class="swal2-input" maxlength="20" value="${code}" style='margin-bottom:0;max-width:250px;text-align:center;'>` +
        `</div>` +
        `<div class='form-group' style='display:flex;flex-direction:row;align-items:center;gap:4px;'>` +
          `<label for="swalCouponType" style='color:#FF69B4;font-weight:600;width:90px;'>Tipo</label>` +
          `<select id="swalCouponType" class="swal2-select" style='width:50px;max-width:50px;'><option value="percent"${type==='percent'?' selected':''}>Percentual (%)</option><option value="fixed"${type==='fixed'?' selected':''}>Valor (R$)</option></select>` +
        `</div>` +
        `<div class='form-group' style='display:flex;flex-direction:row;align-items:center;gap:4px;'>` +
          `<label for="swalCouponValue" style='color:#FF69B4;font-weight:600;width:90px;'>Valor</label>` +
          `<input id="swalCouponValue" class="swal2-input" type="number" step="any" value="${value}" style='flex:1;'>` +
        `</div>` +
        `<div class='form-group checkbox-container' style='display:flex;flex-direction:row;align-items:center;gap:10px;justify-content:center;margin:0 0 0.2rem 0;'>` +
          `<input id="swalCouponAgreement" type="checkbox"${enableAgreement?' checked':''}>` +
          `<label for="swalCouponAgreement" style='color:#FF69B4;font-weight:600;'>Habilita Acordo</label>` +
        `</div>` +
        `<div class='form-group' style='display:flex;flex-direction:row;align-items:center;gap:4px;'>` +
          `<label for="swalCouponStart" style='color:#FF69B4;font-weight:600;width:90px;'>Início</label>` +
          `<input id="swalCouponStart" class="swal2-input" type="date" value="${startDate}" ${noExpiration?'disabled':''} style='flex:1;max-width:160px;'>` +
        `</div>` +
        `<div class='form-group' style='display:flex;flex-direction:row;align-items:center;gap:4px;'>` +
          `<label for="swalCouponEnd" style='color:#FF69B4;font-weight:600;width:90px;'>Fim</label>` +
          `<input id="swalCouponEnd" class="swal2-input" type="date" value="${endDate}" ${noExpiration?'disabled':''} style='flex:1;max-width:160px;'>` +
        `</div>` +
        `<div class='form-group checkbox-container' style='display:flex;flex-direction:row;align-items:center;gap:10px;justify-content:center;margin:0.5rem 0 0 0;'>` +
          `<input id="swalNoExpiration" type="checkbox"${noExpiration?' checked':''}>` +
          `<label for="swalNoExpiration" style='color:#FF69B4;font-weight:600;'>Validade sem expiração</label>` +
        `</div>` +
      `</div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: id ? 'Salvar Alterações' : 'Adicionar Cupom',
    confirmButtonColor: '#FF69B4',
    preConfirm: () => {
      const code = document.getElementById('swalCouponCode').value.trim().toUpperCase();
      const type = document.getElementById('swalCouponType').value;
      const value = parseFloat(document.getElementById('swalCouponValue').value);
      const enableAgreement = document.getElementById('swalCouponAgreement').checked;
      const noExpiration = document.getElementById('swalNoExpiration').checked;
      let startDate = document.getElementById('swalCouponStart').value;
      let endDate = document.getElementById('swalCouponEnd').value;
      if (noExpiration) {
        startDate = '';
        endDate = '';
      }
      if (!code || isNaN(value) || value < 0) {
        Swal.showValidationMessage('O valor do cupom deve ser zero ou positivo.');
        return false;
      }
      if (!enableAgreement && value === 0) {
        Swal.showValidationMessage('O valor do cupom deve ser maior que zero, exceto se for para habilitar acordo.');
        return false;
      }
      if (!noExpiration && startDate && endDate && endDate < startDate) {
        Swal.showValidationMessage('A data de validade deve ser igual ou posterior à data de início.');
        return false;
      }
      return { code, type, value, enableAgreement, startDate, endDate, noExpiration };
    }
  });
  if (formValues) {
    const data = formValues;
    if (data.noExpiration) {
      data.startDate = '';
      data.endDate = '';
    }
    if (id) {
      await updateCoupon(id, data);
    } else {
      await addCoupon(data);
    }
    await refreshCoupons();
    Swal.fire({icon:'success',title:'Cupom salvo com sucesso!',showConfirmButton:false,timer:1200});
  }
}

// Habilita/desabilita campos de data conforme o checkbox no modal
if (typeof window !== 'undefined') {
  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'swalNoExpiration') {
      const disable = e.target.checked;
      const start = document.getElementById('swalCouponStart');
      const end = document.getElementById('swalCouponEnd');
      if (start) start.disabled = disable;
      if (end) end.disabled = disable;
    }
  });
}


if (openAddCouponModalBtn) {
  openAddCouponModalBtn.addEventListener('click', () => openCouponModal());
}


couponsTableBody.addEventListener('click', async (e) => {
  if (e.target.matches('[data-edit]')) {
    const id = e.target.getAttribute('data-edit');
    const coupons = await fetchCoupons();
    const coupon = coupons.find(c => c.id === id);
    if (coupon) {
      await openCouponModal({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        enableAgreement: !!coupon.enableAgreement,
        startDate: coupon.startDate || '',
        endDate: coupon.endDate || '',
        noExpiration: coupon.noExpiration || (!coupon.startDate && !coupon.endDate),
        id: coupon.id
      });
    }
  } else if (e.target.matches('[data-delete]')) {
    const id = e.target.getAttribute('data-delete');
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita! O cupom será removido permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff1493',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await deleteCoupon(id);
        await refreshCoupons();
        Swal.fire({
          title: 'Excluído!',
          text: 'O cupom foi excluído com sucesso.',
          icon: 'success',
          confirmButtonColor: '#4CAF50',
          timer: 1600
        });
      } catch (error) {
        Swal.fire({
          title: 'Erro!',
          text: 'Ocorreu um erro ao excluir o cupom.',
          icon: 'error',
          confirmButtonColor: '#ff1493'
        });
      }
    }
  }
});

// Inicialização
refreshCoupons();
window.refreshCoupons = refreshCoupons;
