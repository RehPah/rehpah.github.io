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

            const novoAcesso = {
                id: Date.now() + Math.random(), // Garante IDs únicos
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
                    isp: data.isp,
                    tipo: data.type
                },
                dispositivo: this.getDispositivoInfo(),
                pagina: window.location.pathname,
                conexao: {
                    tipo: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                    velocidade: navigator.connection ? navigator.connection.downlink : 'unknown'
                },
                referrer: document.referrer || 'Direto'
            };

            // Verifica se já existe um acesso similar nos últimos 5 minutos
            const acessoRecente = this.acessos.find(a => 
                a.ip === data.ip && 
                a.dispositivo === novoAcesso.dispositivo &&
                Date.now() - new Date(a.lastActivity).getTime() < 5 * 60 * 1000
            );

            if (acessoRecente) {
                acessoRecente.lastActivity = Date.now();
                acessoRecente.pagina = novoAcesso.pagina;
                acessoRecente.referrer = novoAcesso.referrer;
            } else {
                this.acessos.unshift(novoAcesso); // Adiciona no início do array
                this.usuariosOnline.add(data.ip);
            }

            // Mantém apenas os últimos 1000 acessos para não sobrecarregar
            if (this.acessos.length > 1000) {
                this.acessos = this.acessos.slice(0, 1000);
            }

            this.salvarDadosLocalmente();
            console.log('Acesso registrado:', novoAcesso);
            return novoAcesso;

        } catch (error) {
            console.error('Erro na API principal:', error);
            return this.tentarAPIBackup();
        }
    }

    async tentarAPIBackup() {
        try {
            const backupResponse = await fetch('https://api.db-ip.com/v2/free/self');
            const backupData = await backupResponse.json();
            
            const acesso = {
                id: Date.now() + Math.random(),
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
                pagina: window.location.pathname,
                referrer: document.referrer || 'Direto'
            };

            this.acessos.unshift(acesso);
            this.usuariosOnline.add(backupData.ipAddress);
            this.salvarDadosLocalmente();
            
            return acesso;
        } catch (backupError) {
            console.error('Erro nas APIs de backup:', backupError);
            return this.criarAcessoLocal();
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
        
        const agora = new Date();
        const ultimasHoras = new Array(24).fill(0);
        const acessosPorRegiao = {};
        const acessosPorDispositivo = {};

        // Considera usuários ativos nos últimos 5 minutos
        const usuariosAtivos = this.acessos.filter(acesso => 
            Date.now() - new Date(acesso.lastActivity).getTime() < 5 * 60 * 1000
        );

        this.acessos.forEach(acesso => {
            const acessoData = new Date(acesso.timestamp);
            const horasAtras = Math.floor((agora - acessoData) / (1000 * 60 * 60));
            
            if (horasAtras < 24) {
                ultimasHoras[23 - horasAtras]++;
            }

            const regiao = `${acesso.localizacao.cidade}, ${acesso.localizacao.estado}`;
            acessosPorRegiao[regiao] = (acessosPorRegiao[regiao] || 0) + 1;

            const dispositivo = acesso.dispositivo.split(' - ')[0];
            acessosPorDispositivo[dispositivo] = (acessosPorDispositivo[dispositivo] || 0) + 1;
        });

        return {
            usuariosAtivos: usuariosAtivos.length,
            visitasHoje: this.acessos.filter(a => 
                new Date(a.timestamp).toDateString() === new Date().toDateString()
            ).length,
            ultimosAcessos: this.acessos.slice(0, 10), // Últimos 10 acessos
            acessosPorHora: ultimasHoras,
            acessosPorRegiao,
            acessosPorDispositivo
        };
    }
}

// Exporta a instância para uso global
window.backend = new BackendSimulado(); 