// javascript/meus-servicos.js

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAKTwMCe5sUPoZz5jwSYV1WiNmGjGxNxY8",
    authDomain: "tcciwill.firebaseapp.com",
    projectId: "tcciwill",
    storageBucket: "tcciwill.appspot.com",
    messagingSenderId: "35460029082",
    appId: "1:35460029082:web:90ae52ac65ff355d8f9d23"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {

    // Seletores de elementos
    const productGrid = document.getElementById('productGrid');
    const loader = document.getElementById('loader');
    
    // Modal de Edição
    const editModal = document.getElementById('editModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const editForm = document.getElementById('editForm');
    
    // Modal de Interessados
    const interestedModal = document.getElementById('interestedModal');
    const interestedModalCloseBtn = document.getElementById('interestedModalCloseBtn');
    const interestedList = document.getElementById('interestedList');
    const interestedLoader = document.getElementById('interestedLoader');

    const searchInput = document.getElementById('myServicesSearchInput');

    let currentUser = null;
    let userProducts = [];

    // Verifica a autenticação e inicia o carregamento dos produtos
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserProducts();
        } else {
            window.location.href = "login.html";
        }
    });

    // FUNÇÃO PARA CARREGAR APENAS OS PRODUTOS DO USUÁRIO LOGADO
    const loadUserProducts = async () => {
        if (!currentUser) return;
        loader.style.display = 'flex';
        productGrid.innerHTML = '';
        try {
            const snapshot = await db.collection('produtos')
                                     .where("vendedorId", "==", currentUser.uid)
                                     .orderBy('criadoEm', 'desc')
                                     .get();
            if (snapshot.empty) {
                productGrid.innerHTML = "<p>Você ainda não cadastrou nenhum serviço.</p>";
            } else {
                userProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts(userProducts);
            }
        } catch (error) {
            console.error("Erro ao carregar seus produtos: ", error);
            productGrid.innerHTML = "<p>Ocorreu um erro ao buscar seus serviços.</p>";
        } finally {
            loader.style.display = 'none';
        }
    };

    // FUNÇÃO PARA RENDERIZAR OS CARDS NA TELA
    const renderProducts = (products) => {
        productGrid.innerHTML = '';
        if (products.length === 0) {
            productGrid.innerHTML = "<p>Nenhum serviço encontrado com o termo pesquisado.</p>";
            return;
        }
        products.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.setAttribute('data-id', product.id);
            
            const imageUrl = product.imagem || 'https://via.placeholder.com/400x250?text=Sem+Imagem';
            const productName = product.nome || 'Serviço sem nome';
            const productPrice = product.preco || 0;
            
            // Conta quantos interessados existem
            const interestedCount = product.interestedUsers ? product.interestedUsers.length : 0;

            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="Eu vou ${productName}" class="product-image">
                    <div class="product-price">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productPrice)}</div>
                </div>
                <div class="product-info">
                    <h4 class="product-title">Eu vou ${productName}</h4>
                    <div class="card-actions-container">
                        
                        <button class="action-btn btn-view-interested">
                            <i class="fas fa-eye"></i> Ver Interessados (${interestedCount})
                        </button>
                        
                        <div class="card-actions-row">
                            <button class="action-btn btn-edit"><i class="fas fa-edit"></i> Editar</button>
                            <button class="action-btn btn-delete"><i class="fas fa-trash"></i> Excluir</button>
                        </div>
                    </div>
                </div>`;
            
            // Event Listeners
            card.querySelector('.btn-view-interested').addEventListener('click', (e) => { e.stopPropagation(); openInterestedModal(product); });
            card.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); openEditModal(product); });
            card.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); deleteProduct(product.id); });
            
            productGrid.appendChild(card);
        });
    };
    
    // FUNÇÃO PARA APLICAR O FILTRO DE PESQUISA
    const applySearch = () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) {
            renderProducts(userProducts);
            return;
        }
        const filteredProducts = userProducts.filter(product => 
            (product.nome && product.nome.toLowerCase().includes(searchTerm)) ||
            (product.descricao && product.descricao.toLowerCase().includes(searchTerm))
        );
        renderProducts(filteredProducts);
    };

    // =======================================================
    // LOGICA DO MODAL DE INTERESSADOS (NOVO)
    // =======================================================
    
    const openInterestedModal = async (product) => {
        interestedModal.classList.add('show');
        interestedList.innerHTML = ''; // Limpa lista anterior
        interestedLoader.style.display = 'flex';

        const interestedIds = product.interestedUsers || [];

        if (interestedIds.length === 0) {
            interestedList.innerHTML = '<p class="no-interested">Ainda ninguém demonstrou interesse neste serviço.</p>';
            interestedLoader.style.display = 'none';
            return;
        }

        try {
            // Busca os dados de CADA usuário interessado na coleção 'vendedores'
            // Nota: Estamos assumindo que usuários compradores também estão na coleção 'vendedores' 
            // ou que existe uma coleção de usuários unificada. Se for separado, ajuste a coleção.
            
            const userPromises = interestedIds.map(uid => db.collection('vendedores').doc(uid).get());
            const userSnapshots = await Promise.all(userPromises);

            userSnapshots.forEach(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    createInterestedItem(userData, product.nome);
                }
            });

            if (interestedList.children.length === 0) {
                interestedList.innerHTML = '<p class="no-interested">Não foi possível carregar os dados dos interessados.</p>';
            }

        } catch (error) {
            console.error("Erro ao carregar interessados:", error);
            interestedList.innerHTML = '<p class="no-interested">Erro ao carregar lista.</p>';
        } finally {
            interestedLoader.style.display = 'none';
        }
    };

    const createInterestedItem = (user, serviceName) => {
        const item = document.createElement('div');
        item.className = 'interested-item';
        
        const avatar = user.imagemPerfil || 'img/avatar.png';
        const name = user.nome || 'Usuário sem nome';
        const phone = user.telefone || '';
        const email = user.email || 'Email não informado'; // O email geralmente fica no Auth, mas se salvou no doc, usa aqui.

        // Formata telefone para o link do WhatsApp (remove tudo que não é número)
        const cleanPhone = phone.replace(/\D/g, '');
        const whatsappLink = `https://wa.me/55${cleanPhone}?text=Olá ${name}, vi que você teve interesse no meu serviço "${serviceName}" no I Will. Podemos conversar?`;

        // Se não tiver telefone, esconde o botão do whats ou deixa inativo
        const whatsappButton = cleanPhone.length >= 10 
            ? `<a href="${whatsappLink}" target="_blank" class="btn-whatsapp" title="Chamar no WhatsApp"><i class="fab fa-whatsapp"></i></a>`
            : `<button class="btn-whatsapp" style="background-color:#ccc; cursor:not-allowed;" title="Telefone não cadastrado"><i class="fab fa-whatsapp"></i></button>`;

        item.innerHTML = `
            <img src="${avatar}" alt="${name}" class="interested-avatar">
            <div class="interested-info">
                <span class="interested-name">${name}</span>
                <span class="interested-contact">${phone || email}</span>
            </div>
            ${whatsappButton}
        `;
        interestedList.appendChild(item);
    };

    const closeInterestedModal = () => interestedModal.classList.remove('show');
    interestedModalCloseBtn.addEventListener('click', closeInterestedModal);
    interestedModal.addEventListener('click', (e) => { if (e.target === interestedModal) closeInterestedModal(); });


    // =======================================================
    // LOGICA DO MODAL DE EDIÇÃO (MANTIDO)
    // =======================================================
    const openEditModal = (product) => {
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.nome || '';
        document.getElementById('editPrice').value = product.preco || 0;
        document.getElementById('editDeliveryTime').value = product.prazo || '';
        document.getElementById('editDescription').value = product.descricao || '';
        editModal.classList.add('show');
    };

    const closeEditModal = () => editModal.classList.remove('show');
    modalCloseBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => { if (event.target === editModal) closeEditModal(); });

    editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const productId = document.getElementById('editProductId').value;
        toggleLoading(true);
        const updatedData = {
            nome: document.getElementById('editProductName').value,
            preco: parseFloat(document.getElementById('editPrice').value),
            prazo: document.getElementById('editDeliveryTime').value,
            descricao: document.getElementById('editDescription').value,
        };
        try {
            await db.collection('produtos').doc(productId).update(updatedData);
            closeEditModal();
            await loadUserProducts();
            showToast("Serviço atualizado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao atualizar o produto: ", error);
            showToast("Falha ao atualizar o serviço. Tente novamente.", "error");
        } finally {
            toggleLoading(false);
        }
    });

    // FUNÇÃO PARA EXCLUIR UM PRODUTO
    const deleteProduct = async (productId) => {
        if (!confirm("Tem certeza de que deseja excluir este serviço? Esta ação não pode ser desfeita.")) return;
        toggleLoading(true);
        try {
            await db.collection('produtos').doc(productId).delete();
            await loadUserProducts();
            showToast("Serviço excluído com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao excluir o produto: ", error);
            showToast("Falha ao excluir o serviço. Tente novamente.", "error");
        } finally {
            toggleLoading(false);
        }
    };
    
    searchInput.addEventListener('input', applySearch);
});