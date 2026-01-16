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

// EXPORTAR PARA window
window.adminFirebase = {
    loginAdmin,
    logoutAdmin,
    getCurrentAdmin,
    requireAuth,
    checkIfAdmin,
    debugAuth,
    db: db,
    auth: auth
};

console.log('✅ adminFirebase exportado para window');
console.log('adminFirebase disponível?', typeof window.adminFirebase !== 'undefined');