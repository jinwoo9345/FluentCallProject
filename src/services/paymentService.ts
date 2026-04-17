import { collection, serverTimestamp, doc, updateDoc, increment, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PAYMENTS_COLLECTION = 'payments';

export const paymentService = {
  async recordPayment(orderId: string, paymentData: any) {
    const paymentRef = doc(db, PAYMENTS_COLLECTION, orderId);
    await setDoc(
      paymentRef,
      {
        ...paymentData,
        status: 'completed',
        confirmedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return paymentRef;
  },

  async updateUserCredits(userId: string, amount: number) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      credits: increment(amount)
    });
  },

  async handleReferralReward(payerUserId: string, referrerCode: string) {
    if (!referrerCode) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referrerCode.trim().toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;

    // 본인 코드로 본인 결제 시 지급 금지
    if (referrerId === payerUserId) return;

    // 결제자(친구)는 보상을 받지 않음. 초대한 사람(추천인)에게만 20 포인트 지급
    const REWARD_AMOUNT = 20;
    await updateDoc(doc(db, 'users', referrerId), {
      credits: increment(REWARD_AMOUNT),
    });

    console.log(`Referral reward (${REWARD_AMOUNT}) sent to referrer ${referrerId} (paid by ${payerUserId})`);
  }
};
