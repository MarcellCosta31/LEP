document.addEventListener('DOMContentLoaded', function() {
    // Elementos principais
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
    
    // Elementos do mini calendário no modal
    const miniCalendarioGrid = document.querySelector('.calendario-mini-grid');
    const miniMesSpan = document.querySelector('.mini-mes');
    const miniPrevBtn = document.querySelector('.mini-prev');
    const miniNextBtn = document.querySelector('.mini-next');
    const diasSelecionadosDiv = document.getElementById('diasSelecionados');
    
    // Configuração da API (ajuste a URL conforme necessário)
    const API_URL = 'http://localhost:3000'; // Mude para seu deploy
    
    // Estado do calendário principal
    let dataAtual = new Date(2026, 0, 1);
    let viewAtual = 'weekly';
    
    // Estado do mini calendário no modal
    let miniDataAtual = new Date();
    let diasSelecionados = [];
    
    // Formatar data para exibição
    function formatarData(data) {
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // Formatar telefone enquanto digita
    const whatsappInput = document.getElementById('whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            
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
    
    // Funções de Modal
    btnAbrir.onclick = () => {
        modal.style.display = 'flex';
        // Resetar mini calendário para mês atual
        miniDataAtual = new Date();
        atualizarMiniCalendario();
        ajustarAlturaModal();
    };
    
    btnFechar.onclick = () => {
        modal.style.display = 'none';
        formReserva.reset();
        diasSelecionados = [];
        atualizarDiasSelecionados();
    };
    
    // Fechar modal ao clicar fora
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            formReserva.reset();
            diasSelecionados = [];
            atualizarDiasSelecionados();
        }
    };
    
    // MINI CALENDÁRIO NO MODAL
    function atualizarMiniCalendario() {
        miniCalendarioGrid.innerHTML = '';
        
        // Cabeçalho dos dias da semana
        const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        diasSemana.forEach(dia => {
            const div = document.createElement('div');
            div.className = 'dia-mini inativo';
            div.textContent = dia;
            miniCalendarioGrid.appendChild(div);
        });
        
        // Configurações do mês
        const ano = miniDataAtual.getFullYear();
        const mes = miniDataAtual.getMonth();
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaInicio = primeiroDia.getDay();
        
        // Atualizar título do mini calendário
        miniMesSpan.textContent = miniDataAtual.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
        
        // Espaços vazios antes do primeiro dia
        for (let i = 0; i < diaInicio; i++) {
            const div = document.createElement('div');
            div.className = 'dia-mini inativo';
            miniCalendarioGrid.appendChild(div);
        }
        
        // Dias do mês
        const hoje = new Date();
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const div = document.createElement('div');
            div.className = 'dia-mini';
            div.textContent = dia;
            div.dataset.dia = dia;
            div.dataset.mes = mes + 1;
            div.dataset.ano = ano;
            
            // Verificar se é hoje
            const dataDia = new Date(ano, mes, dia);
            if (dataDia.toDateString() === hoje.toDateString()) {
                div.style.fontWeight = 'bold';
            }
            
            // Verificar se está selecionado
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            if (diasSelecionados.includes(dataStr)) {
                div.classList.add('selecionado');
            }
            
            // Clique para selecionar/deselecionar
            div.onclick = function() {
                const diaNum = parseInt(this.dataset.dia);
                const mesNum = parseInt(this.dataset.mes);
                const anoNum = parseInt(this.dataset.ano);
                const dataStr = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                
                const index = diasSelecionados.indexOf(dataStr);
                if (index === -1) {
                    // Adicionar
                    diasSelecionados.push(dataStr);
                    this.classList.add('selecionado');
                } else {
                    // Remover
                    diasSelecionados.splice(index, 1);
                    this.classList.remove('selecionado');
                }
                
                atualizarDiasSelecionados();
            };
            
            miniCalendarioGrid.appendChild(div);
        }
    }
    
    function atualizarDiasSelecionados() {
        if (diasSelecionados.length === 0) {
            diasSelecionadosDiv.innerHTML = 'Nenhum dia selecionado';
            return;
        }
        
        diasSelecionadosDiv.innerHTML = '';
        diasSelecionados.sort().forEach(dataStr => {
            const data = new Date(dataStr);
            const diaTag = document.createElement('span');
            diaTag.className = 'dia-tag';
            diaTag.textContent = formatarData(data);
            diasSelecionadosDiv.appendChild(diaTag);
        });
    }
    
    // Navegação do mini calendário
    miniPrevBtn.onclick = function() {
        miniDataAtual.setMonth(miniDataAtual.getMonth() - 1);
        atualizarMiniCalendario();
    };
    
    miniNextBtn.onclick = function() {
        miniDataAtual.setMonth(miniDataAtual.getMonth() + 1);
        atualizarMiniCalendario();
    };
    
    // Inicializar mini calendário
    atualizarMiniCalendario();
    
    // Navegação do calendário principal
    function atualizarTitulo() {
        const opcoes = { month: 'long', year: 'numeric' };
        tituloCalendario.textContent = dataAtual.toLocaleDateString('pt-BR', opcoes);
    }
    
    prevBtn.onclick = function() {
        if (viewAtual === 'monthly') {
            dataAtual.setMonth(dataAtual.getMonth() - 1);
        } else {
            dataAtual.setDate(dataAtual.getDate() - 7);
        }
        atualizarCalendario();
    };
    
    nextBtn.onclick = function() {
        if (viewAtual === 'monthly') {
            dataAtual.setMonth(dataAtual.getMonth() + 1);
        } else {
            dataAtual.setDate(dataAtual.getDate() + 7);
        }
        atualizarCalendario();
    };
    
    // Alternar entre visualizações
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
            }
            
            atualizarTitulo();
        };
    });
    
    // Gerar calendário mensal
    function gerarCalendarioMensal() {
        calendarioGrid.innerHTML = '';
        
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        diasSemana.forEach(dia => {
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
        
        for (let i = 0; i < diaInicio; i++) {
            const div = document.createElement('div');
            div.className = 'dia vazio';
            calendarioGrid.appendChild(div);
        }
        
        const hoje = new Date();
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const div = document.createElement('div');
            div.className = 'dia';
            
            const dataDia = new Date(ano, mes, dia);
            if (dataDia.toDateString() === hoje.toDateString()) {
                div.classList.add('hoje');
            }
            
            div.innerHTML = `
                <div class="dia-numero">${dia}</div>
                <div class="dia-info">Disponível</div>
            `;
            
            // Clique para abrir modal de reserva
            div.onclick = function() {
                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                
                // Adicionar ao mini calendário se não estiver já selecionado
                if (!diasSelecionados.includes(dataStr)) {
                    diasSelecionados.push(dataStr);
                    atualizarDiasSelecionados();
                    
                    // Atualizar mini calendário se estiver no mesmo mês
                    if (mes === miniDataAtual.getMonth() && ano === miniDataAtual.getFullYear()) {
                        atualizarMiniCalendario();
                    }
                }
                
                modal.style.display = 'flex';
                ajustarAlturaModal();
            };
            
            calendarioGrid.appendChild(div);
        }
    }
    
    // Atualizar calendário completo
    function atualizarCalendario() {
        atualizarTitulo();
        
        if (viewAtual === 'monthly') {
            gerarCalendarioMensal();
        }
    }
    
    // Clique nas células da tabela semanal
    document.querySelectorAll('.dia-col').forEach(cell => {
        cell.onclick = function() {
            const dia = this.getAttribute('data-dia');
            const turno = this.getAttribute('data-turno');
            const bolsista = this.textContent;
            
            // Preencher o turno automaticamente
            const radioTurno = document.querySelector(`input[name="turno"][value="${turno}"]`);
            if (radioTurno) {
                radioTurno.checked = true;
            }
            
            modal.style.display = 'flex';
            ajustarAlturaModal();
        };
    });
    
    // Formulário de reserva - AGORA ENVIA PARA O NOTION
    formReserva.onsubmit = async function(e) {
        e.preventDefault();
        
        // Validar se aceitou as regras
        const regrasAceitas = document.querySelector('input[name="regras"]:checked');
        if (!regrasAceitas || regrasAceitas.value !== 'sim') {
            alert('Você deve aceitar as regras do laboratório para fazer uma reserva.');
            return;
        }
        
        // Validar se selecionou pelo menos um dia
        if (diasSelecionados.length === 0) {
            alert('Por favor, selecione pelo menos um dia para a reserva.');
            return;
        }
        
        // Coletar dados do formulário
        const formData = {
            email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            responsavel: document.getElementById('responsavel').value,
            finalidade: document.getElementById('finalidade').value,
            ocupacao: document.getElementById('ocupacao').value,
            dias: diasSelecionados,
            turno: document.querySelector('input[name="turno"]:checked').value
        };
        
        // Mostrar estado de carregamento
        const submitBtn = formReserva.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        try {
            // Enviar para a API backend
            const response = await fetch(`${API_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Reserva criada com sucesso!\n\nID da reserva: ${result.id}\nEm breve entraremos em contato.`);
                
                // Resetar formulário
                modal.style.display = 'none';
                formReserva.reset();
                diasSelecionados = [];
                atualizarDiasSelecionados();
                atualizarMiniCalendario();
                
                // Recarregar reservas para atualizar calendário
                await carregarReservasDoNotion();
            } else {
                throw new Error(result.error || 'Erro ao criar reserva');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert(`❌ Erro ao criar reserva: ${error.message}\nTente novamente ou entre em contato com o laboratório.`);
        } finally {
            // Restaurar botão
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    };
    
    // Função para carregar reservas do Notion
    async function carregarReservasDoNotion() {
        try {
            const response = await fetch(`${API_URL}/api/reservas`);
            const result = await response.json();
            
            if (result.success) {
                console.log('Reservas carregadas:', result.data);
                // Aqui você pode usar os dados para marcar dias ocupados no calendário
                marcarDiasOcupados(result.data);
            }
        } catch (error) {
            console.error('Erro ao carregar reservas:', error);
        }
    }
    
    // Função para marcar dias ocupados no calendário
    function marcarDiasOcupados(reservas) {
        // Limpar marcações anteriores
        document.querySelectorAll('.calendario-grid .dia').forEach(dia => {
            dia.classList.remove('ocupado');
            const info = dia.querySelector('.dia-info');
            if (info && info.textContent === 'Ocupado') {
                info.textContent = 'Disponível';
            }
        });
        
        // Marcar dias ocupados
        reservas.forEach(reserva => {
            reserva.dias.forEach(dataStr => {
                const data = new Date(dataStr);
                const diaNum = data.getDate();
                const mes = data.getMonth();
                const ano = data.getFullYear();
                
                // Verificar se estamos no mês/ano correto
                if (dataAtual.getMonth() === mes && dataAtual.getFullYear() === ano) {
                    // Encontrar o elemento do dia correto
                    const todosDias = document.querySelectorAll('.calendario-grid .dia');
                    const diasVazios = document.querySelectorAll('.calendario-grid .dia.vazio').length;
                    
                    // O índice do dia no grid (considerando dias vazios)
                    const indice = diasVazios + diaNum - 1;
                    
                    if (todosDias[indice]) {
                        todosDias[indice].classList.add('ocupado');
                        const info = todosDias[indice].querySelector('.dia-info');
                        if (info) {
                            info.textContent = 'Ocupado';
                            info.style.color = '#e74c3c';
                            info.style.fontWeight = 'bold';
                        }
                    }
                }
            });
        });
    }
    
    // Ajustar altura máxima do modal com base no conteúdo
    function ajustarAlturaModal() {
        const modalContent = document.querySelector('.modal-content');
        const windowHeight = window.innerHeight;
        
        // Definir altura máxima como 85% da janela
        modalContent.style.maxHeight = (windowHeight * 0.85) + 'px';
    }
    
    // Ajustar quando a janela for redimensionada
    window.addEventListener('resize', ajustarAlturaModal);
    
    // Inicializar
    atualizarCalendario();
    
    // Carregar reservas ao iniciar (se na view mensal)
    if (viewAtual === 'monthly') {
        carregarReservasDoNotion();
    }
});