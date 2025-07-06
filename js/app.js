import { loadProducts } from './products.js';

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
import { collection, onSnapshot, addDoc, getDocs, query, where, getDoc, doc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

// Estado global
let cart = [];  // Carrinho de compras
let products = [];  // Lista de produtos
let currentOrderData = null;  // Dados do pedido atual

// Exportar funções para uso no HTML
export {
    removeFromCart,
    updateCartState,
    updateCartCount,
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

// Tornar resetOrderConfirmation global para uso inline
window.resetOrderConfirmation = resetOrderConfirmation;

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
            return;
        }

        if (!product.active || product.quantity <= 0) {
            const confirmRequest = confirm(
                'Este produto está sem estoque no momento. Deseja receber uma notificação quando estiver disponível?'
            );
            if (confirmRequest) {
                await requestOutOfStockProduct(productId);
            }
            return;
        }

        const currentCartItem = cart.find(item => item.id === productId);
        const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
        const remaining = product.quantity - currentCartQuantity;

        if (remaining <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Estoque máximo atingido',
                text: 'Você já adicionou todo o estoque disponível deste produto ao carrinho.',
                confirmButtonColor: '#ff1493'
            });
            return;
        }

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

        updateCartState();
        // SweetAlert de feedback visual sempre
        const newRemaining = remaining - 1;
        if (newRemaining > 2) {
            Swal.fire({
                title: 'Adicionado!',
                text: 'Produto adicionado ao carrinho.',
                icon: 'success',
                timer: 1200,
                showConfirmButton: false
            });
        } else {
            let alertText = '';
            if (newRemaining === 2) {
                alertText = 'Apenas 2 unidades restantes!';
            } else if (newRemaining === 1) {
                alertText = 'Última unidade disponível!';
            } else if (newRemaining === 0) {
                alertText = 'Você adicionou a última unidade disponível ao carrinho!';
            }
            Swal.fire({
                title: 'Atenção',
                text: alertText,
                icon: 'warning',
                timer: 1800,
                showConfirmButton: false
            });
        }

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


// Inicializar grid de produtos
let productsGridInitialized = false;

function initializeProductsGrid() {
    if (productsGridInitialized) return;
    
    productsGrid = document.getElementById('productsGrid');
    
    if (productsGrid) {
        console.log('Grid de produtos inicializado com sucesso');
        productsGridInitialized = true;
        
        // Inicia atualização em tempo real dos produtos
        if (typeof listenProductsRealtime === 'function') listenProductsRealtime();
    } else {
        console.warn('Elemento productsGrid não encontrado, tentando novamente em 100ms');
        setTimeout(initializeProductsGrid, 100);
    }
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

let productsRendered = false;

async function renderProductList() {
    if (!productsGrid) return;

    try {
        if (productsRendered) return;
        productsRendered = true;

        // Exibir todos os produtos, inclusive desativados
        const allProducts = window.products.slice();
        console.log('Produtos encontrados:', allProducts.length);

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
            const stockStatus = await getStockStatus(product.id);
            const stockClass = stockStatus.class;
            const stockText = stockStatus.text;

            // Calcular descontos
            const normalDiscount = product.oldPrice ? Math.round((1 - product.price/product.oldPrice) * 100) : 0;
            const pixDiscount = product.price && product.pixPrice ? Math.round((1 - product.pixPrice/product.price) * 100) : 0;

            const productCard = document.createElement('div');
            productCard.className = 'product-grid-item';
            productCard.innerHTML = `
                <img src="${product.imageUrl || '/img/placeholder.png'}" alt="${product.name}" onerror="this.onerror=null; this.src='/img/placeholder.png'">
            <h3>${product.name}</h3>
            <div class="product-category-label" style="font-size:0.93em;color:#888;margin-top:-0.15em;margin-bottom:0.6em;">
                ${typeof product.category === 'string' && product.category.trim() ? product.category : '<span style=\"color:#bbb;\">Sem categoria</span>'}
            </div>
            <p class="product-description">${product.description || ''}</p>
            <div class="price-info">
                ${product.oldPrice ? `
                    <p class="old-price">De: R$ ${product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                ` : ''}
                <p class="current-price">Por: R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <span class="discount-badge">-${normalDiscount}% OFF!</span>
                ${product.pixPrice ? `
                    <p class="pix-price">No PIX: R$ ${product.pixPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <span class="discount-badge pix-discount">-${pixDiscount}% OFF!</span>
                ` : ''}
            </div>
            ${(() => {
                const cartItem = cart.find(item => String(item.id) === String(product.id));
                const available = product.quantity - (cartItem ? cartItem.quantity : 0);
                if (product.quantity === 0 || product.active === false) {
                    return `
                        <p class="stock-alert stock-unavailable">
                            <i class="fas fa-ban"></i>
                            Produto Indisponível
                        </p>
                        <button onclick="requestOutOfStockProduct('${product.id}')" class="btn-out-of-stock">
                            <i class="fas fa-envelope"></i>
                            Avise-me!
                        </button>
                    `;
                } else if (available <= 2) {
                    return `
                        <p class="stock-alert">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${available === 1 ? 'Última unidade!' : available === 2 ? 'Apenas 2 unidades!' : 'Produto quase esgotado!'}
                        </p>
                        <button onclick="addToCart('${product.id}')" class="btn-add-cart">
                            <i class="fas fa-shopping-cart"></i>
                            Adicionar ao Carrinho
                        </button>
                    `;
                } else {
                    return `
                        <button onclick="addToCart('${product.id}')" class="btn-add-cart">
                            <i class="fas fa-shopping-cart"></i>
                            Adicionar ao Carrinho
                        </button>
                    `;
                }
            })()}
        
        `;
            productsGrid.appendChild(productCard);
        }

    } catch (error) {
        console.error('Erro ao renderizar lista de produtos:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro ao carregar os produtos.',
            icon: 'error'
        });
    }
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
    } catch (error) {
        console.error('Erro ao salvar lista de espera:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Erro ao salvar seu pedido de lista de espera. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
    }
}

function requestOutOfStockProduct(productId) {
    openWaitlistModal(productId);
}


async function removeFromCart(productId) {
    if (!ensureDOMReferences()) return;

    const index = cart.findIndex(item => String(item.id) === String(productId));
    if (index !== -1) {
        const item = cart[index];
        const result = await Swal.fire({
            title: '<span style="font-family: var(--font-heading); color: var(--color-primary-dark); font-size: 1.4em;">Remover produto?</span>',
            html: `
                <div style="display: flex; align-items: center; flex-direction: column; gap: 12px;">
                    <img src="${item.imageUrl || '/img/placeholder.png'}" alt="${item.name}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 10px; box-shadow: 0 2px 8px #0001; border: 2px solid var(--color-border); background: var(--color-light-gray);">
                    <div style="font-family: var(--font-body); color: var(--color-dark); font-size: 1.1em; margin-bottom: 2px; font-weight: 600;">${item.name}</div>
                    <div style="color: var(--color-gray); font-size: 1em;">Quantidade: <b style='color:var(--color-primary);'>${item.quantity}</b></div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-trash"></i> Sim, remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#FF69B4',
            cancelButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-gray').trim() || '#666',
            background: getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || '#fff',
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                confirmButton: 'btn btn-theme',
                cancelButton: 'btn btn-cancel-theme'
            },
            reverseButtons: true
        });
        if (result.isConfirmed) {
            cart.splice(index, 1);
            updateCartState();
            Swal.fire({
                title: 'Removido',
                text: `Produto removido do carrinho!`,
                icon: 'success',
                timer: 1200,
                showConfirmButton: false
            });
        }
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

function decreaseQuantity(productId) {
    if (!ensureDOMReferences()) return;
    console.log('[decreaseQuantity] chamado para productId:', productId, 'tipo:', typeof productId);
    const cartItem = cart.find(item => String(item.id) === String(productId));
    if (cartItem && cartItem.quantity > 1) {
        cartItem.quantity--;
        console.log('[decreaseQuantity] Novo quantity:', cartItem.quantity, 'para item:', cartItem);
        updateCartState();
    } else if (!cartItem) {
        console.warn('[decreaseQuantity] Nenhum item encontrado para productId:', productId, 'Carrinho:', cart);
    }
}

function increaseQuantity(productId) {
    if (!ensureDOMReferences()) return;
    console.log('[increaseQuantity] chamado para productId:', productId, 'tipo:', typeof productId);
    const cartItem = cart.find(item => String(item.id) === String(productId));
    const product = (window.products || []).find(p => String(p.id) === String(productId));
    if (cartItem && product) {
        if (cartItem.quantity < product.quantity) {
            cartItem.quantity++;
            console.log('[increaseQuantity] Novo quantity:', cartItem.quantity, 'para item:', cartItem);
            updateCartState();
        } else {
            Swal.fire({
                title: 'Estoque máximo atingido',
                text: `Só há ${product.quantity} unidade${product.quantity > 1 ? 's' : ''} em estoque.`,
                icon: 'warning',
                timer: 1600,
                showConfirmButton: false
            });
        }
    } else {
        console.warn('[increaseQuantity] Nenhum item encontrado para productId:', productId, 'Carrinho:', cart);
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
function updateCartState() {
    const elements = {
        cartItems: document.getElementById('cartItems'),
        cartTotalContainer: document.getElementById('cartTotalContainer'),
        emptyCart: document.getElementById('emptyCart'),
        checkoutForm: document.getElementById('checkoutForm')
    };

    if (!Object.values(elements).every(el => el !== null)) {
        console.warn('Elementos necessários não encontrados');
        return;
    }

    updateCartItems();
    updateCartTotals();
    updateCartVisibility();
    updateCartCount();
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
                <img src="${item.imageUrl || '/img/placeholder.png'}" alt="${item.name}" onerror="this.onerror=null; this.src='/img/placeholder.png'">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="quantity-controls">
                        <button onclick="decreaseQuantity(${item.id})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="increaseQuantity(${item.id})">+</button>
                    </div>
                </div>
                <div class="cart-item-prices" style="margin-bottom:4px;">
  <div style="color:#009688;font-weight:500;font-size:1em;">R$ ${(item.pixPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size:0.95em;">no Pix</span></div>
  <div style="color:#333;font-size:0.98em;">ou R$ ${(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no Cartão</div>
</div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">Remover</button>
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
        pixTotal: document.getElementById('pixTotal'),
        installments: document.getElementById('installments')
    };

    if (!elements.cartTotal || !elements.pixTotal || !elements.installments) {
        console.warn('Elementos necessários não encontrados em updateCartTotals');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const pixTotalValue = cart.reduce((sum, item) => sum + (item.pixPrice * item.quantity), 0);
    const installmentValue = calculateInstallment(total, parseInt(elements.installments.value));

    elements.cartTotal.innerHTML = `
        <div class="total-info">
            <span>Total:</span>
            <span class="total-with-items">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>${elements.installments.value}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
    `;

    elements.pixTotal.innerHTML = `
        <div class="pix-discount">
            <span>Total no PIX:</span>
            <span>R$ ${pixTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-${Math.round(((total - pixTotalValue) / total) * 100)}%)</span>
        </div>
    `;
}

// Toggle cart modal
function toggleCart() {
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
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Verificar se há itens no carrinho
    if (cart.length === 0) {
        return;
    }

    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const email = document.getElementById('customerEmail').value;
    const orderNumber = generateOrderNumber();
    
    // Create order message
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const pixTotal = cart.reduce((sum, item) => sum + (item.pixPrice * item.quantity), 0);
    const installments = document.getElementById('installments').value;
    const installmentValue = calculateInstallment(total, parseInt(installments));
    
    const message = `*Novo Pedido: ${orderNumber}*\n\n` +
        `*Cliente:* ${name}\n` +
        `*Telefone:* ${phone}\n` +
        `*Email:* ${email}\n\n` +
        `*Produtos:*\n${cart.map(item => 
            `- ${item.name} (${item.quantity}x) - R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ).join('\n')}\n\n` +
        `*Total:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `*Parcelamento:* ${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `*Total no PIX:* R$ ${pixTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.round(((total - pixTotal) / total) * 100)}% de desconto)`;
    
    // Show order confirmation
    const orderConfirmation = document.getElementById('orderConfirmation');
    const checkoutFormElement = document.getElementById('checkoutForm');
    const cartTotalContainer = document.getElementById('cartTotalContainer');
    const displayOrderNumber = document.getElementById('displayOrderNumber');
    const orderSummary = document.getElementById('orderSummary');
    const whatsappButton = document.getElementById('whatsappButton');
    const emptyCartMessage = document.getElementById('emptyCart');
    
    // Verificar se todos os elementos existem
    if (!orderConfirmation || !checkoutFormElement || !cartTotalContainer || 
        !displayOrderNumber || !orderSummary || !whatsappButton || !emptyCartMessage) {
        console.error('Elementos necessários não encontrados:', {
            orderConfirmation: !!orderConfirmation,
            checkoutFormElement: !!checkoutFormElement,
            cartTotalContainer: !!cartTotalContainer,
            displayOrderNumber: !!displayOrderNumber,
            orderSummary: !!orderSummary,
            whatsappButton: !!whatsappButton,
            emptyCartMessage: !!emptyCartMessage
        });
        return;
    }
    
    // Create order summary HTML
    const summaryHtml = `
        ${cart.map(item => `
            <div class="order-summary-item">
                <span>${item.name} (${item.quantity}x)</span>
                <span>R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        `).join('')}
        <div class="order-summary-item order-summary-total">
            <span>Total:</span>
            <span>R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="order-summary-item">
            <span>Parcelamento:</span>
            <span>${installments}x de R$ ${installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="order-summary-item order-summary-pix">
            <span>Total no PIX:</span>
            <span>R$ ${pixTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-${Math.round(((total - pixTotal) / total) * 100)}%)</span>
        </div>
    `;
    
    // Armazenar dados do pedido para manter visível
    currentOrderData = {
        orderNumber,
        customerName: document.getElementById('customerName').value,
        items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        total,
        installments,
        installmentValue,
        pixTotal,
        message
    };
    
    try {
        // Salvar pedido no Firestore e abater estoque
        const db = window.db;
        // 1. Criar pedido na coleção 'orders'
        const orderDoc = await addDoc(collection(db, 'orders'), {
            orderNumber,
            customerName: name,
            phone,
            email,
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            total,
            installments,
            installmentValue,
            pixTotal,
            createdAt: new Date(),
            status: 'Pendente'
        });
        // 2. Abater estoque dos produtos
        for (const item of cart) {
            const productRef = doc(db, 'products', String(item.id));
            await updateDoc(productRef, {
                quantity: increment(-item.quantity)
            });
        }
        // Update UI - Primeiro esconder elementos
        checkoutFormElement.style.display = 'none';
        cartTotalContainer.style.display = 'none';
        emptyCartMessage.style.display = 'none';
        
        // Depois atualizar o conteúdo
        displayOrderNumber.textContent = `Pedido #${orderNumber}`;
        orderSummary.innerHTML = summaryHtml;
        whatsappButton.href = `https://wa.me/5571991427989?text=${encodeURIComponent(message)}`;
        
        // Por último mostrar a confirmação
        orderConfirmation.classList.add('show');
        
        // Limpar carrinho sem afetar a confirmação
        cart = [];
        updateCartCount();
        checkoutForm.reset();
        
        console.log('Confirmação do pedido exibida com sucesso e estoque atualizado');
    } catch (error) {
        console.error('Erro ao exibir confirmação:', error);
    }
    });
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
        // Se já enviou para o WhatsApp, mostrar mensagem diferente
        const swalOptions = {
            title: `<span style="font-family: 'Playfair Display', serif; color: #333;">Confirmação</span>`,
            html: `
                <div style="text-align: left; font-family: 'Poppins', sans-serif;">
                    <p style="font-size: 1.1em; color: #333; margin-bottom: 15px;">
                        Olá, <strong>${customerName}</strong>!
                    </p>
                    <p style="color: #666; margin-bottom: 20px;">
                        Você já enviou o pedido #${currentOrderData?.orderNumber} para o WhatsApp?
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
                <img src="img/empty-cart.png" alt="Carrinho Vazio" class="empty-cart-icon">
                <p>Seu carrinho está vazio</p>
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
            title: 'Carrinho Resetado',
            text: 'Seu carrinho foi resetado com sucesso!',
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

document.addEventListener('DOMContentLoaded', async () => {
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
});
