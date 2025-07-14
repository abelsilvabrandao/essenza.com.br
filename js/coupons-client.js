import { collection, getDocs, getFirestore } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

const db = getFirestore();
const couponsCol = collection(db, "coupons");

export async function getCouponByCode(code) {
  const snapshot = await getDocs(couponsCol);
  const coupon = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .find(c => c.code.toUpperCase() === code.toUpperCase());
  return coupon || null;
}
