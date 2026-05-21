// analytics-simples.js - Contador de visitas simples
// Soma +1 no campo "visitas" do documento do admin

console.log('📊 Iniciando contador de visitas...');

// Configurações
const ADMIN_UID = 'admin_principal'; // OU o UID do seu admin
const ADMIN_DOC_ID = 'admin_principal'; // ID do documento na coleção admins

// Função para registrar visita (soma +1)
async function registrarVisita() {
    // Aguardar Firebase
    if (typeof db === 'undefined') {
        console.log('⏳ Aguardando Firebase...');
        setTimeout(registrarVisita, 500);
        return;
    }
    
    // Verificar se já contou esta sessão hoje
    const hoje = new Date().toISOString().split('T')[0];
    const sessionKey = `visitou_${hoje}`;
    
    if (sessionStorage.getItem(sessionKey)) {
        console.log('📊 Já contou visita hoje nesta sessão');
        return;
    }
    
    try {
        // Primeiro, tentar encontrar o documento do admin
        const adminsSnapshot = await db.collection('admins').limit(1).get();
        
        if (adminsSnapshot.empty) {
            console.error('❌ Nenhum administrador encontrado no Firestore');
            return;
        }
        
        // Pegar o primeiro admin (ou você pode especificar um específico)
        const adminDoc = adminsSnapshot.docs[0];
        const adminId = adminDoc.id;
        
        console.log(`📊 Adicionando visita para admin: ${adminId}`);
        
        // Atualizar: incrementar +1 no campo visitas
        await db.collection('admins').doc(adminId).update({
            visitas: firebase.firestore.FieldValue.increment(1),
            ultimaVisita: firebase.firestore.FieldValue.serverTimestamp(),
            visitasHoje: firebase.firestore.FieldValue.increment(1)
        });
        
        // Marcar que já contou hoje
        sessionStorage.setItem(sessionKey, 'true');
        
        // Buscar o total atualizado
        const docAtualizado = await db.collection('admins').doc(adminId).get();
        const totalVisitas = docAtualizado.data().visitas || 0;
        
        console.log(`✅ Visita registrada! Total: ${totalVisitas}`);
        
        // Mostrar no console se for admin
        if (window.location.pathname.includes('admin')) {
            console.log(`🎯 Total de visitas ao site: ${totalVisitas}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao registrar visita:', error);
        
        // Se o campo 'visitas' não existe, criar
        if (error.code === 'not-found') {
            try {
                const adminsSnapshot = await db.collection('admins').limit(1).get();
                if (!adminsSnapshot.empty) {
                    await db.collection('admins').doc(adminsSnapshot.docs[0].id).set({
                        visitas: 1,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log('✅ Campo visitas criado com sucesso!');
                }
            } catch (createError) {
                console.error('❌ Erro ao criar campo:', createError);
            }
        }
    }
}

// Registrar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(registrarVisita, 1000);
    });
} else {
    setTimeout(registrarVisita, 1000);
}

// Função para mostrar estatísticas no admin
async function getEstatisticasVisitas() {
    try {
        const adminsSnapshot = await db.collection('admins').limit(1).get();
        if (adminsSnapshot.empty) return null;
        
        const admin = adminsSnapshot.docs[0].data();
        
        return {
            totalVisitas: admin.visitas || 0,
            ultimaVisita: admin.ultimaVisita ? admin.ultimaVisita.toDate() : null,
            visitasHoje: admin.visitasHoje || 0
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return null;
    }
}

// Exportar para uso no admin
if (typeof window !== 'undefined') {
    window.getEstatisticasVisitas = getEstatisticasVisitas;
    window.registrarVisita = registrarVisita;
}