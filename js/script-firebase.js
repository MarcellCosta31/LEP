// script-firebase.js - Com verificação de disponibilidade, correção de fuso horário, múltiplos turnos e visualização de reservas

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

// 🔧 FUNÇÃO PARA FORMATAR OCUPAÇÃO
function formatarOcupacao(ocupacao) {
    if (!ocupacao) return 'Não informada';
    
    // Mapeamento de valores do select para textos mais amigáveis
    const ocupacoesFormatadas = {
        'portugues': 'Docente de Português',
        'espanhol': 'Docente de Espanhol',
        'matematica': 'Docente de Matemática',
        'pedagogia': 'Docente de Pedagogia',
        'historia': 'Docente de História',
        'fisica': 'Docente de Física',
        'engenharia': 'Docente de Engenharia de Produção',
        'posgraduacao': 'Docente de Pós Graduação',
        'estudante': 'Discente de Engenharia de Produção'
    };
    
    return ocupacoesFormatadas[ocupacao] || ocupacao;
}

// AGUARDAR O CARREGAMENTO COMPLETO DA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Iniciando sistema de reservas...');
    
    // ELEMENTOS DO DOM
    const modal = document.getElementById('modalReserva');
    const modalVisualizacao = document.getElementById('modalVisualizacao');
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
    
    // Elementos do modal de visualização
    const dataVisualizacaoSpan = document.getElementById('dataVisualizacao');
    const reservasContainer = document.getElementById('reservasContainer');
    const btnFecharVisualizacao = document.getElementById('btnFecharVisualizacao');
    const btnFecharModalVisualizacao = document.getElementById('btnFecharModalVisualizacao');
    const btnNovaReservaMesmaData = document.getElementById('btnNovaReservaMesmaData');
    const closeModalBtn = document.querySelector('.close-modal');
    
    // ESTADO
    let dataAtual = new Date();
    let viewAtual = 'monthly'; // Alterado para mensal por padrão
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
    
    // FUNÇÃO PARA OBTER OS TURNOS SELECIONADOS
    function obterTurnosSelecionados() {
        const checkboxes = document.querySelectorAll('.turno-checkbox:checked');
        const turnos = Array.from(checkboxes).map(cb => cb.value);
        return turnos;
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
        
        if (event.target === modalVisualizacao) {
            modalVisualizacao.style.display = 'none';
        }
    };
    
    // Fechar modais com ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                formReserva.reset();
                diasSelecionados = [];
                atualizarDiasSelecionados();
            }
            
            if (modalVisualizacao && modalVisualizacao.style.display === 'flex') {
                modalVisualizacao.style.display = 'none';
            }
        }
    });
    
    // 🔧 FUNÇÃO PARA ABRIR MODAL DE NOVA RESERVA COM DATA PRÉ-SELECIONADA
    function abrirModalNovaReserva(dataStr) {
        if (!modal) return;
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataObj = parseDataStringLocal(dataStr);
        
        if (!dataObj) return;
        
        const dataSelecionada = new Date(dataObj);
        dataSelecionada.setHours(0, 0, 0, 0);
        
        // Não permitir datas passadas
        if (dataSelecionada < hoje) {
            alert('❌ Não é possível selecionar datas passadas.');
            return;
        }
        
        // Limpar seleções anteriores
        diasSelecionados = [];
        
        // Adicionar a data clicada
        if (dataStr && !diasSelecionados.includes(dataStr)) {
            diasSelecionados.push(dataStr);
            atualizarDiasSelecionados();
            
            // Atualizar mini calendário se necessário
            const mesSelecionado = dataObj.getMonth();
            const anoSelecionado = dataObj.getFullYear();
            
            if (mesSelecionado === miniDataAtual.getMonth() && 
                anoSelecionado === miniDataAtual.getFullYear()) {
                atualizarMiniCalendario();
            }
        }
        
        // Abrir modal
        modal.style.display = 'flex';
        verificarDisponibilidadeDiasSelecionados();
    }
    
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
                const turnosSelecionados = obterTurnosSelecionados();
                if (turnosSelecionados.length === 2) {
                    div.classList.add('selecionado-ambos');
                } else if (turnosSelecionados.includes('manha')) {
                    div.classList.add('selecionado-manha');
                } else if (turnosSelecionados.includes('tarde')) {
                    div.classList.add('selecionado-tarde');
                } else {
                    div.classList.add('selecionado');
                }
            }
            
            // Verificar disponibilidade para os turnos selecionados
            const turnosSelecionados = obterTurnosSelecionados();
            if (turnosSelecionados.length > 0) {
                let disponivelParaTodosTurnos = true;
                let turnoIndisponivel = null;
                
                for (const turno of turnosSelecionados) {
                    const disponibilidade = verificarDisponibilidadeDiaParaTurno(dataStr, turno);
                    if (!disponibilidade.disponivel) {
                        disponivelParaTodosTurnos = false;
                        turnoIndisponivel = turno;
                        break;
                    }
                }
                
                if (!disponivelParaTodosTurnos && turnoIndisponivel) {
                    div.classList.add('indisponivel');
                    div.title = `Já reservado no turno da ${turnoIndisponivel === 'manha' ? 'manhã' : 'tarde'}`;
                } else if (turnosSelecionados.length > 0) {
                    div.classList.remove('indisponivel');
                    div.title = 'Disponível para os turnos selecionados';
                }
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
                    // Adicionar classe baseada nos turnos selecionados
                    const turnosSelecionados = obterTurnosSelecionados();
                    if (turnosSelecionados.length === 2) {
                        this.classList.add('selecionado-ambos');
                    } else if (turnosSelecionados.includes('manha')) {
                        this.classList.add('selecionado-manha');
                    } else if (turnosSelecionados.includes('tarde')) {
                        this.classList.add('selecionado-tarde');
                    } else {
                        this.classList.add('selecionado');
                    }
                } else {
                    diasSelecionados.splice(index, 1);
                    this.classList.remove('selecionado', 'selecionado-manha', 'selecionado-tarde', 'selecionado-ambos');
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
            
            // Verificar disponibilidade para todos os turnos selecionados
            const turnosSelecionados = obterTurnosSelecionados();
            let indisponivel = false;
            
            if (turnosSelecionados.length > 0) {
                for (const turno of turnosSelecionados) {
                    const disponibilidade = verificarDisponibilidadeDiaParaTurno(dataStr, turno);
                    if (!disponibilidade.disponivel) {
                        indisponivel = true;
                        diaTag.classList.add('indisponivel-tag');
                        diaTag.title = `Já reservado no turno da ${disponibilidade.turno === 'manha' ? 'manhã' : 'tarde'}`;
                        break;
                    }
                }
            }
            
            // Adicionar ícone de turno se disponível
            if (!indisponivel && turnosSelecionados.length > 0) {
                const turnoIcon = document.createElement('span');
                turnoIcon.className = 'turno-icon';
                turnoIcon.textContent = turnosSelecionados.length === 2 ? ' (Manhã+Tarde)' : 
                                      turnosSelecionados.includes('manha') ? ' (Manhã)' : ' (Tarde)';
                turnoIcon.style.marginLeft = '3px';
                turnoIcon.style.fontSize = '0.9em';
                turnoIcon.style.color = turnosSelecionados.length === 2 ? '#004aad' : 
                                      turnosSelecionados.includes('manha') ? '#004aad' : '#ffa500';
                diaTag.appendChild(turnoIcon);
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
    
    // VERIFICAR DISPONIBILIDADE DE UM DIA PARA UM TURNO ESPECÍFICO
    function verificarDisponibilidadeDiaParaTurno(dataStr, turno) {
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
                
                if (diasReservaLocal.includes(dataStr) && reserva.turno === turno) {
                    return { 
                        disponivel: false, 
                        turno: reserva.turno,
                        motivo: `Já reservado no turno da ${reserva.turno === 'manha' ? 'manhã' : 'tarde'}`,
                        responsavel: reserva.responsavel
                    };
                }
            }
        }
        
        return { disponivel: true };
    }
    
    // VERIFICAR DISPONIBILIDADE DE TODOS OS DIAS SELECIONADOS
    function verificarDisponibilidadeDiasSelecionados() {
        if (!diasSelecionados.length) return true;
        
        const turnosSelecionados = obterTurnosSelecionados();
        
        // Validar que pelo menos um turno foi selecionado
        if (turnosSelecionados.length === 0) {
            return true; // Retorna true, a validação principal vai mostrar erro
        }
        
        const diasIndisponiveis = [];
        
        diasSelecionados.forEach(dataStr => {
            // Verificar para cada turno selecionado
            for (const turno of turnosSelecionados) {
                const disponibilidade = verificarDisponibilidadeDiaParaTurno(dataStr, turno);
                if (!disponibilidade.disponivel) {
                    diasIndisponiveis.push({
                        data: dataStr,
                        motivo: disponibilidade.motivo,
                        turno: disponibilidade.turno,
                        responsavel: disponibilidade.responsavel
                    });
                    break; // Se um turno está indisponível, já adiciona
                }
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
        const dataFormatada = formatarDataParaExibicao(new Date(dataStr));
        const turnosSelecionados = obterTurnosSelecionados();
        
        let mensagem = `❌ ${dataFormatada} não está disponível`;
        
        // Verificar qual turno está indisponível
        for (const turno of turnosSelecionados) {
            const disponibilidade = verificarDisponibilidadeDiaParaTurno(dataStr, turno);
            if (!disponibilidade.disponivel) {
                mensagem += ` no turno da ${turno === 'manha' ? 'manhã' : 'tarde'}`;
                if (disponibilidade.responsavel) {
                    mensagem += `\nJá reservado por: ${disponibilidade.responsavel}`;
                }
                break;
            }
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
        if (!calendarioGrid) {
            console.error('Elemento calendarioGrid não encontrado!');
            return;
        }
        
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
            
            // Clique para verificar reservas ou fazer nova reserva
            div.onclick = async function() {
                const dataStr = this.dataset.data;
                const dataObj = parseDataStringLocal(dataStr);
                
                if (!dataObj) {
                    console.error('Data inválida:', dataStr);
                    return;
                }
                
                // Verificar se há reservas para esta data
                const reservasParaDia = await obterReservasParaData(dataStr);
                
                if (reservasParaDia.length > 0) {
                    // Se houver reservas, mostrar modal de visualização
                    mostrarModalVisualizacao(dataStr, reservasParaDia);
                } else {
                    // Se não houver reservas, abrir modal normal para nova reserva
                    abrirModalNovaReserva(dataStr);
                }
            };
            
            calendarioGrid.appendChild(div);
        }
    }
    
    // 🔧 FUNÇÃO PARA OBTER RESERVAS DE UMA DATA ESPECÍFICA
    async function obterReservasParaData(dataStr) {
        if (!db) return [];
        
        try {
            // Converter data local para UTC para busca
            const dataLocal = parseDataStringLocal(dataStr);
            const dataUTC = formatarDataParaStringUTC(dataLocal);
            
            console.log(`Buscando reservas para data (UTC): ${dataUTC}`);
            
            const snapshot = await db.collection('reservas')
                .where('status', '==', 'aprovado')
                .get();
            
            const reservasParaDia = [];
            
            snapshot.forEach(doc => {
                const reserva = doc.data();
                const reservaConvertida = {
                    id: doc.id,
                    ...reserva,
                    criadoEm: converterDataFirestoreParaLocal(reserva.criadoEm),
                    aprovadoEm: converterDataFirestoreParaLocal(reserva.aprovadoEm)
                };
                
                // Verificar se a reserva inclui este dia (considerando diferenças de fuso)
                if (reserva.dias && Array.isArray(reserva.dias)) {
                    const diasReservaLocal = reserva.dias.map(diaUTC => {
                        const dataUTC = parseDataStringUTC(diaUTC);
                        return dataUTC ? formatarDataLocalParaString(dataUTC) : diaUTC;
                    });
                    
                    if (diasReservaLocal.includes(dataStr)) {
                        reservasParaDia.push(reservaConvertida);
                    }
                }
            });
            
            console.log(`Encontradas ${reservasParaDia.length} reservas para ${dataStr}`);
            return reservasParaDia;
            
        } catch (error) {
            console.error('Erro ao buscar reservas para data:', error);
            return [];
        }
    }
    
    // 🔧 FUNÇÃO AUXILIAR PARA CRIAR CARD DE RESERVA
    function criarCardReserva(reserva) {
        const card = document.createElement('div');
        card.className = `reserva-card ${reserva.turno}`;
        
        const turnoTexto = reserva.turno === 'manha' ? 'Manhã (08h às 12h)' : 'Tarde (14h às 17h)';
        const ocupacaoFormatada = formatarOcupacao(reserva.ocupacao);
        
        card.innerHTML = `
            <div class="reserva-card-header">
                <div class="turno-icon ${reserva.turno}">
                    ${reserva.turno === 'manha' ? 'M' : 'T'}
                </div>
                <h3>${reserva.responsavel || 'Não informado'}</h3>
                <span class="reserva-horario">${turnoTexto}</span>
            </div>
            
            <div class="reserva-detalhes">
                <div class="detalhe-item">
                    <strong>Ocupação:</strong>
                    <span>${ocupacaoFormatada}</span>
                </div>
                
                <div class="detalhe-item full-width">
                    <strong>Finalidade:</strong>
                    <div class="finalidade-texto">
                        ${reserva.finalidade || 'Não informada'}
                    </div>
                </div>
                
                <div class="detalhe-item">
                    <strong>Status:</strong>
                    <span class="status-badge status-aprovado">Aprovado</span>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // 🔧 FUNÇÃO PARA MOSTRAR MODAL DE VISUALIZAÇÃO
    function mostrarModalVisualizacao(dataStr, reservas) {
        if (!modalVisualizacao || !dataVisualizacaoSpan || !reservasContainer) {
            console.error('Elementos do modal de visualização não encontrados');
            return;
        }

        // Formatar data para exibição
        const dataObj = parseDataStringLocal(dataStr);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Capitalizar primeira letra
        const dataFormatadaCapitalizada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
        dataVisualizacaoSpan.textContent = dataFormatadaCapitalizada;

        // Limpar container
        reservasContainer.innerHTML = '';

        if (reservas.length === 0) {
            // Não deveria acontecer, mas por segurança
            const semReservasDiv = document.createElement('div');
            semReservasDiv.className = 'sem-reservas';
            semReservasDiv.innerHTML = `
                <div class="icon">📅</div>
                <p>Nenhuma reserva encontrada para este dia.</p>
                <button type="button" class="btn-secondary" onclick="abrirModalNovaReserva('${dataStr}')">Fazer reserva</button>
            `;
            reservasContainer.appendChild(semReservasDiv);
        } else {
            // Separar reservas por turno
            const reservaManha = reservas.find(r => r.turno === 'manha');
            const reservaTarde = reservas.find(r => r.turno === 'tarde');

            // Se houver reserva pela manhã
            if (reservaManha) {
                // Separador
                const separadorManha = document.createElement('div');
                separadorManha.className = 'turno-separator';
                separadorManha.innerHTML = '<h3>🌅 TURNO DA MANHÃ</h3>';
                reservasContainer.appendChild(separadorManha);

                // Card da reserva da manhã
                const cardManha = criarCardReserva(reservaManha);
                reservasContainer.appendChild(cardManha);
            }

            // Se houver reserva pela tarde
            if (reservaTarde) {
                // Separador
                const separadorTarde = document.createElement('div');
                separadorTarde.className = 'turno-separator';
                separadorTarde.innerHTML = '<h3>🌇 TURNO DA TARDE</h3>';
                reservasContainer.appendChild(separadorTarde);

                // Card da reserva da tarde
                const cardTarde = criarCardReserva(reservaTarde);
                reservasContainer.appendChild(cardTarde);
            }

            // Aviso se ambos os turnos estão ocupados
            if (reservaManha && reservaTarde) {
                const avisoDiv = document.createElement('div');
                avisoDiv.className = 'aviso-reserva-dupla';
                avisoDiv.innerHTML = `
                    <div class="info-aviso">
                        <strong>⚠️ Ambos os turnos estão reservados para este dia.</strong>
                        <p>Para fazer uma nova reserva, escolha outra data ou entre em contato com os responsáveis.</p>
                    </div>
                `;
                reservasContainer.appendChild(avisoDiv);
            }
        }

        // Mostrar modal
        modalVisualizacao.style.display = 'flex';

        // Configurar botões de fechar
        if (btnFecharVisualizacao) {
            btnFecharVisualizacao.onclick = function() {
                modalVisualizacao.style.display = 'none';
            };
        }

        if (btnFecharModalVisualizacao) {
            btnFecharModalVisualizacao.onclick = function() {
                modalVisualizacao.style.display = 'none';
            };
        }

        if (closeModalBtn) {
            closeModalBtn.onclick = function() {
                modalVisualizacao.style.display = 'none';
            };
        }

        // Configurar botão para nova reserva
        if (btnNovaReservaMesmaData) {
            btnNovaReservaMesmaData.onclick = function() {
                modalVisualizacao.style.display = 'none';
                
                // Aguardar um pouco para o modal fechar
                setTimeout(() => {
                    abrirModalNovaReserva(dataStr);
                }, 300);
            };
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
                turno: r.turno,
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
            diaDiv.classList.remove('ocupado', 'ocupado-manha', 'ocupado-tarde', 'ocupado-ambos', 'tem-reserva');
            
            const info = diaDiv.querySelector('.dia-info');
            if (info) {
                info.innerHTML = '';
            }
            
            // Verificar se há reservas neste dia
            const reservasDoDia = reservasPorDia[dia];
            
            if (reservasDoDia) {
                // Adicionar classe para indicar que tem reserva
                diaDiv.classList.add('tem-reserva');
                
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
                
                diaDiv.title = 'Clique para ver detalhes da reserva';
                
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
        
        const turnosSelecionados = obterTurnosSelecionados();
        if (turnosSelecionados.length === 0) {
            return { valido: false, erro: 'Selecione pelo menos um turno.' };
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
        
        // Verificar duplicidade de reserva para CADA TURNO
        try {
            const snapshot = await db.collection('reservas')
                .where('status', '==', 'aprovado')
                .get();
            
            const conflitos = [];
            
            snapshot.forEach(doc => {
                const reserva = doc.data();
                
                // Converter dias da reserva para formato local
                const diasReservaLocal = reserva.dias ? reserva.dias.map(diaUTC => {
                    const dataUTC = parseDataStringUTC(diaUTC);
                    return dataUTC ? formatarDataLocalParaString(dataUTC) : diaUTC;
                }) : [];
                
                // Verificar sobreposição para cada turno selecionado
                for (const diaReserva of diasReservaLocal) {
                    if (diasSelecionados.includes(diaReserva) && turnosSelecionados.includes(reserva.turno)) {
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
                const conflitosUnicos = conflitos.filter((c, i, self) => 
                    self.findIndex(t => t.data === c.data && t.turno === c.turno) === i
                );
                
                conflitosUnicos.forEach(conflito => {
                    mensagem += `• ${conflito.data} (${conflito.turno}) - ${conflito.responsavel}\n`;
                });
                mensagem += '\nEscolha outros dias ou turnos.';
                
                return { valido: false, erro: mensagem };
            }
            
        } catch (error) {
            console.error('Erro ao verificar duplicidade:', error);
        }
        
        return { valido: true };
    }
    
    // 🔧 SALVAR RESERVA COM APROVAÇÃO AUTOMÁTICA (MÚLTIPLOS TURNOS)
    formReserva.onsubmit = async function(e) {
        e.preventDefault();
        
        // Validações básicas
        const regrasAceitas = document.querySelector('input[name="regras"]:checked');
        if (!regrasAceitas || regrasAceitas.value !== 'sim') {
            alert('❌ Você deve aceitar as regras do laboratório.');
            return;
        }
        
        const turnosSelecionados = obterTurnosSelecionados();
        if (turnosSelecionados.length === 0) {
            alert('❌ Selecione pelo menos um turno.');
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
        console.log('Turnos selecionados:', turnosSelecionados);
        
        // Botão de envio
        const submitBtn = formReserva.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Criando reserva(s)...';
        submitBtn.disabled = true;
        
        try {
            if (!db) {
                throw new Error('Banco de dados não disponível');
            }
            
            // Criar uma reserva para CADA TURNO selecionado
            const promises = turnosSelecionados.map(async (turno) => {
                // Coletar dados (cada turno é uma reserva separada)
                const formData = {
                    email: document.getElementById('email').value,
                    whatsapp: document.getElementById('whatsapp').value,
                    responsavel: document.getElementById('responsavel').value,
                    finalidade: document.getElementById('finalidade').value,
                    ocupacao: document.getElementById('ocupacao').value,
                    dias: diasUTC, // 🔧 Usar formato UTC
                    turno: turno,
                    status: 'aprovado',
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    visualizado: false,
                    aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    aprovadoPor: 'sistema',
                    // Adicionar flag para indicar que faz parte de uma reserva múltipla
                    reservaMultipla: turnosSelecionados.length > 1,
                    turnosAssociados: turnosSelecionados.length > 1 ? turnosSelecionados : null
                };
                
                console.log(`Salvando reserva para turno ${turno}:`, formData);
                return await db.collection('reservas').add(formData);
            });
            
            // Aguardar todas as reservas serem salvas
            const resultados = await Promise.all(promises);
            
            // Mensagem de sucesso
            if (turnosSelecionados.length === 1) {
                alert(`✅ Reserva criada e APROVADA automaticamente!\n\nID: ${resultados[0].id}\nStatus: Aprovado\nTurno: ${turnosSelecionados[0] === 'manha' ? 'Manhã' : 'Tarde'}\n\nA reserva já está ativa no sistema.`);
            } else {
                const ids = resultados.map(r => r.id).join(', ');
                alert(`✅ ${turnosSelecionados.length} reservas criadas e APROVADAS automaticamente!\n\nIDs: ${ids}\nTurnos: ${turnosSelecionados.map(t => t === 'manha' ? 'Manhã' : 'Tarde').join(' e ')}\n\nAs reservas já estão ativas no sistema.`);
            }
            
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
            
            mostrarFeedback('Reserva(s) aprovada(s) com sucesso!', 'sucesso');
            
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
    
    // Monitorar mudanças nos turnos (checkboxes)
    document.querySelectorAll('.turno-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            verificarDisponibilidadeDiasSelecionados();
            
            // Atualizar mini calendário para mostrar disponibilidade
            atualizarMiniCalendario();
            
            // Atualizar visualização dos dias selecionados
            atualizarDiasSelecionados();
        });
    });
    
    // 🔧 FUNÇÃO DE DEPURAÇÃO
    function depurarDatas() {
        console.log('=== DEPURAÇÃO DE DATAS ===');
        console.log('Data atual:', dataAtual.toLocaleDateString('pt-BR'));
        console.log('Dias selecionados:', diasSelecionados);
        console.log('Turnos selecionados:', obterTurnosSelecionados());
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
});