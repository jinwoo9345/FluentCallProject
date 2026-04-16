import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Tutor } from '../types';

const TUTORS_COLLECTION = 'tutors';

export const tutorService = {
  async getAllTutors(): Promise<Tutor[]> {
    const tutorRef = collection(db, TUTORS_COLLECTION);
    const snapshot = await getDocs(tutorRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tutor));
  },

  async getTutorById(id: string): Promise<Tutor | null> {
    const tutorRef = doc(db, TUTORS_COLLECTION, id);
    const snapshot = await getDoc(tutorRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Tutor;
    }
    return null;
  },

  async getTutorsByIds(ids: string[]): Promise<Tutor[]> {
    if (!ids || ids.length === 0) return [];
    
    // Firestore 'in' query supports up to 10-30 IDs usually. 
    // If more, we might need to batch or fetch individually.
    const tutorRef = collection(db, TUTORS_COLLECTION);
    const q = query(tutorRef, where('id', 'in', ids));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tutor));
  }
};
