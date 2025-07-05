import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";



// Referência à coleção de produtos
const productsCollection = 'products';

// Carregar produtos
export async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(window.db, productsCollection));
        const products = [];
        
        querySnapshot.forEach((doc) => {
            const productData = doc.data();
            // Garantir que o produto tenha as propriedades necessárias
            const product = {
                id: doc.id,
                name: productData.name || 'Produto sem nome',
                price: Number(productData.price) || 0,
                pixPrice: Number(productData.pixPrice) || Number(productData.price) || 0,
                imageUrl: productData.imageUrl || '/img/placeholder.png',
                description: productData.description || '',
                quantity: Number(productData.quantity) || 0,
                purchasePrice: Number(productData.purchasePrice) || 0,
                category: typeof productData.category === 'string' && productData.category.trim() 
                          ? productData.category.trim()
                          : 'Sem categoria',
                active: productData.active === false ? false : true,
                specialOffer: productData.specialOffer || false,
                oldPrice: productData.oldPrice || null
              };
              
            products.push(product);
        });
        
        console.log(`${products.length} produtos carregados`);
        window.products = products;
        return products;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        throw error;
    }
}

// Funções de gerenciamento de produtos
async function migrateProductsToFirestore() {
    try {
        console.log('Iniciando migração dos produtos...');
        const batch = writeBatch(window.db);
        const productsRef = collection(window.db, 'products');

        // Adicionar cada produto ao batch
        for (const product of window.products) {
            console.log(`Migrando produto: ${product.name}`);
            const docRef = doc(productsRef, product.id.toString());
            batch.set(docRef, product);
        }

        // Executar o batch
        console.log('Executando batch write...');
        await batch.commit();
        console.log('Produtos migrados com sucesso!');

        Swal.fire({
            title: 'Sucesso!',
            text: 'Produtos migrados para o Firestore com sucesso!',
            icon: 'success',
            confirmButtonColor: '#4CAF50'
        });

        return true;
    } catch (error) {
        console.error('Erro ao migrar produtos:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Erro ao migrar produtos para o Firestore: ' + error.message,
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
        return false;
    }
}

export async function initializeProducts() {
    try {
        console.log('Verificando produtos no Firestore...');
        const querySnapshot = await getDocs(collection(window.db, 'products'));
        
        if (querySnapshot.empty) {
            console.log('Nenhum produto encontrado, iniciando migração...');
            await migrateProductsToFirestore();
        } else {
            console.log('Produtos já existem no Firestore');
        }
    } catch (error) {
        console.error('Erro ao inicializar produtos:', error);
    }
}

export async function deleteProduct(productId) {
    try {
        console.log('Deletando produto com ID:', productId);
        
        // Remover do Firestore
        const productRef = doc(window.db, productsCollection, productId.toString());
        await deleteDoc(productRef);
        
        // Remover da lista local
        const index = window.products.findIndex(p => p.id === productId);
        if (index > -1) {
            window.products.splice(index, 1);
        }
        
        console.log('Produto deletado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Erro ao deletar produto: ' + error.message,
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
        return false;
    }
}

export async function saveProduct(product) {
    try {
        console.log('Salvando produto:', product.name);
        console.log('Dados do produto:', product);
        
        // Garantir que os campos obrigatórios existam
        if (!product.name || !product.price || product.quantity === undefined) {
            throw new Error('Campos obrigatórios faltando: nome, preço ou quantidade');
        }

        // Processar imagem
        let imageUrl = product.imageUrl || product.image;
        
        // Se é um arquivo (upload)
        if (product.imageFile) {
            const reader = new FileReader();
            reader.readAsDataURL(product.imageFile);
            reader.onload = function(e) {
                imageUrl = e.target.result;
            };
        }
        
        // Se é base64
        else if (imageUrl && imageUrl.startsWith('data:image/')) {
            imageUrl = imageUrl;
        }
        // Se é caminho relativo
        else if (imageUrl && !imageUrl.startsWith('http')) {
            const cleanPath = imageUrl.replace(/^\.\./, '');
            imageUrl = window.location.origin + '/' + cleanPath;
        }
        // Se não tem imagem
        else if (!imageUrl) {
            imageUrl = null;
        }

        // Converter valores numéricos para números
        const productData = {
            ...product,
            name: product.name,
            description: product.description || '',
            imageUrl: imageUrl,
            price: parseFloat(product.price),
            oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
            pixPrice: product.pixPrice ? parseFloat(product.pixPrice) : null,
            quantity: parseInt(product.quantity) || 0,
            active: Boolean(product.active),
            specialOffer: Boolean(product.specialOffer)
        };

        const productRef = doc(window.db, productsCollection, product.id.toString());
        await setDoc(productRef, productData, { merge: true });
        
        // Atualizar dados globais
        const index = window.products.findIndex(p => p.id === product.id);
        if (index > -1) {
            window.products[index] = productData;
        } else {
            window.products.push(productData);
        }

        console.log('Produto salvo com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Erro ao salvar produto: ' + error.message,
            icon: 'error',
            confirmButtonColor: '#ff1493'
        });
        return false;
    }
}


// Função para verificar disponibilidade do produto
async function isProductAvailable(productId) {
    try {
        const productDoc = await getDoc(doc(window.db, productsCollection, productId.toString()));
        if (productDoc.exists()) {
            const productData = productDoc.data();
            return productData.active !== false && (productData.quantity || 0) > 0;
        }
        return false;
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        return false;
    }
}

// Função para obter quantidade em estoque
async function getStockQuantity(productId) {
    try {
        const productDoc = await getDoc(doc(window.db, productsCollection, productId.toString()));
        if (productDoc.exists()) {
            return productDoc.data().quantity || 0;
        }
        return 0;
    } catch (error) {
        console.error('Erro ao obter quantidade em estoque:', error);
        return 0;
    }
}
