// Função para observar mudanças na variável global de produtos
function observeProducts() {
    console.log('Observando alterações em window.products...');
    
    // Verifica se window.products já existe e tem itens
    if (window.products && Array.isArray(window.products) && window.products.length > 0) {
        console.log('Produtos já carregados, inicializando categorias...');
        initCategories();
        return;
    }
    
    // Cria um proxy para observar mudanças na variável window.products
    window.products = new Proxy(window.products || [], {
        set: function(target, property, value, receiver) {
            console.log(`Alteração em window.products[${property}]`);
            
            // Atualiza o valor original
            const result = Reflect.set(target, property, value, receiver);
            
            // Se a propriedade for 'length' ou se for um índice numérico, atualiza as categorias
            if (property === 'length' || !isNaN(property)) {
                console.log('Atualizando categorias devido a mudança em window.products');
                initCategories();
            }
            
            return result;
        }
    });
    
    // Tenta carregar os produtos se ainda não estiverem carregados
    if ((!window.products || window.products.length === 0) && typeof loadProducts === 'function') {
        console.log('Carregando produtos...');
        loadProducts()
            .then(products => {
                console.log(`${products.length} produtos carregados com sucesso`);
                initCategories();
            })
            .catch(error => {
                console.error('Erro ao carregar produtos:', error);
            });
    }
    
        // Verifica periodicamente se a variável foi definida (para casos onde o proxy não pegar a inicialização)
    let initTimeout;
    const checkProducts = setInterval(() => {
        if (window.products && Array.isArray(window.products)) {
            if (window.products.length > 0) {
                console.log('Produtos carregados via intervalo de verificação');
                if (initCategoriesWhenReady()) {
                    if (initTimeout) clearTimeout(initTimeout);
                    clearInterval(checkProducts);
                }
            } else if (typeof loadProducts === 'function') {
                console.log('Array de produtos vazio, tentando carregar novamente...');
                loadProducts()
                    .then(products => {
                        console.log(`${products.length} produtos carregados no retry`);
                        initCategories();
                        clearInterval(checkProducts);
                    })
                    .catch(console.error);
            }
        }
    }, 1500);
    
    // Limpa o intervalo após 15 segundos para evitar vazamento de memória
    setTimeout(() => {
        clearInterval(checkProducts);
        console.log('Verificação de produtos encerrada após timeout');
    }, 15000);
}

// Função para atualizar a visibilidade dos botões de rolagem
function updateScrollButtons() {
    const categoriesScroll = document.getElementById('categoriesScroll');
    const scrollLeftBtn = document.querySelector('.scroll-button.scroll-left');
    const scrollRightBtn = document.querySelector('.scroll-button.scroll-right');
    
    if (!categoriesScroll || !scrollLeftBtn || !scrollRightBtn) {
        console.warn('Elementos de rolagem não encontrados');
        return;
    }
    
    // Verifica se há overflow horizontal
    const hasHorizontalScroll = categoriesScroll.scrollWidth > categoriesScroll.clientWidth;
    
    // Atualiza a visibilidade dos botões de rolagem
    scrollLeftBtn.style.display = hasHorizontalScroll ? 'flex' : 'none';
    scrollRightBtn.style.display = hasHorizontalScroll ? 'flex' : 'none';
    
    console.log('Botões de rolagem atualizados:', {
        hasHorizontalScroll,
        scrollWidth: categoriesScroll.scrollWidth,
        clientWidth: categoriesScroll.clientWidth,
        scrollLeft: categoriesScroll.scrollLeft,
        scrollLeftMax: categoriesScroll.scrollWidth - categoriesScroll.clientWidth
    });
}

// Função para rolagem suave
function scrollCategories(direction) {
    const categoriesScroll = document.getElementById('categoriesScroll');
    if (!categoriesScroll) return;
    
    const scrollAmount = 200; // Quantidade de pixels para rolar
    const currentScroll = categoriesScroll.scrollLeft;
    
    categoriesScroll.scrollTo({
        left: currentScroll + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth'
    });
    
    // Atualiza os botões após a animação de rolagem
    setTimeout(updateScrollButtons, 300);
}

// Função para extrair categorias únicas dos produtos
function getUniqueCategories(products) {
    const allCategories = new Set();
    
    if (!products || !Array.isArray(products)) {
        console.warn('Nenhum produto encontrado para extrair categorias');
        return ['Todas as Categorias'];
    }
    
    // Coleta todas as categorias únicas
    products.forEach(product => {
        if (product && product.category && typeof product.category === 'string' && product.category.trim() !== '') {
            allCategories.add(product.category.trim());
        }
    });
    
    // Converte para array, remove duplicatas e ordena alfabeticamente
    const sortedCategories = Array.from(allCategories).sort((a, b) => 
        a.localeCompare(b, 'pt-BR', {sensitivity: 'base'})
    );
    
    // Garante que 'Todas as Categorias' é o primeiro item
    return ['Todas as Categorias', ...sortedCategories.filter(cat => cat !== 'Todas as Categorias')];
}

// Função para inicializar as categorias
function initCategories() {
    console.log('Iniciando initCategories...');
    const categoriesScroll = document.getElementById('categoriesScroll');
    if (!categoriesScroll) {
        console.warn('Elemento categoriesScroll não encontrado no DOM');
        return;
    }
    
    // Tenta obter os produtos da variável global
    const products = window.products || [];
    console.log('Produtos disponíveis:', products);
    
    // Verifica se há produtos e se eles têm categorias
    if (products.length > 0) {
        console.log('Primeiro produto:', {
            id: products[0].id,
            name: products[0].name,
            category: products[0].category
        });
    }
    
    const categories = getUniqueCategories(products);
    console.log('Categorias extraídas:', categories);
    
    // Limpa as categorias atuais
    categoriesScroll.innerHTML = '';
    
    if (categories.length === 0) {
        console.warn('Nenhuma categoria encontrada para exibir');
        // Adiciona uma mensagem ou categoria padrão
        const defaultCategory = document.createElement('div');
        defaultCategory.className = 'category-item active';
        defaultCategory.textContent = 'Todas as Categorias';
        defaultCategory.setAttribute('data-category', 'Todas as Categorias');
        defaultCategory.addEventListener('click', handleCategoryClick);
        categoriesScroll.appendChild(defaultCategory);
    } else {
        // Adiciona as categorias ao DOM
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item' + (category === 'Todas as Categorias' ? ' active' : '');
            categoryItem.textContent = category;
            categoryItem.setAttribute('data-category', category);
            categoryItem.addEventListener('click', handleCategoryClick);
            categoriesScroll.appendChild(categoryItem);
        });
    }
    
    console.log('Categorias adicionadas ao DOM');
    
    // Atualiza a visibilidade dos botões de rolagem
    updateScrollButtons();
    
    // Força uma nova verificação após um pequeno atraso para garantir que o DOM foi atualizado
    setTimeout(updateScrollButtons, 300);
    
    // Verifica novamente após um tempo maior para garantir que tudo foi carregado
    setTimeout(() => {
        console.log('Verificação final das categorias:', {
            scrollElement: document.getElementById('categoriesScroll'),
            categories: document.querySelectorAll('.category-item').length
        });
        updateScrollButtons();
    }, 1000);
}

// Função para lidar com o clique em uma categoria
function handleCategoryClick(e) {
    // Prevenir comportamento padrão do link
    e.preventDefault();
    
    const category = e.currentTarget.getAttribute('data-category');
    console.log('Categoria selecionada:', category);
    
    // Atualizar a categoria atual
    window.currentCategory = category;
    
    // Remover a classe 'active' de todos os itens
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar a classe 'active' ao item clicado
    e.currentTarget.classList.add('active');
    
    // Rolar suavemente para o topo
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Forçar atualização da lista de produtos
    if (typeof window.renderProductList === 'function') {
        console.log('Atualizando lista de produtos para a categoria:', category);
        window.renderProductList();
    } else {
        console.error('Função renderProductList não encontrada');
    }
}

// Inicializa as categorias quando os produtos estiverem disponíveis
function initCategoriesWhenReady() {
    if (window.products && Array.isArray(window.products) && window.products.length > 0) {
        console.log('Produtos disponíveis para inicialização de categorias:', window.products);
        initCategories();
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicia a observação da variável de produtos
    observeProducts();
    
    // Elementos do DOM
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const scrollLeftBtn = document.querySelector('.scroll-button.scroll-left');
    const scrollRightBtn = document.querySelector('.scroll-button.scroll-right');
    
    // Tenta inicializar as categorias imediatamente
    let categoriesInitialized = initCategoriesWhenReady();
    
    // Se não conseguiu inicializar, tenta novamente após um curto atraso
    if (!categoriesInitialized) {
        const checkProductsLoaded = setInterval(() => {
            if (initCategoriesWhenReady()) {
                clearInterval(checkProductsLoaded);
            }
        }, 500);
        
        // Timeout de segurança
        const initTimeout = setTimeout(() => {
            if (window.products && Array.isArray(window.products)) {
                initCategories();
            } else {
                console.warn('Produtos não carregados após timeout, tentando inicializar categorias de qualquer forma');
                initCategories();
            }
            clearInterval(checkProductsLoaded);
        }, 3000);
    }
    
    // Função para criar os itens de categoria
    function createCategoryItems() {
        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;
        
        // Limpa a lista de categorias
        categoriesList.innerHTML = '';
        
        // Adiciona a categoria 'Todas' como padrão
        const allCategoriesItem = document.createElement('div');
        allCategoriesItem.className = 'category-item active';
        allCategoriesItem.textContent = 'Todas as Categorias';
        allCategoriesItem.setAttribute('data-category', 'Todas as Categorias');
        allCategoriesItem.addEventListener('click', handleCategoryClick);
        categoriesList.appendChild(allCategoriesItem);
    // Limpa as categorias atuais
    categoriesScroll.innerHTML = '';
    
    // Adiciona as categorias ao DOM
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item' + (category === 'Todas as Categorias' ? ' active' : '');
        categoryItem.textContent = category;
        categoryItem.setAttribute('data-category', category);
            categoryItem.addEventListener('click', handleCategoryClick);
            categoriesScroll.appendChild(categoryItem);
        });
        
        // Atualiza a visibilidade dos botões de rolagem
        updateScrollButtons();
    }
    
    // Função para lidar com a busca
    function handleSearch() {
        const searchTerm = searchInput.value.trim();
        console.log('Buscando por:', searchTerm);
        
        // Atualizar o termo de busca atual
        window.currentSearchTerm = searchTerm || '';
        
        // Se a função renderProductList estiver disponível, chame-a para atualizar a lista de produtos
        if (typeof window.renderProductList === 'function') {
            window.renderProductList();
        }
    }
    
    // As funções updateScrollButtons e scrollCategories já estão definidas no escopo global
    
    // Event Listeners
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // Adiciona event listeners para os botões de rolagem
    if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', () => scrollCategories('left'));
    }
    
    if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', () => scrollCategories('right'));
    }
    
    // Atualiza a visibilidade dos botões de rolagem quando o usuário rolar
    const categoriesScroll = document.getElementById('categoriesScroll');
    if (categoriesScroll) {
        categoriesScroll.addEventListener('scroll', updateScrollButtons);
    }
    
    // Atualiza a visibilidade dos botões quando a janela for redimensionada
    window.addEventListener('resize', updateScrollButtons);
    
    // Inicialização
    createCategoryItems();
    
    // Verifica se há um termo de busca na URL (opcional)
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('q');
    if (searchParam && searchInput) {
        searchInput.value = searchParam;
        handleSearch();
    }
});
