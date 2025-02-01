// Dados simulados de pets (em um projeto real, viria de uma API/backend)
const petsData = [
    {
        id: 1,
        nome: "Max",
        tipo: "cao",
        idade: 2,
        idade_tipo: "adulto",
        sexo: "Macho",
        porte: "médio",
        descricao: "Max é um cachorro muito dócil e brincalhão. Adora crianças e outros animais.",
        imagens: [
            "https://images.unsplash.com/photo-1543466835-00a7907e9de1",
            "https://images.unsplash.com/photo-1548199973-03cce0bbc87b"
        ],
        caracteristicas: ["Vacinado", "Castrado", "Dócil"]
    },
    // Adicione mais pets aqui
];

// Funções principais
document.addEventListener('DOMContentLoaded', () => {
    carregarPets();
    inicializarFiltros();
    inicializarModal();
    inicializarFormulario();
});

function carregarPets(filtros = {}) {
    const container = document.getElementById('pets-container');
    container.innerHTML = '';

    const petsFilter = petsData.filter(pet => {
        if (filtros.tipo && filtros.tipo !== 'todos' && pet.tipo !== filtros.tipo) return false;
        if (filtros.idade && filtros.idade !== 'todos' && pet.idade_tipo !== filtros.idade) return false;
        if (filtros.pesquisa) {
            const pesquisa = filtros.pesquisa.toLowerCase();
            return pet.nome.toLowerCase().includes(pesquisa) || 
                   pet.descricao.toLowerCase().includes(pesquisa);
        }
        return true;
    });

    petsFilter.forEach(pet => {
        const card = criarPetCard(pet);
        container.appendChild(card);
    });
}

function criarPetCard(pet) {
    const card = document.createElement('div');
    card.className = 'pet-card';
    card.innerHTML = `
        <img src="${pet.imagens[0]}" alt="${pet.nome}">
        <h3>${pet.nome}</h3>
        <p>${pet.sexo}, ${pet.idade} anos</p>
        <div class="tags">
            ${pet.caracteristicas.map(c => `<span class="tag">${c}</span>`).join('')}
        </div>
        <button class="btn-secondary" onclick="abrirModal(${pet.id})">
            <i class="fas fa-paw"></i> Saiba Mais
        </button>
    `;
    return card;
}

// Gerenciamento do Modal
function abrirModal(petId) {
    const pet = petsData.find(p => p.id === petId);
    const modal = document.getElementById('modal');
    
    document.getElementById('modal-pet-image').src = pet.imagens[0];
    document.getElementById('modal-pet-name').textContent = pet.nome;
    document.getElementById('modal-pet-age').textContent = `${pet.idade} anos, ${pet.porte}`;
    document.getElementById('modal-pet-description').textContent = pet.descricao;

    // Carregar miniaturas
    const thumbnailContainer = modal.querySelector('.thumbnail-container');
    thumbnailContainer.innerHTML = pet.imagens.map(img => `
        <img src="${img}" alt="Miniatura" onclick="trocarImagemPrincipal('${img}')">
    `).join('');

    modal.style.display = 'block';
}

// Upload de imagens
function inicializarFormulario() {
    const uploadArea = document.getElementById('upload-area');
    const input = document.getElementById('foto-animal');
    const previewContainer = document.getElementById('preview-container');

    uploadArea.addEventListener('click', () => input.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    input.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.createElement('div');
                    preview.className = 'preview-item';
                    preview.innerHTML = `
                        <img src="${e.target.result}">
                        <button type="button" class="remove-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    previewContainer.appendChild(preview);

                    preview.querySelector('.remove-btn').addEventListener('click', () => {
                        preview.remove();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Filtros e pesquisa
function inicializarFiltros() {
    const pesquisa = document.getElementById('pesquisa');
    const filtroTipo = document.getElementById('filtro-tipo');
    const filtroIdade = document.getElementById('filtro-idade');

    const aplicarFiltros = () => {
        const filtros = {
            pesquisa: pesquisa.value,
            tipo: filtroTipo.value,
            idade: filtroIdade.value
        };
        carregarPets(filtros);
    };

    pesquisa.addEventListener('input', aplicarFiltros);
    filtroTipo.addEventListener('change', aplicarFiltros);
    filtroIdade.addEventListener('change', aplicarFiltros);
} 