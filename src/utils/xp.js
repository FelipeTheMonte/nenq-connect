// Utilitário central de XP — atualiza xp total E xpMensal
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

export async function aplicarXP(matricula, delta) {
  try {
    const snap = await getDocs(query(collection(db,'usuarios'), where('matricula','==',matricula)));
    if (snap.empty) return;
    const uDoc = snap.docs[0];
    const data = uDoc.data();
    const mes  = mesAtual();

    const novoTotal   = Math.max(0, (data.xp || 0) + delta);
    const xpMensal    = data.xpMensal || {};
    const mensal      = xpMensal[mes] || 0;
    // XP mensal não vai abaixo de 0
    const novoMensal  = Math.max(0, mensal + delta);

    await updateDoc(doc(db,'usuarios',uDoc.id), {
      xp: novoTotal,
      [`xpMensal.${mes}`]: novoMensal,
    });
  } catch(e) { console.log('aplicarXP error:', e); }
}
