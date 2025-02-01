// Verificação de autenticação
function verificarAutenticacao() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Atualiza os dados a cada 5 segundos
const INTERVALO_ATUALIZACAO = 5000;

function atualizarDashboard() {
    const estatisticas = window.backend.getEstatisticas();
    
    // Atualiza contadores
    document.getElementById('usuarios-ativos').textContent = estatisticas.usuariosAtivos;
    document.getElementById('visitas-hoje').textContent = estatisticas.visitasHoje;

    // Atualiza gráficos
    atualizarGraficoRegiao(estatisticas.acessosPorRegiao);
    atualizarGraficoVisitas(estatisticas.acessosPorHora);
    
    // Atualiza tabela de acessos
    atualizarTabelaAcessos(estatisticas.ultimosAcessos);
}

function atualizarGraficoRegiao(dados) {
    const ctx = document.getElementById('acessos-regiao').getContext('2d');
    if (!window.graficoRegiao) {
        window.graficoRegiao = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dados),
                datasets: [{
                    data: Object.values(dados),
                    backgroundColor: [
                        '#4caf50', '#2196f3', '#ff9800', '#f44336',
                        '#9c27b0', '#00bcd4', '#795548', '#607d8b'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    } else {
        window.graficoRegiao.data.labels = Object.keys(dados);
        window.graficoRegiao.data.datasets[0].data = Object.values(dados);
        window.graficoRegiao.update();
    }
}

function atualizarGraficoVisitas(dados) {
    const ctx = document.getElementById('visitas-24h').getContext('2d');
    const labels = Array.from({length: 24}, (_, i) => `${23-i}h atrás`).reverse();
    
    if (!window.graficoVisitas) {
        window.graficoVisitas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visitas',
                    data: dados,
                    borderColor: '#2196f3',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(33, 150, 243, 0.1)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } else {
        window.graficoVisitas.data.datasets[0].data = dados;
        window.graficoVisitas.update();
    }
}

function atualizarTabelaAcessos(acessos) {
    const tbody = document.querySelector('#tabela-acessos tbody');
    tbody.innerHTML = acessos.map(acesso => `
        <tr>
            <td>${acesso.ip}</td>
            <td>${acesso.localizacao.cidade}, ${acesso.localizacao.estado}</td>
            <td>${new Date(acesso.timestamp).toLocaleString()}</td>
            <td>${acesso.dispositivo}</td>
        </tr>
    `).join('');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    
    // Primeira atualização
    atualizarDashboard();
    
    // Configura atualização periódica
    setInterval(atualizarDashboard, INTERVALO_ATUALIZACAO);
    
    // Inicia rastreamento de acessos
    window.backend.rastrearAcesso();
});

// Logout
document.getElementById('logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}); 