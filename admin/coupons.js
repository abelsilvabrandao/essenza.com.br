import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const db = getFirestore();
const couponsCol = collection(db, "coupons");

export async function fetchCoupons() {
  const snapshot = await getDocs(couponsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addCoupon(data) {
  return await addDoc(couponsCol, data);
}

export async function updateCoupon(id, data) {
  const couponRef = doc(db, "coupons", id);
  return await updateDoc(couponRef, data);
}

export async function deleteCoupon(id) {
  const couponRef = doc(db, "coupons", id);
  return await deleteDoc(couponRef);
}
