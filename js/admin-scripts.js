// admin-scripts.js - Lógica principal do painel administrativo (VERSÃO COMPLETA COM EXPORTAÇÃO AVANÇADA)

// Variáveis globais para a aba de Reservas
let currentPage = 1;
const itemsPerPage = 20;
let currentReservas = [];
let selectedReservas = new Set();

document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.admin-container')) return;

    // Inicializar componentes
    setupNavigation();
    setupDashboard();
    setupReservas();
    setupRelatorios();
    setupUsuarios();
    setupConfiguracoes();
    setupModals();

    // Carregar dados iniciais
    loadInitialData();
});

// Função de debug para verificar se o Firebase está funcionando
async function debugFirebase() {
    console.log('=== DEBUG FIREBASE ===');
    console.log('adminFirebase disponível?', typeof window.adminFirebase !== 'undefined');
    console.log('Firestore disponível?', adminFirebase.db ? 'Sim' : 'Não');
    console.log('Auth disponível?', adminFirebase.auth ? 'Sim' : 'Não');
    
    try {
        // Testar uma consulta simples
        const snapshot = await adminFirebase.db.collection('reservas').limit(1).get();
        console.log(`Total de reservas no Firestore: ${snapshot.size}`);
        
        if (snapshot.size > 0) {
            snapshot.forEach(doc => {
                console.log('Exemplo de reserva:', doc.id, doc.data());
            });
        }
    } catch (error) {
        console.error('Erro no teste do Firestore:', error);
    }
    
    console.log('=== FIM DEBUG ===');
}

// Chamar após 2 segundos do carregamento
setTimeout(debugFirebase, 2000);

// Navegação entre views
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentViews = document.querySelectorAll('.content-view');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            const viewName = this.getAttribute('data-view');

            // Atualizar navegação ativa
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Mostrar view correspondente
            contentViews.forEach(view => {
                view.classList.remove('active-view');
                if (view.id === `${viewName}View`) {
                    view.classList.add('active-view');
                }
            });
            
            // Atualizar título da página
            if (pageTitle) {
                const titles = {
                    dashboard: 'Dashboard',
                    reservas: 'Gerenciar Reservas',
                    relatorios: 'Relatórios',
                    usuarios: 'Administradores',
                    configuracoes: 'Configurações'
                };
                pageTitle.textContent = titles[viewName];
            }
            
            // Carregar dados específicos da view
            switch (viewName) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'reservas':
                    loadReservasData();
                    break;
                case 'relatorios':
                    setupReportChart();
                    break;
                case 'usuarios':
                    loadUsuariosData();
                    break;
            }
        });
    });
}

// Dashboard
function setupDashboard() {
    // Configurar atualização periódica
    setInterval(loadDashboardData, 30000); // Atualizar a cada 30 segundos
    
    // Inicializar gráfico
    setTimeout(() => {
        const chartElement = document.getElementById('dashboardChart');
        if (chartElement) {
            // O gráfico será criado quando os dados forem carregados
            loadDashboardData();
        }
    }, 1000);
}

async function loadDashboardData() {
    try {
        console.log('🔄 Carregando dados do dashboard...');
        
        // Carregar todas as reservas
        const reservas = await adminFirebase.getAllReservas();
        
        // Carregar reservas recentes (últimos 7 dias)
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);
        
        // Filtrar reservas desta semana
        const reservasEstaSemana = reservas.filter(r => 
            r.criadoEm && r.criadoEm >= seteDiasAtras
        );
        
        // Calcular estatísticas
        const totalReservas = reservas.length;
        const aprovadas = reservas.filter(r => r.status === 'aprovado').length;
        
        console.log(`Estatísticas: Total=${totalReservas}, Aprovadas=${aprovadas}, EstaSemana=${reservasEstaSemana.length}`);
        
        // Carregar contagem de visitas
        carregarVisitas();
        
        // Atualizar interface - TOTAL DE RESERVAS
        const totalElement = document.getElementById('totalReservas');
        if (totalElement) {
            animateCounter(totalElement, totalReservas);
        }
        
        // Atualizar RESERVAS APROVADAS
        const aprovadasElement = document.getElementById('reservasAprovadas');
        if (aprovadasElement) {
            animateCounter(aprovadasElement, aprovadas);
        }
        
        // Atualizar ESTA SEMANA
        const estaSemanaElement = document.getElementById('reservasEstaSemana');
        if (estaSemanaElement) {
            animateCounter(estaSemanaElement, reservasEstaSemana.length);
        }
        
        // Calcular percentual de aprovação
        const percentAprovadas = totalReservas > 0 ? 
            Math.round((aprovadas / totalReservas) * 100) : 0;
        
        const aprovadasPercent = document.getElementById('aprovadasPercent');
        if (aprovadasPercent) {
            aprovadasPercent.textContent = `${percentAprovadas}% do total`;
        }
        
        // Atualizar tendência (comparar com a semana anterior)
        const duasSemanasAtras = new Date();
        duasSemanasAtras.setDate(hoje.getDate() - 14);
        
        const reservasSemanaAnterior = reservas.filter(r => 
            r.criadoEm && 
            r.criadoEm >= duasSemanasAtras && 
            r.criadoEm < seteDiasAtras
        );
        
        const trendElement = document.getElementById('reservasTrend');
        if (trendElement) {
            const semanaAnterior = reservasSemanaAnterior.length;
            const estaSemana = reservasEstaSemana.length;
            
            let trendText = '';
            let trendColor = '#28a745';
            
            if (semanaAnterior > 0) {
                const diff = estaSemana - semanaAnterior;
                const percentDiff = Math.round((diff / semanaAnterior) * 100);
                
                if (diff > 0) {
                    trendText = `↑ ${percentDiff}% em relação à semana anterior`;
                    trendColor = '#28a745';
                } else if (diff < 0) {
                    trendText = `↓ ${Math.abs(percentDiff)}% em relação à semana anterior`;
                    trendColor = '#dc3545';
                } else {
                    trendText = '⇄ Igual à semana anterior';
                    trendColor = '#ffc107';
                }
            } else {
                trendText = estaSemana > 0 ? '↑ Primeiros dados esta semana' : 'Sem dados nas últimas semanas';
            }
            
            trendElement.textContent = trendText;
            trendElement.style.color = trendColor;
        }
        
        // Carregar atividade recente (últimas 10 reservas)
        // Usar reservas gerais, não só desta semana
        const reservasRecentes = [...reservas]
            .sort((a, b) => b.criadoEm - a.criadoEm)
            .slice(0, 10);
        
        loadRecentActivity(reservasRecentes);
        
        // Atualizar gráfico se existir
        updateDashboardChart(reservasEstaSemana);
        
        console.log('✅ Dashboard carregado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'erro');
    }
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        // Animar contagem
        if (typeof value === 'number') {
            animateCounter(element, value);
        } else {
            element.textContent = value;
        }
    }
}

async function carregarVisitas() {
    try {
        if (!adminFirebase || !adminFirebase.db) return;
        var doc = await adminFirebase.db.collection('admins').doc('visitas').get();
        var visitsEl = document.getElementById('totalVisitas');
        if (visitsEl && doc.exists) {
            animateCounter(visitsEl, doc.data().visitas || 0);
        } else if (visitsEl) {
            visitsEl.textContent = '0';
        }
    } catch (e) {
        console.warn('Erro ao carregar visitas:', e);
    }
}

function animateCounter(element, target) {
    // Se já estiver no valor alvo, não fazer nada
    const currentText = element.textContent.trim();
    const current = parseInt(currentText) || 0;
    
    // Se já estiver no valor alvo, não animar
    if (current === target) {
        element.textContent = target;
        return;
    }
    
    // Limpar qualquer animação anterior
    if (element.__counterInterval) {
        clearInterval(element.__counterInterval);
        delete element.__counterInterval;
    }
    
    // Configurar animação
    const increment = target > current ? 1 : -1;
    const difference = Math.abs(target - current);
    const duration = 500; // 0.5 segundos no total
    const speed = Math.max(10, Math.floor(duration / difference)); // Mínimo de 10ms
    
    let currentValue = current;
    
    element.__counterInterval = setInterval(() => {
        currentValue += increment;
        element.textContent = currentValue;
        
        // Verificar se chegou ao alvo
        if (currentValue === target) {
            clearInterval(element.__counterInterval);
            delete element.__counterInterval;
        }
    }, speed);
}

function updateDashboardChart(reservasRecentes) {
    const chartElement = document.getElementById('dashboardChart');
    if (!chartElement) return;
    
    // Agrupar reservas por dia
    const reservasPorDia = {};
    const hoje = new Date();
    
    // Inicializar últimos 7 dias
    for (let i = 6; i >= 0; i--) {
        const dia = new Date();
        dia.setDate(hoje.getDate() - i);
        const diaStr = dia.toLocaleDateString('pt-BR', { weekday: 'short' });
        reservasPorDia[diaStr] = 0;
    }
    
    // Contar reservas por dia
    reservasRecentes.forEach(reserva => {
        if (reserva.criadoEm) {
            const diaStr = reserva.criadoEm.toLocaleDateString('pt-BR', { weekday: 'short' });
            if (reservasPorDia[diaStr] !== undefined) {
                reservasPorDia[diaStr]++;
            }
        }
    });
    
    // Criar ou atualizar gráfico
    if (!window.dashboardChart) {
        const ctx = chartElement.getContext('2d');
        window.dashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(reservasPorDia),
                datasets: [{
                    label: 'Reservas',
                    data: Object.values(reservasPorDia),
                    borderColor: '#004aad',
                    backgroundColor: 'rgba(0, 74, 173, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } else {
        window.dashboardChart.data.labels = Object.keys(reservasPorDia);
        window.dashboardChart.data.datasets[0].data = Object.values(reservasPorDia);
        window.dashboardChart.update();
    }
}

function loadRecentActivity(reservas) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    if (reservas.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">📭</div>
                <div class="activity-content">
                    Nenhuma atividade recente
                    <div class="activity-time">Sem reservas registradas</div>
                </div>
            </div>
        `;
        return;
    }
    
    reservas.forEach(reserva => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        // Formatar data
        const dataFormatada = reserva.criadoEm ? 
            formatarDataParaExibicaoDashboard(reserva.criadoEm) : 
            'Data não disponível';
        
        // Formatar turno
        const turnoFormatado = reserva.turno === 'manha' ? 'Manhã' : 'Tarde';
        
        // Status
        const statusIcon = getStatusIcon(reserva.status);
        const statusClass = getStatusClass(reserva.status);
        
        activityItem.innerHTML = `
            <div class="activity-icon ${statusClass}">${statusIcon}</div>
            <div class="activity-content">
                <div class="activity-header">
                    <strong>${reserva.responsavel || 'Usuário'}</strong>
                    <span class="activity-turno ${reserva.turno}">
                        ${turnoFormatado}
                    </span>
                </div>
                <div class="activity-details">
                    <span class="activity-data">${dataFormatada}</span>
                    <span class="activity-status status-${reserva.status}">
                        ${getStatusText(reserva.status)}
                    </span>
                </div>
                <div class="activity-time">${getTimeAgo(reserva.criadoEm)}</div>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Função auxiliar para formatar data do dashboard
function formatarDataParaExibicaoDashboard(date) {
    if (!date) return '';
    
    // Se for string, converter para Date
    let dataObj;
    if (typeof date === 'string') {
        dataObj = new Date(date);
    } else if (date.toDate) {
        // Se for timestamp do Firestore
        dataObj = date.toDate();
    } else {
        dataObj = date;
    }
    
    return dataObj.toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
    const classes = {
        aprovado: 'status-aprovado',
        pendente: 'status-pendente',
        recusado: 'status-recusado'
    };
    return classes[status] || '';
}

function getTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${ diffMins } min`;
    if (diffHours < 24) return `Há ${ diffHours } h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${ diffDays } dias`;
    
    return date.toLocaleDateString('pt-BR');
}

function getStatusIcon(status) {
    const icons = {
        aprovado: '✓',
        pendente: '⏳',
        recusado: '✗'
    };
    return icons[status] || '📝';
}

function getStatusText(status) {
    const statusMap = {
        aprovado: 'Aprovado',
        pendente: 'Pendente',
        recusado: 'Recusado'
    };
    return statusMap[status] || status;
}

// Gerenciamento de Reservas
async function setupReservas() {
    // Carregar bibliotecas de exportação
    await loadSheetJS().catch(() => {
        console.warn('SheetJS não pôde ser carregado. Usando CSV como fallback.');
    });
    
    const filterStatus = document.getElementById('filterStatus');
    const filterDate = document.getElementById('filterDate');
    const applyFilterBtn = document.getElementById('btnApplyFilter');
    const clearFilterBtn = document.getElementById('btnClearFilter');
    const selectAllCheckbox = document.getElementById('selectAll');
    const bulkActionSelect = document.getElementById('bulkAction');
    const applyBulkBtn = document.getElementById('btnApplyBulk');
    const exportBtn = document.getElementById('btnExportReservas');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    // Aplicar filtros
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            currentPage = 1;
            loadReservasData();
        });
    }
    
    // Limpar filtros
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            if (filterStatus) filterStatus.value = 'all';
            if (filterDate) filterDate.value = '';
            currentPage = 1;
            loadReservasData();
        });
    }
    
    // Selecionar todos
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.reserva-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const reservaId = cb.getAttribute('data-id');
                if (this.checked) {
                    selectedReservas.add(reservaId);
                } else {
                    selectedReservas.delete(reservaId);
                }
            });
            updateSelectedCount();
            updateBulkActionButton();
        });
    }
    
    // Ações em massa
    if (bulkActionSelect) {
        bulkActionSelect.addEventListener('change', function() {
            updateBulkActionButton();
        });
    }
    
    if (applyBulkBtn) {
        applyBulkBtn.addEventListener('click', async function() {
            const action = bulkActionSelect.value;
            const reservaIds = Array.from(selectedReservas);
            
            if (!action || reservaIds.length === 0) return;
            
            if (confirm(`Deseja realmente ${ getBulkActionText(action) } ${ reservaIds.length } reserva(s)?`)) {
                try {
                    switch (action) {
                        case 'approve':
                            await approveMultipleReservas(reservaIds);
                            break;
                        case 'reject':
                            await rejectMultipleReservas(reservaIds);
                            break;
                        case 'delete':
                            await deleteMultipleReservas(reservaIds);
                            break;
                    }
                    
                    showNotification(`${ reservaIds.length } reserva(s) ${ getBulkActionDoneText(action) }`, 'sucesso');
                    loadReservasData();
                    
                    // Resetar seleção
                    selectedReservas.clear();
                    updateSelectedCount();
                    updateBulkActionButton();
                    
                } catch (error) {
                    console.error('Erro na ação em massa:', error);
                    showNotification('Erro ao processar ação', 'erro');
                }
            }
        });
    }
    
    // Exportar em múltiplos formatos
    const exportOptions = document.querySelectorAll('.export-option');
    
    exportOptions.forEach(option => {
        option.addEventListener('click', async function(e) {
            e.preventDefault();
            const format = this.getAttribute('data-format');
            await exportReservas(format);
        });
    });
    
    // Manter compatibilidade com clique no botão principal
    if (exportBtn) {
        exportBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            // Por padrão exporta como Excel
            await exportReservas('xlsx');
        });
    }
    
    // Paginação
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderReservasTable();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentReservas.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderReservasTable();
            }
        });
    }
    
    // Carregar reservas ao inicializar
    loadReservasData();
}

async function loadReservasData() {
    try {
        console.log('🔄 Carregando dados das reservas...');
        
        const filterStatus = document.getElementById('filterStatus').value;
        const filterDate = document.getElementById('filterDate').value;
        
        const options = {};
        if (filterStatus !== 'all') {
            options.status = filterStatus;
        }
        
        if (filterDate) {
            const date = new Date(filterDate);
            date.setHours(0, 0, 0, 0);
            options.startDate = date;
            
            const endDate = new Date(filterDate);
            endDate.setHours(23, 59, 59, 999);
            options.endDate = endDate;
        }
        
        console.log('Opções de filtro:', options);
        
        currentReservas = await adminFirebase.getAllReservas(options);
        
        console.log(`✅ ${currentReservas.length} reservas carregadas`);
        
        // Log das primeiras reservas para debug
        if (currentReservas.length > 0) {
            console.log('Primeira reserva:', {
                id: currentReservas[0].id,
                responsavel: currentReservas[0].responsavel,
                status: currentReservas[0].status,
                criadoEm: currentReservas[0].criadoEm,
                dias: currentReservas[0].dias
            });
        }
        
        currentPage = 1;
        renderReservasTable();
        
    } catch (error) {
        console.error('❌ Erro ao carregar reservas:', error);
        showNotification('Erro ao carregar reservas', 'erro');
        
        // Fallback: mostrar mensagem na tabela
        const tableBody = document.getElementById('reservasTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell erro">
                        Erro ao carregar reservas: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

function renderReservasTable() {
    const tableBody = document.getElementById('reservasTableBody');
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (!tableBody) {
        console.error('Elemento reservasTableBody não encontrado!');
        return;
    }
    
    // Verificar se há reservas
    if (!currentReservas || currentReservas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    Nenhuma reserva encontrada
                </td>
            </tr>
        `;
        return;
    }
    
    // Calcular paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageReservas = currentReservas.slice(startIndex, endIndex);
    const totalPages = Math.ceil(currentReservas.length / itemsPerPage);
    
    console.log(`Renderizando ${pageReservas.length} reservas (página ${currentPage}/${totalPages})`);
    
    // Atualizar informações da página
    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage === totalPages;
    }
    
    // Renderizar tabela
    tableBody.innerHTML = '';
    
    pageReservas.forEach(reserva => {
        const row = document.createElement('tr');
        const isSelected = selectedReservas.has(reserva.id);
        
        // Formatar data de criação
        const criadoEmFormatado = reserva.criadoEm ? 
            formatarDataParaExibicaoDashboard(reserva.criadoEm) : 
            'Data não disponível';
        
        // Formatar dias
        const diasCount = reserva.dias ? reserva.dias.length : 0;
        const diasPreview = getDiasPreview(reserva.dias);
        
        // Formatar turno
        const turnoText = reserva.turno === 'manha' ? 'Manhã' : 'Tarde';
        const turnoClass = reserva.turno === 'manha' ? 'status-pendente' : 'status-aprovado';
        
        // Formatar status
        const statusText = getStatusText(reserva.status);
        const statusClass = `status-${reserva.status}`;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="reserva-checkbox" 
                       data-id="${reserva.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${criadoEmFormatado}</td>
            <td>
                <div class="responsavel-info">
                    <strong>${reserva.responsavel || 'Não informado'}</strong>
                    <div class="responsavel-email">${reserva.email || ''}</div>
                </div>
            </td>
            <td>
                <div class="dias-info">
                    <span class="dias-count">${diasCount} dia(s)</span>
                    <div class="dias-preview">${diasPreview}</div>
                </div>
            </td>
            <td>
                <span class="status-badge ${turnoClass}">
                    ${turnoText}
                </span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>${formatDateTime(reserva.criadoEm)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-id="${reserva.id}" 
                            title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" data-id="${reserva.id}" 
                            title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-id="${reserva.id}" 
                            title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar event listeners aos checkboxes
    document.querySelectorAll('.reserva-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const reservaId = this.getAttribute('data-id');
            
            if (this.checked) {
                selectedReservas.add(reservaId);
            } else {
                selectedReservas.delete(reservaId);
                // Desmarcar "select all" se algum foi desmarcado
                const selectAll = document.getElementById('selectAll');
                if (selectAll) {
                    selectAll.checked = false;
                }
            }
            
            updateSelectedCount();
            updateBulkActionButton();
        });
    });
    
    // Adicionar event listeners aos botões de ação
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const reservaId = this.getAttribute('data-id');
            viewReservaDetails(reservaId);
        });
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const reservaId = this.getAttribute('data-id');
            editReserva(reservaId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const reservaId = this.getAttribute('data-id');
            deleteSingleReserva(reservaId);
        });
    });
}

function getDiasPreview(dias) {
    if (!dias || !Array.isArray(dias) || dias.length === 0) {
        return '<small>Sem dias selecionados</small>';
    }
    
    // Tentar formatar as datas
    const diasFormatados = dias.map(diaStr => {
        try {
            // Tente parse como data no formato YYYY-MM-DD
            if (typeof diaStr === 'string' && diaStr.includes('-')) {
                const [ano, mes, dia] = diaStr.split('-');
                return `${dia}/${mes}/${ano}`;
            }
            return diaStr;
        } catch (e) {
            return diaStr;
        }
    });
    
    if (diasFormatados.length <= 2) {
        return `<small>${diasFormatados.join(', ')}</small>`;
    }
    
    return `<small>${diasFormatados[0]}, ${diasFormatados[1]}... +${diasFormatados.length - 2}</small>`;
}

function formatDateTime(date) {
    if (!date) return '';
    
    // Se for string, converter para Date
    let dataObj;
    if (typeof date === 'string') {
        dataObj = new Date(date);
    } else if (date.toDate) {
        // Se for timestamp do Firestore
        dataObj = date.toDate();
    } else {
        dataObj = date;
    }
    
    return dataObj.toLocaleDateString('pt-BR') + ' ' + 
           dataObj.toLocaleTimeString('pt-BR', { 
               hour: '2-digit', 
               minute: '2-digit' 
           });
}

function updateSelectedCount() {
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) {
        selectedCount.textContent = selectedReservas.size;
    }
}

function updateBulkActionButton() {
    const applyBulkBtn = document.getElementById('btnApplyBulk');
    const bulkActionSelect = document.getElementById('bulkAction');
    
    if (applyBulkBtn && bulkActionSelect) {
        const hasSelection = selectedReservas.size > 0;
        const hasAction = bulkActionSelect.value !== '';
        
        applyBulkBtn.disabled = !hasSelection || !hasAction;
    }
}

function getBulkActionText(action) {
    const texts = {
        approve: 'aprovar',
        reject: 'recusar',
        delete: 'excluir'
    };
    return texts[action] || action;
}

function getBulkActionDoneText(action) {
    const texts = {
        approve: 'aprovadas',
        reject: 'recusadas',
        delete: 'excluídas'
    };
    return texts[action] || 'processadas';
}

async function approveMultipleReservas(reservaIds) {
    const updates = reservaIds.map(id => 
        adminFirebase.updateReserva(id, {
            status: 'aprovado',
            aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            aprovadoPor: adminFirebase.getCurrentAdmin().uid
        })
    );
    
    await Promise.all(updates);
}

async function rejectMultipleReservas(reservaIds) {
    const updates = reservaIds.map(id => 
        adminFirebase.updateReserva(id, {
            status: 'recusado',
            aprovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            aprovadoPor: adminFirebase.getCurrentAdmin().uid
        })
    );
    
    await Promise.all(updates);
}

async function deleteMultipleReservas(reservaIds) {
    await adminFirebase.deleteMultipleReservas(reservaIds);
}

async function viewReservaDetails(reservaId) {
    try {
        const doc = await adminFirebase.db.collection('reservas').doc(reservaId).get();
        
        if (doc.exists) {
            const reserva = doc.data();
            
            // Converter timestamps
            const criadoEm = reserva.criadoEm ? 
                reserva.criadoEm.toDate().toLocaleString('pt-BR') : 
                'Não disponível';
            const aprovadoEm = reserva.aprovadoEm ? 
                reserva.aprovadoEm.toDate().toLocaleString('pt-BR') : 
                'Não aprovado ainda';
            
            // Formatar turno
            const turnoText = reserva.turno === 'manha' ? 'Manhã (08h às 12h)' : 'Tarde (14h às 17h)';
            
            // Formatar dias
            let diasHtml = '';
            if (reserva.dias && Array.isArray(reserva.dias)) {
                reserva.dias.forEach(dia => {
                    try {
                        const [ano, mes, diaNum] = dia.split('-');
                        diasHtml += `• ${diaNum}/${mes}/${ano}<br>`;
                    } catch (e) {
                        diasHtml += `• ${dia}<br>`;
                    }
                });
            }
            
            let details = `
                <h3>📋 Detalhes da Reserva</h3>
                <hr>
                <div style="max-height: 400px; overflow-y: auto;">
                    <p><strong>👤 Responsável:</strong> ${reserva.responsavel || ''}</p>
                    <p><strong>📧 E-mail:</strong> ${reserva.email || ''}</p>
                    <p><strong>📱 WhatsApp:</strong> ${reserva.whatsapp || ''}</p>
                    <p><strong>🎓 Ocupação:</strong> ${reserva.ocupacao || ''}</p>
                    <p><strong>⏰ Turno:</strong> ${turnoText}</p>
                    <p><strong>📊 Status:</strong> ${getStatusText(reserva.status)}</p>
                    
                    <p><strong>📅 Dias Reservados (${reserva.dias ? reserva.dias.length : 0}):</strong></p>
                    <div style="margin-left: 20px; margin-bottom: 15px;">
                        ${diasHtml || 'Nenhum dia registrado'}
                    </div>
                    
                    <p><strong>📝 Finalidade:</strong></p>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        ${reserva.finalidade || 'Não informada'}
                    </div>
                    
                    <hr>
                    <p><strong>📅 Criado em:</strong> ${criadoEm}</p>
                    <p><strong>✅ Aprovado em:</strong> ${aprovadoEm}</p>
                </div>
            `;
            
            // Criar modal customizado
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            `;
            
            modalContent.innerHTML = details;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Fechar';
            closeBtn.style.cssText = `
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
                width: 100%;
            `;
            closeBtn.onclick = () => document.body.removeChild(modal);
            
            modalContent.appendChild(closeBtn);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Fechar ao clicar fora
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };
        }
        
    } catch (error) {
        console.error('Erro ao visualizar reserva:', error);
        showNotification('Erro ao carregar detalhes', 'erro');
    }
}

async function editReserva(reservaId) {
    try {
        const doc = await adminFirebase.db.collection('reservas').doc(reservaId).get();
        
        if (doc.exists) {
            const reserva = doc.data();
            
            // Preencher modal de edição
            document.getElementById('editEmail').value = reserva.email || '';
            document.getElementById('editResponsavel').value = reserva.responsavel || '';
            document.getElementById('editTurno').value = reserva.turno || 'manha';
            document.getElementById('editStatus').value = reserva.status || 'pendente';
            document.getElementById('editFinalidade').value = reserva.finalidade || '';
            
            // Preencher dias
            const diasContainer = document.getElementById('editDiasContainer');
            diasContainer.innerHTML = '';
            
            if (reserva.dias && Array.isArray(reserva.dias)) {
                reserva.dias.forEach(dia => {
                    try {
                        const [ano, mes, diaNum] = dia.split('-');
                        const diaFormatado = `${diaNum}/${mes}/${ano}`;
                        
                        const diaTag = document.createElement('span');
                        diaTag.className = 'dia-tag';
                        diaTag.textContent = diaFormatado;
                        diasContainer.appendChild(diaTag);
                    } catch (e) {
                        const diaTag = document.createElement('span');
                        diaTag.className = 'dia-tag';
                        diaTag.textContent = dia;
                        diasContainer.appendChild(diaTag);
                    }
                });
            }
            
            // Mostrar modal
            const modal = document.getElementById('editReservaModal');
            modal.style.display = 'flex';
            
            // Configurar submit do formulário
            const form = document.getElementById('editReservaForm');
            form.onsubmit = async function(e) {
                e.preventDefault();
                
                const updates = {
                    email: document.getElementById('editEmail').value,
                    responsavel: document.getElementById('editResponsavel').value,
                    turno: document.getElementById('editTurno').value,
                    status: document.getElementById('editStatus').value,
                    finalidade: document.getElementById('editFinalidade').value,
                    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    atualizadoPor: adminFirebase.getCurrentAdmin().uid
                };
                
                try {
                    await adminFirebase.updateReserva(reservaId, updates);
                    modal.style.display = 'none';
                    showNotification('Reserva atualizada com sucesso', 'sucesso');
                    loadReservasData();
                } catch (error) {
                    console.error('Erro ao atualizar reserva:', error);
                    showNotification('Erro ao atualizar reserva', 'erro');
                }
            };
        }
        
    } catch (error) {
        console.error('Erro ao editar reserva:', error);
        showNotification('Erro ao carregar reserva', 'erro');
    }
}

async function deleteSingleReserva(reservaId) {
    if (confirm('⚠️ Deseja realmente excluir esta reserva?\nEsta ação não pode ser desfeita.')) {
        try {
            await adminFirebase.deleteReserva(reservaId);
            showNotification('Reserva excluída com sucesso', 'sucesso');
            loadReservasData();
        } catch (error) {
            console.error('Erro ao excluir reserva:', error);
            showNotification('Erro ao excluir reserva', 'erro');
        }
    }
}

function formatDateString(dateStr) {
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

// FUNÇÕES DE EXPORTAÇÃO AVANÇADAS
async function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadJSPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
        script.onload = () => {
            // Carregar também autoTable
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://unpkg.com/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js';
            autoTableScript.onload = resolve;
            autoTableScript.onerror = reject;
            document.head.appendChild(autoTableScript);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Nova função principal de exportação
async function exportReservas(format = 'xlsx') {
    try {
        // Mostrar loading
        const exportBtn = document.getElementById('btnExportReservas');
        const originalHTML = exportBtn.innerHTML;
        exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exportando ${format.toUpperCase()}...`;
        exportBtn.disabled = true;
        
        // Obter filtros atuais
        const filterStatus = document.getElementById('filterStatus').value;
        const filterDate = document.getElementById('filterDate').value;
        
        const options = {};
        if (filterStatus !== 'all') {
            options.status = filterStatus;
        }
        
        if (filterDate) {
            const date = new Date(filterDate);
            date.setHours(0, 0, 0, 0);
            options.startDate = date;
            
            const endDate = new Date(filterDate);
            endDate.setHours(23, 59, 59, 999);
            options.endDate = endDate;
        }
        
        // Carregar reservas com os mesmos filtros
        const reservas = await adminFirebase.getAllReservas(options);
        
        // Gerar dados formatados
        const excelData = generateExcelData(reservas);
        
        let blob;
        let fileName;
        const hoje = new Date();
        const dataStr = hoje.toISOString().split('T')[0].replace(/-/g, '');
        
        switch (format.toLowerCase()) {
            case 'xlsx':
                blob = exportWithSheetJS(excelData);
                fileName = `reservas_lep_${dataStr}.xlsx`;
                break;
            case 'csv':
                blob = exportAsCSV(excelData);
                fileName = `reservas_lep_${dataStr}.csv`;
                break;
            case 'pdf':
                try {
                    blob = await exportAsPDF(excelData);
                    fileName = `reservas_lep_${dataStr}.pdf`;
                } catch (error) {
                    console.error('Erro ao gerar PDF:', error);
                    showNotification('Erro ao gerar PDF. Exportando como Excel.', 'alerta');
                    blob = exportWithSheetJS(excelData);
                    fileName = `reservas_lep_${dataStr}.xlsx`;
                }
                break;
            default:
                blob = exportWithSheetJS(excelData);
                fileName = `reservas_lep_${dataStr}.xlsx`;
        }
        
        // Download
        downloadExcelFile(blob, fileName);
        
        showNotification(`${reservas.length} reservas exportadas como ${format.toUpperCase()}`, 'sucesso');
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        showNotification(`Erro ao exportar como ${format.toUpperCase()}`, 'erro');
    } finally {
        // Restaurar botão
        const exportBtn = document.getElementById('btnExportReservas');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Exportar';
            exportBtn.disabled = false;
        }
    }
}

function generateExcelData(reservas) {
    // Cabeçalhos da tabela
    const headers = [
        'ID',
        'Data da Reserva',
        'Responsável',
        'E-mail',
        'WhatsApp',
        'Ocupação',
        'Dias Reservados',
        'Turno',
        'Status',
        'Finalidade',
        'Criado em',
        'Aprovado em',
        'Atualizado em'
    ];
    
    // Converter reservas para formato de linha
    const rows = reservas.map(reserva => {
        // Formatar datas
        const dataReserva = reserva.criadoEm ? 
            formatDateTime(reserva.criadoEm).split(' ')[0] : 
            '';
        
        // Formatar dias
        let diasFormatados = '';
        if (reserva.dias && Array.isArray(reserva.dias)) {
            diasFormatados = reserva.dias.map(dia => {
                try {
                    const [ano, mes, diaNum] = dia.split('-');
                    return `${diaNum}/${mes}/${ano}`;
                } catch (e) {
                    return dia;
                }
            }).join(', ');
        }
        
        // Formatar turno
        const turnoFormatado = reserva.turno === 'manha' ? 'Manhã (08h-12h)' : 
                              reserva.turno === 'tarde' ? 'Tarde (14h-17h)' : 
                              reserva.turno || '';
        
        // Formatar status
        const statusFormatado = getStatusText(reserva.status);
        
        // Formatar datas timestamps
        const criadoEm = reserva.criadoEm ? formatDateTime(reserva.criadoEm) : '';
        const aprovadoEm = reserva.aprovadoEm ? 
            (reserva.aprovadoEm.toDate ? 
                formatDateTime(reserva.aprovadoEm.toDate()) : 
                formatDateTime(reserva.aprovadoEm)) : '';
        const atualizadoEm = reserva.atualizadoEm ? 
            (reserva.atualizadoEm.toDate ? 
                formatDateTime(reserva.atualizadoEm.toDate()) : 
                formatDateTime(reserva.atualizadoEm)) : '';
        
        return [
            reserva.id || '',
            dataReserva,
            reserva.responsavel || '',
            reserva.email || '',
            reserva.whatsapp || '',
            reserva.ocupacao || '',
            diasFormatados,
            turnoFormatado,
            statusFormatado,
            reserva.finalidade || '',
            criadoEm,
            aprovadoEm,
            atualizadoEm
        ];
    });
    
    return { headers, rows };
}

function exportWithSheetJS(excelData) {
    // Criar uma nova pasta de trabalho
    const wb = XLSX.utils.book_new();
    
    // Converter dados para worksheet
    const wsData = [
        // Título
        ['RELATÓRIO DE RESERVAS - LEP'],
        ['Data de exportação:', new Date().toLocaleDateString('pt-BR')],
        ['Total de reservas:', excelData.rows.length],
        [], // Linha vazia
        excelData.headers, // Cabeçalhos
        ...excelData.rows // Dados
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    const colWidths = [
        { wch: 25 }, // ID
        { wch: 12 }, // Data
        { wch: 20 }, // Responsável
        { wch: 25 }, // E-mail
        { wch: 15 }, // WhatsApp
        { wch: 15 }, // Ocupação
        { wch: 30 }, // Dias
        { wch: 15 }, // Turno
        { wch: 10 }, // Status
        { wch: 40 }, // Finalidade
        { wch: 20 }, // Criado em
        { wch: 20 }, // Aprovado em
        { wch: 20 }  // Atualizado em
    ];
    ws['!cols'] = colWidths;
    
    // Formatar células
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Título
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
        };
    }
    
    // Cabeçalhos (linha 4)
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 4, c: C });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "004AAD" } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
    }
    
    // Adicionar worksheet à pasta de trabalho
    XLSX.utils.book_append_sheet(wb, ws, "Reservas");
    
    // Gerar arquivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function exportAsCSV(excelData) {
    // Função fallback para CSV
    let csv = 'RELATÓRIO DE RESERVAS - LEP\n';
    csv += `Data de exportação:,${new Date().toLocaleDateString('pt-BR')}\n`;
    csv += `Total de reservas:,${excelData.rows.length}\n\n`;
    
    // Cabeçalhos
    csv += excelData.headers.map(h => `"${h}"`).join(',') + '\n';
    
    // Dados
    excelData.rows.forEach(row => {
        csv += row.map(cell => {
            // Escapar vírgulas e aspas
            if (typeof cell === 'string') {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return `"${cell}"`;
        }).join(',') + '\n';
    });
    
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// Função para exportar como PDF (opcional)
async function exportAsPDF(excelData) {
    // Carregar jsPDF se não estiver disponível
    if (!window.jspdf) {
        await loadJSPDF();
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Título
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE RESERVAS - LEP', 14, 15);
    doc.setFontSize(10);
    doc.text(`Data de exportação: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
    doc.text(`Total de reservas: ${excelData.rows.length}`, 14, 30);
    
    // Preparar dados da tabela
    const tableData = excelData.rows.map(row => [...row]);
    const tableHeaders = excelData.headers;
    
    // Configurar tabela
    doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [0, 74, 173], // Azul LEP
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240]
        },
        columnStyles: {
            0: { cellWidth: 25 }, // ID
            1: { cellWidth: 15 }, // Data
            2: { cellWidth: 20 }, // Responsável
            3: { cellWidth: 25 }, // E-mail
            5: { cellWidth: 15 }, // Ocupação
            6: { cellWidth: 30 }, // Dias
            9: { cellWidth: 40 }  // Finalidade
        },
        margin: { top: 35 }
    });
    
    // Número de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
        );
    }
    
    return doc.output('blob');
}

function downloadExcelFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Relatórios
function setupRelatorios() {
    const generateBtn = document.getElementById('btnGenerateReport');
    const printBtn = document.getElementById('btnPrintReport');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', printReport);
    }
}

function setupReportChart() {
    // Inicializar gráfico vazio
    const ctx = document.getElementById('reportChart').getContext('2d');
    window.reportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Reservas',
                data: [],
                backgroundColor: '#004aad'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function generateReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const reportType = document.getElementById('reportType').value;
        const reportFormat = document.getElementById('reportFormat').value;
        
        const options = {
            type: reportType,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null
        };
        
        const report = await adminFirebase.generateReport(options);
        
        // Atualizar gráfico
        updateReportChart(report);
        
        // Gerar tabela
        generateReportTable(report, reportFormat);
        
        // Gerar sumário
        generateReportSummary(report);
        
        // Oferecer download se não for HTML
        if (reportFormat !== 'html') {
            const data = await adminFirebase.getAllReservas({
                startDate: options.startDate,
                endDate: options.endDate
            });
            
            const exported = adminFirebase.exportToFormat(data, reportFormat);
            const fileName = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.${reportFormat}`;
            
            setTimeout(() => {
                if (confirm('Deseja baixar o relatório?')) {
                    downloadFile(exported, fileName, getMimeType(reportFormat));
                }
            }, 500);
        }
        
        showNotification('Relatório gerado com sucesso', 'sucesso');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório', 'erro');
    }
}

function updateReportChart(report) {
    if (!window.reportChart) return;
    
    const labels = Object.keys(report.dados);
    const data = Object.values(report.dados).map(d => 
        typeof d === 'object' ? d.total || 0 : d
    );
    
    window.reportChart.data.labels = labels;
    window.reportChart.data.datasets[0].data = data;
    window.reportChart.update();
}

function generateReportTable(report, format) {
    const container = document.getElementById('reportTableContainer');
    if (!container) return;
    
    if (format === 'html') {
        let html = '<h3>Dados do Relatório</h3>';
        
        if (typeof report.dados === 'object') {
            html += '<table class="report-table"><thead><tr>';
            
            if (report.type === 'turnos') {
                html += '<th>Turno</th><th>Quantidade</th><th>Percentual</th>';
            } else {
                html += '<th>Data</th><th>Total</th><th>Aprovadas</th><th>Pendentes</th><th>Recusadas</th>';
            }
            
            html += '</tr></thead><tbody>';
            
            Object.entries(report.dados).forEach(([key, value]) => {
                html += '<tr>';
                
                if (report.type === 'turnos') {
                    const total = value.manha + value.tarde;
                    const percentManha = total > 0 ? Math.round((value.manha / total) * 100) : 0;
                    const percentTarde = total > 0 ? Math.round((value.tarde / total) * 100) : 0;
                    
                    html += `
                        <td>Manhã</td>
                        <td>${value.manha}</td>
                        <td>${percentManha}%</td>
                    </tr>
                    <tr>
                        <td>Tarde</td>
                        <td>${value.tarde}</td>
                        <td>${percentTarde}%</td>
                    `;
                } else {
                    html += `
                        <td>${key}</td>
                        <td>${value.total || value}</td>
                        <td>${value.aprovadas || ''}</td>
                        <td>${value.pendentes || ''}</td>
                        <td>${value.recusadas || ''}</td>
                    `;
                }
                
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
        
        container.innerHTML = html;
    }
}

function generateReportSummary(report) {
    const summary = document.getElementById('reportSummary');
    if (!summary) return;

    let html = '<div class="report-summary-content">';
    html += `<h3>Resumo do Relatório</h3>`;
    html += `<p><strong>Título:</strong> ${report.titulo}</p>`;

    if (report.totalReservas !== undefined) {
        html += `<p><strong>Total de Reservas:</strong> ${report.totalReservas}</p>`;
    }

    if (report.periodo) {
        html += `<p><strong>Período:</strong> `;
        if (report.periodo.inicio) {
            html += `De ${report.periodo.inicio.toLocaleDateString('pt-BR')} `;
        }
        if (report.periodo.fim) {
            html += `até ${report.periodo.fim.toLocaleDateString('pt-BR')}`;
        }
        html += `</p>`;
    }

    html += `</div>`;
    summary.innerHTML = html;
}

function printReport() {
    window.print();
}

function getMimeType(format) {
    const mimeTypes = {
        csv: 'text/csv',
        json: 'application/json',
        pdf: 'application/pdf',
        html: 'text/html'
    };
    return mimeTypes[format] || 'text/plain';
}

// Usuários (Administradores)
function setupUsuarios() {
    const addAdminBtn = document.getElementById('btnAddAdmin');

    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', function () {
            const modal = document.getElementById('addAdminModal');
            modal.style.display = 'flex';
        });
    }

    // Configurar formulário de adição de admin
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const adminData = {
                nome: document.getElementById('newAdminName').value,
                email: document.getElementById('newAdminEmail').value,
                password: document.getElementById('newAdminPassword').value,
                nivel: document.getElementById('newAdminLevel').value
            };

            try {
                await adminFirebase.addAdmin(adminData);

                // Fechar modal e limpar formulário
                const modal = document.getElementById('addAdminModal');
                modal.style.display = 'none';
                addAdminForm.reset();

                showNotification('Administrador adicionado com sucesso', 'sucesso');
                loadUsuariosData();

            } catch (error) {
                console.error('Erro ao adicionar administrador:', error);
                showNotification(`Erro: ${error.message}`, 'erro');
            }
        });
    }
}

async function loadUsuariosData() {
    try {
        const snapshot = await adminFirebase.db.collection('admins').get();
        const tableBody = document.getElementById('usersTableBody');

        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        Nenhum administrador encontrado
                    </td>
                </tr>
            `;
            return;
        }

        const currentAdminId = adminFirebase.getCurrentAdmin().uid;

        snapshot.forEach(doc => {
            const admin = doc.data();
            const isCurrentUser = doc.id === currentAdminId;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${admin.nome || ''}</td>
                <td>${admin.email || ''}</td>
                <td>
                    <span class="status-badge ${admin.nivel === 'superadmin' ? 'status-aprovado' : 'status-pendente'}">
                        ${admin.nivel === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                </td>
                <td>${admin.ultimoAcesso ? formatDateTime(admin.ultimoAcesso.toDate()) : 'Nunca'}</td>
                <td>
                    <span class="status-badge ${admin.ativo ? 'status-aprovado' : 'status-recusado'}">
                        ${admin.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${!isCurrentUser ? `
                            <button class="btn-action btn-edit" data-id="${doc.id}" 
                                    title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" data-id="${doc.id}" 
                                    title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : '<small>(Você)</small>'}
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // Adicionar event listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function () {
                const adminId = this.getAttribute('data-id');
                editAdmin(adminId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const adminId = this.getAttribute('data-id');
                deleteAdmin(adminId);
            });
        });

    } catch (error) {
        console.error('Erro ao carregar administradores:', error);
        showNotification('Erro ao carregar administradores', 'erro');
    }
}

async function editAdmin(adminId) {
    // Implementar edição de administrador
    alert('Funcionalidade de edição em desenvolvimento');
}

async function deleteAdmin(adminId) {
    if (confirm('Deseja realmente excluir este administrador?\nEsta ação não pode ser desfeita.')) {
        try {
            await adminFirebase.deleteAdmin(adminId);
            showNotification('Administrador excluído com sucesso', 'sucesso');
            loadUsuariosData();
        } catch (error) {
            console.error('Erro ao excluir administrador:', error);
            showNotification('Erro ao excluir administrador', 'erro');
        }
    }
}

// Configurações
function setupConfiguracoes() {
    const saveSettingsBtn = document.getElementById('btnSaveSettings');
    const resetSettingsBtn = document.getElementById('btnResetSettings');
    const backupBtn = document.getElementById('btnBackup');
    const restoreBtn = document.getElementById('btnRestore');
    const clearOldDataBtn = document.getElementById('btnClearOldData');

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }

    if (backupBtn) {
        backupBtn.addEventListener('click', backupData);
    }

    if (restoreBtn) {
        restoreBtn.addEventListener('click', restoreData);
    }

    if (clearOldDataBtn) {
        clearOldDataBtn.addEventListener('click', clearOldData);
    }

    // Carregar configurações salvas
    loadSettings();
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('lep_admin_settings') || '{}');

    // Aplicar configurações
    if (settings.notifyNewReservations !== undefined) {
        document.getElementById('notifyNewReservations').checked = settings.notifyNewReservations;
    }

    if (settings.notifyChanges !== undefined) {
        document.getElementById('notifyChanges').checked = settings.notifyChanges;
    }

    if (settings.theme) {
        document.getElementById('themeSelect').value = settings.theme;
        applyTheme(settings.theme);
    }
}

function saveSettings() {
    const settings = {
        notifyNewReservations: document.getElementById('notifyNewReservations').checked,
        notifyChanges: document.getElementById('notifyChanges').checked,
        theme: document.getElementById('themeSelect').value
    };

    localStorage.setItem('lep_admin_settings', JSON.stringify(settings));
    applyTheme(settings.theme);

    showNotification('Configurações salvas com sucesso', 'sucesso');
}

function resetSettings() {
    if (confirm('Deseja restaurar as configurações padrão?')) {
        localStorage.removeItem('lep_admin_settings');
        location.reload();
    }
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.style.setProperty('--light-color', '#343a40');
        document.documentElement.style.setProperty('--dark-color', '#f8f9fa');
    } else {
        document.documentElement.style.setProperty('--light-color', '#f8f9fa');
        document.documentElement.style.setProperty('--dark-color', '#343a40');
    }
}

async function backupData() {
    try {
        const backup = await adminFirebase.backupData();
        const backupStr = JSON.stringify(backup, null, 2);

        downloadFile(backupStr, `backup_lep_${new Date().toISOString().split('T')[0]}.json`, 'application/json');

        showNotification('Backup criado com sucesso', 'sucesso');

    } catch (error) {
        console.error('Erro ao criar backup:', error);
        showNotification('Erro ao criar backup', 'erro');
    }
}

async function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async function (e) {
        const file = e.target.files[0];

        if (!file) return;

        if (confirm('ATENÇÃO: Esta ação substituirá todos os dados atuais. Deseja continuar?')) {
            try {
                const reader = new FileReader();

                reader.onload = async function (event) {
                    try {
                        const backupData = JSON.parse(event.target.result);
                        await adminFirebase.restoreData(backupData);

                        showNotification('Dados restaurados com sucesso', 'sucesso');
                        location.reload();

                    } catch (error) {
                        console.error('Erro ao restaurar dados:', error);
                        showNotification('Arquivo de backup inválido', 'erro');
                    }
                };

                reader.readAsText(file);

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                showNotification('Erro ao processar arquivo', 'erro');
            }
        }
    };

    input.click();
}

async function clearOldData(days = 90) {
    const daysInput = prompt('Excluir reservas mais antigas que quantos dias?', '90');

    if (daysInput && !isNaN(daysInput) && parseInt(daysInput) > 0) {
        if (confirm(`Deseja excluir reservas com mais de ${daysInput} dias?\nEsta ação não pode ser desfeita.`)) {
            try {
                const count = await adminFirebase.clearOldData(parseInt(daysInput));
                showNotification(`${count} reservas antigas excluídas`, 'sucesso');
                loadDashboardData();

            } catch (error) {
                console.error('Erro ao limpar dados antigos:', error);
                showNotification('Erro ao limpar dados antigos', 'erro');
            }
        }
    }
}

// Modais
function setupModals() {
    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });

    // Botões de fechar modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Fechar com ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Funções utilitárias
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function showNotification(message, type = 'info') {
    // Remover notificações anteriores
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: var(--radius);
        background-color: ${type === 'sucesso' ? '#d4edda' :
            type === 'erro' ? '#f8d7da' :
                type === 'alerta' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'sucesso' ? '#155724' :
            type === 'erro' ? '#721c24' :
                type === 'alerta' ? '#856404' : '#0c5460'};
        border: 1px solid ${type === 'sucesso' ? '#c3e6cb' :
            type === 'erro' ? '#f5c6cb' :
                type === 'alerta' ? '#ffeaa7' : '#bee5eb'};
        z-index: 10000;
        box-shadow: var(--shadow);
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Carregar dados iniciais
async function loadInitialData() {
    console.log('🔄 Carregando dados iniciais...');
    await loadDashboardData();
}

// No arquivo admin-scripts.js, adicione:
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarOverlay = document.createElement('div');
    
    // Cria o overlay
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);
    
    // Alterna o menu
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSidebar();
    });
    
    // Fecha o menu ao clicar no overlay
    sidebarOverlay.addEventListener('click', function() {
        closeSidebar();
    });
    
    // Fecha o menu ao clicar em um link (opcional)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Fecha o menu ao pressionar ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
    
    // Fecha o menu ao redimensionar para desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            mainContent.classList.remove('expanded');
            menuToggle.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    });
    
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        mainContent.classList.toggle('expanded');
        menuToggle.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
        
        // Alterna ícone
        const icon = menuToggle.querySelector('i');
        if (menuToggle.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
    
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        mainContent.classList.remove('expanded');
        menuToggle.classList.remove('active');
        menuToggle.querySelector('i').classList.remove('fa-times');
        menuToggle.querySelector('i').classList.add('fa-bars');
        document.body.classList.remove('sidebar-open');
    }
});

// Verificar se há atualizações em tempo real
function setupRealTimeUpdates() {
    // Escutar por novas reservas
    adminFirebase.db.collection('reservas')
        .where('visualizado', '==', false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const reserva = change.doc.data();
                    showNotification(`Nova reserva de ${reserva.responsavel}`, 'info');

                    // Marcar como visualizado
                    change.doc.ref.update({ visualizado: true });
                }
            });
        });
}

// Inicializar atualizações em tempo real
setTimeout(setupRealTimeUpdates, 3000);

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
    
    .notification-sucesso {
        background-color: #d4edda !important;
        color: #155724 !important;
        border-color: #c3e6cb !important;
    }
    
    .notification-erro {
        background-color: #f8d7da !important;
        color: #721c24 !important;
        border-color: #f5c6cb !important;
    }
    
    .notification-alerta {
        background-color: #fff3cd !important;
        color: #856404 !important;
        border-color: #ffeaa7 !important;
    }
`;
document.head.appendChild(estiloAnimacoes);