(function() {
    function contar() {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
            console.log('⏳ visit-counter: Firebase não disponível ainda');
            return false;
        }
        try {
            var db = firebase.firestore();
            var ref = db.collection('admins').doc('visitas');
            ref.update({
                visitas: firebase.firestore.FieldValue.increment(1),
                ultimaVisita: firebase.firestore.FieldValue.serverTimestamp(),
                pagina: window.location.pathname
            }).then(function() {
                console.log('✅ Visita contada!');
            }).catch(function(err) {
                if (err.code === 'not-found') {
                    ref.set({
                        visitas: 1,
                        ultimaVisita: firebase.firestore.FieldValue.serverTimestamp(),
                        pagina: window.location.pathname
                    }).then(function() {
                        console.log('✅ Primeira visita registrada!');
                    }).catch(function(err2) {
                        console.error('❌ Erro ao criar documento:', err2);
                    });
                } else {
                    console.error('❌ Erro ao atualizar visita:', err);
                }
            });
            return true;
        } catch(e) {
            console.error('❌ Erro no visit-counter:', e);
            return false;
        }
    }

    if (contar()) return;

    var tentativas = 0;
    var check = setInterval(function() {
        tentativas++;
        if (contar()) {
            clearInterval(check);
        } else if (tentativas >= 30) {
            clearInterval(check);
            console.log('❌ visit-counter: Firebase não inicializado após 30 tentativas');
        }
    }, 500);
})();
