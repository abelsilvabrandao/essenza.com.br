import { collection, getDocs, getFirestore } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js';

// Config Firebase igual vendas.html
const firebaseConfig = {
  apiKey: "AIzaSyAxwRPEkFUE_rudNjKT7xrg5lSLfTHUe-g",
  authDomain: "siteabel-4bcca.firebaseapp.com",
  projectId: "siteabel-4bcca",
  storageBucket: "siteabel-4bcca.appspot.com",
  messagingSenderId: "865433569180",
  appId: "1:865433569180:web:2ad4d6391ad2432b25aa59",
  measurementId: "G-PDFHYJ6YZK"
};
if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();
const couponsCol = collection(db, "coupons");

export async function getCouponByCode(code) {
  const snapshot = await getDocs(couponsCol);
  const coupon = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .find(c => c.code.toUpperCase() === code.toUpperCase());
  return coupon || null;
}
