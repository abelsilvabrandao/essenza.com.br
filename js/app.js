import { loadProducts } from './products.js';

/**
 * Formata a descrição do produto para exibição (título com * e sublinhado colorido, texto justificado)
 * @param {string} description
 * @param {string} underlineColor
 * @returns {string}
 */
function formatProductDescription(description, underlineColor = 'underline-primary') {
  if (!description) return '';
  const lines = description.split(/\r?\n/);
  let html = '';
  lines.forEach((line, idx) => {
    const titleMatch = line.trim().match(/^\*\*(.+)\*\*$/);
    if (titleMatch) {
      const cleanTitle = titleMatch[1].trim();
      // Se não for o primeiro título, adiciona espaçamento antes
      if (html.trim() !== '') {
        html += '<div style="height:0.7em"></div>';
      }
      html += `<span class="desc-title ${underlineColor}"><b>${escapeHtml(cleanTitle)}</b></span><br>`;
    } else if (line.trim()) {
      html += `<div class="desc-text">${escapeHtml(line.trim())}</div>`;
    }
    if (!line.trim() && idx !== 0) {
      html += '<div style="height:0.5em"></div>';
    }
  });
  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}


// Inicializar listener em tempo real para produtos
export function listenProductsRealtime() {
    const productsCol = collection(window.db, 'products');
    onSnapshot(productsCol, (snapshot) => {
        const products = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            products.push({
                id: doc.id,
                name: data.name || 'Produto sem nome',
                category: data.category || 'Sem categoria',
                price: data.price || 0,
                pixPrice: data.pixPrice || data.price || 0,
                imageUrl: data.imageUrl || '/img/placeholder.png',
                description: data.description || '',
                quantity: data.quantity || 0,
                active: data.active === false ? false : true,
                specialOffer: data.specialOffer || false,
                oldPrice: data.oldPrice || null
            });
        });
        window.products = products;
        if (typeof renderProductList === 'function') renderProductList();
    });
}

// Forçar atualização dos produtos do Firestore
export async function refreshProducts() {
    window.products = await loadProducts();
    if (typeof renderProductList === 'function') renderProductList();
}
import { collection, onSnapshot, addDoc, getDocs, query, where, getDoc, doc, updateDoc, increment, writeBatch, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

// Estado global
let cart = [];  // Carrinho de compras
let products = [];  // Lista de produtos
let currentOrderData = null;  // Dados do pedido atual

// Exportar funções para uso no HTML
export {
    removeFromCart,
    updateCartState,
    updateCartCount,
    updateCartTotals,
    toggleCart,
    closeCartModal,
    requestOutOfStockProduct,
    openWaitlistModal,
    closeWaitlistModal,
    handleWaitlistSubmit,
    resetOrderConfirmation,
    doResetOrder,
    initializeProductsGrid,
    initializeDOMReferences
};

// Tornar funções globais para uso inline
window.resetOrderConfirmation = resetOrderConfirmation;
window.updateCartTotals = updateCartTotals;

// Garantir que temos as referências DOM antes de qualquer operação
function ensureDOMReferences() {
    const elements = {
        cartItems: document.getElementById('cartItems'),
        cartIcon: document.getElementById('cartIcon'),
        cartTotalContainer: document.getElementById('cartTotalContainer'),
        checkoutForm: document.getElementById('checkoutForm'),
        emptyCart: document.getElementById('emptyCart'),
        closeCart: document.getElementById('closeCart'),
        cartOverlay: document.getElementById('cartOverlay'),
        installments: document.getElementById('installments')
    };

    // Verificar se todos os elementos essenciais existem
    const requiredElements = ['cartItems', 'cartIcon', 'cartTotalContainer', 'checkoutForm', 'emptyCart'];
    const missingElements = requiredElements.filter(id => !elements[id]);

    if (missingElements.length > 0) {
        console.warn('Elementos DOM não encontrados:', missingElements);
        return false;
    }

    // Adicionar event listeners
    if (elements.closeCart) elements.closeCart.addEventListener('click', closeCartModal);
    if (elements.cartOverlay) elements.cartOverlay.addEventListener('click', closeCartModal);
    if (elements.installments) elements.installments.addEventListener('change', updateInstallments);
    if (elements.cartIcon) elements.cartIcon.addEventListener('click', toggleCart);

    return true;
}

// Inicializar referências DOM
function initializeDOMReferences() {
    if (ensureDOMReferences()) {
        console.log('Referências DOM inicializadas com sucesso');
        return true;
    }
    return false;
}

// Função principal para adicionar ao carrinho
async function addToCart(productId) {
    if (!ensureDOMReferences()) return;

    try {
        const product = (window.products || []).find(p => String(p.id) === String(productId));
        if (!product) {
            console.error('Produto não encontrado:', productId);
            Swal.fire({
                title: 'Erro',
                text: 'Produto não encontrado. Por favor, tente novamente.',
                icon: 'error',
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }

        // Verificar se o produto está ativo e tem estoque
        if (!product.active || product.quantity <= 0) {
            const { isConfirmed } = await Swal.fire({
                title: 'Produto Indisponível',
                text: 'Este produto está sem estoque no momento. Deseja ser avisado quando estiver disponível?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, me avise!',
                cancelButtonText: 'Não, obrigado',
                confirmButtonColor: '#ff1493',
                cancelButtonColor: '#6c757d'
            });
            
            if (isConfirmed) {
                await requestOutOfStockProduct(productId);
            }
            return;
        }

        // Encontrar o item no carrinho
        const currentCartItem = cart.find(item => String(item.id) === String(productId));
        const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
        const remaining = product.quantity - currentCartQuantity;

        // Verificar se ainda há estoque disponível
        if (remaining <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Estoque esgotado',
                text: 'Este produto não possui mais unidades disponíveis no momento.',
                confirmButtonColor: '#ff1493',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }

        // Adicionar ao carrinho ou incrementar quantidade
        if (currentCartItem) {
            currentCartItem.quantity++;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                pixPrice: product.pixPrice,
                imageUrl: product.imageUrl,
                quantity: 1
            });
        }

        // Atualizar a interface
        await updateCartState();
        
        // Mostrar feedback visual
        const newRemaining = remaining - 1;
        const toastOptions = {
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        };

        if (newRemaining > 2) {
            await Swal.fire({
                ...toastOptions,
                icon: 'success',
                title: 'Adicionado ao carrinho!',
                text: `${product.name} foi adicionado ao carrinho.`
            });
        } else {
            let alertText = '';
            if (newRemaining === 2) {
                alertText = 'Apenas 2 unidades restantes!';
            } else if (newRemaining === 1) {
                alertText = 'Última unidade disponível!';
            } else if (newRemaining === 0) {
                alertText = 'Você adicionou a última unidade disponível!';
            }
            
            await Swal.fire({
                ...toastOptions,
                icon: 'info',
                title: 'Atenção! Aproveite!',
                text: alertText,
                timer: 2500
            });
        }
        
        // Atualizar contagem do carrinho na barra de navegação
        updateCartCount();

    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao adicionar o produto ao carrinho.',
            icon: 'error'
        });
    }
}
window.addToCart = addToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;

// Inicializar variáveis globais
let currentCarouselIndex = 0;
let productsGrid = null;
let carousel = null;
let prevButton = null;
let nextButton = null;


// Variáveis para controle do swipe
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

// Inicializar carousel
function initializeCarousel() {
    carousel = document.getElementById('productsCarousel');
    prevButton = document.getElementById('prevButton');
    nextButton = document.getElementById('nextButton');

    if (!carousel || !prevButton || !nextButton) {
        console.warn('Elementos do carousel não encontrados');
        return;
    }

    // Adicionar event listeners para swipe
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    });

    // Adicionar event listeners para mouse
    carousel.addEventListener('mousedown', (e) => {
        touchStartX = e.clientX;
    });

    carousel.addEventListener('mouseup', (e) => {
        touchEndX = e.clientX;
        handleSwipe();
    });

    // Adicionar event listeners para swipe
    carousel.addEventListener('mouseenter', () => {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
    });

    carousel.addEventListener('mouseleave', () => {
        startAutoScroll();
    });

    // Inicializar com a primeira página
    updateCarousel();

    // Iniciar rolagem automática
    startAutoScroll();
}

// Função para lidar com o swipe
function handleSwipe() {
    const swipeDistance = touchStartX - touchEndX;
    

}
let productsGridInitialized = false;

function calculateItemsPerView() {
    const width = window.innerWidth;
    if (width < 576) return 1;  // Extra small devices
    if (width < 768) return 2;  // Small devices
    if (width < 992) return 3;  // Medium devices
    return 4;  // Large devices and up
}

function initializeProductsGrid() {
    if (productsGridInitialized) return;
    
    productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.warn('Elemento productsGrid não encontrado, tentando novamente em 100ms');
        setTimeout(initializeProductsGrid, 100);
        return;
    }
    
    console.log('Grid de produtos inicializado com sucesso');
    
    // Verificar se estamos em um carrossel ou grid
    carousel = productsGrid.querySelector('.products-carousel');
    
    if (carousel) {
        setupCarousel();
    } else {
        // Configuração para grid responsivo
        const updateGridLayout = () => {
            const itemsPerRow = calculateItemsPerView();
            const items = productsGrid.querySelectorAll('.product-grid-item');
            
            items.forEach((item) => {
                // Remove classes de posicionamento do carrossel
                item.style.transform = '';
                item.style.opacity = '1';
                item.style.position = 'relative';
                item.style.left = '0';
                item.style.zIndex = '1';
                
                // Adiciona classe para itens ativos
                item.classList.add('active');
                
                // Remove classe 'middle' para evitar conflitos
                item.classList.remove('middle');
            });
            
            // Atualiza o grid para o número correto de colunas
            productsGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${Math.max(250, 100/itemsPerRow - 2)}px, 1fr))`;
            productsGrid.style.gap = '1.5rem';
        };
        
        // Atualiza o layout quando a janela for redimensionada
        window.addEventListener('resize', updateGridLayout);
        updateGridLayout();
    }
    
    // Inicia atualização em tempo real dos produtos
    if (typeof listenProductsRealtime === 'function') listenProductsRealtime();
    
    productsGridInitialized = true;
}

// Initialize products
async function getStockStatus(productId) {
    try {
        const productsCollection = collection(window.db, 'products');
        const productDoc = await getDoc(doc(productsCollection, productId));
        
        if (!productDoc.exists()) {
            console.error('Produto não encontrado:', productId);
            return { class: 'out-of-stock', text: 'Produto Indisponível' };
        }
        
        const product = productDoc.data();
        if (!product.active || product.quantity <= 0) return { class: 'out-of-stock', text: 'Produto Indisponível' };
        if (product.quantity <= 2) return { class: 'low-stock', text: product.quantity === 1 ? 'Última unidade em estoque!' : 'Apenas 2 em estoque!' };
        return { class: '', text: '' }; // Não mostrar texto para 3+ unidades
    } catch (error) {
        console.error('Erro ao verificar estoque:', error);
        return { class: 'out-of-stock', text: 'Produto Indisponível' };
    }
}

// Cache para armazenar o HTML dos produtos e evitar renderizações desnecessárias
let productsCache = new Map();
let lastCartState = JSON.stringify([]);

async function renderProductList() {
    if (!productsGrid) return;

    try {
        // Exibir todos os produtos, inclusive desativados
        const allProducts = window.products.slice();
        
        // Verificar se houve mudanças no carrinho
        const currentCartState = JSON.stringify(cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        })));
        
        // Se não houve mudanças no carrinho e já temos os produtos em cache, não precisa renderizar novamente
        if (currentCartState === lastCartState && productsCache.size > 0) {
            return;
        }
        
        lastCartState = currentCartState;
        console.log('Atualizando lista de produtos. Total:', allProducts.length);

        // Ordenar produtos pelo ID numérico
        allProducts.sort((a, b) => {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            return idA - idB;
        });

        // Limpar o grid antes de adicionar os novos produtos
        productsGrid.innerHTML = '';

        // Adicionar cada produto ao grid
        for (const product of allProducts) {
            // Se o produto foi desativado e está no carrinho, remove do carrinho imediatamente
            if (product.active === false) {
                const cartIndex = cart.findIndex(item => String(item.id) === String(product.id));
                if (cartIndex !== -1) {
                    cart.splice(cartIndex, 1);
                    updateCartState();
                    Swal.fire({
                        title: 'Produto Indisponível',
                        text: `O produto "${product.name}" foi removido do carrinho porque ficou indisponível!`,
                        icon: 'warning',
                        confirmButtonColor: '#ff1493',
                        timer: 2200
                    });
                }
            }
            // Obter o item do carrinho se existir
            const cartItem = cart.find(item => String(item.id) === String(product.id));
            
            // Calcular estoque disponível considerando itens no carrinho
            const available = Math.max(0, product.quantity - (cartItem ? cartItem.quantity : 0));
            
            // Determinar o status do estoque com base na disponibilidade
            let stockStatus;
            
            if (product.quantity <= 0) {
                stockStatus = { class: 'out-of-stock', text: 'Produto Indisponível' };
            } else if (available <= 2) {
                stockStatus = { 
                    class: 'low-stock', 
                    text: available === 1 ? 'Última unidade!' : 'Apenas 2 unidades!'
                };
            } else {
                stockStatus = { class: '', text: '' };
            }
            
            const stockClass = stockStatus.class;
            const stockText = stockStatus.text;

            // Calcular descontos
            const normalDiscount = product.oldPrice ? Math.round((1 - product.price/product.oldPrice) * 100) : 0;
            const pixDiscount = product.price && product.pixPrice ? Math.round((1 - product.pixPrice/product.price) * 100) : 0;

            // Gerar uma chave única para o cache deste produto
            const cacheKey = `${product.id}_${available}_${product.active}`;
            let productHTML;
            
            // Verificar se já temos este produto em cache
            if (productsCache.has(cacheKey)) {
                productHTML = productsCache.get(cacheKey);
            } else {
                // Se não estiver em cache, criar o HTML
                productHTML = `
                <img src="${product.imageUrl || '/img/placeholder.png'}" alt="${product.name}" onerror="this.onerror=null; this.src='/img/placeholder.png'">
            <h3>${product.name}</h3>
            <div class="product-category-label" style="font-size:0.93em;color:#888;margin-top:-0.15em;margin-bottom:0.6em;">
                ${typeof product.category === 'string' && product.category.trim() ? product.category : '<span style=\"color:#bbb;\">Sem categoria</span>'}
            </div>
            <div class="product-description">
  ${(() => {
    if (!product.description) return '';
    const lines = product.description.split(/\r?\n/);
    let html = '';
    let showSeeMore = false;
    let i = 0;
    while (i < lines.length) {
      const titleMatch = lines[i].trim().match(/^\*\*(.+)\*\*$/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        html += `<span class=\"desc-title underline-primary\"><b>${escapeHtml(title)}</b></span>`;
        // Preview: até 2 linhas ou 120 caracteres após o título
        let previewText = '';
        let previewCount = 0;
        let previewCharLimit = 60;
        let j = i + 1;
        let previewEnded = false;
        while (j < lines.length && previewCount < 2 && previewText.length < previewCharLimit) {
          if (lines[j].trim() && !lines[j].trim().endsWith('*')) {
            let toAdd = lines[j].trim();
            if (previewText.length + toAdd.length > previewCharLimit) {
              toAdd = toAdd.slice(0, previewCharLimit - previewText.length);
              previewEnded = true;
            }
            previewText += (previewText ? ' ' : '') + toAdd;
            previewCount++;
            if (previewText.length >= previewCharLimit) previewEnded = true;
          }
          if (lines[j].trim().endsWith('*')) break;
          j++;
        }
        // Se houver mais linhas após o preview (antes do próximo título ou fim), mostrar ... e botão
        let hasHidden = false;
        let k = j;
        while (k < lines.length) {
          if (lines[k].trim() && !lines[k].trim().endsWith('*')) {
            hasHidden = true;
            break;
          }
          if (lines[k].trim().endsWith('*')) break;
          k++;
        }
        // Se previewEnded (bateu limite de caracteres/linhas) ou tem linhas ocultas, mostrar ... e botão
        if (previewText) {
          html += `<span class=\"desc-text\">${escapeHtml(previewText)}${(hasHidden || previewEnded) ? '...' : ''}</span>`;
        }
        if (hasHidden || previewEnded) showSeeMore = true;
        i = j;
      } else {
        i++;
      }
      
    }
    if (showSeeMore) {
      html += ` <button class=\"see-more-btn\" data-product-id=\"${product.id}\" title=\"Ver descrição completa\" style=\"background:none;border:none;cursor:pointer;padding:0 0.2em;vertical-align:middle;display:inline-flex;align-items:center;\"><i class=\"fas fa-search\" style=\"margin-right:0.3em;\"></i>Ver mais</button>`;
    }
    return html;
  })()}
</div>
            <div class="price-info">
                ${product.oldPrice ? `
                    <p class="old-price">
                        De: R$ ${product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                ` : ''}
                <p class="current-price">
                    Por: R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    ${product.oldPrice ? `<span class="discount-badge">-${normalDiscount}% OFF</span>` : ''}
                </p>
                ${product.pixPrice ? `
                    <p class="pix-price">
                        PIX: R$ ${product.pixPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span class="discount-badge pix-discount">-${pixDiscount}% OFF</span>
                    </p>
                ` : ''}
            </div>
            ${(() => {
                if (available <= 0 || product.active === false) {
                    return `
                        <p class="stock-alert stock-unavailable">
                            <i class="fas fa-ban"></i>
                            Produto Indisponível
                        </p>
                        <button onclick="requestOutOfStockProduct('${product.id}')" class="btn-out-of-stock">
                            <i class="fas fa-envelope"></i>
                            Avise-me quando disponível!
                        </button>
                    `;
                } else if (available <= 2) {
                    return `
                        <p class="stock-alert">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${available === 1 ? 'Última unidade!' : 'Apenas 2 unidades!'}
                        </p>
                        <button onclick="addToCart('${product.id}')" class="btn-add-cart" ${available === 0 ? 'disabled style="opacity: 0.7; cursor: not-allowed;"' : ''}>
                            <svg class="icon-bag" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:0.32em;"><path d="M7 7V6a5 5 0 0110 0v1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="7" width="18" height="14" rx="2" stroke="#fff" stroke-width="2"/><path d="M16 11a4 4 0 01-8 0" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            ${available === 0 ? 'Sem estoque' : '<b>COMPRAR</b>'}
                        </button>
                    `;
                } else {
                    return `
                        <button onclick="addToCart('${product.id}')" class="btn-add-cart">
                            <svg class="icon-bag" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:0.32em;"><path d="M7 7V6a5 5 0 0110 0v1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="7" width="18" height="14" rx="2" stroke="#fff" stroke-width="2"/><path d="M16 11a4 4 0 01-8 0" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            <b>COMPRAR</b>
                        </button>
                    `;
                }
            })()}
        
        `;
                // Armazenar no cache
                productsCache.set(cacheKey, productHTML);
            }
            
            // Criar elemento do produto
            const productElement = document.createElement('div');
            const itemClasses = ['product-grid-item'];
            
            // Verificar se o produto está inativo
            const productIsInactive = product.active === false;
            
            if (productIsInactive) {
                // Se o produto estiver inativo, adicionar apenas a classe inactive
                itemClasses.push('inactive');
            } else if (stockClass) {
                // Se não estiver inativo, adicionar a classe de status de estoque (se houver)
                itemClasses.push(stockClass);
            }
            
            productElement.className = itemClasses.join(' ');
            productElement.dataset.id = product.id;
            productElement.innerHTML = productHTML;
            productsGrid.appendChild(productElement);
        }

    // Add event delegation for 'Ver mais' after rendering all products
    productsGrid.removeEventListener('click', handleSeeMoreClick);
    productsGrid.addEventListener('click', handleSeeMoreClick);

    } catch (error) {
        console.error('Erro ao renderizar lista de produtos:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao carregar os produtos.',
            icon: 'error'
        });
    }
}

// Handler for 'Ver mais' button click
function handleSeeMoreClick(event) {
    const btn = event.target.closest('.see-more-btn');
    if (!btn) return;
    const productId = btn.getAttribute('data-product-id');
    const product = window.products.find(p => String(p.id) === String(productId));
    if (!product) return;
    Swal.fire({
        title: product.name,
        html: formatProductDescription(product.description, product.descUnderlineColor || 'underline-primary'),
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            popup: 'swal2-product-desc-modal'
        },
        width: 600,
        didOpen: () => {
            // Foca no título ao abrir
            const el = document.querySelector('.swal2-product-desc-modal .desc-title');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}


// Funções de Status do Estoque

// Funções da Lista de Espera
function openWaitlistModal(productId) {
    const modal = document.getElementById('waitlistModal');
    const productIdInput = document.getElementById('waitlistProductId');
    const form = document.getElementById('waitlistForm');
    
    // Limpar formulário
    form.reset();
    productIdInput.value = productId;
    
    // Mostrar modal com fade
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

function closeWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    
    // Esconder modal com fade
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Máscara para o campo de telefone
function maskPhone(event) {
    let input = event.target;
    let value = input.value.replace(/\D/g, '');
    let formattedValue = '';

    if (value.length <= 11) {
        if (value.length > 2) {
            formattedValue += '(' + value.substring(0, 2) + ') ';
            if (value.length > 7) {
                formattedValue += value.substring(2, 7) + '-' + value.substring(7);
            } else {
                formattedValue += value.substring(2);
            }
        } else {
            formattedValue = value;
        }

        input.value = formattedValue;
    }
}

async function handleWaitlistSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('waitlistForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // já está processando
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

    const phone = document.getElementById('waitlistPhone').value;
    // Validar formato do telefone
    if (!phone.match(/^\(\d{2}\)\s\d{5}-\d{4}$/)) {
        Swal.fire({
            title: 'Formato Inválido',
            text: 'Por favor, insira um número de telefone válido no formato (99) 99999-9999',
            icon: 'warning',
            confirmButtonColor: '#ff1493'
        });
        return;
    }

    const productId = document.getElementById('waitlistProductId').value;
    const formData = {
        productId: productId,
        name: document.getElementById('waitlistName').value,
        phone: phone,
        email: document.getElementById('waitlistEmail').value,
        date: new Date().toISOString()
    };

    // Buscar snapshot do produto no Firestore
    try {
        const productDoc = await getDoc(doc(collection(window.db, 'products'), productId));
        if (!productDoc.exists()) {
            Swal.fire({
                title: 'Produto não encontrado',
                text: 'O produto selecionado não existe mais.',
                icon: 'error',
                confirmButtonColor: '#ff1493'
            });
            return;
        }
        const productData = productDoc.data();
        // Adicionar snapshot do produto ao registro da lista de espera
        formData.productSnapshot = {
            name: productData.name || '',
            imageUrl: productData.imageUrl || '',
            price: productData.price || null,
            oldPrice: productData.oldPrice || null,
            pixPrice: productData.pixPrice || null
        };

        // Salvar no Firestore
        const waitlistRef = collection(window.db, 'waitlist');
        const docRef = await addDoc(waitlistRef, formData);
        console.log('Pedido de lista de espera salvo com sucesso:', docRef.id);

        // Fechar modal e mostrar mensagem de sucesso
        closeWaitlistModal();
        Swal.fire({
            title: 'Cadastro Realizado!',
            text: 'Você será avisado quando o produto estiver disponível.',
            icon: 'success',
            confirmButtonColor: '#ff1493',
            timer: 3000,
            timerProgressBar: true
        });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Cadastrar';
        }
        console.log('Pedido enviado com sucesso para o WhatsApp');
    } catch (error) {
        console.error('Erro ao processar pedido:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao processar seu pedido. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: '#4CAF50'
        });
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Cadastrar';
        }
    }
}


async function requestOutOfStockProduct(productId) {
    try {
        const productsCollection = collection(window.db, 'products');
        const productDoc = await getDoc(doc(productsCollection, productId));

        if (!productDoc.exists()) {
            Swal.fire({
                title: 'Produto não encontrado',
                text: 'Este produto não existe mais.',
                icon: 'error'
            });
            return;
        }

        const product = productDoc.data();
        if (product.active !== false && Number(product.quantity) > 0) {
            Swal.fire({
                title: 'Produto disponível!',
                text: 'O produto já está disponível. Aproveite para comprar agora!',
                icon: 'success'
            }).then(() => {
                window.location.reload();
            });
            return;
        }

        // Produto ainda esgotado, abrir modal de lista de espera normalmente
        openWaitlistModal(productId);
    } catch (error) {
        Swal.fire({
            title: 'Erro',
            text: 'Erro ao verificar estoque. Tente novamente.',
            icon: 'error'
        });
    }
}


async function removeFromCart(productId) {
    if (!ensureDOMReferences()) return;

    try {
        const index = cart.findIndex(item => String(item.id) === String(productId));
        if (index === -1) {
            console.warn('Item não encontrado no carrinho:', productId);
            return;
        }

        const item = cart[index];
        const product = (window.products || []).find(p => String(p.id) === String(productId));
        
        // Configuração do modal de confirmação
        const result = await Swal.fire({
            title: '<span style="font-family: var(--font-heading); color: var(--color-primary-dark); font-size: 1.4em;">Remover produto?</span>',
            html: `
                <div style="display: flex; align-items: center; flex-direction: column; gap: 12px;">
                    <img src="${item.imageUrl || '/img/placeholder.png'}" 
                         alt="${item.name}" 
                         style="width: 90px; height: 90px; object-fit: cover; border-radius: 10px; 
                                box-shadow: 0 2px 8px #0001; border: 2px solid var(--color-border); 
                                background: var(--color-light-gray);">
                    <div style="font-family: var(--font-body); color: var(--color-dark); 
                                font-size: 1.1em; margin-bottom: 2px; font-weight: 600;">
                        ${item.name}
                    </div>
                    <div style="color: var(--color-gray); font-size: 1em;">
                        Quantidade: <b style='color:var(--color-primary);'>${item.quantity}</b>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-trash"></i> Remover',
            cancelButtonText: '<i class="fas fa-times"></i> Manter na Sacola',
            confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim() || '#dc3545',
            cancelButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-gray').trim() || '#6c757d',
            background: getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || '#fff',
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-secondary'
            },
            reverseButtons: true,
            focusCancel: true
        });

        if (result.isConfirmed) {
            // Remover o item do carrinho
            cart.splice(index, 1);
            
            // Atualizar a interface
            await updateCartState();
            
            // Mostrar mensagem de sucesso
            await Swal.fire({
                title: 'Removido!',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 3em; margin-bottom: 15px;"></i>
                        <p>Produto removido da Sacola</p>
                        ${product && product.quantity > 0 ? 
                          `<p style="color: #28a745; margin-top: 10px;">
                              <i class="fas fa-undo"></i> ${item.quantity} foi removido da sacola.
                          </p>` : ''}
                    </div>
                `,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                timerProgressBar: true
            });
            
            // Atualizar contagem do carrinho na barra de navegação
            updateCartCount();
            
            // Forçar atualização da lista de produtos para refletir mudanças no estoque
            if (productsGrid) {
                await renderProductList();
            }
        }
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        await Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao remover o produto da sacola. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
    }
}

function updateCartCount() {
    const cartIcon = document.getElementById('cartIcon');
    if (!cartIcon) return;
    
    const cartCount = cartIcon.querySelector('.cart-count');
    if (!cartCount) return;
    
    if (cart.length === 0) {
        cartCount.textContent = '';
    } else {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

async function decreaseQuantity(productId) {
    if (!ensureDOMReferences()) return;
    
    try {
        const item = cart.find(item => String(item.id) === String(productId));
        if (!item) {
            console.warn('Item não encontrado no carrinho:', productId);
            return;
        }

        // Verificar se a quantidade é maior que 1 antes de decrementar
        if (item.quantity > 1) {
            item.quantity--;
            await updateCartState();
            
            // Atualizar a lista de produtos para refletir a mudança no estoque
            if (productsGrid) {
                await renderProductList();
            }
            
            // Feedback visual sutil
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
            
            await Toast.fire({
                icon: 'info',
                title: 'Quantidade atualizada',
                text: `Agora você tem ${item.quantity} unidade(s) de ${item.name} na sacola`
            });
            
        } else {
            // Se a quantidade for 1, remover o item do carrinho
            await removeFromCart(productId);
        }
    } catch (error) {
        console.error('Erro ao diminuir quantidade:', error);
        await Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao atualizar a quantidade. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
    }
}

async function increaseQuantity(productId) {
    if (!ensureDOMReferences()) return;
    
    try {
        const item = cart.find(item => String(item.id) === String(productId));
        if (!item) {
            console.warn('Item não encontrado no carrinho:', productId);
            return;
        }

        const product = (window.products || []).find(p => String(p.id) === String(productId));
        if (!product) {
            console.error('Produto não encontrado:', productId);
            return;
        }

        // Calcular a quantidade total no carrinho (incluindo o item atual)
        const currentCartQuantity = cart.reduce((total, cartItem) => {
            return String(cartItem.id) === String(productId) ? total + cartItem.quantity : total;
        }, 0);
        
        // Verificar se ainda há estoque disponível
        if (currentCartQuantity < product.quantity) {
            item.quantity++;
            await updateCartState();
            
            // Atualizar a lista de produtos para refletir a mudança no estoque
            if (productsGrid) {
                await renderProductList();
            }
            
            // Feedback visual sutil
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
            
            await Toast.fire({
                icon: 'success',
                title: 'Quantidade atualizada',
                text: `Agora você tem ${item.quantity} unidade(s) de ${item.name} na sacola`
            });
            
        } else {
            // Verificar se o produto está realmente sem estoque ou se é apenas limite do carrinho
            if (product.quantity <= 0) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Produto esgotado',
                    text: 'Este produto não possui mais unidades disponíveis no momento.',
                    confirmButtonColor: '#ff1493',
                    footer: '<a href="#" class="notify-link" style="color: #ff1493; text-decoration: underline;">Me avise quando estiver disponível</a>'
                });
            } else {
                // Mostrar mensagem de limite de estoque
                await Swal.fire({
                    icon: 'info',
                    title: 'Limite de estoque',
                    html: `
                        <div style="text-align: center;">
                            <p>Você já adicionou todas as <b>${product.quantity} unidade(s)</b> disponíveis de <b>${product.name}</b> a sacola.</p>
                            <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                                Para adquirir mais unidades, entre em contato conosco.
                            </p>
                        </div>
                    `,
                    confirmButtonColor: '#ff1493',
                    confirmButtonText: 'Entendi',
                    showCancelButton: true,
                    cancelButtonText: 'Remover item',
                    cancelButtonColor: '#6c757d',
                    showDenyButton: true,
                    denyButtonText: 'Me avise quando tiver mais',
                    denyButtonColor: '#17a2b8'
                }).then(async (result) => {
                    if (result.isDenied) {
                        // Usuário clicou em "Me avise quando tiver mais"
                        await requestOutOfStockProduct(productId);
                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                        // Usuário clicou em "Remover item"
                        await removeFromCart(productId);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Erro ao aumentar quantidade:', error);
        await Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao atualizar a quantidade. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
    }
}

// Calcular valor das parcelas
function calculateInstallment(total, installments) {
    const interestRates = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        7: 0.0599, 8: 0.0599, 9: 0.0599, 10: 0.0599, 11: 0.0599, 12: 0.0599
    };

    if (installments <= 6) {
        return total / installments;
    } else {
        const rate = interestRates[installments];
        return (total * rate * Math.pow(1 + rate, installments)) / (Math.pow(1 + rate, installments) - 1);
    }
}

function updateInstallments() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const installments = parseInt(document.getElementById('installments').value);
    const installmentValue = calculateInstallment(total, installments);
    
    let installmentText = '';
    if (installments <= 6) {
        installmentText = `ou ${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`;
    } else {
        const totalWithInterest = installmentValue * installments;
        installmentText = `ou ${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com juros (total: R$ ${totalWithInterest.toFixed(2)})`;
    }

    document.getElementById('cartTotal').innerHTML = `
        <div class="total-info">
            <span class="total-with-items">Total (${totalItems} ${totalItems === 1 ? 'item' : 'itens'}): R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span class="installment-info">${installmentText}</span>
        </div>`;
}

// Função principal de atualização do carrinho
async function updateCartState() {
    try {
        const elements = {
            cartItems: document.getElementById('cartItems'),
            cartTotalContainer: document.getElementById('cartTotalContainer'),
            emptyCart: document.getElementById('emptyCart'),
            checkoutForm: document.getElementById('checkoutForm'),
            productsGrid: document.getElementById('productsGrid')
        };

        if (!elements.cartItems || !elements.cartTotalContainer || !elements.emptyCart || !elements.checkoutForm) {
            console.warn('Elementos do carrinho não encontrados');
            return;
        }

        // Atualizar itens do carrinho e totais
        updateCartItems();
        updateCartTotals();
        updateCartVisibility();
        updateCartCount();
        
        // Se houver uma lista de produtos, renderizar novamente para atualizar as mensagens de estoque
        if (elements.productsGrid) {
            try {
                await renderProductList();
            } catch (error) {
                console.error('Erro ao atualizar lista de produtos:', error);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar estado do carrinho:', error);
    }
}

// Atualiza a visibilidade dos elementos do carrinho
function updateCartVisibility() {
    const elements = {
        cartTotalContainer: document.getElementById('cartTotalContainer'),
        checkoutForm: document.getElementById('checkoutForm'),
        emptyCart: document.getElementById('emptyCart')
    };

    if (!Object.values(elements).every(el => el !== null)) {
        console.warn('Elementos necessários não encontrados em updateCartVisibility');
        return;
    }

    const hasItems = cart.length > 0;
    elements.cartTotalContainer.style.display = hasItems ? 'block' : 'none';
    elements.checkoutForm.style.display = hasItems ? 'flex' : 'none';
    elements.emptyCart.style.display = hasItems ? 'none' : 'flex';
}

// Atualiza os itens do carrinho
function updateCartItems() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) {
        console.warn('Elemento cartItems não encontrado');
        return;
    }

    // Limpar itens existentes
    const cartItemsList = cartItems.querySelector('.cart-items-list');
    if (cartItemsList) {
        cartItemsList.remove();
    }

    if (cart.length > 0) {
        const itemsList = document.createElement('div');
        itemsList.className = 'cart-items-list';

        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
  <div class="cart-item">
    <div class="cart-item-image">
      <img src="${item.imageUrl || '/img/placeholder.png'}" alt="${item.name}" onerror="this.onerror=null; this.src='/img/placeholder.png'">
    </div>
    
    <div class="cart-item-details">
      <h4 class="cart-item-name">${item.name}</h4>

      <div class="quantity-controls">
        <button onclick="decreaseQuantity(${item.id})">-</button>
        <span>${item.quantity}</span>
        <button onclick="increaseQuantity(${item.id})">+</button>
      </div>

      <div class="cart-item-prices">
        <div class="pix-price">R$ ${(item.pixPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span class="pix-label">no Pix</span></div>
        <div class="card-price">ou R$ ${(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no Cartão</div>
      </div>

      <button class="remove-item" onclick="removeFromCart(${item.id})">Remover</button>
    </div>
  </div>
`;

            itemsList.appendChild(itemElement);
        });

        cartItems.appendChild(itemsList);
    }

    const emptyCartMessage = document.getElementById('emptyCart');
    if (emptyCartMessage) {
        emptyCartMessage.style.display = cart.length === 0 ? 'flex' : 'none';
    }
}

// Atualiza os totais e parcelas do carrinho
function updateCartTotals() {
    const elements = {
        cartTotal: document.getElementById('cartTotal'),
        paymentMethod: document.getElementById('paymentMethod'),
        installments: document.getElementById('installments'),
        installmentsContainer: document.getElementById('installmentsContainer')
    };

    if (!elements.cartTotal || !elements.paymentMethod) {
        console.warn('Elementos necessários não encontrados em updateCartTotals');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let finalTotal = total;
    let couponDiscount = 0;
    let couponBadge = '';

    // Aplicar desconto do cupom, se houver
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            couponDiscount = Math.round(total * (appliedCoupon.value / 100));
            finalTotal = total - couponDiscount;
            couponBadge = `<div class="discount-badge">Cupom aplicado: -${appliedCoupon.value}%</div>`;
        } else if (appliedCoupon.type === 'fixed') {
            couponDiscount = appliedCoupon.value;
            finalTotal = Math.max(0, total - couponDiscount);
            couponBadge = `<div class="discount-badge">Cupom aplicado: -R$ ${appliedCoupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>`;
        }
    }

    const paymentMethod = elements.paymentMethod.value;

    // Atualizar visibilidade do seletor de parcelas
    if (elements.installmentsContainer) {
        elements.installmentsContainer.style.display = paymentMethod === 'credit' ? 'flex' : 'none';
    }

    if (paymentMethod === 'pix') {
        const pixTotalValue = cart.reduce((sum, item) => sum + (item.pixPrice * item.quantity), 0);
        const discountPercentage = Math.round(((total - pixTotalValue) / total) * 100);
        let displayTotal = finalTotal;
        let pixBadge = '';
        if (appliedCoupon) {
            displayTotal = Math.max(0, finalTotal); // Cupom já aplicado
        } else {
            displayTotal = pixTotalValue;
            pixBadge = `<div class="discount-badge">Economize ${discountPercentage}% no PIX</div>`;
        }
        elements.cartTotal.innerHTML = `
            <div class="total-info">
                <div class="total-row">
                    <span>Total (${cart.reduce((sum, item) => sum + item.quantity, 0)} itens):</span>
                    <span class="old-price">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="total-row highlight">
                    <span>Total com desconto:</span>
                    <span class="total-amount">R$ ${displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${couponBadge || pixBadge}
            </div>
        `;
    } else if (paymentMethod === 'agreement') {
        const agreementsSelect = document.getElementById('agreements');
        let agreements = agreementsSelect ? parseInt(agreementsSelect.value) : 1;
        if (agreements !== 1 && agreements !== 2) agreements = 1;
        const installmentValue = calculateInstallment(finalTotal, agreements);
        elements.cartTotal.innerHTML = `
            <div class="total-info">
                <div class="total-row">
                    <span>Total (${cart.reduce((sum, item) => sum + item.quantity, 0)} itens):</span>
                    <span class="total-amount">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="installment-info">
                    ou ${agreements}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                </div>
                ${couponBadge}
            </div>
        `;
    } else {
        const installments = elements.installments ? parseInt(elements.installments.value) : 1;
        const installmentValue = calculateInstallment(finalTotal, installments);
        elements.cartTotal.innerHTML = `
            <div class="total-info">
                <div class="total-row">
                    <span>Total (${cart.reduce((sum, item) => sum + item.quantity, 0)} itens):</span>
                    <span class="total-amount">R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="installment-info">
                    ou ${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${installments > 6 ? `(com juros - Total: R$ ${(installmentValue * installments).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : 'sem juros'}
                </div>
                ${couponBadge}
            </div>
        `;
    }
}


// Função para alternar entre PIX e Cartão
function togglePaymentMethod() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) return;
    
    const installmentsContainer = document.getElementById('installmentsContainer');
    const agreementsContainer = document.getElementById('agreementsContainer');
    const paymentMethodField = document.getElementById('paymentMethod');
    
    if (paymentMethodField) {
        paymentMethodField.value = paymentMethod;
    }
    
    if (installmentsContainer) {
        installmentsContainer.style.display = paymentMethod === 'credit' ? 'block' : 'none';
    }
    if (agreementsContainer) {
        agreementsContainer.style.display = paymentMethod === 'agreement' ? 'block' : 'none';
    }

    // Mostrar/ocultar opção acordo conforme cupom
    const agreementOption = document.getElementById('paymentMethodAgreement')?.closest('.payment-option');
    if (agreementOption) {
        if (appliedCoupon && appliedCoupon.enableAgreement) {
            agreementOption.style.display = '';
        } else {
            agreementOption.style.display = 'none';
            // Se estava selecionado, volta para pix
            if (paymentMethod === 'agreement') {
                document.getElementById('paymentMethodPix').checked = true;
                if (paymentMethodField) paymentMethodField.value = 'pix';
            }
        }
    }

    updateCartTotals();
}

// Lógica para aplicar cupom e atualizar métodos de pagamento
const couponInput = document.getElementById('couponInput');
const applyCouponBtn = document.getElementById('applyCouponBtn');
import { getCouponByCode } from './coupons-client.js';

let appliedCoupon = null;

if (couponInput && applyCouponBtn) {
    // Lógica do botão X para limpar cupom
    const clearCouponBtn = document.getElementById('clearCouponBtn');
    function updateClearCouponBtn() {
        if (couponInput.value.trim()) {
            clearCouponBtn.style.display = '';
        } else {
            clearCouponBtn.style.display = 'none';
        }
    }
    couponInput.addEventListener('input', updateClearCouponBtn);
    if (clearCouponBtn) {
        clearCouponBtn.addEventListener('click', () => {
            couponInput.value = '';
            couponInput.classList.remove('input-success', 'input-error');
            appliedCoupon = null;
            updateClearCouponBtn();
            togglePaymentMethod();
            updateCartTotals();
        });
    }
    // Inicializa estado do botão X
    updateClearCouponBtn();
    const couponFeedback = document.getElementById('couponFeedback');

    const handleCoupon = async () => {
        const code = couponInput.value.trim().toUpperCase(); // Sempre maiúsculo
        appliedCoupon = null;
        couponFeedback.textContent = '';
        couponFeedback.className = 'coupon-feedback';
        if (code) {
            const coupon = await getCouponByCode(code);
            if (coupon) {
                // --- Validação de datas ---
                const today = new Date();
                let valid = true;
                let errorMsg = '';

                if (!coupon.noExpiration) {
                    // Validar início
                    if (coupon.startDate) {
                        const start = new Date(coupon.startDate);
                        if (today < start.setHours(0,0,0,0)) {
                            valid = false;
                            errorMsg = 'Este cupom só poderá ser usado a partir de ' + start.toLocaleDateString('pt-BR') + '.';
                        }
                    }
                    // Validar fim
                    if (valid && coupon.endDate) {
                        const end = new Date(coupon.endDate);
                        if (today > end.setHours(23,59,59,999)) {
                            valid = false;
                            errorMsg = 'Este cupom está expirado.';
                        }
                    }
                }

                if (!valid) {
                    couponInput.classList.remove('input-success');
                    couponInput.classList.add('input-error');
                    couponFeedback.textContent = errorMsg;
                    couponFeedback.className = 'coupon-feedback feedback-error';
                    appliedCoupon = null;
                } else {
                    appliedCoupon = coupon;
                    couponInput.classList.remove('input-error');
                    couponInput.classList.add('input-success');
                    couponFeedback.textContent = 'Cupom aplicado com sucesso!';
                    couponFeedback.className = 'coupon-feedback feedback-success';
                }
            } else {
                couponInput.classList.remove('input-success');
                couponInput.classList.add('input-error');
                couponFeedback.textContent = 'O cupom informado não existe ou está incorreto.';
                couponFeedback.className = 'coupon-feedback feedback-error';
            }
        } else {
            couponInput.classList.remove('input-success','input-error');
            couponFeedback.textContent = '';
            couponFeedback.className = 'coupon-feedback';
        }
        togglePaymentMethod();
        updateCartTotals();
    };

    // Limpar feedback ao limpar cupom
    if (clearCouponBtn) {
        clearCouponBtn.addEventListener('click', () => {
            couponFeedback.textContent = '';
            couponFeedback.className = 'coupon-feedback';
        });
    }

    applyCouponBtn.addEventListener('click', handleCoupon);
    // Removido o listener de input para só aplicar ao clicar
}


// Torna a função disponível globalmente
window.togglePaymentMethod = togglePaymentMethod;

// Toggle cart modal
function toggleCart() {
    // Garante exibição correta dos métodos de pagamento
    const agreementOption = document.getElementById('paymentMethodAgreement')?.closest('.payment-option');
    const couponValue = document.getElementById('couponInput')?.value.trim().toUpperCase();
    if (agreementOption) {
        if (couponValue === 'ACORDO2025') {
            agreementOption.style.display = '';
        } else {
            agreementOption.style.display = 'none';
            // Se estava selecionado, volta para pix
            const paymentMethodField = document.getElementById('paymentMethod');
            if (document.getElementById('paymentMethodAgreement').checked) {
                document.getElementById('paymentMethodPix').checked = true;
                if (paymentMethodField) paymentMethodField.value = 'pix';
            }
        }
    }

    if (!ensureDOMReferences()) return;

    const cartModal = document.getElementById('cartModal');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartModal && cartOverlay) {
        if (cartOpen) {
            cartModal.classList.remove('open');
            cartOverlay.classList.remove('open');
        } else {
            cartModal.classList.add('open');
            cartOverlay.classList.add('open');
        }
        cartOpen = !cartOpen;
    }
}


let cartOpen = false;

async function openCart() {
    cartOpen = true;
    const cartModal = document.getElementById('cartModal');
    const cartOverlay = document.getElementById('cartOverlay');
    const orderConfirmation = document.getElementById('orderConfirmation');
    const checkoutFormElement = document.getElementById('checkoutForm');
    const cartTotalContainer = document.getElementById('cartTotalContainer');
    const emptyCartMessage = document.getElementById('emptyCart');
    const displayOrderNumber = document.getElementById('displayOrderNumber');
    const orderSummary = document.getElementById('orderSummary');
    const whatsappButton = document.getElementById('whatsappButton');

    cartModal.classList.add('open');
    cartOverlay.classList.add('open');

    // Se houver um pedido confirmado, mostrar a confirmação
    if (currentOrderData) {
        checkoutFormElement.style.display = 'none';
        cartTotalContainer.style.display = 'none';
        emptyCartMessage.style.display = 'none';
        orderConfirmation.classList.add('show');

        // Restaurar dados do pedido
        displayOrderNumber.textContent = `Pedido #${currentOrderData.orderNumber}`;
        orderSummary.innerHTML = `
            ${currentOrderData.items.map(item => `
                <div class="order-summary-item">
                    <span>${item.name} (${item.quantity}x)</span>
                    <span>R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            `).join('')}
            <div class="order-summary-item order-summary-total">
                <span>Total:</span>
                <span>R$ ${currentOrderData.total.toFixed(2)}</span>
            </div>
            <div class="order-summary-item">
                <span>Parcelamento:</span>
                <span>${currentOrderData.installments}x de R$ ${currentOrderData.installmentValue.toFixed(2)}</span>
            </div>
            <div class="order-summary-item order-summary-pix">
                <span>Total no PIX:</span>
                <span>R$ ${currentOrderData.pixTotal.toFixed(2)} (-${Math.round(((currentOrderData.total - currentOrderData.pixTotal) / currentOrderData.total) * 100)}%)</span>
            </div>
        `;

        // Restaurar link do WhatsApp
        whatsappButton.href = `https://wa.me/5571991427989?text=${encodeURIComponent(currentOrderData.message)}`;
    } else {
        // Verifique se a função updateCartState está sendo chamada corretamente
        updateCartState();
    }
}
// Generate order number
function generateOrderNumber() {
    const date = new Date();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PED${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${random}`;
}

// Handle checkout
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        
        try {
            // Verificar se há itens no carrinho
            if (cart.length === 0) {
                await Swal.fire({
                    title: 'Sacola vazia',
                    text: 'Adicione itens a sacola antes de finalizar o pedido.',
                    icon: 'warning',
                    confirmButtonColor: '#4CAF50'
                });
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            
            // Obter método de pagamento selecionado
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
            if (!paymentMethod) {
                await Swal.fire({
                    title: 'Método de pagamento',
                    text: 'Por favor, selecione um método de pagamento.',
                    icon: 'warning',
                    confirmButtonColor: '#4CAF50'
                });
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            
            const isPix = paymentMethod === 'pix';
            
            // Calcular totais
            let total = 0;
            let pixTotal = 0;
            
            cart.forEach(item => {
                total += item.price * item.quantity;
                pixTotal += (item.pixPrice || item.price) * item.quantity;
            });
            
            // Obter dados do cliente
            const customerName = document.getElementById('customerName')?.value.trim() || '';
            const customerPhone = document.getElementById('customerPhone')?.value.trim() || '';
            const customerEmail = document.getElementById('customerEmail')?.value.trim() || '';
            
            // Validação dos dados do cliente
            if (!customerName || !customerPhone || !customerEmail) {
                Swal.fire({
                    title: 'Dados incompletos',
                    text: 'Por favor, preencha todos os campos do formulário.',
                    icon: 'warning',
                    confirmButtonColor: '#4CAF50'
                });
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            
            // Validar e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerEmail)) {
                Swal.fire({
                    title: 'E-mail inválido',
                    text: 'Por favor, insira um endereço de e-mail válido.',
                    icon: 'warning',
                    confirmButtonColor: '#4CAF50'
                });
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            
            // Validar telefone (formato brasileiro básico)
            const phoneRegex = /^\d{10,11}$/;
            const cleanPhone = customerPhone.replace(/\D/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                Swal.fire({
                    title: 'Telefone inválido',
                    text: 'Por favor, insira um número de telefone válido (DDD + número).',
                    icon: 'warning',
                    confirmButtonColor: '#4CAF50'
                });
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            
            // Gerar número do pedido
            const orderNumber = generateOrderNumber();
            
            // Aplicar desconto do cupom se houver
            let couponDiscount = 0;
            let couponDescText = '';
            let finalTotal = total;
            if (appliedCoupon) {
                if (appliedCoupon.type === 'percent') {
                    couponDiscount = Math.round(total * (appliedCoupon.value / 100));
                    finalTotal = total - couponDiscount;
                    couponDescText = `Cupom aplicado: -${appliedCoupon.value}%`;
                } else if (appliedCoupon.type === 'fixed') {
                    couponDiscount = appliedCoupon.value;
                    finalTotal = Math.max(0, total - couponDiscount);
                    couponDescText = `Cupom aplicado: -R$ ${appliedCoupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
            }

            // Aplicar desconto do cupom ao valor do PIX também
            let pixFinalTotal = pixTotal;
            if (appliedCoupon) {
                if (appliedCoupon.type === 'percent') {
                    pixFinalTotal = pixTotal - Math.round(pixTotal * (appliedCoupon.value / 100));
                } else if (appliedCoupon.type === 'fixed') {
                    pixFinalTotal = Math.max(0, pixTotal - appliedCoupon.value);
                }
            }

            // Definir o valor final com base no método de pagamento
            const finalAmount = isPix ? pixFinalTotal : finalTotal;
            const paymentInfo = isPix 
                ? `⚡ PIX${appliedCoupon ? ' + Cupom' : ''} (${Math.round(((total - pixFinalTotal) / total) * 100)}% de desconto)` 
                : (paymentMethod === 'agreement' ? '🤝 Acordo' : '💳 Cartão de Crédito');

            // Adicionar informações de parcelamento se for cartão ou acordo
            let paymentDetails = paymentInfo;
            let installments = 1;
            let installmentValue = finalAmount;

            if (paymentMethod === 'agreement' || paymentMethod === 'credit') {
                // Para acordo e cartão, usar o valor já com desconto
                let selectedInstallments = 1;
                if (paymentMethod === 'agreement') {
                    selectedInstallments = parseInt(document.getElementById('agreements')?.value || '1');
                    if (isNaN(selectedInstallments) || selectedInstallments < 1) selectedInstallments = 1;
                } else {
                    selectedInstallments = parseInt(document.getElementById('installments')?.value || '1');
                    if (isNaN(selectedInstallments) || selectedInstallments < 1) selectedInstallments = 1;
                }
                installments = selectedInstallments;
                installmentValue = calculateInstallment(finalAmount, installments);
                paymentDetails += ` em ${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                if (installments > 6) {
                    const totalWithInterest = installmentValue * installments;
                    paymentDetails += ` (com juros - Total: R$ ${totalWithInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                } else {
                    paymentDetails += ' sem juros';
                }
            }

            // Adicionar texto do cupom ao final dos detalhes do pagamento se houver
            if (appliedCoupon && couponDescText) {
                paymentDetails += `\n${couponDescText}`;
            }

            
            // Formatar mensagem para o WhatsApp
            let whatsappMessage = `*NOVO PEDIDO #${orderNumber}*\n\n`;
            whatsappMessage += `*Cliente:* ${customerName}\n`;
            whatsappMessage += `*Telefone:* ${customerPhone}\n`;
            whatsappMessage += `*E-mail:* ${customerEmail}\n\n`;
            whatsappMessage += `*Itens do Pedido:*\n`;
            
            cart.forEach(item => {
                let itemUnitPrice = isPix ? (item.pixPrice || item.price) : item.price;
                // Aplica desconto proporcional do cupom ao item
                if (appliedCoupon) {
                    if (appliedCoupon.type === 'percent') {
                        itemUnitPrice = itemUnitPrice - (itemUnitPrice * (appliedCoupon.value / 100));
                    } else if (appliedCoupon.type === 'fixed') {
                        // Distribui o desconto fixo proporcionalmente entre os itens
                        const totalCartValue = isPix ? pixTotal : total;
                        const itemShare = (itemUnitPrice * item.quantity) / totalCartValue;
                        itemUnitPrice = itemUnitPrice - (appliedCoupon.value * itemShare / item.quantity);
                    }
                }
                const itemTotal = itemUnitPrice * item.quantity;
                whatsappMessage += `- ${item.quantity}x ${item.name} - R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            });
            
            whatsappMessage += `\n*Pagamento:* ${paymentDetails}\n`;
            whatsappMessage += `*Valor Total:* R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            if (appliedCoupon && couponDescText) {
                whatsappMessage += `*${couponDescText}*\n`;
            }
            whatsappMessage += `\n`;
            if (isPix) {
                whatsappMessage += `*Chave Pix:* (71)99142-7989`;
            } else {
                whatsappMessage += `*Endereço de Entrega:*\n`;
                whatsappMessage += `(O cliente irá informar o endereço no WhatsApp)`;
            }
            
            // Criar objeto do pedido
            const orderData = {
                orderNumber,
                customerName,
                customerPhone,
                customerEmail,
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    pixPrice: item.pixPrice || item.price,
                    quantity: item.quantity,
                    imageUrl: item.imageUrl || ''
                })),
                total: finalAmount,
                paymentMethod,
                installments: isPix ? 1 : installments,
                coupon: appliedCoupon ? {
                    code: appliedCoupon.code,
                    type: appliedCoupon.type,
                    value: appliedCoupon.value
                } : null,
                couponDiscount,
                status: 'Pendente',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            // Salvar pedido e atualizar estoque de forma atômica
            await runTransaction(db, async (transaction) => {
                // 1. Verificar estoque de todos os produtos
                for (const item of cart) {
                    const productRef = doc(db, 'products', String(item.id));
                    const productSnap = await transaction.get(productRef);
                    const estoqueAtual = productSnap.data().quantity || 0;
                    if (estoqueAtual < item.quantity) {
                        throw new Error(`Estoque insuficiente para o produto "${item.name}". Disponível: ${estoqueAtual}, solicitado: ${item.quantity}`);
                    }
                }
                // 2. Descontar estoque
                for (const item of cart) {
                    const productRef = doc(db, 'products', String(item.id));
                    transaction.update(productRef, {
                        quantity: increment(-item.quantity),
                        stock: increment(-item.quantity),
                        updatedAt: new Date().toISOString()
                    });
                }
                // 3. Criar pedido
                const ordersCol = collection(db, 'orders');
                transaction.set(doc(ordersCol), orderData);
            });
            console.log('Pedido criado e estoque atualizado com sucesso!');
            
            // Atualizar a interface do usuário
            updateOrderConfirmationUI(orderData, whatsappMessage);
            
            // Limpar o carrinho
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            updateCartState();

            // Mostrar mensagem de sucesso
            if (isPix) {
                await Swal.fire({
                    title: 'Pedido realizado com sucesso!',
                    html: `Seu pedido #${orderNumber} foi recebido.<br>Copie o link, efetue o pagamento, e envie o comprovante clicando no botão para enviar pelo WhatsApp.<br><br>
                    <button id="copyPixBtn" style="background:#ff1493;color:#fff;border:none;padding:10px 18px;border-radius:5px;font-size:16px;cursor:pointer;transition:background 0.2s;">💠 Copiar Chave PIX</button>`,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonColor: '#4CAF50',
                    confirmButtonText: 'Abrir WhatsApp',
                    cancelButtonText: 'Cancelar',
                    allowOutsideClick: false,
                    didOpen: () => {
                        const btn = document.getElementById('copyPixBtn');
                        const pixCopiaCola = '00020126570014br.gov.bcb.pix0114+55719914279890217Comprinha Essenza5204000053039865802BR5924Jose Abel Silva De Jesus6009Sao Paulo62130509abelsilva6304FFDF';
                        if (btn) {
                            btn.addEventListener('click', async () => {
                                try {
                                    await navigator.clipboard.writeText(pixCopiaCola);
                                    btn.textContent = '💠✔ Chave PIX Copiada!';
                                    btn.style.background = '#4CAF50';
                                    setTimeout(() => {
                                        btn.textContent = '💠 Copiar Chave PIX';
                                        btn.style.background = '#ff1493';
                                    }, 2000);
                                } catch (e) {
                                    btn.textContent = 'Erro ao copiar';
                                    btn.style.background = '#b71c1c';
                                    setTimeout(() => {
                                        btn.textContent = '💠 Copiar Chave PIX';
                                        btn.style.background = '#ff1493';
                                    }, 2000);
                                }
                            });
                        }
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open(`https://wa.me/5571991427989?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
                    }
                });
            } else {
                await Swal.fire({
                    title: 'Pedido realizado com sucesso!',
                    html: `Seu pedido #${orderNumber} foi recebido. Clique no botão abaixo para enviar pelo WhatsApp.`,
                    icon: 'success',
                    confirmButtonColor: '#4CAF50',
                    confirmButtonText: 'Abrir WhatsApp',
                    showCancelButton: true,
                    cancelButtonText: 'Fechar',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open(`https://wa.me/5571991427989?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
                    }
                });
            }

            // Resetar o formulário
            checkoutForm.reset();
        } catch (error) {
            console.error('Erro ao processar pedido:', error);
            
            // Mostrar mensagem de erro para o usuário
            await Swal.fire({
                title: 'Erro',
                text: error.message || 'Ocorreu um erro ao processar seu pedido. Por favor, tente novamente.',
                icon: 'error',
                confirmButtonColor: '#4CAF50',
                confirmButtonText: 'Entendi'
            });
        } finally {
            // Restaurar o estado do botão de submit
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        }
    });
}



// Função para atualizar a interface de confirmação do pedido
function updateOrderConfirmationUI(orderData, whatsappMessage) {
    const orderConfirmation = document.getElementById('orderConfirmation');
    const orderSummary = document.getElementById('orderSummary');
    const checkoutForm = document.getElementById('checkoutForm');
    const cartTotalContainer = document.getElementById('cartTotalContainer');
    const whatsappButton = document.getElementById('whatsappButton');
    
    if (!orderConfirmation || !orderSummary || !whatsappButton) return;
    
    // Atualizar número do pedido
    const displayOrderNumber = document.getElementById('displayOrderNumber');
    if (displayOrderNumber) {
        displayOrderNumber.textContent = `Pedido #${orderData.orderNumber}`;
    }
    
    // Atualizar resumo do pedido
    let summaryHTML = '<div class="order-items">';
    orderData.items.forEach(item => {
        const itemTotal = orderData.paymentMethod === 'pix' ? 
            (item.pixPrice * item.quantity) : 
            (item.price * item.quantity);
            
        summaryHTML += `
            <div class="order-item">
                <div class="order-item-image">
                    <img src="${item.imageUrl || 'img/placeholder-product.jpg'}" alt="${item.name}">
                </div>
                <div class="order-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.quantity}x R$ ${(orderData.paymentMethod === 'pix' ? item.pixPrice : item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div class="order-item-total">
                    R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>`;
    });
    
    summaryHTML += `
        <div class="order-totals">
            <div class="order-total-row">
                <span>Subtotal:</span>
                <span>R$ ${orderData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="order-total-row">
                <span>Forma de pagamento:</span>
                <span>${orderData.paymentMethod === 'pix'
                    ? 'PIX'
                    : orderData.paymentMethod === 'agreement'
                        ? `🤝 Acordo (${orderData.installments}x)`
                        : `💳 Cartão de Crédito (${orderData.installments}x)`
                }</span>
            </div>
            <div class="order-total-row total">
                <strong>Total:</strong>
                <strong>R$ ${orderData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            ${orderData.coupon && orderData.couponDiscount ? `<div class="order-total-row coupon-row"><span>${orderData.coupon.type === 'percent' ? `Cupom aplicado: -${orderData.coupon.value}%` : `Cupom aplicado: -R$ ${orderData.coupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span></div>` : ''}
        </div>
    </div>`;
    
    orderSummary.innerHTML = summaryHTML;
    
    // Atualizar link do WhatsApp
    whatsappButton.href = `https://wa.me/5571991427989?text=${encodeURIComponent(whatsappMessage)}`;
    
    // Atualizar o botão de novo pedido com o nome do cliente
    const newOrderButton = document.getElementById('newOrderButton');
    if (newOrderButton) {
        newOrderButton.setAttribute('onclick', `resetOrderConfirmation('${orderData.customerName}')`);
    }
    
    // Mostrar confirmação e esconder formulário
    if (checkoutForm) checkoutForm.style.display = 'none';
    if (cartTotalContainer) cartTotalContainer.style.display = 'none';
    orderConfirmation.style.display = 'block';
    
    // Rolar para a confirmação
    orderConfirmation.scrollIntoView({ behavior: 'smooth' });
}

// Reset checkout form when closing cart
function closeCartModal() {
    cartOpen = false;
    const cartModal = document.getElementById('cartModal');
    const cartOverlay = document.getElementById('cartOverlay');
    cartModal.classList.remove('open');
    cartOverlay.classList.remove('open');
}

// Verificar se o pedido foi enviado para o WhatsApp
let orderSentToWhatsApp = false;

// Marcar pedido como enviado quando clicar no botão do WhatsApp
document.getElementById('whatsappButton').addEventListener('click', () => {
    orderSentToWhatsApp = true;
});

// Reset order confirmation
async function resetOrderConfirmation(customerName) {
    if (!ensureDOMReferences()) return;

    try {
        // Obter o número do pedido atual do DOM se não estiver disponível no currentOrderData
        let orderNumber = currentOrderData?.orderNumber || '';
        if (!orderNumber) {
            const displayOrderNumber = document.getElementById('displayOrderNumber');
            if (displayOrderNumber) {
                const match = displayOrderNumber.textContent.match(/#(\d+)/);
                if (match && match[1]) {
                    orderNumber = match[1];
                }
            }
        }

        // Se já enviou para o WhatsApp, mostrar mensagem diferente
        const swalOptions = {
            title: `<span style="font-family: 'Playfair Display', serif; color: #333;">Confirmação</span>`,
            html: `
                <div style="text-align: left; font-family: 'Poppins', sans-serif;">
                    <p style="font-size: 1.1em; color: #333; margin-bottom: 15px;">
                        Olá, <strong>${customerName || 'Cliente'}</strong>!
                    </p>
                    <p style="color: #666; margin-bottom: 20px;">
                        ${orderNumber ? `Você já enviou o pedido #${orderNumber} para o WhatsApp?` : 'Deseja fazer um novo pedido?'}
                    </p>
                </div>
            `,
            icon: null,
            showCancelButton: true,
            confirmButtonText: 'Sim, fazer novo pedido',
            cancelButtonText: 'Não, manter pedido',
            customClass: {
                container: 'custom-swal-container',
                popup: 'custom-swal-popup',
                header: 'custom-swal-header',
                title: 'custom-swal-title',
                closeButton: 'custom-swal-close',
                content: 'custom-swal-content',
                confirmButton: 'custom-swal-confirm',
                cancelButton: 'custom-swal-cancel'
            },
            buttonsStyling: false
        };

        const result = await Swal.fire(swalOptions);
        if (result.isConfirmed) {
            // Mostrar mensagem de sucesso antes de resetar
            const successOptions = {
                title: `<span style="font-family: 'Playfair Display', serif; color: #333;">Pedido Finalizado</span>`,
                html: `
                    <div style="text-align: center; font-family: 'Poppins', sans-serif;">
                        <p style="color: #666;">
                            O pedido #${currentOrderData?.orderNumber} foi finalizado com sucesso.
                            <br>Você pode fazer um novo pedido agora!
                        </p>
                    </div>
                `,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                    popup: 'custom-swal-popup',
                    title: 'custom-swal-title',
                    content: 'custom-swal-content'
                }
            };

            await Swal.fire(successOptions);
            // Resetar pedido apenas se confirmado
            await doResetOrder();
        }
    } catch (error) {
        console.error('Erro ao confirmar reset de pedido:', error);
        await Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao processar sua solicitação.',
            icon: 'error'
        });
    }
}

async function doResetOrder() {
    if (!ensureDOMReferences()) return;

    try {
        // Limpar dados do pedido e carrinho
        currentOrderData = null;
        cart = [];
        
        // Resetar elementos do DOM
        const elements = {
            orderConfirmation: document.getElementById('orderConfirmation'),
            checkoutForm: document.getElementById('checkoutForm'),
            cartTotalContainer: document.getElementById('cartTotalContainer'),
            emptyCart: document.getElementById('emptyCart'),
            orderSummary: document.getElementById('orderSummary'),
            displayOrderNumber: document.getElementById('displayOrderNumber'),
            cartItems: document.getElementById('cartItems')
        };
        
        if (!Object.values(elements).every(el => el !== null)) {
            console.error('Elementos necessários não encontrados em resetOrderConfirmation');
            return;
        }

        // Mostrar loading
        Swal.fire({
            title: 'Resetando...',
            html: '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        // Restaurar HTML do carrinho vazio
        elements.cartItems.innerHTML = `
            <div class="empty-cart" id="emptyCart">
                <img src="img/empty-cart.png" alt="Sacola Vazia" class="empty-cart-icon">
                <p>Sua sacola está vazia</p>
                <p class="empty-cart-subtitle">Explore nossos produtos e encontre o que você procura</p>
                <button class="btn-continue-shopping" onclick="closeCartModal()">
                    <span>Continuar Comprando</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 5l7 7-7 7M5 12h15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        // Resetar formulário de checkout
        if (elements.checkoutForm) {
            elements.checkoutForm.reset();
        }

        // Resetar visibilidade dos elementos
        elements.orderConfirmation.style.display = 'none';
        elements.cartTotalContainer.style.display = 'none';
        elements.emptyCart.style.display = 'block';
        elements.orderSummary.style.display = 'none';
        elements.displayOrderNumber.textContent = '';

        // Resetar contagem do carrinho
        updateCartCount();

        // Fechar modal do carrinho
        closeCartModal();

        // Mostrar mensagem de sucesso
        Swal.fire({
            title: 'Sacola Resetada',
            text: 'Sua sacola foi resetada com sucesso!',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Erro ao resetar pedido:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao resetar o pedido.',
            icon: 'error'
        });
    } finally {
        // Fechar qualquer alerta de loading
        Swal.close();
    }
}

// Event listeners
function initializeEventListeners() {
    const cartIcon = document.getElementById('cartIcon');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const installmentsSelect = document.getElementById('installments');
    const waitlistForm = document.getElementById('waitlistForm');
    const waitlistPhone = document.getElementById('waitlistPhone');

    if (cartIcon) cartIcon.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', closeCartModal);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartModal);
    if (installmentsSelect) installmentsSelect.addEventListener('change', updateInstallments);
    if (waitlistForm) waitlistForm.addEventListener('submit', handleWaitlistSubmit);
    if (waitlistPhone) waitlistPhone.addEventListener('input', maskPhone);

    // Fechar modal da lista de espera ao clicar fora
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('waitlistModal');
        if (event.target === modal) {
            closeWaitlistModal();
        }
    });
}

// Inicializa o letreiro promocional
function initializePromoMarquee() {
    const promoText = document.querySelector('.header-promo');
    if (promoText) {
        const text = promoText.textContent.trim();
        // Repete o texto 3 vezes para criar um efeito contínuo
        const repeatedText = `${text} • ${text} • ${text}`;
        promoText.innerHTML = `<span class="marquee">${repeatedText}</span>`;
    }
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar referências DOM e event listeners
        if (!ensureDOMReferences()) {
            console.warn('Algumas referências DOM não foram encontradas');
            return;
        }

        // Inicializar letreiro promocional
        initializePromoMarquee();
        
        // Inicializar grid de produtos
        initializeProductsGrid();
        initializeEventListeners();

        // Carregar produtos do Firestore
        const productsFromFirestore = await loadProducts();
        if (productsFromFirestore) {
            products = productsFromFirestore;
            
            // Configurar listener em tempo real para produtos
            const productsCollection = collection(window.db, 'products');
            onSnapshot(productsCollection, (snapshot) => {
                const updatedProducts = [];
                snapshot.forEach(doc => {
                    const product = { id: doc.id, ...doc.data() };
                    updatedProducts.push(product);
                });
                
                // Atualizar produtos globalmente
                products = updatedProducts;
                
                // Re-renderizar listas
                renderProductList();
                
                // Atualizar carrinho se necessário
                updateCartState();
            });
        } else {
            console.error('Erro ao carregar produtos do Firestore');
        }

        // Inicializar interface
        renderProductList();
        updateCartCount();
    } catch (error) {
        console.error('Erro ao inicializar app:', error);
    }
});

// Função para inicializar a aplicação
async function initializeApp() {
    try {
        // Inicializar referências DOM e event listeners
        if (!ensureDOMReferences()) {
            console.warn('Algumas referências DOM não foram encontradas');
            return;
        }

        // Inicializar grid de produtos
        initializeProductsGrid();
        initializeEventListeners();

        // Carregar produtos do Firestore
        const productsFromFirestore = await loadProducts();
        if (productsFromFirestore) {
            products = productsFromFirestore;
            
            // Configurar listener em tempo real para produtos
            const productsCollection = collection(window.db, 'products');
            onSnapshot(productsCollection, (snapshot) => {
                const updatedProducts = [];
                snapshot.forEach(doc => {
                    const product = { id: doc.id, ...doc.data() };
                    updatedProducts.push(product);
                });
                
                // Atualizar produtos globalmente
                products = updatedProducts;
                
                // Re-renderizar listas
                renderProductList();
                
                // Atualizar carrinho se necessário
                updateCartState();
            });
        } else {
            console.error('Erro ao carregar produtos do Firestore');
        }

        // Inicializar interface
        renderProductList();
        updateCartCount();
    } catch (error) {
        console.error('Erro ao inicializar app:', error);
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}