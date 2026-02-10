// script-firebase.js - Com verificação de disponibilidade, correção de fuso horário, múltiplos turnos, visualização de reservas, BLOQUEIO DE FERIADOS e TURNO DA NOITE para docentes da FEI

// 🔧 FUNÇÃO PARA CARREGAR SCRIPT DO TELEGRAM DINAMICAMENTE
async function carregarScriptTelegram() {
    return new Promise((resolve, reject) => {
        // Verificar se já está carregado
        if (typeof notificarTelegram === 'function') {
            console.log('✅ Função notificarTelegram já está disponível');
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'js/telegram-notificacao.js';
        script.onload = () => {
            console.log('✅ Script do Telegram carregado com sucesso');
            if (typeof notificarTelegram === 'function') {
                resolve();
            } else {
                reject(new Error('Função notificarTelegram não foi definida no script'));
            }
        };
        script.onerror = () => {
            console.error('❌ Erro ao carregar script do Telegram');
            reject(new Error('Falha ao carregar script do Telegram'));
        };
        document.head.appendChild(script);
    });
}

// 🔧 FUNÇÃO ALTERNATIVA PARA ENVIAR NOTIFICAÇÃO TELEGRAM
async function enviarNotificacaoTelegram(reserva) {
    const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
    const CHAT_ID = "-1003832202230";
    
    // Formatar o turno para exibição
    const formatarTurno = (turno) => {
        if (turno === 'manha') return 'Manhã (08h-12h)';
        if (turno === 'tarde') return 'Tarde (14h-17h)';
        if (turno === 'noite') return 'Noite (18h-22h)';
        return turno;
    };

    // Formatar datas
    const formatarDatas = (dias) => {
        if (!dias || !Array.isArray(dias)) return 'Não informado';
        
        // Converter datas UTC para exibição local
        return dias.map(dataStr => {
            try {
                const partes = dataStr.split('-');
                if (partes.length === 3) {
                    return `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
                return dataStr;
            } catch (e) {
                return dataStr;
            }
        }).join(', ');
    };

    const mensagem = `
📅 *NOVA RESERVA NO LEP*

👤 *Responsável:* ${reserva.responsavel || 'Não informado'}
📧 *Email:* ${reserva.email || 'Não informado'}
📱 *WhatsApp:* ${reserva.whatsapp || 'Não informado'}
🕒 *Turno:* ${formatarTurno(reserva.turno)}
📆 *Datas:* ${formatarDatas(reserva.dias)}
📋 *Ocupação:* ${reserva.ocupacao || 'Não informado'}
🎯 *Finalidade:* ${(reserva.finalidade || '').substring(0, 100)}${reserva.finalidade && reserva.finalidade.length > 100 ? '...' : ''}

${reserva.turno === 'noite' ? '⚠️ *ATENÇÃO: Turno da noite - Necessita aprovação*' : '✅ *Reserva aprovada automaticamente*'}
${reserva.justificativaNoite ? `📝 *Justificativa:* ${reserva.justificativaNoite.substring(0, 100)}${reserva.justificativaNoite.length > 100 ? '...' : ''}` : ''}

📊 *Status:* ${reserva.status === 'aprovado' ? 'APROVADO ✅' : 'PENDENTE ⏳'}
⏰ *Criado em:* ${new Date().toLocaleString('pt-BR')}
    `;

    console.log('🔔 Enviando notificação Telegram...');

    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: mensagem,
                parse_mode: "Markdown"
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Erro na resposta do Telegram:', result);
            throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
        } else {
            console.log('✅ Notificação enviada ao Telegram com sucesso');
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao enviar para Telegram:', error);
        return false;
    }
}

// 🔧 FUNÇÃO PRINCIPAL PARA ENVIAR NOTIFICAÇÃO (COM FALLBACK)
async function enviarNotificacao(reserva) {
    console.log('🔔 Tentando enviar notificação...');
    
    try {
        // Primeiro tentar usar a função global
        if (typeof notificarTelegram === 'function') {
            console.log('📞 Usando função notificarTelegram global');
            await notificarTelegram(reserva);
            return true;
        }
        
        // Se não estiver disponível, tentar carregar o script
        console.log('📦 Função não disponível, tentando carregar script...');
        await carregarScriptTelegram();
        
        // Tentar novamente
        if (typeof notificarTelegram === 'function') {
            console.log('📞 Usando função notificarTelegram após carregamento');
            await notificarTelegram(reserva);
            return true;
        }
        
        // Se ainda não funcionar, usar função alternativa
        console.log('⚡ Usando função alternativa de notificação');
        return await enviarNotificacaoTelegram(reserva);
        
    } catch (error) {
        console.error('❌ Falha em todos os métodos de notificação:', error);
        // Não lançar erro para não interromper o fluxo principal
        return false;
    }
}

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

// 🔧 LISTA DE FERIADOS E PONTOS FACULTATIVOS PARA 2026
const feriadosPontosFacultativos = [
    // Janeiro
    { data: '2026-01-01', tipo: 'feriado', descricao: 'Confraternização Universal - Feriado Nacional' },
    { data: '2026-01-02', tipo: 'ponto_facultativo', descricao: 'Ponto Facultativo' },

    // Fevereiro (Carnaval)
    { data: '2026-02-16', tipo: 'ponto_facultativo', descricao: 'Carnaval - Ponto Facultativo' },
    { data: '2026-02-17', tipo: 'ponto_facultativo', descricao: 'Carnaval - Ponto Facultativo' },
    { data: '2026-02-18', tipo: 'ponto_facultativo_12h', descricao: 'Quarta-feira de Cinzas - Ponto Facultativo até 12h' },

    // Abril
    { data: '2026-04-02', tipo: 'ponto_facultativo', descricao: 'Ponto Facultativo' },
    { data: '2026-04-03', tipo: 'feriado', descricao: 'Sexta-feira da Paixão - Feriado Nacional' },
    { data: '2026-04-20', tipo: 'ponto_facultativo', descricao: 'Ponto Facultativo' },
    { data: '2026-04-21', tipo: 'feriado', descricao: 'Tiradentes - Feriado Nacional' },

    // Maio
    { data: '2026-05-01', tipo: 'feriado', descricao: 'Dia Mundial do Trabalho - Feriado Nacional' },

    // Junho
    { data: '2026-06-04', tipo: 'ponto_facultativo', descricao: 'Corpus Christi - Ponto Facultativo' },
    { data: '2026-06-05', tipo: 'ponto_facultativo', descricao: 'Ponto Facultativo' },

    // Agosto
    { data: '2026-08-15', tipo: 'feriado_estadual', descricao: 'Adesão do Grão-Pará à Independência do Brasil - Feriado Estadual' },

    // Setembro
    { data: '2026-09-07', tipo: 'feriado', descricao: 'Independência do Brasil - Feriado Nacional' },

    // Outubro
    { data: '2026-10-12', tipo: 'feriado', descricao: 'Nossa Senhora Aparecida (pós-Círio) - Feriado Nacional' },
    { data: '2026-10-26', tipo: 'ponto_facultativo_12h', descricao: 'Recírio - Ponto Facultativo até 12h' },
    { data: '2026-10-28', tipo: 'ponto_facultativo', descricao: 'Dia do Servidor Público - Ponto Facultativo' },

    // Novembro
    { data: '2026-11-02', tipo: 'feriado', descricao: 'Finados - Feriado Nacional' },
    { data: '2026-11-15', tipo: 'feriado', descricao: 'Proclamação da República - Feriado Nacional' },
    { data: '2026-11-20', tipo: 'feriado', descricao: 'Dia Nacional de Zumbi e da Consciência Negra - Feriado Nacional' },

    // Dezembro
    { data: '2026-12-07', tipo: 'ponto_facultativo', descricao: 'Ponto Facultativo' },
    { data: '2026-12-08', tipo: 'ponto_facultativo', descricao: 'Nossa Senhora da Conceição - Ponto Facultativo' },
    { data: '2026-12-24', tipo: 'ponto_facultativo', descricao: 'Véspera de Natal - Ponto Facultativo' },
    { data: '2026-12-25', tipo: 'feriado', descricao: 'Natal - Feriado Nacional' },
    { data: '2026-12-31', tipo: 'ponto_facultativo', descricao: 'Véspera de Ano Novo - Ponto Facultativo' }
];

// 🔧 FUNÇÃO PARA VERIFICAR SE UMA DATA É FERIADO/PONTO FACULTATIVO
function verificarFeriadoOuPontoFacultativo(dataStr) {
    const dataFormatada = dataStr.includes('-') ? dataStr : formatarDataLocalParaString(new Date(dataStr));

    const feriado = feriadosPontosFacultativos.find(item => item.data === dataFormatada);

    if (feriado) {
        return {
            isFeriado: true,
            tipo: feriado.tipo,
            descricao: feriado.descricao,
            permiteManha: feriado.tipo === 'ponto_facultativo' || feriado.tipo === 'ponto_facultativo_12h',
            permiteTarde: feriado.tipo === 'ponto_facultativo' && feriado.tipo !== 'ponto_facultativo_12h',
            permiteNoite: feriado.tipo === 'ponto_facultativo' && feriado.tipo !== 'ponto_facultativo_12h'
        };
    }

    return {
        isFeriado: false,
        tipo: 'normal',
        descricao: 'Dia normal',
        permiteManha: true,
        permiteTarde: true,
        permiteNoite: true
    };
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

function formatarOcupacao(ocupacao) {
    if (!ocupacao) return 'Não informada';

    // Mapeamento de valores do select para textos mais amigáveis
    const ocupacoesFormatadas = {
        'docente_fei': 'Docente da FEI',
        'docente_outros': 'Docente de outros cursos',
        'discente_producao': 'Discente de Produção',
        'tecnico_administrativo': 'Técnico-Administrativo',
        'usuario_externo': 'Usuário Externo'
    };

    return ocupacoesFormatadas[ocupacao] || ocupacao;
}

// 🔧 FUNÇÃO PARA FORMATAR TURNO PARA EXIBIÇÃO
function formatarTurnoParaExibicao(turno) {
    const turnosFormatados = {
        'manha': 'Manhã',
        'tarde': 'Tarde',
        'noite': 'Noite'
    };
    return turnosFormatados[turno] || turno;
}

// AGUARDAR O CARREGAMENTO COMPLETO DA PÁGINA
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM carregado. Iniciando sistema de reservas...');
    
    // DEPURAÇÃO: Verificar se as funções estão disponíveis
    console.log('🔍 Verificando disponibilidade de funções:');
    console.log('- notificarTelegram:', typeof notificarTelegram === 'function' ? '✅ Disponível' : '❌ Não disponível');
    console.log('- enviarNotificacao:', typeof enviarNotificacao === 'function' ? '✅ Disponível' : '❌ Não disponível');

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

    // 🔧 MONITORAR MUDANÇAS NA OCUPAÇÃO PARA MOSTRAR/OCULTAR TURNO DA NOITE
    document.getElementById('ocupacao').addEventListener('change', function () {
        const ocupacao = this.value;
        const noiteContainer = document.getElementById('noiteContainer');
        const justificativaContainer = document.getElementById('justificativaNoiteContainer');
        const mensagemAnalise = document.getElementById('mensagemAnaliseNoite');

        if (ocupacao === 'docente_fei') {
            // Mostrar turno da noite para docentes da FEI
            noiteContainer.style.display = 'flex';
        } else {
            // Ocultar turno da noite e campos relacionados
            noiteContainer.style.display = 'none';
            justificativaContainer.style.display = 'none';
            mensagemAnalise.style.display = 'none';

            // Desmarcar turno da noite se estava selecionado
            const noiteCheckbox = document.querySelector('.turno-noite');
            if (noiteCheckbox) {
                noiteCheckbox.checked = false;
            }

            // Limpar justificativa
            document.getElementById('justificativaNoite').value = '';
        }
    });

    // 🔧 MONITORAR MUDANÇAS NO CHECKBOX DO TURNO DA NOITE
    document.addEventListener('change', function (e) {
        if (e.target.classList.contains('turno-noite')) {
            const justificativaContainer = document.getElementById('justificativaNoiteContainer');
            const mensagemAnalise = document.getElementById('mensagemAnaliseNoite');

            if (e.target.checked) {
                justificativaContainer.style.display = 'block';
                mensagemAnalise.style.display = 'block';
            } else {
                justificativaContainer.style.display = 'none';
                mensagemAnalise.style.display = 'none';
                document.getElementById('justificativaNoite').value = '';
            }
        }
    });

    // FORMATAR TELEFONE
    const whatsappInput = document.getElementById('whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', function (e) {
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

    // 🔧 FUNÇÃO PARA OBTER JUSTIFICATIVA DO TURNO DA NOITE
    function obterJustificativaNoite() {
        const justificativaInput = document.getElementById('justificativaNoite');
        return justificativaInput ? justificativaInput.value.trim() : '';
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

        // 🔧 RESETAR CAMPOS ESPECÍFICOS DO TURNO DA NOITE
        document.getElementById('justificativaNoite').value = '';
        document.getElementById('justificativaNoiteContainer').style.display = 'none';
        document.getElementById('mensagemAnaliseNoite').style.display = 'none';
        document.getElementById('noiteContainer').style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            formReserva.reset();
            diasSelecionados = [];
            atualizarDiasSelecionados();

            // 🔧 RESETAR CAMPOS ESPECÍFICOS DO TURNO DA NOITE
            document.getElementById('justificativaNoite').value = '';
            document.getElementById('justificativaNoiteContainer').style.display = 'none';
            document.getElementById('mensagemAnaliseNoite').style.display = 'none';
            document.getElementById('noiteContainer').style.display = 'none';
        }

        if (event.target === modalVisualizacao) {
            modalVisualizacao.style.display = 'none';
        }
    };

    // Fechar modais com ESC
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                formReserva.reset();
                diasSelecionados = [];
                atualizarDiasSelecionados();

                // 🔧 RESETAR CAMPOS ESPECÍFICOS DO TURNO DA NOITE
                document.getElementById('justificativaNoite').value = '';
                document.getElementById('justificativaNoiteContainer').style.display = 'none';
                document.getElementById('mensagemAnaliseNoite').style.display = 'none';
                document.getElementById('noiteContainer').style.display = 'none';
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

        // 🔧 VERIFICAR SE É FERIADO
        const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
        if (feriadoInfo.isFeriado) {
            alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
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

            // 🔧 VERIFICAR SE É FERIADO OU PONTO FACULTATIVO
            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);

            if (feriadoInfo.isFeriado) {
                // Adicionar classe baseada no tipo
                if (feriadoInfo.tipo === 'feriado' || feriadoInfo.tipo === 'feriado_estadual') {
                    div.classList.add('feriado');
                } else if (feriadoInfo.tipo === 'ponto_facultativo') {
                    div.classList.add('ponto-facultativo');
                } else if (feriadoInfo.tipo === 'ponto_facultativo_12h') {
                    div.classList.add('ponto-facultativo-12h');
                }

                // Adicionar tooltip
                div.title = feriadoInfo.descricao;

                // Desabilitar clique
                div.onclick = function () {
                    alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
                };

                // Pular para o próximo dia
                miniCalendarioGrid.appendChild(div);
                continue;
            }

            // Verificar se já está selecionado
            if (diasSelecionados.includes(dataStr)) {
                const turnosSelecionados = obterTurnosSelecionados();
                if (turnosSelecionados.length === 3) {
                    div.classList.add('selecionado-ambos');
                } else if (turnosSelecionados.includes('manha') && turnosSelecionados.includes('tarde')) {
                    div.classList.add('selecionado-ambos');
                } else if (turnosSelecionados.includes('manha') && turnosSelecionados.includes('noite')) {
                    div.classList.add('selecionado-manha-noite');
                } else if (turnosSelecionados.includes('tarde') && turnosSelecionados.includes('noite')) {
                    div.classList.add('selecionado-tarde-noite');
                } else if (turnosSelecionados.includes('manha')) {
                    div.classList.add('selecionado-manha');
                } else if (turnosSelecionados.includes('tarde')) {
                    div.classList.add('selecionado-tarde');
                } else if (turnosSelecionados.includes('noite')) {
                    div.classList.add('selecionado-noite');
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
                    div.title = `Já reservado no turno da ${formatarTurnoParaExibicao(turnoIndisponivel).toLowerCase()}`;
                } else if (turnosSelecionados.length > 0) {
                    div.classList.remove('indisponivel');
                    div.title = 'Disponível para os turnos selecionados';
                }
            }

            // Clique no dia (apenas se não for feriado)
            div.onclick = function () {
                if (this.classList.contains('indisponivel')) {
                    mostrarAlertaDisponibilidade(dataStr);
                    return;
                }

                const index = diasSelecionados.indexOf(dataStr);

                if (index === -1) {
                    diasSelecionados.push(dataStr);
                    // Adicionar classe baseada nos turnos selecionados
                    const turnosSelecionados = obterTurnosSelecionados();
                    if (turnosSelecionados.length === 3) {
                        this.classList.add('selecionado-ambos');
                    } else if (turnosSelecionados.includes('manha') && turnosSelecionados.includes('tarde')) {
                        this.classList.add('selecionado-ambos');
                    } else if (turnosSelecionados.includes('manha') && turnosSelecionados.includes('noite')) {
                        this.classList.add('selecionado-manha-noite');
                    } else if (turnosSelecionados.includes('tarde') && turnosSelecionados.includes('noite')) {
                        this.classList.add('selecionado-tarde-noite');
                    } else if (turnosSelecionados.includes('manha')) {
                        this.classList.add('selecionado-manha');
                    } else if (turnosSelecionados.includes('tarde')) {
                        this.classList.add('selecionado-tarde');
                    } else if (turnosSelecionados.includes('noite')) {
                        this.classList.add('selecionado-noite');
                    } else {
                        this.classList.add('selecionado');
                    }
                } else {
                    diasSelecionados.splice(index, 1);
                    this.classList.remove('selecionado', 'selecionado-manha', 'selecionado-tarde', 'selecionado-noite', 'selecionado-ambos', 'selecionado-manha-noite', 'selecionado-tarde-noite');
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
                        diaTag.title = `Já reservado no turno da ${formatarTurnoParaExibicao(disponibilidade.turno).toLowerCase()}`;
                        break;
                    }
                }
            }

            // Adicionar ícone de turno se disponível
            if (!indisponivel && turnosSelecionados.length > 0) {
                const turnoIcon = document.createElement('span');
                turnoIcon.className = 'turno-icon';

                // 🔧 ADICIONAR TURNO DA NOITE À EXIBIÇÃO
                const turnosTexto = turnosSelecionados.map(t => {
                    if (t === 'manha') return 'Manhã';
                    if (t === 'tarde') return 'Tarde';
                    if (t === 'noite') return 'Noite';
                    return t;
                }).join('+');

                turnoIcon.textContent = ` (${turnosTexto})`;
                turnoIcon.style.marginLeft = '3px';
                turnoIcon.style.fontSize = '0.9em';

                // 🔧 CORES DIFERENCIADAS PARA TURNO DA NOITE
                if (turnosSelecionados.length === 3) {
                    turnoIcon.style.color = '#8B008B';
                } else if (turnosSelecionados.includes('noite')) {
                    turnoIcon.style.color = '#8B008B';
                } else if (turnosSelecionados.length === 2) {
                    turnoIcon.style.color = '#004aad';
                } else if (turnosSelecionados.includes('manha')) {
                    turnoIcon.style.color = '#004aad';
                } else if (turnosSelecionados.includes('tarde')) {
                    turnoIcon.style.color = '#ffa500';
                }

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
            removerBtn.onclick = function (e) {
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

        // 🔧 VERIFICAR SE É FERIADO OU PONTO FACULTATIVO
        const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);

        if (feriadoInfo.isFeriado) {
            // Verificar se o turno é permitido neste feriado/ponto facultativo
            if (turno === 'manha' && !feriadoInfo.permiteManha) {
                return {
                    disponivel: false,
                    turno: turno,
                    motivo: `Feriado/Ponto Facultativo - ${feriadoInfo.descricao}`
                };
            }

            if (turno === 'tarde' && !feriadoInfo.permiteTarde) {
                return {
                    disponivel: false,
                    turno: turno,
                    motivo: `Feriado/Ponto Facultativo - ${feriadoInfo.descricao}`
                };
            }

            if (turno === 'noite' && !feriadoInfo.permiteNoite) {
                return {
                    disponivel: false,
                    turno: turno,
                    motivo: `Feriado/Ponto Facultativo - ${feriadoInfo.descricao}`
                };
            }

            // Se for feriado nacional/estadual, não permite nenhum turno
            if (feriadoInfo.tipo === 'feriado' || feriadoInfo.tipo === 'feriado_estadual') {
                return {
                    disponivel: false,
                    turno: turno,
                    motivo: `Feriado - ${feriadoInfo.descricao}`
                };
            }
        }

        // 🔧 VERIFICAR HORÁRIO DO TURNO DA NOITE (se aplicável)
        if (turno === 'noite') {
            // Verificar se o laboratório funciona à noite (você pode ajustar essa lógica)
            // Por exemplo, talvez o laboratório só funcione até as 22h
            const horaAtual = new Date().getHours();
            if (horaAtual > 22 || horaAtual < 6) {
                return {
                    disponivel: false,
                    turno: turno,
                    motivo: 'Laboratório não funciona neste horário noturno'
                };
            }
        }

        // Verificar nas reservas existentes (APENAS APROVADAS)
        for (const reserva of reservasExistentes) {
            if (reserva.status !== 'aprovado' && turno !== 'noite') continue;

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
                        motivo: `Já reservado no turno da ${formatarTurnoParaExibicao(reserva.turno).toLowerCase()}`,
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
            // 🔧 VERIFICAR SE É FERIADO
            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
            if (feriadoInfo.isFeriado) {
                diasIndisponiveis.push({
                    data: dataStr,
                    motivo: feriadoInfo.descricao,
                    turno: 'ambos',
                    responsavel: 'Sistema'
                });
                return;
            }

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

        // 🔧 VERIFICAR SE É FERIADO
        const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
        if (feriadoInfo.isFeriado) {
            alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
            return;
        }

        let mensagem = `❌ ${dataFormatada} não está disponível`;

        // Verificar qual turno está indisponível
        for (const turno of turnosSelecionados) {
            const disponibilidade = verificarDisponibilidadeDiaParaTurno(dataStr, turno);
            if (!disponibilidade.disponivel) {
                mensagem += ` no turno da ${formatarTurnoParaExibicao(turno).toLowerCase()}`;
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
            if (item.responsavel && item.responsavel !== 'Sistema') {
                mensagem += ` (${item.responsavel})`;
            }
            mensagem += '\n';
        });

        mensagem += '\nPor favor, selecione outros dias ou turnos.';
        alert(mensagem);
    }

    // NAVEGAÇÃO MINI CALENDÁRIO
    if (miniPrevBtn) {
        miniPrevBtn.onclick = function () {
            miniDataAtual.setMonth(miniDataAtual.getMonth() - 1);
            atualizarMiniCalendario();
        };
    }

    if (miniNextBtn) {
        miniNextBtn.onclick = function () {
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
        prevBtn.onclick = function () {
            console.log('Prev clicked - Mês atual:', dataAtual.getMonth() + 1);

            // Criar uma NOVA data para evitar problemas de referência
            const novaData = new Date(dataAtual);

            if (viewAtual === 'monthly') {
                // Alterar o mês de forma segura
                novaData.setMonth(novaData.getMonth() - 1);
            } else {
                novaData.setDate(novaData.getDate() - 7);
            }

            // Atualizar a data atual com a nova data
            dataAtual = novaData;

            console.log('Novo mês:', dataAtual.getMonth() + 1);
            atualizarCalendario();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = function () {
            console.log('Next clicked - Mês atual:', dataAtual.getMonth() + 1);

            // Criar uma NOVA data para evitar problemas de referência
            const novaData = new Date(dataAtual);

            if (viewAtual === 'monthly') {
                // Alterar o mês de forma segura
                novaData.setMonth(novaData.getMonth() + 1);
            } else {
                novaData.setDate(novaData.getDate() + 7);
            }

            // Atualizar a data atual com a nova data
            dataAtual = novaData;

            console.log('Novo mês:', dataAtual.getMonth() + 1);
            atualizarCalendario();
        };
    }
    // ALTERNAR VISUALIZAÇÃO
    if (viewButtons.length > 0) {
        viewButtons.forEach(btn => {
            btn.onclick = function () {
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

            // 🔧 VERIFICAR SE É FERIADO OU PONTO FACULTATIVO
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);

            if (feriadoInfo.isFeriado) {
                // Adicionar classe baseada no tipo
                if (feriadoInfo.tipo === 'feriado' || feriadoInfo.tipo === 'feriado_estadual') {
                    div.classList.add('feriado');
                    div.dataset.feriadoTipo = 'FERIADO';
                } else if (feriadoInfo.tipo === 'ponto_facultativo') {
                    div.classList.add('ponto-facultativo');
                    div.dataset.feriadoTipo = 'FACULT';
                } else if (feriadoInfo.tipo === 'ponto_facultativo_12h') {
                    div.classList.add('ponto-facultativo-12h');
                    div.dataset.feriadoTipo = 'ATÉ 12H';
                }

                // Adicionar tooltip
                div.title = feriadoInfo.descricao;

                div.innerHTML = `
                    <div class="dia-numero">${dia}</div>
                    <div class="dia-info">
                        <div class="feriado-info">
                            <div class="feriado-icon">🎉</div>
                            <div class="feriado-texto">${feriadoInfo.tipo.includes('feriado') ? 'Feriado' : 'Ponto Facultativo'}</div>
                        </div>
                    </div>
                `;

                // Clique para mostrar alerta de feriado
                div.onclick = function () {
                    alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
                };

                calendarioGrid.appendChild(div);
                continue;
            }

            // Dia normal (não é feriado)
            div.innerHTML = `
                <div class="dia-numero">${dia}</div>
                <div class="dia-info">Disponível</div>
            `;

            // Clique para verificar reservas ou fazer nova reserva
            div.onclick = async function () {
                const dataStr = this.dataset.data;
                const dataObj = parseDataStringLocal(dataStr);

                if (!dataObj) {
                    console.error('Data inválida:', dataStr);
                    return;
                }

                // 🔧 VERIFICAR SE É FERIADO
                const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
                if (feriadoInfo.isFeriado) {
                    alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
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

        // Após gerar o calendário, marcar os dias ocupados e feriados
        setTimeout(() => {
            if (reservasExistentes.length > 0) {
                marcarDiasOcupados(reservasExistentes);
            }
            marcarFeriadosNoCalendario();
        }, 100);
    }

    // 🔧 FUNÇÃO PARA MARCAR FERIADOS NO CALENDÁRIO
    function marcarFeriadosNoCalendario() {
        if (!calendarioGrid) return;

        const ano = dataAtual.getFullYear();
        const mes = dataAtual.getMonth();

        // Verificar cada dia do calendário
        document.querySelectorAll('.calendario-grid .dia:not(.vazio)').forEach(diaDiv => {
            const dia = parseInt(diaDiv.dataset.dia);
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);

            if (feriadoInfo.isFeriado) {
                // Adicionar tooltip com a descrição
                diaDiv.title = feriadoInfo.descricao;

                // Atualizar informação do dia
                const info = diaDiv.querySelector('.dia-info');
                if (info) {
                    info.innerHTML = `
                        <div class="feriado-info">
                            <div class="feriado-icon">🎉</div>
                            <div class="feriado-texto">${feriadoInfo.tipo.includes('feriado') ? 'Feriado' : 'Ponto Facultativo'}</div>
                        </div>
                    `;
                }
            }
        });
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

        const turnoTexto = reserva.turno === 'manha' ? 'Manhã (08h às 12h)' :
            reserva.turno === 'tarde' ? 'Tarde (14h às 17h)' :
                'Noite (18h às 22h)';
        const ocupacaoFormatada = formatarOcupacao(reserva.ocupacao);

        card.innerHTML = `
            <div class="reserva-card-header">
                <div class="turno-icon ${reserva.turno}">
                    ${reserva.turno === 'manha' ? 'M' : reserva.turno === 'tarde' ? 'T' : 'N'}
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
                    <span class="status-badge status-${reserva.status}">${reserva.status === 'aprovado' ? 'Aprovado' : 'Pendente'}</span>
                </div>
                
                ${reserva.justificativaNoite ? `
                <div class="detalhe-item full-width">
                    <strong>Justificativa do turno da noite:</strong>
                    <div class="justificativa-texto">
                        ${reserva.justificativaNoite}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    // 🔧 FUNÇÃO PARA ADICIONAR INFORMAÇÕES DE FERIADO NO MODAL
    function adicionarInfoFeriadoNoModal(dataStr, reservasContainer) {
        const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);

        if (feriadoInfo.isFeriado) {
            const feriadoDiv = document.createElement('div');
            feriadoDiv.className = `aviso-feriado ${feriadoInfo.tipo}`;

            let icon = '🎉';
            if (feriadoInfo.tipo.includes('ponto_facultativo')) {
                icon = '📅';
            }
            if (feriadoInfo.tipo.includes('feriado_estadual')) {
                icon = '🏛️';
            }

            feriadoDiv.innerHTML = `
                <div class="info-feriado">
                    <div class="feriado-icon-large">${icon}</div>
                    <div class="feriado-content">
                        <strong>${feriadoInfo.descricao}</strong>
                        <p>
                            ${feriadoInfo.tipo.includes('feriado') ? 'Laboratório fechado' : 'Ponto facultativo'} - 
                            ${feriadoInfo.permiteManha && feriadoInfo.permiteTarde && feriadoInfo.permiteNoite ? 'Funcionamento normal' :
                    feriadoInfo.permiteManha && !feriadoInfo.permiteTarde && !feriadoInfo.permiteNoite ? 'Funciona apenas pela manhã' :
                        'Não funciona neste turno'}
                        </p>
                    </div>
                </div>
            `;

            // Adicionar no início do container
            reservasContainer.insertBefore(feriadoDiv, reservasContainer.firstChild);

            // Desabilitar botão de nova reserva
            const btnNovaReserva = document.getElementById('btnNovaReservaMesmaData');
            if (btnNovaReserva) {
                btnNovaReserva.disabled = true;
                btnNovaReserva.style.opacity = '0.5';
                btnNovaReserva.style.cursor = 'not-allowed';
                btnNovaReserva.title = 'Não é possível fazer reservas em feriados/pontos facultativos';
            }
        }
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

        // 🔧 ADICIONAR INFORMAÇÕES DE FERIADO/PONTO FACULTATIVO
        adicionarInfoFeriadoNoModal(dataStr, reservasContainer);

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
            const reservaNoite = reservas.find(r => r.turno === 'noite');

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

            // 🔧 Se houver reserva pela noite
            if (reservaNoite) {
                // Separador
                const separadorNoite = document.createElement('div');
                separadorNoite.className = 'turno-separator';
                separadorNoite.innerHTML = '<h3>🌙 TURNO DA NOITE</h3>';
                reservasContainer.appendChild(separadorNoite);

                // Card da reserva da noite
                const cardNoite = criarCardReserva(reservaNoite);
                reservasContainer.appendChild(cardNoite);
            }

            // Aviso se todos os turnos estão ocupados
            const turnosOcupados = [];
            if (reservaManha) turnosOcupados.push('manhã');
            if (reservaTarde) turnosOcupados.push('tarde');
            if (reservaNoite) turnosOcupados.push('noite');

            if (turnosOcupados.length >= 2) {
                const avisoDiv = document.createElement('div');
                avisoDiv.className = 'aviso-reserva-dupla';
                avisoDiv.innerHTML = `
                    <div class="info-aviso">
                        <strong>⚠️ ${turnosOcupados.length} turnos estão reservados para este dia (${turnosOcupados.join(', ')}).</strong>
                        <p>Para fazer uma nova reserva, escolha outro turno, outra data ou entre em contato com os responsáveis.</p>
                    </div>
                `;
                reservasContainer.appendChild(avisoDiv);
            }
        }

        // Mostrar modal
        modalVisualizacao.style.display = 'flex';

        // Configurar botões de fechar
        if (btnFecharVisualizacao) {
            btnFecharVisualizacao.onclick = function () {
                modalVisualizacao.style.display = 'none';
                // Reabilitar botão de nova reserva
                const btnNovaReserva = document.getElementById('btnNovaReservaMesmaData');
                if (btnNovaReserva) {
                    btnNovaReserva.disabled = false;
                    btnNovaReserva.style.opacity = '1';
                    btnNovaReserva.style.cursor = 'pointer';
                    btnNovaReserva.title = '';
                }
            };
        }

        if (btnFecharModalVisualizacao) {
            btnFecharModalVisualizacao.onclick = function () {
                modalVisualizacao.style.display = 'none';
                // Reabilitar botão de nova reserva
                const btnNovaReserva = document.getElementById('btnNovaReservaMesmaData');
                if (btnNovaReserva) {
                    btnNovaReserva.disabled = false;
                    btnNovaReserva.style.opacity = '1';
                    btnNovaReserva.style.cursor = 'pointer';
                    btnNovaReserva.title = '';
                }
            };
        }

        if (closeModalBtn) {
            closeModalBtn.onclick = function () {
                modalVisualizacao.style.display = 'none';
                // Reabilitar botão de nova reserva
                const btnNovaReserva = document.getElementById('btnNovaReservaMesmaData');
                if (btnNovaReserva) {
                    btnNovaReserva.disabled = false;
                    btnNovaReserva.style.opacity = '1';
                    btnNovaReserva.style.cursor = 'pointer';
                    btnNovaReserva.title = '';
                }
            };
        }

        // Configurar botão para nova reserva
        if (btnNovaReservaMesmaData) {
            btnNovaReservaMesmaData.onclick = function () {
                // 🔧 VERIFICAR SE É FERIADO
                const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
                if (feriadoInfo.isFeriado) {
                    alert(`❌ ${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`);
                    return;
                }

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
                                tarde: null,
                                noite: null // 🔧 ADICIONAR TURNO DA NOITE
                            };
                        }

                        // Armazenar reserva pelo turno
                        if (reserva.turno === 'manha') {
                            reservasPorDia[dia].manha = reserva;
                        } else if (reserva.turno === 'tarde') {
                            reservasPorDia[dia].tarde = reserva;
                        } else if (reserva.turno === 'noite') { // 🔧 ADICIONAR TURNO DA NOITE
                            reservasPorDia[dia].noite = reserva;
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

            // 🔧 PULAR SE FOR FERIADO
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
            if (feriadoInfo.isFeriado) {
                return; // Não marca como ocupado se for feriado
            }

            // Remover classes antigas
            diaDiv.classList.remove('ocupado', 'ocupado-manha', 'ocupado-tarde', 'ocupado-noite', 'ocupado-ambos', 'ocupado-manha-noite', 'ocupado-tarde-noite', 'ocupado-ambos-noite', 'tem-reserva');

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

                // 🔧 Adicionar informações da noite
                if (reservasDoDia.noite) {
                    const reserva = reservasDoDia.noite;
                    const turnoDiv = document.createElement('div');
                    turnoDiv.className = 'turno-info noite';
                    turnoDiv.innerHTML = `
                        <div class="turno-titulo">🌙 Noite:</div>
                        <div class="responsavel">${reserva.responsavel}</div>
                    `;
                    infoContainer.appendChild(turnoDiv);
                    diaDiv.classList.add('ocupado-noite');
                }

                // Se ambos os turnos diurnos estão ocupados
                if (reservasDoDia.manha && reservasDoDia.tarde && !reservasDoDia.noite) {
                    diaDiv.classList.add('ocupado-ambos');
                    diaDiv.classList.add('ocupado');
                }
                // Se manhã e noite estão ocupados
                else if (reservasDoDia.manha && reservasDoDia.noite && !reservasDoDia.tarde) {
                    diaDiv.classList.add('ocupado-manha-noite');
                    diaDiv.classList.add('ocupado');
                }
                // Se tarde e noite estão ocupados
                else if (reservasDoDia.tarde && reservasDoDia.noite && !reservasDoDia.manha) {
                    diaDiv.classList.add('ocupado-tarde-noite');
                    diaDiv.classList.add('ocupado');
                }
                // Se todos os turnos estão ocupados
                else if (reservasDoDia.manha && reservasDoDia.tarde && reservasDoDia.noite) {
                    diaDiv.classList.add('ocupado-ambos-noite');
                    diaDiv.classList.add('ocupado');
                }
                // Se apenas um turno está ocupado
                else if (reservasDoDia.manha || reservasDoDia.tarde || reservasDoDia.noite) {
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

                if (reservasDoDia.noite) {
                    tooltipText += `\n🌙 Noite: ${reservasDoDia.noite.responsavel}`;
                    if (reservasDoDia.noite.finalidade) {
                        tooltipText += `\n   ${reservasDoDia.noite.finalidade.substring(0, 50)}...`;
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

        // Marcar feriados no calendário
        marcarFeriadosNoCalendario();
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

        // 🔧 VALIDAR JUSTIFICATIVA SE TURNO DA NOITE FOR SELECIONADO
        if (turnosSelecionados.includes('noite')) {
            const justificativa = obterJustificativaNoite();
            if (!justificativa || justificativa.length < 10) {
                return {
                    valido: false,
                    erro: 'Para reservas no turno da noite, é necessário fornecer uma justificativa detalhada (mínimo 10 caracteres).'
                };
            }
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

            // 🔧 VERIFICAR SE É FERIADO
            const feriadoInfo = verificarFeriadoOuPontoFacultativo(dataStr);
            if (feriadoInfo.isFeriado) {
                return {
                    valido: false,
                    erro: `${feriadoInfo.descricao}\n\nNão é possível fazer reservas nesta data.`
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
                        const turnoStr = formatarTurnoParaExibicao(reserva.turno).toLowerCase();

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

    // 🔧 SALVAR RESERVA COM APROVAÇÃO AUTOMÁTICA (EXCETO TURNO DA NOITE)
    formReserva.onsubmit = async function (e) {
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

        // 🔧 VALIDAR JUSTIFICATIVA SE TURNO DA NOITE FOR SELECIONADO
        if (turnosSelecionados.includes('noite')) {
            const justificativa = obterJustificativaNoite();
            if (!justificativa || justificativa.length < 10) {
                alert('❌ Para reservas no turno da noite, é necessário fornecer uma justificativa detalhada (mínimo 10 caracteres).');
                return;
            }
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
        submitBtn.textContent = turnosSelecionados.includes('noite') ? 'Enviando para análise...' : 'Criando reserva(s)...';
        submitBtn.disabled = true;

        try {
            if (!db) {
                throw new Error('Banco de dados não disponível');
            }

            // 🔧 DETERMINAR STATUS BASEADO NOS TURNOS
            const temTurnoNoite = turnosSelecionados.includes('noite');

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
                    // 🔧 STATUS DIFERENCIADO: pendente para noite, aprovado para outros
                    status: turno === 'noite' ? 'pendente' : 'aprovado',
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    visualizado: false,
                    // 🔧 APROVAÇÃO DIFERENCIADA
                    aprovadoEm: turno === 'noite' ? null : firebase.firestore.FieldValue.serverTimestamp(),
                    aprovadoPor: turno === 'noite' ? null : 'sistema',
                    // 🔧 ADICIONAR JUSTIFICATIVA SE FOR TURNO DA NOITE
                    justificativaNoite: turno === 'noite' ? obterJustificativaNoite() : null,
                    // 🔧 ADICIONAR FLAG DE TURNO ESPECIAL
                    turnoEspecial: turno === 'noite',
                    // Adicionar flag para indicar que faz parte de uma reserva múltipla
                    reservaMultipla: turnosSelecionados.length > 1,
                    turnosAssociados: turnosSelecionados.length > 1 ? turnosSelecionados : null
                };

                console.log(`Salvando reserva para turno ${turno}:`, formData);
                const docRef = await db.collection('reservas').add(formData);

                // 🔔 NOTIFICAÇÃO TELEGRAM (COM FALLBACK)
                try {
                    console.log(`🔔 Enviando notificação para turno ${turno}...`);
                    const notificacaoEnviada = await enviarNotificacao(formData);
                    if (notificacaoEnviada) {
                        console.log(`✅ Notificação Telegram enviada para turno ${turno}`);
                    } else {
                        console.warn(`⚠️ Notificação Telegram não enviada para turno ${turno}`);
                    }
                } catch (notificacaoError) {
                    console.error(`❌ Erro ao enviar notificação para turno ${turno}:`, notificacaoError);
                    // Não interromper o fluxo principal por erro na notificação
                }

                return docRef;
            });

            // Aguardar todas as reservas serem salvas
            const resultados = await Promise.all(promises);

            // 🔧 MENSAGEM DIFERENCIADA BASEADA NOS TURNOS
            if (temTurnoNoite) {
                // Separar turnos diurnos e noturnos
                const turnosDiurnos = turnosSelecionados.filter(t => t !== 'noite');
                const temTurnosDiurnos = turnosDiurnos.length > 0;

                let mensagem = `📋 Reserva(s) criada(s) com sucesso!\n\n`;

                if (temTurnosDiurnos) {
                    const turnosDiurnosTexto = turnosDiurnos.map(t =>
                        t === 'manha' ? 'Manhã' : 'Tarde'
                    ).join(' e ');
                    mensagem += `✅ Turnos diurnos (${turnosDiurnosTexto}): Aprovados automaticamente\n`;
                }

                mensagem += `⏳ Turno da noite: Enviado para análise\n\n`;
                mensagem += `A equipe do LEP entrará em contato para confirmar a disponibilidade do turno da noite.`;

                alert(mensagem);
            } else {
                // Mensagem original para apenas turnos diurnos
                if (turnosSelecionados.length === 1) {
                    alert(`✅ Reserva criada e APROVADA automaticamente!\n\nID: ${resultados[0].id}\nStatus: Aprovado\nTurno: ${turnosSelecionados[0] === 'manha' ? 'Manhã' : 'Tarde'}\n\nA reserva já está ativa no sistema.`);
                } else {
                    const ids = resultados.map(r => r.id).join(', ');
                    alert(`✅ ${turnosSelecionados.length} reservas criadas e APROVADAS automaticamente!\n\nIDs: ${ids}\nTurnos: ${turnosSelecionados.map(t => t === 'manha' ? 'Manhã' : 'Tarde').join(' e ')}\n\nAs reservas já estão ativas no sistema.`);
                }
            }

            // Resetar
            modal.style.display = 'none';
            formReserva.reset();
            diasSelecionados = [];
            atualizarDiasSelecionados();
            atualizarMiniCalendario();

            // 🔧 RESETAR CAMPOS ESPECÍFICOS DO TURNO DA NOITE
            document.getElementById('justificativaNoite').value = '';
            document.getElementById('justificativaNoiteContainer').style.display = 'none';
            document.getElementById('mensagemAnaliseNoite').style.display = 'none';
            document.getElementById('noiteContainer').style.display = 'none';

            // Atualizar lista de reservas IMEDIATAMENTE
            if (viewAtual === 'monthly') {
                setTimeout(carregarReservas, 500);
            }

            mostrarFeedback(temTurnoNoite ? 'Reserva(s) enviada(s) para análise!' : 'Reserva(s) aprovada(s) com sucesso!',
                temTurnoNoite ? 'aviso' : 'sucesso');

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

        // Estilo baseado no tipo
        if (tipo === 'sucesso') {
            feedback.style.backgroundColor = '#d4edda';
            feedback.style.color = '#155724';
            feedback.style.border = '1px solid #c3e6cb';
        } else if (tipo === 'aviso') {
            feedback.style.backgroundColor = '#fff3cd';
            feedback.style.color = '#856404';
            feedback.style.border = '1px solid #ffeaa7';
        } else if (tipo === 'erro') {
            feedback.style.backgroundColor = '#f8d7da';
            feedback.style.color = '#721c24';
            feedback.style.border = '1px solid #f5c6cb';
        }

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
    `;
    document.head.appendChild(estiloAnimacoes);

    // Monitorar mudanças nos turnos (checkboxes)
    document.querySelectorAll('.turno-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
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
            responsavel: r.responsavel,
            status: r.status
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
        console.log('atualizarCalendario chamado. Mês:', dataAtual.getMonth() + 1);

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

// 🔥 EASTER EGG: TRIPLE CLICK EM "MARCELL"
document.addEventListener('DOMContentLoaded', function () {
    // Encontrar todas as células com o nome "Marcell"
    const celulasMarcell = document.querySelectorAll('.dia-col[data-turno="tarde"]');

    function obterMesAtualFormatado() {
        const agora = new Date();
        return agora.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
    }
    if (tituloCalendario) {
        tituloCalendario.textContent = obterMesAtualFormatado();
    }

    // Contador de cliques e timestamp do último clique
    let clickCount = 0;
    let lastClickTime = 0;
    const clickTimeout = 1000; // 1 segundo para resetar contador

    celulasMarcell.forEach(celula => {
        // Verificar se realmente contém "Marcell"
        if (celula.textContent.trim() === 'Marcell' || celula.textContent.includes('Marcell')) {
            celula.style.cursor = 'pointer';
            celula.title = 'Clique 3 vezes para um segredo...';

            // Adicionar efeito visual sutil
            const originalBackground = celula.style.backgroundColor;

            celula.addEventListener('mouseenter', function () {
                this.style.transition = 'background-color 0.3s';
                this.style.backgroundColor = 'rgba(0, 74, 173, 0.1)';
            });

            celula.addEventListener('mouseleave', function () {
                this.style.backgroundColor = originalBackground;
            });

            // Detectar triple click
            celula.addEventListener('click', function (e) {
                const currentTime = new Date().getTime();

                // Resetar contador se passou muito tempo
                if (currentTime - lastClickTime > clickTimeout) {
                    clickCount = 0;
                }

                clickCount++;
                lastClickTime = currentTime;

                // Efeito visual para cada clique
                this.style.transform = 'scale(0.95)';
                this.style.transition = 'transform 0.1s';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 100);

                // Efeito de brilho
                this.style.boxShadow = '0 0 10px rgba(0, 74, 173, 0.5)';
                setTimeout(() => {
                    this.style.boxShadow = '';
                }, 300);

                // Adicionar contador visual temporário
                const counter = document.createElement('div');
                counter.textContent = `${clickCount}/3`;
                counter.style.position = 'absolute';
                counter.style.top = '5px';
                counter.style.right = '5px';
                counter.style.background = '#004aad';
                counter.style.color = 'white';
                counter.style.borderRadius = '50%';
                counter.style.width = '20px';
                counter.style.height = '20px';
                counter.style.fontSize = '10px';
                counter.style.display = 'flex';
                counter.style.alignItems = 'center';
                counter.style.justifyContent = 'center';
                counter.style.fontWeight = 'bold';
                this.style.position = 'relative';
                this.appendChild(counter);

                setTimeout(() => {
                    if (counter.parentNode === this) {
                        this.removeChild(counter);
                    }
                }, 500);

                // Se clicou 3 vezes
                if (clickCount === 3) {
                    // Efeito especial
                    this.style.animation = 'pulse 0.5s 3';

                    // Criar efeito de confetti local
                    criarMiniConfetti(e.clientX, e.clientY);

                    // Som de sucesso (opcional)
                    fazerSomEasterEgg();

                    // Mensagem
                    setTimeout(() => {
                        window.open('dedicatoria.html', '_blank');

                        // Resetar contador
                        clickCount = 0;
                        lastClickTime = 0;

                        // Remover efeito
                        this.style.animation = '';
                    }, 800);
                }

                e.stopPropagation();
            });
        }
    });

    // Função para criar confetti local
    function criarMiniConfetti(x, y) {
        const colors = ['#004aad', '#ffa500', '#25D366', '#ffc107', '#8B008B'];
        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '8px';
            confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.left = (x - 4) + 'px';
            confetti.style.top = (y - 4) + 'px';
            confetti.style.zIndex = '10000';
            confetti.style.pointerEvents = 'none';
            document.body.appendChild(confetti);

            // Animação
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            let posX = x;
            let posY = y;

            function animar() {
                posX += vx;
                posY += vy;
                vy += 0.1; // gravidade

                confetti.style.left = posX + 'px';
                confetti.style.top = posY + 'px';

                if (posY < window.innerHeight) {
                    requestAnimationFrame(animar);
                } else {
                    confetti.remove();
                }
            }

            requestAnimationFrame(animar);

            // Remover após 2 segundos
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            }, 2000);
        }
    }

    // Função para som do easter egg
    function fazerSomEasterEgg() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Melodia simples
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Navegador não suporta AudioContext
            console.log('Som do Easter Egg não disponível');
        }
    }

    // Adicionar animação de pulso ao CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
});