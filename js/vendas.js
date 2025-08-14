import { getCouponByCode } from './coupons-client.js';

let appliedCoupon = null;
window.appliedCoupon = appliedCoupon; // garantir referência global


const couponInput = document.getElementById('couponInput');
const applyCouponBtn = document.getElementById('applyCouponBtn');
const clearCouponBtn = document.getElementById('clearCouponBtn');
const couponFeedback = document.getElementById('couponFeedback');
const acordoChip = document.getElementById('acordoChip');

function updateAcordoVisibility() {
  if (appliedCoupon && appliedCoupon.enableAgreement) {
    acordoChip.style.display = '';
  } else {
    acordoChip.style.display = 'none';
    // If "Acordo" was selected, fallback to Pix
    const paymentAgreement = document.getElementById('paymentMethodAgreement');
    if (paymentAgreement && paymentAgreement.checked) {
      document.getElementById('paymentMethodPix').checked = true;
    }
  }
}

async function handleCoupon() {
  const code = couponInput.value.trim().toUpperCase();
  appliedCoupon = null;
  couponFeedback.textContent = '';
  couponFeedback.className = 'coupon-feedback';
  if (code) {
    const coupon = await getCouponByCode(code);
    if (coupon) {
      // Validate date if needed
      const now = new Date();
      if (coupon.startDate && new Date(coupon.startDate) > now) {
        couponFeedback.textContent = 'Este cupom ainda não está válido.';
        couponFeedback.classList.add('input-error');
      } else if (coupon.endDate && new Date(coupon.endDate) < now) {
        couponFeedback.textContent = 'Este cupom expirou.';
        couponFeedback.classList.add('input-error');
      } else {
        appliedCoupon = coupon;
        window.appliedCoupon = appliedCoupon;
        couponFeedback.textContent = 'Cupom aplicado!';
        couponFeedback.classList.add('success');
      }
    } else {
      couponInput.classList.add('input-error');
      couponFeedback.textContent = 'O cupom informado não existe ou está incorreto.';
    }
  }
  if (window.renderPayChips) window.renderPayChips();
  updateAcordoVisibility();
  updateCartTotals();
}

function updateClearCouponBtn() {
  if (couponInput.value.trim()) {
    clearCouponBtn.style.display = '';
  } else {
    clearCouponBtn.style.display = 'none';
  }
}

function updateCartTotals() {
  // Elements
  const totalEl = document.getElementById('total');
  const installmentsSelect = document.getElementById('installments');
  const installmentInfo = document.getElementById('installmentInfo');
  let total = 0;
  let pixTotal = 0;
  let finalTotal = 0;
  let couponDiscount = 0;
  let payment = window.formaSelecionada || 'Pix';
  // Find local cart/products
  let localCart = window.cart || [];
  let localProducts = window.products || [];

  // Calculate base totals
  for (const item of localCart) {
    const product = localProducts.find(p => p.id === item.id);
    if (!product) continue;
    const price = (payment === 'Pix' || payment === 'Dinheiro' || payment === 'Débito') ? (product.precoPix && product.precoPix < product.preco ? product.precoPix : product.preco) : product.preco;
    total += product.preco * item.qty;
    pixTotal += (product.precoPix && product.precoPix < product.preco ? product.precoPix : product.preco) * item.qty;
    finalTotal += price * item.qty;
  }

  // Apply coupon
  // Sempre usar window.appliedCoupon para garantir sincronismo
  const activeCoupon = window.appliedCoupon;
  if (activeCoupon) {
    if (activeCoupon.type === 'percent') {
      couponDiscount = Math.round(finalTotal * (activeCoupon.value / 100));
      finalTotal = Math.max(0, finalTotal - couponDiscount);
    } else if (activeCoupon.type === 'fixed') {
      couponDiscount = activeCoupon.value;
      finalTotal = Math.max(0, finalTotal - couponDiscount);
    }
  }

  // Update total UI
  if (totalEl) {
    totalEl.textContent = (window.formatBRL ? window.formatBRL(finalTotal) : `R$ ${finalTotal.toFixed(2)}`);
  }

  // Handle installments (Crédito/Acordo)
  if (installmentsSelect && (payment === 'Crédito' || payment === 'Acordo')) {
    const installments = parseInt(installmentsSelect.value) || 1;
    const parcela = finalTotal / installments;
    if (installmentInfo) {
      installmentInfo.textContent = `${installments}x de ${(window.formatBRL ? window.formatBRL(parcela) : `R$ ${parcela.toFixed(2)}`)} sem juros`;
    }
  } else if (installmentInfo) {
    installmentInfo.textContent = '';
  }
}

// Expose globally for event handlers
window.updateCartTotals = updateCartTotals;

if (applyCouponBtn) applyCouponBtn.addEventListener('click', handleCoupon);
if (clearCouponBtn) clearCouponBtn.addEventListener('click', () => {
  couponInput.value = '';
  appliedCoupon = null;
  window.appliedCoupon = null;
  couponFeedback.textContent = '';
  couponFeedback.className = 'coupon-feedback';
  updateAcordoVisibility();
  if (window.renderPayChips) window.renderPayChips();
  updateCartTotals();
  updateClearCouponBtn();
});
couponInput.addEventListener('input', updateClearCouponBtn);

window.getAppliedCoupon = () => appliedCoupon;
window.updateAcordoVisibility = updateAcordoVisibility;
