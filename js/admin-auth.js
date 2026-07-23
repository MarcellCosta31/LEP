// admin-auth.js - VERSÃO SIMPLIFICADA E SEGURA

console.log('🔐 Carregando admin-auth.js...');

// Aguardar o Firebase carregar
let firebaseLoaded = false;

// Verificar se Firebase está disponível
function checkFirebaseLoaded() {
    if (typeof firebase !== 'undefined' && 
        typeof firebase.auth !== 'undefined' &&
        window.adminFirebase) {
        console.log('✅ Firebase carregado, iniciando...');
        firebaseLoaded = true;
        initializeLogin();
    } else {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(checkFirebaseLoaded, 500);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado');
    
    // Verificar se estamos na página de login
    if (document.getElementById('loginForm')) {
        console.log('🔑 Página de login detectada');
        checkFirebaseLoaded();
    }
    
    // Verificar se estamos no painel admin
    if (document.querySelector('.admin-container')) {
        console.log('🖥️ Painel admin detectado');
        checkFirebaseLoaded();
        setupAdminPage();
    }
});

// INICIALIZAR LOGIN
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.log('⚠️ Não é página de login');
        return;
    }
    
    console.log('🔑 Configurando formulário de login...');
    
    // Remover event listeners antigos
    const newForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newForm, loginForm);
    
    // Configurar novo listener
    newForm.addEventListener('submit', handleLogin);
    
    console.log('✅ Login configurado');
}

// MANIPULAR LOGIN
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const loginError = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validação básica
    if (!email || !password) {
        showError(loginError, 'Preencha e-mail e senha');
        return;
    }
    
    // Estado de loading
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Entrando...';
    submitBtn.disabled = true;
    
    if (loginError) {
        loginError.style.display = 'none';
    }
    
    try {
        console.log('🔄 Processando login...');
        
        // 1. Verificar se adminFirebase está disponível
        if (!window.adminFirebase) {
            throw new Error('Sistema não carregado. Recarregue a página.');
        }
        
        // 2. Fazer login
        const isAdmin = await adminFirebase.loginAdmin(email, password);
        
        if (isAdmin) {
            console.log('✅ Login bem-sucedido!');
            
            // Pequeno delay para garantir persistência
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 800);
            
        } else {
            // Fazer logout se não for admin
            await adminFirebase.logoutAdmin();
            throw new Error('Acesso não autorizado. Este usuário não é administrador.');
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        
        // Mensagens amigáveis
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado. Verifique o e-mail.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Senha incorreta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'E-mail inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Muitas tentativas. Tente mais tarde.';
        } else if (error.message.includes('não é administrador')) {
            errorMessage = 'Este usuário não tem permissão de administrador.';
        } else if (error.message.includes('Sistema não carregado')) {
            errorMessage = 'Erro no sistema. Recarregue a página (F5).';
        }
        
        showError(loginError, errorMessage);
        
        // Restaurar botão
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function setupAdminPage() {
    console.log('⚙️ Configurando página admin...');
    
    // Botão de logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                await adminFirebase.logoutAdmin();
                // ALTERAÇÃO: Redirecionar para index.html em vez de login.html
                window.location.href = '../index.html'; // ou apenas 'index.html' dependendo da estrutura
            } catch (error) {
                console.error('Erro no logout:', error);
                alert('Erro ao fazer logout');
            }
        });
    }
    
    // Verificar autenticação
    setTimeout(() => {
        protectAdminPage();
    }, 1000);
}

// PROTEGER PÁGINA ADMIN
async function protectAdminPage() {
    console.log('🛡️ Verificando autenticação...');
    
    try {
        await adminFirebase.requireAuth();
        console.log('✅ Acesso autorizado');
        
        // Carregar informações do admin
        loadAdminInfo();
        
    } catch (error) {
        console.error('❌ Erro de autenticação:', error.message);
        
        if (error.message.includes('Não autenticado')) {
            alert('Por favor, faça login primeiro.');
        } else if (error.message.includes('Não é administrador')) {
            alert('Acesso não autorizado. Apenas administradores.');
        }
        
        window.location.href = 'login.html';
    }
}

// CARREGAR INFORMAÇÕES DO ADMIN
function loadAdminInfo() {
    const admin = adminFirebase.getCurrentAdmin();
    
    if (admin) {
        console.log('👤 Carregando info do admin:', admin.email);
        
        // Atualizar interface
        const emailDisplay = document.getElementById('adminEmailDisplay');
        const userName = document.getElementById('userName');
        
        if (emailDisplay) emailDisplay.textContent = admin.email;
        if (userName) userName.textContent = admin.email.split('@')[0];
    }
}

// MOSTRAR ERRO
function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    } else {
        alert(message);
    }
}

