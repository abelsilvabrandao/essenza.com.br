// Configurações sensíveis do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAxwRPEkFUE_rudNjKT7xrg5lSLfTHUe-g",
    authDomain: "siteabel-4bcca.firebaseapp.com",
    projectId: "siteabel-4bcca",
    storageBucket: "siteabel-4bcca.appspot.com",
    messagingSenderId: "865433569180",
    appId: "1:865433569180:web:2ad4d6391ad2432b25aa59",
    measurementId: "G-PDFHYJ6YZK"
};

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    // Para Node.js
    module.exports = { firebaseConfig };
} else {
    // Para navegador
    window.firebaseConfig = firebaseConfig;
}

