import { collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Recipe } from '../../types';

export const getHistoryRecipes = async (): Promise<Recipe[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const recipesRef = collection(db, `users/${user.uid}/recipes`);
  const q = query(recipesRef);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
};
