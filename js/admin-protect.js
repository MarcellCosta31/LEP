// admin-protect.js - PROTEGER ACESSO DIRETO AO ADMIN.HTML

console.log('🛡️ Carregando proteção do admin...');

// Aguardar Firebase carregar
let firebaseLoaded = false;

function checkFirebaseLoaded() {
    if (typeof firebase !== 'undefined' && 
        typeof window.adminFirebase !== 'undefined') {
        console.log('✅ Firebase carregado, verificando acesso...');
        firebaseLoaded = true;
        protectAdminPage();
    } else {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(checkFirebaseLoaded, 500);
    }
}

// Verificar se estamos na página admin
function isAdminPage() {
    return document.querySelector('.admin-container') !== null;
}

// Proteger a página admin
async function protectAdminPage() {
    if (!isAdminPage()) {
        console.log('⚠️ Não é página admin');
        return;
    }
    
    console.log('🛡️ Protegendo página admin...');
    
    try {
        // Verificar se o adminFirebase tem a função verifyAdminAccess
        if (!window.adminFirebase || typeof window.adminFirebase.verifyAdminAccess !== 'function') {
            console.error('❌ adminFirebase não carregado corretamente');
            window.location.href = 'login.html';
            return;
        }
        
        // Verificar acesso
        const user = await adminFirebase.verifyAdminAccess();
        console.log('✅ Acesso autorizado para:', user.email);
        
        // Carregar informações do admin
        loadAdminInfo(user);
        
        // Remover botão DEBUG se existir
        const debugBtn = document.querySelector('button[style*="bottom: 10px"]');
        if (debugBtn) debugBtn.remove();
        
    } catch (error) {
        console.error('❌ Erro na verificação de acesso:', error);
        
        // Redirecionar para login
        let redirectUrl = 'login.html';
        
        // Adicionar parâmetro de redirecionamento se não for erro de login
        if (!error.message.includes('faça login')) {
            redirectUrl += '?error=' + encodeURIComponent(error.message);
        }
        
        // Mostrar mensagem e redirecionar
        alert('❌ Acesso não autorizado. Redirecionando para login...');
        window.location.href = redirectUrl;
    }
}

// Carregar informações do admin
function loadAdminInfo(user) {
    console.log('👤 Carregando info do admin:', user.email);
    
    // Atualizar interface
    const emailDisplay = document.getElementById('adminEmailDisplay');
    const userName = document.getElementById('userName');
    
    if (emailDisplay) emailDisplay.textContent = user.email;
    if (userName) userName.textContent = user.email.split('@')[0];
    
    // Mostrar que está logado
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.style.display = 'flex';
    }
}

// Configurar botão de logout
function setupLogoutButton() {
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (confirm('Deseja realmente sair?')) {
                try {
                    await adminFirebase.logoutAdmin();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Erro no logout:', error);
                    alert('Erro ao fazer logout');
                }
            }
        });
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado');
    
    // Verificar se estamos na página admin
    if (isAdminPage()) {
        console.log('🖥️ Página admin detectada, verificando autenticação...');
        checkFirebaseLoaded();
        setupLogoutButton();
        
        // Ocultar conteúdo até a verificação
        document.querySelector('.main-content').style.opacity = '0.5';
    }
});