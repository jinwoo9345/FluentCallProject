import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PAYMENTS_COLLECTION = 'payments';

export const paymentService = {
  async recordPayment(paymentData: any) {
    const paymentRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
      ...paymentData,
      status: 'completed',
      createdAt: serverTimestamp()
    });
    return paymentRef;
  },

  async updateUserCredits(userId: string, amount: number) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      credits: increment(amount)
    });
  },

  async handleReferralReward(newUserId: string, referrerCode: string) {
    if (!referrerCode) return;

    // Find referrer by code
    const usersRef = collection(db, 'users');
    const { query, where, getDocs } = await import('firebase/firestore');
    const q = query(usersRef, where('referralCode', '==', referrerCode));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const referrerDoc = snapshot.docs[0];
      const referrerId = referrerDoc.id;

      // Award credits to both (Example: 10 credits each)
      const REWARD_AMOUNT = 10;
      
      const batch = (await import('firebase/firestore')).writeBatch(db);
      batch.update(doc(db, 'users', referrerId), { credits: increment(REWARD_AMOUNT) });
      batch.update(doc(db, 'users', newUserId), { credits: increment(REWARD_AMOUNT) });
      await batch.commit();
      
      console.log(`Referral rewards sent to ${referrerId} and ${newUserId}`);
    }
  }
};
