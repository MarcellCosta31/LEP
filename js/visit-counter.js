(function() {
    if (sessionStorage.getItem('lep_visit_counted')) return;

    function initCounter() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && window.APP_CONFIG) {
            var db = firebase.firestore();
            var docRef = db.collection('stats').doc('visits');
            docRef.update({
                count: firebase.firestore.FieldValue.increment(1),
                lastVisit: firebase.firestore.FieldValue.serverTimestamp(),
                lastPage: window.location.pathname
            }).catch(function() {
                docRef.set({
                    count: 1,
                    lastVisit: firebase.firestore.FieldValue.serverTimestamp(),
                    lastPage: window.location.pathname
                });
            });
            sessionStorage.setItem('lep_visit_counted', '1');
            return true;
        }
        return false;
    }

    if (initCounter()) return;

    var check = setInterval(function() {
        if (initCounter()) clearInterval(check);
    }, 300);

    setTimeout(function() {
        clearInterval(check);
        if (!sessionStorage.getItem('lep_visit_counted')) {
            var appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js';
            appScript.onload = function() {
                var fsScript = document.createElement('script');
                fsScript.src = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js';
                fsScript.onload = function() {
                    var configScript = document.createElement('script');
                    configScript.src = 'js/config.js';
                    configScript.onload = function() {
                        firebase.initializeApp({
                            apiKey: window.APP_CONFIG.FIREBASE_API_KEY,
                            authDomain: window.APP_CONFIG.FIREBASE_AUTH_DOMAIN,
                            projectId: window.APP_CONFIG.FIREBASE_PROJECT_ID,
                            storageBucket: window.APP_CONFIG.FIREBASE_STORAGE_BUCKET,
                            messagingSenderId: window.APP_CONFIG.FIREBASE_MESSAGING_SENDER_ID,
                            appId: window.APP_CONFIG.FIREBASE_APP_ID
                        });
                        var db = firebase.firestore();
                        var docRef = db.collection('stats').doc('visits');
                        docRef.update({
                            count: firebase.firestore.FieldValue.increment(1),
                            lastVisit: firebase.firestore.FieldValue.serverTimestamp(),
                            lastPage: window.location.pathname
                        }).catch(function() {
                            docRef.set({
                                count: 1,
                                lastVisit: firebase.firestore.FieldValue.serverTimestamp(),
                                lastPage: window.location.pathname
                            });
                        });
                        sessionStorage.setItem('lep_visit_counted', '1');
                    };
                    document.head.appendChild(configScript);
                };
                document.head.appendChild(fsScript);
            };
            document.head.appendChild(appScript);
        }
    }, 3000);
})();
