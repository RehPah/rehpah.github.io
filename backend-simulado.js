class BackendSimulado {
    constructor() {
        this.acessos = [];
        this.usuariosOnline = new Set();
        this.ipAtual = null;
        this.carregarDadosLocais();
        this.iniciarRastreamento();
        this.iniciarHeartbeat();
    }

    async rastrearAcesso() {
        try {
            // Usando ipwhois.app - API gratuita com alto limite de requisições
            const response = await fetch('https://ipwhois.app/json/');
            const data = await response.json();

            if (!data.success) {
                throw new Error('Falha ao obter dados de localização');
            }

            this.ipAtual = data.ip;

            const acesso = {
                id: Date.now(),
                ip: data.ip,
                timestamp: new Date().toISOString(),
                lastActivity: Date.now(),
                userAgent: navigator.userAgent,
                localizacao: {
                    cidade: data.city,
                    estado: data.region,
                    pais: data.country,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    isp: data.isp, // Provedor de internet
                    tipo: data.type // Tipo de IP (IPv4/IPv6)
                },
                dispositivo: this.getDispositivoInfo(),
                pagina: window.location.pathname,
                conexao: {
                    tipo: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                    velocidade: navigator.connection ? navigator.connection.downlink : 'unknown'
                }
            };

            // Verifica se já existe um acesso com mesmo IP
            const acessoExistente = this.acessos.find(a => a.ip === data.ip);
            if (acessoExistente) {
                acessoExistente.lastActivity = Date.now();
                acessoExistente.localizacao = acesso.localizacao;
                acessoExistente.conexao = acesso.conexao;
            } else {
                this.acessos.push(acesso);
                this.usuariosOnline.add(data.ip);
            }

            this.salvarDadosLocalmente();
            console.log('Novo acesso registrado:', acesso); // Debug
            return acesso;

        } catch (error) {
            console.error('Erro ao rastrear acesso:', error);
            
            // Tenta uma segunda API como backup
            try {
                const backupResponse = await fetch('https://api.db-ip.com/v2/free/self');
                const backupData = await backupResponse.json();
                
                const acesso = {
                    id: Date.now(),
                    ip: backupData.ipAddress,
                    timestamp: new Date().toISOString(),
                    lastActivity: Date.now(),
                    userAgent: navigator.userAgent,
                    localizacao: {
                        cidade: backupData.city,
                        estado: backupData.stateProv,
                        pais: backupData.countryName,
                        continente: backupData.continentName
                    },
                    dispositivo: this.getDispositivoInfo(),
                    pagina: window.location.pathname
                };

                this.acessos.push(acesso);
                this.usuariosOnline.add(backupData.ipAddress);
                this.salvarDadosLocalmente();
                
                return acesso;
            } catch (backupError) {
                console.error('Erro no backup:', backupError);
                return this.criarAcessoLocal();
            }
        }
    }

    criarAcessoLocal() {
        const acesso = {
            id: Date.now(),
            ip: 'Não detectado',
            timestamp: new Date().toISOString(),
            lastActivity: Date.now(),
            userAgent: navigator.userAgent,
            localizacao: {
                cidade: 'Não detectada',
                estado: 'Não detectado',
                pais: 'Não detectado'
            },
            dispositivo: this.getDispositivoInfo(),
            pagina: window.location.pathname
        };

        this.acessos.push(acesso);
        this.usuariosOnline.add('local-user');
        this.salvarDadosLocalmente();
        
        return acesso;
    }

    iniciarHeartbeat() {
        // Atualiza a atividade do usuário atual
        document.addEventListener('mousemove', () => this.atualizarAtividade());
        document.addEventListener('keypress', () => this.atualizarAtividade());
        document.addEventListener('click', () => this.atualizarAtividade());
        document.addEventListener('scroll', () => this.atualizarAtividade());

        // Verifica usuários inativos a cada 30 segundos
        setInterval(() => {
            const agora = Date.now();
            this.acessos = this.acessos.filter(acesso => {
                const inativo = agora - acesso.lastActivity > 5 * 60 * 1000; // 5 minutos
                if (inativo) {
                    this.usuariosOnline.delete(acesso.ip);
                }
                return !inativo;
            });
            this.salvarDadosLocalmente();
        }, 30000);
    }

    atualizarAtividade() {
        const usuarioAtual = this.acessos.find(a => a.ip === this.ipAtual);
        if (usuarioAtual) {
            usuarioAtual.lastActivity = Date.now();
        }
    }

    salvarDadosLocalmente() {
        try {
            localStorage.setItem('acessos', JSON.stringify(this.acessos));
            localStorage.setItem('usuariosOnline', JSON.stringify([...this.usuariosOnline]));
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
        }
    }

    carregarDadosLocais() {
        try {
            const acessos = localStorage.getItem('acessos');
            const usuariosOnline = localStorage.getItem('usuariosOnline');
            if (acessos) this.acessos = JSON.parse(acessos);
            if (usuariosOnline) this.usuariosOnline = new Set(JSON.parse(usuariosOnline));
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
    }

    getDispositivoInfo() {
        const ua = navigator.userAgent;
        let dispositivo = 'Desconhecido';
        let sistema = 'Desconhecido';
        let navegador = 'Desconhecido';

        // Detecta dispositivo
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            dispositivo = 'Tablet';
        } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
            dispositivo = 'Mobile';
        } else {
            dispositivo = 'Desktop';
        }

        // Detecta sistema operacional
        if (ua.indexOf('Windows') !== -1) sistema = 'Windows';
        else if (ua.indexOf('Mac') !== -1) sistema = 'MacOS';
        else if (ua.indexOf('Linux') !== -1) sistema = 'Linux';
        else if (ua.indexOf('Android') !== -1) sistema = 'Android';
        else if (ua.indexOf('iOS') !== -1) sistema = 'iOS';

        // Detecta navegador
        if (ua.indexOf('Chrome') !== -1) navegador = 'Chrome';
        else if (ua.indexOf('Firefox') !== -1) navegador = 'Firefox';
        else if (ua.indexOf('Safari') !== -1) navegador = 'Safari';
        else if (ua.indexOf('Edge') !== -1) navegador = 'Edge';

        return `${dispositivo} - ${sistema} - ${navegador}`;
    }

    iniciarRastreamento() {
        // Apenas um rastreamento inicial
        this.rastrearAcesso();
        
        // Atualiza a atividade periodicamente apenas para o usuário atual
        setInterval(() => {
            if (document.hasFocus()) {
                this.atualizarAtividade();
            }
        }, 30000);
    }

    limparAcessosAntigos() {
        const umDiaAtras = Date.now() - (24 * 60 * 60 * 1000);
        this.acessos = this.acessos.filter(acesso => {
            const acessoTime = new Date(acesso.timestamp).getTime();
            return acessoTime > umDiaAtras;
        });
        this.salvarDadosLocalmente();
    }

    getEstatisticas() {
        this.limparAcessosAntigos();
        
        // Filtra apenas usuários realmente ativos
        const usuariosAtivos = this.acessos.filter(acesso => 
            Date.now() - new Date(acesso.lastActivity) < 5 * 60 * 1000
        );

        const acessosPorRegiao = {};
        const acessosPorDispositivo = {};
        const ultimasHoras = new Array(24).fill(0);

        if (usuariosAtivos.length > 0) {
            usuariosAtivos.forEach(acesso => {
                const regiao = `${acesso.localizacao.cidade}, ${acesso.localizacao.estado}`;
                acessosPorRegiao[regiao] = 1; // Apenas conta uma vez por região

                const dispositivo = acesso.dispositivo.split(' - ')[0];
                acessosPorDispositivo[dispositivo] = 1; // Apenas conta uma vez por dispositivo

                // Conta apenas o acesso atual na hora atual
                const horaAtual = new Date().getHours();
                ultimasHoras[horaAtual] = 1;
            });
        }

        return {
            usuariosAtivos: usuariosAtivos.length,
            visitasHoje: 1, // Apenas o usuário atual
            ultimosAcessos: [usuariosAtivos[0]], // Apenas o acesso atual
            acessosPorHora: ultimasHoras,
            acessosPorRegiao,
            acessosPorDispositivo
        };
    }
}

// Exporta a instância para uso global
window.backend = new BackendSimulado(); 