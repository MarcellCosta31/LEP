// script-firebase.js - Com verificação de disponibilidade e correção de fuso horário

// 🔥 CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBsDDnW7HZaie47AgjMaZ5U1orAiLvOaDM",
    authDomain: "lep-reservas.firebaseapp.com",
    projectId: "lep-reservas",
    storageBucket: "lep-reservas.firebasestorage.app",
    messagingSenderId: "492338423428",
    appId: "1:492338423428:web:7f72cdd8bcd4a5146f84d1"
};

// 🔥 INICIALIZAR FIREBASE
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('✅ Firebase inicializado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
}

// 🔧 FUNÇÕES DE DATA CORRIGIDAS (SEMPRE UTC)
function formatarDataParaStringUTC(data) {
    // SEMPRE usar UTC para armazenamento
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function parseDataStringUTC(dataStr) {
    // Parse em UTC
    const partes = dataStr.split('-');
    if (partes.length !== 3) return null;
    
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;
    if (mes < 0 || mes > 11) return null;
    if (dia < 1 || dia > 31) return null;
    
    return new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
}

function formatarDataLocalParaString(data) {
    // Para seleção local no calendário
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function parseDataStringLocal(dataStr) {
    // Parse considerando fuso local
    const partes = dataStr.split('-');
    if (partes.length !== 3) return null;
    
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;
    if (mes < 0 || mes > 11) return null;
    if (dia < 1 || dia > 31) return null;
    
    return new Date(ano, mes, dia);
}

function formatarDataParaExibicao(data) {
    // Para exibição, usar fuso local
    return data.toLocaleDateString('pt-BR');
}

function getDataLocalSemHora(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

// 🔧 FUNÇÃO PARA CONVERTER DATAS DO FIREBASE PARA EXIBIÇÃO
function converterDataFirestoreParaLocal(timestamp) {
    if (!timestamp) return null;
    
    // Se for um timestamp do Firestore
    if (timestamp.toDate) {
        return timestamp.toDate();
    }
    
    // Se já for um Date
    if (timestamp instanceof Date) {
        return timestamp;
    }
    
    // Se for string, tentar parse
    if (typeof timestamp === 'string') {
        // Tentar parse como UTC primeiro
        const dataUTC = parseDataStringUTC(timestamp);
        if (dataUTC) return dataUTC;
        
        // Fallback para parse local
        return new Date(timestamp);
    }
    
    return null;
}

// AGUARDAR O CARREGAMENTO COMPLETO DA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Iniciando sistema de reservas...');
    
    // ELEMENTOS DO DOM
    const modal = document.getElementById('modalReserva');
    const btnAbrir = document.getElementById('btnAbrirModal');
    const btnFechar = document.getElementById('btnFecharModal');
    const formReserva = document.getElementById('formReserva');
    const tituloCalendario = document.getElementById('tituloCalendario');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const viewButtons = document.querySelectorAll('.view-btn');
    const weeklyView = document.getElementById('weeklyView');
    const monthlyView = document.getElementById('monthlyView');
    const calendarioGrid = document.querySelector('.calendario-grid');
    
    // Elementos do mini calendário
    const miniCalendarioGrid = document.querySelector('.calendario-mini-grid');
    const miniMesSpan = document.querySelector('.mini-mes');
    const miniPrevBtn = document.querySelector('.mini-prev');
    const miniNextBtn = document.querySelector('.mini-next');
    const diasSelecionadosDiv = document.getElementById('diasSelecionados');
    
    // ESTADO
    let dataAtual = new Date();
    let viewAtual = 'weekly';
    let miniDataAtual = new Date();
    let diasSelecionados = [];
    let reservasExistentes = [];
    
    // FORMATAR TELEFONE
    const whatsappInput = document.getElementById('whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 11) value = value.substring(0, 11);
            
            if (value.length > 0) {
                if (value.length <= 2) {
                    value = `(${value}`;
                } else if (value.length <= 7) {
                    value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
                } else {
                    value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
                }
            }
            
            e.target.value = value;
        });
    }
    
    // MODAL FUNCTIONS
    btnAbrir.onclick = () => {
        modal.style.display = 'flex';
        miniDataAtual = new Date();
        atualizarMiniCalendario();
        verificarDisponibilidadeDiasSelecionados();
    };
    
    btnFechar.onclick = () => {
        modal.style.display = 'none';
        formReserva.reset();
        diasSelecionados = [];
        atualizarDiasSelecionados();
    };
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            formReserva.reset();
            diasSelecionados = [];
            atualizarDiasSelecionados();
        }
    };
    
    // MINI CALENDÁRIO
    function atualizarMiniCalendario() {
        if (!miniCalendarioGrid) return;
        
        miniCalendarioGrid.innerHTML = '';
        
        // Dias da semana
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(dia => {
            const div = document.createElement('div');
            div.className = 'dia-mini inativo';
            div.textContent = dia;
            miniCalendarioGrid.appendChild(div);
        });
        
        const ano = miniDataAtual.getFullYear();
        const mes = miniDataAtual.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaInicio = primeiroDia.getDay();
        
        miniMesSpan.textContent = miniDataAtual.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        }).replace(/^\w/, c => c.toUpperCase());
        
        // Dias vazios no início
        for (let i = 0; i < diaInicio; i++) {
            const div = document.createElement('div');
            div.className = 'dia-mini inativo';
            miniCalendarioGrid.appendChild(div);
        }
        
        // Dias do mês
        const hoje = new Date();
        const hojeFormatado = formatarDataLocalParaString(hoje);
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const div = document.createElement('div');
            div.className = 'dia-mini';
            div.textContent = dia;
            div.dataset.dia = dia;
            div.dataset.mes = mes + 1;
            div.dataset.ano = ano;
            
            // Criar data LOCAL
            const dataDia = new Date(ano, mes, dia);
            const dataStr = formatarDataLocalParaString(dataDia);
            
            // Verificar se é hoje
            if (dataStr === hojeFormatado) {
                div.style.fontWeight = 'bold';
                div.style.border = '2px solid #004aad';
            }
            
            // Verificar se já está selecionado
            if (diasSelecionados.includes(dataStr)) {
                div.classList.add('selecionado');
            }
            
            // Verificar disponibilidade
            const disponibilidade = verificarDisponibilidadeDia(dataStr);
            if (!disponibilidade.disponivel) {
                div.classList.add('indisponivel');
                div.title = `Já reservado no turno da ${disponibilidade.turno === 'manha' ? 'manhã' : 'tarde'}`;
            }
            
            // Clique no dia
            div.onclick = function() {
                if (this.classList.contains('indisponivel')) {
                    mostrarAlertaDisponibilidade(dataStr);
                    return;
                }
                
                const index = diasSelecionados.indexOf(dataStr);
                
                if (index === -1) {
                    diasSelecionados.push(dataStr);
                    this.classList.add('selecionado');
                } else {
                    diasSelecionados.splice(index, 1);
                    this.classList.remove('selecionado');
                }
                
                atualizarDiasSelecionados();
                verificarDisponibilidadeDiasSelecionados();
            };
            
            miniCalendarioGrid.appendChild(div);
        }
        
        console.log('Mini calendário atualizado. Mês:', mes + 1, 'Ano:', ano);
    }
    
    // ATUALIZAR DIAS SELECIONADOS
    function atualizarDiasSelecionados() {
        if (!diasSelecionadosDiv) return;
        
        if (diasSelecionados.length === 0) {
            diasSelecionadosDiv.innerHTML = 'Nenhum dia selecionado';
            return;
        }
        
        diasSelecionadosDiv.innerHTML = '';
        
        // Ordenar datas corretamente
        diasSelecionados.sort((a, b) => {
            const dataA = parseDataStringLocal(a);
            const dataB = parseDataStringLocal(b);
            return dataA - dataB;
        });
        
        diasSelecionados.forEach(dataStr => {
            const data = parseDataStringLocal(dataStr);
            if (!data) return;
            
            const diaTag = document.createElement('span');
            diaTag.className = 'dia-tag';
            diaTag.textContent = data.toLocaleDateString('pt-BR');
            
            // Verificar disponibilidade
            const disponibilidade = verificarDisponibilidadeDia(dataStr);
            if (!disponibilidade.disponivel) {
                diaTag.classList.add('indisponivel-tag');
                diaTag.title = `Já reservado no turno da ${disponibilidade.turno === 'manha' ? 'manhã' : 'tarde'}`;
            }
            
            // Botão de remover
            const removerBtn = document.createElement('span');
            removerBtn.className = 'remover-dia';
            removerBtn.innerHTML = ' ×';
            removerBtn.style.cursor = 'pointer';
            removerBtn.style.color = '#ff4444';
            removerBtn.style.marginLeft = '5px';
            removerBtn.style.fontWeight = 'bold';
            removerBtn.onclick = function(e) {
                e.stopPropagation();
                const index = diasSelecionados.indexOf(dataStr);
                if (index !== -1) {
                    diasSelecionados.splice(index, 1);
                    atualizarDiasSelecionados();
                    atualizarMiniCalendario();
                }
            };
            
            diaTag.appendChild(removerBtn);
            diasSelecionadosDiv.appendChild(diaTag);
        });
        
        console.log('Dias selecionados:', diasSelecionados);
    }
    
    // VERIFICAR DISPONIBILIDADE DE UM DIA ESPECÍFICO
    function verificarDisponibilidadeDia(dataStr) {
        const hoje = new Date();
        const dataDia = parseDataStringLocal(dataStr);
        
        if (!dataDia) {
            return { disponivel: false, motivo: 'Data inválida' };
        }
        
        const hojeSemHora = getDataLocalSemHora(hoje);
        const dataSemHora = getDataLocalSemHora(dataDia);
        
        // Não permitir datas passadas
        if (dataSemHora < hojeSemHora) {
            return { disponivel: false, motivo: 'Data passada' };
        }
        
        // Verificar nas reservas existentes (APENAS APROVADAS)
        for (const reserva of reservasExistentes) {
            if (reserva.status !== 'aprovado') continue;
            
            if (reserva.dias && Array.isArray(reserva.dias)) {
                // Converter cada dia da reserva para formato local para comparação
                const diasReservaLocal = reserva.dias.map(diaUTC => {
                    const dataUTC = parseDataStringUTC(diaUTC);
                    if (!dataUTC) return diaUTC;
                    return formatarDataLocalParaString(dataUTC);
                });
                
                if (diasReservaLocal.includes(dataStr)) {
                    // Verificar turno selecionado
                    const turnoSelecionado = document.querySelector('input[name="turno"]:checked');
                    if (turnoSelecionado && turnoSelecionado.value === reserva.turno) {
                        return { 
                            disponivel: false, 
                            turno: reserva.turno,
                            motivo: `Já reservado no turno da ${reserva.turno === 'manha' ? 'manhã' : 'tarde'}`,
                            responsavel: reserva.responsavel
                        };
                    }
                }
            }
        }
        
        return { disponivel: true };
    }
    
    // VERIFICAR DISPONIBILIDADE DE TODOS OS DIAS SELECIONADOS
    function verificarDisponibilidadeDiasSelecionados() {
        if (!diasSelecionados.length) return;
        
        const turnoSelecionado = document.querySelector('input[name="turno"]:checked');
        if (!turnoSelecionado) return;
        
        const diasIndisponiveis = [];
        
        diasSelecionados.forEach(dataStr => {
            const disponibilidade = verificarDisponibilidadeDia(dataStr);
            if (!disponibilidade.disponivel) {
                diasIndisponiveis.push({
                    data: dataStr,
                    motivo: disponibilidade.motivo,
                    turno: disponibilidade.turno,
                    responsavel: disponibilidade.responsavel
                });
            }
        });
        
        if (diasIndisponiveis.length > 0) {
            mostrarAlertasIndisponibilidade(diasIndisponiveis);
            return false;
        }
        
        return true;
    }
    
    // MOSTRAR ALERTA DE DISPONIBILIDADE
    function mostrarAlertaDisponibilidade(dataStr) {
        const disponibilidade = verificarDisponibilidadeDia(dataStr);
        const dataFormatada = formatarDataParaExibicao(new Date(dataStr));
        
        let mensagem = `❌ ${dataFormatada} não está disponível`;
        if (disponibilidade.turno) {
            mensagem += ` no turno da ${disponibilidade.turno === 'manha' ? 'manhã' : 'tarde'}`;
        }
        if (disponibilidade.responsavel) {
            mensagem += `\nJá reservado por: ${disponibilidade.responsavel}`;
        }
        
        alert(mensagem);
    }
    
    function mostrarAlertasIndisponibilidade(diasIndisponiveis) {
        if (diasIndisponiveis.length === 0) return;
        
        let mensagem = '⚠️ Alguns dias selecionados não estão disponíveis:\n\n';
        
        diasIndisponiveis.forEach(item => {
            const dataFormatada = formatarDataParaExibicao(new Date(item.data));
            mensagem += `• ${dataFormatada}: ${item.motivo}`;
            if (item.responsavel) {
                mensagem += ` (${item.responsavel})`;
            }
            mensagem += '\n';
        });
        
        mensagem += '\nPor favor, selecione outros dias ou turnos.';
        alert(mensagem);
    }
    
    // NAVEGAÇÃO MINI CALENDÁRIO
    if (miniPrevBtn) {
        miniPrevBtn.onclick = function() {
            miniDataAtual.setMonth(miniDataAtual.getMonth() - 1);
            atualizarMiniCalendario();
        };
    }
    
    if (miniNextBtn) {
        miniNextBtn.onclick = function() {
            miniDataAtual.setMonth(miniDataAtual.getMonth() + 1);
            atualizarMiniCalendario();
        };
    }
    
    // CALENDÁRIO PRINCIPAL
    function atualizarTitulo() {
        if (!tituloCalendario) return;
        tituloCalendario.textContent = dataAtual.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
    }
    
    // NAVEGAÇÃO CALENDÁRIO PRINCIPAL
    if (prevBtn) {
        prevBtn.onclick = function() {
            if (viewAtual === 'monthly') {
                dataAtual.setMonth(dataAtual.getMonth() - 1);
            } else {
                dataAtual.setDate(dataAtual.getDate() - 7);
            }
            atualizarCalendario();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = function() {
            if (viewAtual === 'monthly') {
                dataAtual.setMonth(dataAtual.getMonth() + 1);
            } else {
                dataAtual.setDate(dataAtual.getDate() + 7);
            }
            atualizarCalendario();
        };
    }
    
    // ALTERNAR VISUALIZAÇÃO
    if (viewButtons.length > 0) {
        viewButtons.forEach(btn => {
            btn.onclick = function() {
                viewButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                viewAtual = this.getAttribute('data-view');
                
                if (viewAtual === 'weekly') {
                    weeklyView.classList.add('active-view');
                    monthlyView.classList.remove('active-view');
                } else {
                    weeklyView.classList.remove('active-view');
                    monthlyView.classList.add('active-view');
                    gerarCalendarioMensal();
                    carregarReservas();
                }
                
                atualizarTitulo();
            };
        });
    }
    
    // GERAR CALENDÁRIO MENSAL
    function gerarCalendarioMensal() {
        if (!calendarioGrid) return;
                console.error('Elemento calendarioGrid não encontrado!');

        
        calendarioGrid.innerHTML = '';
        
        // Cabeçalho dos dias
        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dia => {
            const div = document.createElement('div');
            div.className = 'dia-header';
            div.textContent = dia;
            calendarioGrid.appendChild(div);
        });
        
        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaInicio = primeiroDia.getDay();
        
        // Dias vazios no início
        for (let i = 0; i < diaInicio; i++) {
            const div = document.createElement('div');
            div.className = 'dia vazio';
            calendarioGrid.appendChild(div);
        }
        
        // Dias do mês
        const hoje = new Date();
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const div = document.createElement('div');
            div.className = 'dia';
            div.dataset.dia = dia;
            div.dataset.mes = mes + 1;
            div.dataset.ano = ano;
            div.dataset.data = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            
            const dataDia = new Date(ano, mes, dia);
            if (dataDia.toDateString() === hoje.toDateString()) {
                div.classList.add('hoje');
            }
            
            div.innerHTML = `
                <div class="dia-numero">${dia}</div>
                <div class="dia-info">Disponível</div>
            `;
            
            // Clique para selecionar no modal
            div.onclick = function() {
                const dataStr = this.dataset.data;
                const dataObj = parseDataStringLocal(dataStr);
                
                if (!dataObj) {
                    console.error('Data inválida:', dataStr);
                    return;
                }
                
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const dataSelecionada = new Date(dataObj);
                dataSelecionada.setHours(0, 0, 0, 0);
                
                // Não permitir datas passadas
                if (dataSelecionada < hoje) {
                    alert('❌ Não é possível selecionar datas passadas.');
                    return;
                }
                
                if (!diasSelecionados.includes(dataStr)) {
                    diasSelecionados.push(dataStr);
                    atualizarDiasSelecionados();
                    
                    // Sincronizar mini calendário
                    const mesSelecionado = dataObj.getMonth();
                    const anoSelecionado = dataObj.getFullYear();
                    
                    if (mesSelecionado === miniDataAtual.getMonth() && 
                        anoSelecionado === miniDataAtual.getFullYear()) {
                        atualizarMiniCalendario();
                    }
                }
                
                modal.style.display = 'flex';
                verificarDisponibilidadeDiasSelecionados();
            };
            
            calendarioGrid.appendChild(div);
        }
    }
    
    // 🔧 CARREGAR RESERVAS DO FIREBASE
    async function carregarReservas() {
        if (!db || viewAtual !== 'monthly') return;
        
        try {
            console.log('🔄 Carregando reservas APROVADAS do Firebase...');
            
            const snapshot = await db.collection('reservas')
                .where('status', '==', 'aprovado')
                .get();
            
            reservasExistentes = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Converter timestamps do Firestore
                const reservaConvertida = {
                    id: doc.id,
                    ...data,
                    criadoEm: converterDataFirestoreParaLocal(data.criadoEm),
                    aprovadoEm: converterDataFirestoreParaLocal(data.aprovadoEm)
                };
                
                reservasExistentes.push(reservaConvertida);
            });
            
            console.log(`✅ ${reservasExistentes.length} reservas APROVADAS carregadas`);
            console.log('Datas carregadas:', reservasExistentes.map(r => ({
                id: r.id,
                dias: r.dias,
                responsavel: r.responsavel
            })));
            
            marcarDiasOcupados(reservasExistentes);
            
        } catch (error) {
            console.error('❌ Erro ao carregar reservas:', error);
            // Fallback
            carregarTodasReservasEFiltrar();
        }
    }
    
    // Função fallback
    async function carregarTodasReservasEFiltrar() {
        try {
            const snapshot = await db.collection('reservas').get();
            const todasReservas = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                todasReservas.push({
                    id: doc.id,
                    ...data,
                    criadoEm: converterDataFirestoreParaLocal(data.criadoEm)
                });
            });
            
            // Filtrar apenas aprovadas
            reservasExistentes = todasReservas.filter(r => r.status === 'aprovado');
            console.log(`✅ ${reservasExistentes.length} reservas aprovadas (fallback)`);
            marcarDiasOcupados(reservasExistentes);
            
        } catch (error) {
            console.error('Erro no fallback:', error);
        }
    }
    
    // 🔧 MARCAR DIAS OCUPADOS NO CALENDÁRIO
    function marcarDiasOcupados(reservas) {
        if (!calendarioGrid) return;
        
        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();
        
        // Primeiro, coletar todas as reservas por dia
        const reservasPorDia = {};
        
        reservas.forEach(reserva => {
            // Ignorar reservas não aprovadas
            if (reserva.status !== 'aprovado') return;
            
            // Verificar se tem dias
            if (!reserva.dias || !Array.isArray(reserva.dias)) return;
            
            reserva.dias.forEach(dataStr => {
                try {
                    // Parse como UTC e converter para local
                    const dataUTC = parseDataStringUTC(dataStr);
                    if (!dataUTC) return;
                    
                    const dataLocal = new Date(dataUTC);
                    
                    // Verificar se é do mês atual
                    if (dataLocal.getFullYear() === ano && dataLocal.getMonth() === mes) {
                        const dia = dataLocal.getDate();
                        
                        if (!reservasPorDia[dia]) {
                            reservasPorDia[dia] = {
                                manha: null,
                                tarde: null
                            };
                        }
                        
                        // Armazenar reserva pelo turno
                        if (reserva.turno === 'manha') {
                            reservasPorDia[dia].manha = reserva;
                        } else if (reserva.turno === 'tarde') {
                            reservasPorDia[dia].tarde = reserva;
                        }
                    }
                } catch (e) {
                    console.warn('Erro ao processar data:', dataStr, e);
                }
            });
        });
        
        // Atualizar cada dia no calendário
        document.querySelectorAll('.calendario-grid .dia:not(.vazio)').forEach(diaDiv => {
            const dia = parseInt(diaDiv.dataset.dia);
            
            // Remover classes antigas
            diaDiv.classList.remove('ocupado', 'ocupado-manha', 'ocupado-tarde', 'ocupado-ambos');
            
            const info = diaDiv.querySelector('.dia-info');
            if (info) {
                info.innerHTML = '';
            }
            
            // Verificar se há reservas neste dia
            const reservasDoDia = reservasPorDia[dia];
            
            if (reservasDoDia) {
                // Criar container para as informações
                const infoContainer = document.createElement('div');
                infoContainer.className = 'info-turnos';
                
                // Adicionar informações da manhã
                if (reservasDoDia.manha) {
                    const reserva = reservasDoDia.manha;
                    const turnoDiv = document.createElement('div');
                    turnoDiv.className = 'turno-info manha';
                    turnoDiv.innerHTML = `
                        <div class="turno-titulo">🌅 Manhã:</div>
                        <div class="responsavel">${reserva.responsavel}</div>
                    `;
                    infoContainer.appendChild(turnoDiv);
                    diaDiv.classList.add('ocupado-manha');
                }
                
                // Adicionar informações da tarde
                if (reservasDoDia.tarde) {
                    const reserva = reservasDoDia.tarde;
                    const turnoDiv = document.createElement('div');
                    turnoDiv.className = 'turno-info tarde';
                    turnoDiv.innerHTML = `
                        <div class="turno-titulo">🌇 Tarde:</div>
                        <div class="responsavel">${reserva.responsavel}</div>
                    `;
                    infoContainer.appendChild(turnoDiv);
                    diaDiv.classList.add('ocupado-tarde');
                }
                
                // Se ambos os turnos estão ocupados
                if (reservasDoDia.manha && reservasDoDia.tarde) {
                    diaDiv.classList.add('ocupado-ambos');
                    diaDiv.classList.add('ocupado');
                } else if (reservasDoDia.manha || reservasDoDia.tarde) {
                    diaDiv.classList.add('ocupado');
                }
                
                // Adicionar informações ao dia
                if (info) {
                    info.appendChild(infoContainer);
                }
                
                // Adicionar tooltip
                let tooltipText = `Dia ${dia}/${mes + 1}:\n`;
                
                if (reservasDoDia.manha) {
                    tooltipText += `\n🌅 Manhã: ${reservasDoDia.manha.responsavel}`;
                    if (reservasDoDia.manha.finalidade) {
                        tooltipText += `\n   ${reservasDoDia.manha.finalidade.substring(0, 50)}...`;
                    }
                }
                
                if (reservasDoDia.tarde) {
                    tooltipText += `\n🌇 Tarde: ${reservasDoDia.tarde.responsavel}`;
                    if (reservasDoDia.tarde.finalidade) {
                        tooltipText += `\n   ${reservasDoDia.tarde.finalidade.substring(0, 50)}...`;
                    }
                }
                
                diaDiv.title = tooltipText;
                
            } else {
                // Dia disponível
                if (info) {
                    info.innerHTML = '<div class="disponivel-texto">Disponível</div>';
                }
            }
        });
    }
    
    // VALIDAR RESERVA ANTES DE ENVIAR
    async function validarReservaAntesDeEnviar() {
        if (diasSelecionados.length === 0) {
            return { valido: false, erro: 'Selecione pelo menos um dia.' };
        }
        
        const turnoSelecionado = document.querySelector('input[name="turno"]:checked');
        if (!turnoSelecionado) {
            return { valido: false, erro: 'Selecione um turno.' };
        }
        
        // Verificar datas passadas
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        for (const dataStr of diasSelecionados) {
            const dataDia = parseDataStringLocal(dataStr);
            if (!dataDia) continue;
            
            const dataSemHora = getDataLocalSemHora(dataDia);
            if (dataSemHora < hoje) {
                return { 
                    valido: false, 
                    erro: `A data ${dataDia.toLocaleDateString('pt-BR')} já passou. Selecione uma data futura.` 
                };
            }
        }
        
        // Verificar duplicidade de reserva
        try {
            const snapshot = await db.collection('reservas')
                .where('status', '==', 'aprovado')
                .get();
            
            const turno = turnoSelecionado.value;
            const conflitos = [];
            
            snapshot.forEach(doc => {
                const reserva = doc.data();
                
                // Converter dias da reserva para formato local
                const diasReservaLocal = reserva.dias ? reserva.dias.map(diaUTC => {
                    const dataUTC = parseDataStringUTC(diaUTC);
                    return dataUTC ? formatarDataLocalParaString(dataUTC) : diaUTC;
                }) : [];
                
                // Verificar sobreposição
                for (const diaReserva of diasReservaLocal) {
                    if (diasSelecionados.includes(diaReserva) && reserva.turno === turno) {
                        const dataFormatada = parseDataStringLocal(diaReserva).toLocaleDateString('pt-BR');
                        const turnoStr = reserva.turno === 'manha' ? 'manhã' : 'tarde';
                        
                        conflitos.push({
                            data: dataFormatada,
                            responsavel: reserva.responsavel,
                            turno: turnoStr
                        });
                    }
                }
            });
            
            if (conflitos.length > 0) {
                let mensagem = 'Conflito de reserva encontrado:\n\n';
                conflitos.forEach(conflito => {
                    mensagem += `• ${conflito.data} (${conflito.turno}) - ${conflito.responsavel}\n`;
                });
                mensagem += '\nEscolha outro dia ou turno.';
                
                return { valido: false, erro: mensagem };
            }
            
        } catch (error) {
            console.error('Erro ao verificar duplicidade:', error);
        }
        
        return { valido: true };
    }
    
    // 🔧 SALVAR RESERVA COM APROVAÇÃO AUTOMÁTICA
    formReserva.onsubmit = async function(e) {
        e.preventDefault();
        
        // Validações básicas
        const regrasAceitas = document.querySelector('input[name="regras"]:checked');
        if (!regrasAceitas || regrasAceitas.value !== 'sim') {
            alert('❌ Você deve aceitar as regras do laboratório.');
            return;
        }
        
        // Validação avançada
        const validacao = await validarReservaAntesDeEnviar();
        if (!validacao.valido) {
            alert(`❌ ${validacao.erro}`);
            return;
        }
        
        // 🔧 CORREÇÃO: Converter dias selecionados para UTC antes de salvar
        const diasUTC = diasSelecionados.map(dataStr => {
            const dataLocal = parseDataStringLocal(dataStr);
            if (!dataLocal) return dataStr;
            return formatarDataParaStringUTC(dataLocal);
        });
        
        console.log('Dias selecionados (local):', diasSelecionados);
        console.log('Dias para salvar (UTC):', diasUTC);
        
        // Coletar dados
        const formData = {
            email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            responsavel: document.getElementById('responsavel').value,
            finalidade: document.getElementById('finalidade').value,
            ocupacao: document.getElementById('ocupacao').value,
            dias: diasUTC, // 🔧 Usar formato UTC
            turno: document.querySelector('input[name="turno"]:checked').value,
            status: 'aprovado',
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            visualizado: false,
            aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            aprovadoPor: 'sistema'
        };
        
        // Botão de envio
        const submitBtn = formReserva.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Criando reserva...';
        submitBtn.disabled = true;
        
        try {
            if (!db) {
                throw new Error('Banco de dados não disponível');
            }
            
            console.log('Salvando reserva (aprovada automaticamente):', formData);
            const docRef = await db.collection('reservas').add(formData);
            
            alert(`✅ Reserva criada e APROVADA automaticamente!\n\nID: ${docRef.id}\nStatus: Aprovado\n\nA reserva já está ativa no sistema.`);
            
            // Resetar
            modal.style.display = 'none';
            formReserva.reset();
            diasSelecionados = [];
            atualizarDiasSelecionados();
            atualizarMiniCalendario();
            
            // Atualizar lista de reservas IMEDIATAMENTE
            if (viewAtual === 'monthly') {
                setTimeout(carregarReservas, 500);
            }
            
            mostrarFeedback('Reserva aprovada com sucesso!', 'sucesso');
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(`❌ Erro ao criar reserva: ${error.message}`);
            mostrarFeedback('Erro ao criar reserva', 'erro');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    };
    
    // FUNÇÃO PARA MOSTRAR FEEDBACK VISUAL
    function mostrarFeedback(mensagem, tipo = 'sucesso') {
        const feedbackAnterior = document.getElementById('feedback-reserva');
        if (feedbackAnterior) {
            feedbackAnterior.remove();
        }
        
        const feedback = document.createElement('div');
        feedback.id = 'feedback-reserva';
        feedback.className = `feedback-reserva feedback-${tipo}`;
        feedback.textContent = mensagem;
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Adicionar animações CSS dinamicamente
    const estiloAnimacoes = document.createElement('style');
    estiloAnimacoes.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .feedback-sucesso {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .feedback-erro {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    `;
    document.head.appendChild(estiloAnimacoes);
    
    // CLIQUE NAS CÉLULAS DA SEMANA
    document.querySelectorAll('.dia-col').forEach(cell => {
        cell.onclick = function() {
            const turno = this.getAttribute('data-turno');
            const radioTurno = document.querySelector(`input[name="turno"][value="${turno}"]`);
            if (radioTurno) {
                radioTurno.checked = true;
            }
            modal.style.display = 'flex';
            
            setTimeout(verificarDisponibilidadeDiasSelecionados, 100);
        };
    });
    
    // Monitorar mudanças no turno
    document.querySelectorAll('input[name="turno"]').forEach(radio => {
        radio.addEventListener('change', function() {
            verificarDisponibilidadeDiasSelecionados();
        });
    });
    
    // 🔧 FUNÇÃO DE DEPURAÇÃO
    function depurarDatas() {
        console.log('=== DEPURAÇÃO DE DATAS ===');
        console.log('Data atual:', dataAtual.toLocaleDateString('pt-BR'));
        console.log('Dias selecionados:', diasSelecionados);
        console.log('Reservas existentes:', reservasExistentes.map(r => ({
            id: r.id,
            dias: r.dias,
            diasLocal: r.dias ? r.dias.map(d => {
                const dataUTC = parseDataStringUTC(d);
                return dataUTC ? formatarDataLocalParaString(dataUTC) : d;
            }) : [],
            turno: r.turno,
            responsavel: r.responsavel
        })));
    }
    
    // Adicionar botão de depuração
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Datas';
    debugBtn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:10000;background:#ff4444;color:white;border:none;padding:5px;border-radius:3px;font-size:12px;';
    debugBtn.onclick = depurarDatas;
    document.body.appendChild(debugBtn);
    
    // INICIALIZAÇÃO
    atualizarMiniCalendario();
    // INICIALIZAÇÃO
    atualizarMiniCalendario();
    
    // 🔥 CORREÇÃO: Garantir que o calendário mensal seja gerado ao carregar
    if (viewAtual === 'monthly') {
        gerarCalendarioMensal();
        carregarReservas();
    } else {
        // Se for semanal, apenas atualiza o título
        atualizarTitulo();
    }
    
    // Função para atualizar calendário
    function atualizarCalendario() {
        atualizarTitulo();
        if (viewAtual === 'monthly') {
            gerarCalendarioMensal();
            carregarReservas();
        }
    }
    
    // TESTE RÁPIDO DE CONEXÃO
    if (db) {
        setTimeout(() => {
            console.log('🔥 Firebase conectado. Pronto para uso!');
        }, 500);
    }

// 🔥 INICIALIZAÇÃO DO CALENDÁRIO PADRÃO (MENSAL)
viewAtual = 'monthly';

atualizarTitulo();
gerarCalendarioMensal();
carregarReservas();

});