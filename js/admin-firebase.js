// admin-firebase.js - VERSÃO SUPER SIMPLIFICADA

console.log('🔄 Carregando admin-firebase.js...');

// Configuração
const firebaseConfig = {
    apiKey: "AIzaSyBsDDnW7HZaie47AgjMaZ5U1orAiLvOaDM",
    authDomain: "lep-reservas.firebaseapp.com",
    projectId: "lep-reservas",
    storageBucket: "lep-reservas.firebasestorage.app",
    messagingSenderId: "492338423428",
    appId: "1:492338423428:web:7f72cdd8bcd4a5146f84d1"
};

// Inicializar apenas UMA VEZ
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado');
} else {
    console.log('✅ Firebase já estava inicializado');
}

// Referências
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistência
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('Persistência configurada'))
    .catch(error => console.error('Erro na persistência:', error));

// NO admin-firebase.js - ADICIONAR ESTA FUNÇÃO NO INÍCIO DO ARQUIVO
// Função para verificar se o usuário está autenticado e é admin
async function verifyAdminAccess() {
    console.log('🔒 Verificando acesso administrativo...');
    
    try {
        // Aguardar autenticação
        return new Promise((resolve, reject) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('✅ Usuário autenticado:', user.email);
                    
                    // Verificar se é admin
                    const isAdmin = await checkIfAdmin(user.uid);
                    if (isAdmin) {
                        resolve(user);
                    } else {
                        console.error('❌ Usuário não é administrador');
                        reject(new Error('Acesso não autorizado. Apenas administradores.'));
                    }
                } else {
                    console.error('❌ Nenhum usuário autenticado');
                    reject(new Error('Por favor, faça login primeiro.'));
                }
            });
        });
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
        throw error;
    }
}

// Adicionar esta função ao objeto window.adminFirebase
window.adminFirebase = {
    // ... outras funções existentes ...
    verifyAdminAccess,  // <-- ADICIONAR ESTA LINHA
    // ... resto das funções ...
};

// FUNÇÕES PRINCIPAIS
async function loginAdmin(email, password) {
    console.log('🔐 Tentando login:', email);
    
    try {
        // Fazer login
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login Auth OK:', userCredential.user.email);
        
        // Verificar se é admin (versão SIMPLES)
        return await checkIfAdmin(userCredential.user.uid);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        throw error;
    }
}

async function checkIfAdmin(uid) {
    console.log('👑 Verificando admin para UID:', uid);
    
    try {
        // Tenta buscar na coleção 'admins'
        const adminDoc = await db.collection('admins').doc(uid).get();
        
        if (adminDoc.exists) {
            console.log('✅ Usuário é admin (encontrado na coleção)');
            return true;
        }
        
        // Se não encontrou, verifica email específico (PARA TESTE)
        const user = auth.currentUser;
        if (user && user.email) {
            console.log('📧 Email do usuário:', user.email);
            
            // PARA TESTES: Aceitar qualquer email com 'admin' OU emails específicos
            if (user.email.includes('admin') || 
                user.email === 'admin@exemplo.com' ||
                user.email === 'admin@teste.com') {
                console.log('⚠️ PERMITINDO ACESSO PARA TESTE');
                return true;
            }
        }
        
        console.log('❌ Usuário não é admin');
        return false;
        
    } catch (error) {
        console.error('❌ Erro ao verificar admin:', error);
        // Em caso de erro, permitir acesso (APENAS PARA DESENVOLVIMENTO)
        return true;
    }
}

function logoutAdmin() {
    return auth.signOut();
}

function getCurrentAdmin() {
    return auth.currentUser;
}

async function requireAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 Usuário autenticado:', user.email);
                
                const isAdmin = await checkIfAdmin(user.uid);
                if (isAdmin) {
                    resolve(user);
                } else {
                    reject(new Error('Não é administrador'));
                }
            } else {
                reject(new Error('Não autenticado'));
            }
        });
    });
}

// Debug helper
function debugAuth() {
    console.log('=== DEBUG ===');
    console.log('Usuário atual:', getCurrentAdmin()?.email || 'null');
    console.log('UID:', getCurrentAdmin()?.uid || 'null');
    console.log('=== FIM DEBUG ===');
}

// Funções para buscar dados do Firebase
async function getAllReservas(options = {}) {
    console.log('📊 Buscando reservas com opções:', options);
    
    try {
        let query = db.collection('reservas');
        
        // Aplicar filtros
        if (options.status && options.status !== 'all') {
            query = query.where('status', '==', options.status);
        }
        
        if (options.startDate) {
            query = query.where('criadoEm', '>=', options.startDate);
        }
        
        if (options.endDate) {
            query = query.where('criadoEm', '<=', options.endDate);
        }
        
        // Ordenar por data mais recente
        query = query.orderBy('criadoEm', 'desc');
        
        // Limitar resultados se necessário
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const snapshot = await query.get();
        const reservas = [];
        
        snapshot.forEach(doc => {
            reservas.push({
                id: doc.id,
                ...doc.data(),
                criadoEm: doc.data().criadoEm ? doc.data().criadoEm.toDate() : new Date()
            });
        });
        
        console.log(`✅ ${reservas.length} reservas encontradas`);
        return reservas;
        
    } catch (error) {
        console.error('❌ Erro ao buscar reservas:', error);
        throw error;
    }
}

async function getReservasCount(options = {}) {
    try {
        const reservas = await getAllReservas(options);
        return reservas.length;
    } catch (error) {
        console.error('Erro ao contar reservas:', error);
        return 0;
    }
}

async function getRecentReservas(limit = 10) {
    try {
        const query = db.collection('reservas')
            .orderBy('criadoEm', 'desc')
            .limit(limit);
        
        const snapshot = await query.get();
        const reservas = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            reservas.push({
                id: doc.id,
                ...data,
                criadoEm: data.criadoEm ? data.criadoEm.toDate() : new Date()
            });
        });
        
        return reservas;
        
    } catch (error) {
        console.error('Erro ao buscar reservas recentes:', error);
        return [];
    }
}

// Funções para gerenciar reservas
async function updateReserva(reservaId, updates) {
    try {
        await db.collection('reservas').doc(reservaId).update({
            ...updates,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Reserva ${reservaId} atualizada`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao atualizar reserva ${reservaId}:`, error);
        throw error;
    }
}

async function deleteReserva(reservaId) {
    try {
        await db.collection('reservas').doc(reservaId).delete();
        console.log(`🗑️ Reserva ${reservaId} excluída`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao excluir reserva ${reservaId}:`, error);
        throw error;
    }
}

async function deleteMultipleReservas(reservaIds) {
    try {
        const batch = db.batch();
        
        reservaIds.forEach(id => {
            const ref = db.collection('reservas').doc(id);
            batch.delete(ref);
        });
        
        await batch.commit();
        console.log(`🗑️ ${reservaIds.length} reservas excluídas`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao excluir múltiplas reservas:', error);
        throw error;
    }
}

// Funções para relatórios
async function generateReport(options = {}) {
    try {
        const reservas = await getAllReservas(options);
        
        let reportData = {};
        const hoje = new Date();
        const titulo = `Relatório de Reservas - ${hoje.toLocaleDateString('pt-BR')}`;
        
        switch (options.type) {
            case 'reservas':
                // Agrupar por dia
                reservas.forEach(reserva => {
                    if (reserva.criadoEm) {
                        const dia = reserva.criadoEm.toLocaleDateString('pt-BR');
                        if (!reportData[dia]) {
                            reportData[dia] = {
                                total: 0,
                                aprovadas: 0,
                                pendentes: 0,
                                recusadas: 0
                            };
                        }
                        
                        reportData[dia].total++;
                        
                        if (reserva.status === 'aprovado') {
                            reportData[dia].aprovadas++;
                        } else if (reserva.status === 'pendente') {
                            reportData[dia].pendentes++;
                        } else if (reserva.status === 'recusado') {
                            reportData[dia].recusadas++;
                        }
                    }
                });
                break;
                
            case 'turnos':
                reportData = {
                    manha: 0,
                    tarde: 0
                };
                reservas.forEach(reserva => {
                    if (reserva.turno === 'manha') {
                        reportData.manha++;
                    } else if (reserva.turno === 'tarde') {
                        reportData.tarde++;
                    }
                });
                break;
                
            case 'usuarios':
                // Agrupar por responsável
                reservas.forEach(reserva => {
                    const responsavel = reserva.responsavel || 'Desconhecido';
                    if (!reportData[responsavel]) {
                        reportData[responsavel] = 0;
                    }
                    reportData[responsavel]++;
                });
                break;
                
            case 'ocupacao':
                // Agrupar por status
                reportData = {
                    aprovado: 0,
                    pendente: 0,
                    recusado: 0
                };
                reservas.forEach(reserva => {
                    if (reportData.hasOwnProperty(reserva.status)) {
                        reportData[reserva.status]++;
                    }
                });
                break;
                
            default:
                reportData = {
                    total: reservas.length
                };
        }
        
        return {
            titulo,
            tipo: options.type || 'reservas',
            totalReservas: reservas.length,
            dados: reportData,
            periodo: {
                inicio: options.startDate,
                fim: options.endDate
            }
        };
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        throw error;
    }
}

function exportToFormat(data, format = 'csv') {
    switch (format) {
        case 'csv':
            return convertToCSV(data);
        case 'json':
            return JSON.stringify(data, null, 2);
        case 'html':
            return convertToHTML(data);
        default:
            return JSON.stringify(data);
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Cabeçalhos
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    // Dados
    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header];
            
            // Tratar valores especiais
            if (value instanceof Date) {
                value = value.toISOString();
            } else if (Array.isArray(value)) {
                value = value.join(';');
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            } else if (typeof value === 'string') {
                // Escapar vírgulas em strings
                if (value.includes(',')) {
                    value = `"${value}"`;
                }
            }
            
            return value || '';
        });
        
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

function convertToHTML(data) {
    if (!data || data.length === 0) return '<p>Nenhum dado disponível</p>';
    
    const headers = Object.keys(data[0]);
    
    let html = '<table border="1" cellpadding="5" cellspacing="0">';
    
    // Cabeçalho
    html += '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead>';
    
    // Dados
    html += '<tbody>';
    data.forEach(item => {
        html += '<tr>';
        headers.forEach(header => {
            let value = item[header];
            
            if (value instanceof Date) {
                value = value.toLocaleDateString('pt-BR');
            } else if (Array.isArray(value)) {
                value = value.join(', ');
            }
            
            html += `<td>${value || ''}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    return html;
}

// Funções para backup
async function backupData() {
    try {
        const [reservasSnapshot, adminsSnapshot] = await Promise.all([
            db.collection('reservas').get(),
            db.collection('admins').get()
        ]);
        
        const backup = {
            timestamp: new Date().toISOString(),
            reservas: [],
            admins: []
        };
        
        reservasSnapshot.forEach(doc => {
            backup.reservas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        adminsSnapshot.forEach(doc => {
            backup.admins.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Backup criado: ${backup.reservas.length} reservas, ${backup.admins.length} admins`);
        return backup;
        
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        throw error;
    }
}

async function restoreData(backupData) {
    try {
        const batch = db.batch();
        
        // Restaurar reservas
        if (backupData.reservas) {
            backupData.reservas.forEach(reserva => {
                const ref = db.collection('reservas').doc(reserva.id);
                const { id, ...data } = reserva;
                batch.set(ref, data);
            });
        }
        
        // Restaurar admins
        if (backupData.admins) {
            backupData.admins.forEach(admin => {
                const ref = db.collection('admins').doc(admin.id);
                const { id, ...data } = admin;
                batch.set(ref, data);
            });
        }
        
        await batch.commit();
        console.log('✅ Dados restaurados com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao restaurar dados:', error);
        throw error;
    }
}

async function clearOldData(days = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const snapshot = await db.collection('reservas')
            .where('criadoEm', '<', cutoffDate)
            .get();
        
        const batch = db.batch();
        let count = 0;
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`🗑️ ${count} reservas antigas excluídas`);
        }
        
        return count;
        
    } catch (error) {
        console.error('❌ Erro ao limpar dados antigos:', error);
        throw error;
    }
}

// Funções para administradores
async function addAdmin(adminData) {
    try {
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(
            adminData.email,
            adminData.password
        );
        
        // Adicionar à coleção admins
        await db.collection('admins').doc(userCredential.user.uid).set({
            nome: adminData.nome,
            email: adminData.email,
            nivel: adminData.nivel || 'admin',
            ativo: true,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            criadoPor: getCurrentAdmin().uid
        });
        
        console.log(`✅ Admin ${adminData.email} adicionado`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao adicionar admin:', error);
        throw error;
    }
}

async function deleteAdmin(adminId) {
    try {
        // Não permitir deletar a si mesmo
        if (adminId === getCurrentAdmin().uid) {
            throw new Error('Não é possível excluir sua própria conta');
        }
        
        // Excluir do Firestore
        await db.collection('admins').doc(adminId).delete();
        
        // Excluir do Firebase Auth
        await auth.deleteUser(adminId);
        
        console.log(`🗑️ Admin ${adminId} excluído`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao excluir admin:', error);
        throw error;
    }
}

// EXPORTAR PARA window
window.adminFirebase = {
    loginAdmin,
    logoutAdmin,
    getCurrentAdmin,
    requireAuth,
    checkIfAdmin,
    debugAuth,
    db: db,
    auth: auth,
    getAllReservas,
    getReservasCount,
    getRecentReservas,
    updateReserva,
    deleteReserva,
    deleteMultipleReservas,
    generateReport,
    exportToFormat,
    backupData,
    restoreData,
    clearOldData,
    addAdmin,
    deleteAdmin
};

console.log('✅ Todas as funções do adminFirebase carregadas');
console.log('✅ adminFirebase exportado para window');
console.log('adminFirebase disponível?', typeof window.adminFirebase !== 'undefined');