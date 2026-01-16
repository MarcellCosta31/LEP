// admin-scripts.js - Lógica principal do painel administrativo

document.addEventListener('DOMContentLoaded', function() {
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

// Navegação entre views
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentViews = document.querySelectorAll('.content-view');
    const pageTitle = document.getElementById('pageTitle');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const viewName = this.getAttribute('data-view');
            
            // Atualizar navegação ativa
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar view correspondente
            contentViews.forEach(view => {
                view.classList.remove('active-view');
                if (view.id === `${viewName}View') {
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
}

async function loadDashboardData() {
    try {
        // Carregar estatísticas
        const [reservas, admins] = await Promise.all([
            adminFirebase.getAllReservas({ limit: 1000 }),
            adminFirebase.db.collection('admins').get()
        ]);
        
        // Calcular estatísticas
        const totalReservas = reservas.length;
        const aprovadas = reservas.filter(r => r.status === 'aprovado').length;
        const pendentes = reservas.filter(r => r.status === 'pendente').length;
        const totalAdmins = admins.size;
        
        // Atualizar interface
        updateStatElement('totalReservas', totalReservas);
        updateStatElement('reservasAprovadas', aprovadas);
        updateStatElement('reservasPendentes', pendentes);
        updateStatElement('totalUsuarios', totalAdmins);
        
        // Calcular percentual
        const percentAprovadas = totalReservas > 0 ? 
            Math.round((aprovadas / totalReservas) * 100) : 0;
        updateStatElement('aprovadasPercent', `${percentAprovadas}% do total`);
        
        // Atualizar tendência (últimos 7 dias)
        const lastWeekReservas = reservas.filter(r => {
            if (!r.criadoEm) return false;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return r.criadoEm >= sevenDaysAgo;
        });
        
        const lastWeekCount = lastWeekReservas.length;
        const prevWeekCount = Math.max(0, totalReservas - lastWeekCount);
        const trend = prevWeekCount > 0 ? 
            Math.round(((lastWeekCount - prevWeekCount) / prevWeekCount) * 100) : 100;
        
        const trendElement = document.getElementById('reservasTrend');
        if (trendElement) {
            const trendText = trend >= 0 ? 
                `↑ ${trend}% em relação à semana anterior` :
                `↓ ${Math.abs(trend)}% em relação à semana anterior`;
            trendElement.textContent = trendText;
            trendElement.style.color = trend >= 0 ? '#28a745' : '#dc3545';
        }
        
        // Carregar atividade recente
        loadRecentActivity(reservas);
        
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
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

function animateCounter(element, target) {
    const current = parseInt(element.textContent) || 0;
    const increment = target > current ? 1 : -1;
    const speed = Math.floor(1000 / Math.abs(target - current));
    
    let currentValue = current;
    
    const timer = setInterval(() => {
        currentValue += increment;
        element.textContent = currentValue;
        
        if (currentValue === target) {
            clearInterval(timer);
        }
    }, speed);
}

function loadRecentActivity(reservas) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
    
    // Ordenar por data (mais recente primeiro)
    const recentReservas = [...reservas]
        .sort((a, b) => b.criadoEm - a.criadoEm)
        .slice(0, 10);
    
    activityList.innerHTML = '';
    
    if (recentReservas.length === 0) {
        activityList.innerHTML = '<div class="activity-item">Nenhuma atividade recente</div>';
        return;
    }
    
    recentReservas.forEach(reserva => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const timeAgo = getTimeAgo(reserva.criadoEm);
        const statusIcon = getStatusIcon(reserva.status);
        
        activityItem.innerHTML = `
            <div class="activity-icon">${statusIcon}</div>
            <div class="activity-content">
                <strong>${reserva.responsavel}</strong> ${getActivityText(reserva)}
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

function getTimeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    
    return date.toLocaleDateString('pt-BR');
}

function getStatusIcon(status) {
    const icons = {
        aprovado: '✅',
        pendente: '⏳',
        recusado: '❌'
    };
    return icons[status] || '📝';
}

function getActivityText(reserva) {
    switch (reserva.status) {
        case 'aprovado':
            return `reservou ${reserva.dias ? reserva.dias.length : 0} dias para ${reserva.turno === 'manha' ? 'manhã' : 'tarde'}`;
        case 'pendente':
            return `solicitou reserva para ${reserva.dias ? reserva.dias.length : 0} dias`;
        case 'recusado':
            return `teve reserva recusada`;
        default:
            return 'fez uma reserva';
    }
}

// Gerenciamento de Reservas
function setupReservas() {
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
    
    // Estado da paginação
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentReservas = [];
    let selectedReservas = new Set();
    
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
            
            if (confirm(`Deseja realmente ${getBulkActionText(action)} ${reservaIds.length} reserva(s)?`)) {
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
                    
                    showNotification(`${reservaIds.length} reserva(s) ${getBulkActionDoneText(action)}`, 'sucesso');
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
    
    // Exportar
    if (exportBtn) {
        exportBtn.addEventListener('click', async function() {
            try {
                const reservas = await adminFirebase.getAllReservas({
                    limit: 1000
                });
                
                const csv = adminFirebase.exportToFormat(reservas, 'csv');
                downloadFile(csv, 'reservas_lep.csv', 'text/csv');
                
                showNotification('Reservas exportadas com sucesso', 'sucesso');
                
            } catch (error) {
                console.error('Erro ao exportar:', error);
                showNotification('Erro ao exportar reservas', 'erro');
            }
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
}

async function loadReservasData() {
    try {
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
        
        currentReservas = await adminFirebase.getAllReservas(options);
        currentPage = 1;
        renderReservasTable();
        
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        showNotification('Erro ao carregar reservas', 'erro');
    }
}

function renderReservasTable() {
    const tableBody = document.getElementById('reservasTableBody');
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (!tableBody) return;
    
    // Calcular paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageReservas = currentReservas.slice(startIndex, endIndex);
    const totalPages = Math.ceil(currentReservas.length / itemsPerPage);
    
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
    
    if (pageReservas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    Nenhuma reserva encontrada
                </td>
            </tr>
        `;
        return;
    }
    
    pageReservas.forEach(reserva => {
        const row = document.createElement('tr');
        const isSelected = selectedReservas.has(reserva.id);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="reserva-checkbox" 
                       data-id="${reserva.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${reserva.criadoEm ? reserva.criadoEm.toLocaleDateString('pt-BR') : ''}</td>
            <td>
                <strong>${reserva.responsavel || ''}</strong><br>
                <small>${reserva.email || ''}</small>
            </td>
            <td>
                ${reserva.dias ? reserva.dias.length : 0} dia(s)<br>
                <small>${getDiasPreview(reserva.dias)}</small>
            </td>
            <td>
                <span class="status-badge ${reserva.turno === 'manha' ? 'status-pendente' : 'status-aprovado'}">
                    ${reserva.turno === 'manha' ? 'Manhã' : 'Tarde'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${reserva.status || 'pendente'}">
                    ${getStatusText(reserva.status)}
                </span>
            </td>
            <td>${reserva.criadoEm ? formatDateTime(reserva.criadoEm) : ''}</td>
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
    if (!dias || !Array.isArray(dias)) return '';
    
    if (dias.length <= 3) {
        return dias.join(', ');
    }
    
    return `${dias.slice(0, 3).join(', ')}...`;
}

function getStatusText(status) {
    const statusMap = {
        aprovado: 'Aprovado',
        pendente: 'Pendente',
        recusado: 'Recusado'
    };
    return statusMap[status] || status;
}

function formatDateTime(date) {
    if (!date) return '';
    
    return date.toLocaleDateString('pt-BR') + ' ' + 
           date.toLocaleTimeString('pt-BR', { 
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
            
            let details = `
                <strong>Responsável:</strong> ${reserva.responsavel || ''}<br>
                <strong>E-mail:</strong> ${reserva.email || ''}<br>
                <strong>WhatsApp:</strong> ${reserva.whatsapp || ''}<br>
                <strong>Ocupação:</strong> ${reserva.ocupacao || ''}<br>
                <strong>Turno:</strong> ${reserva.turno === 'manha' ? 'Manhã' : 'Tarde'}<br>
                <strong>Status:</strong> ${getStatusText(reserva.status)}<br>
                <strong>Dias:</strong><br>
            `;
            
            if (reserva.dias && Array.isArray(reserva.dias)) {
                reserva.dias.forEach(dia => {
                    details += `• ${formatDateString(dia)}<br>`;
                });
            }
            
            details += `<br><strong>Finalidade:</strong><br>${reserva.finalidade || ''}`;
            
            if (reserva.criadoEm) {
                details += `<br><br><strong>Criado em:</strong> ${formatDateTime(reserva.criadoEm.toDate())}`;
            }
            
            if (reserva.aprovadoEm && reserva.aprovadoPor) {
                details += `<br><strong>Aprovado em:</strong> ${formatDateTime(reserva.aprovadoEm.toDate())}`;
            }
            
            alert(details);
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
                    const diaTag = document.createElement('span');
                    diaTag.className = 'dia-tag';
                    diaTag.textContent = formatDateString(dia);
                    diasContainer.appendChild(diaTag);
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
    if (confirm('Deseja realmente excluir esta reserva?')) {
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
        addAdminBtn.addEventListener('click', function() {
            const modal = document.getElementById('addAdminModal');
            modal.style.display = 'flex';
        });
    }
    
    // Configurar formulário de adição de admin
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async function(e) {
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
            btn.addEventListener('click', function() {
                const adminId = this.getAttribute('data-id');
                editAdmin(adminId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
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
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        
        if (!file) return;
        
        if (confirm('ATENÇÃO: Esta ação substituirá todos os dados atuais. Deseja continuar?')) {
            try {
                const reader = new FileReader();
                
                reader.onload = async function(event) {
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

async function clearOldData() {
    const days = prompt('Excluir reservas mais antigas que quantos dias?', '90');
    
    if (days && !isNaN(days) && parseInt(days) > 0) {
        if (confirm(`Deseja excluir reservas com mais de ${days} dias?\nEsta ação não pode ser desfeita.`)) {
            try {
                const count = await adminFirebase.clearOldData(parseInt(days));
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
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Botões de fechar modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
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

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
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
    
    .activity-item {
        display: flex;
        gap: 15px;
        padding: 15px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .activity-item:last-child {
        border-bottom: none;
    }
    
    .activity-icon {
        font-size: 1.2rem;
    }
    
    .activity-content {
        flex: 1;
    }
    
    .activity-time {
        font-size: 0.8rem;
        color: var(--secondary-color);
        margin-top: 5px;
    }
    
    .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    
    .report-table th,
    .report-table td {
        border: 1px solid var(--border-color);
        padding: 10px;
        text-align: left;
    }
    
    .report-table th {
        background-color: #f8f9fa;
    }
`;
document.head.appendChild(style);

// Carregar dados iniciais
async function loadInitialData() {
    await loadDashboardData();
}

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