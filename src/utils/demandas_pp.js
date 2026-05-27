import { aplicarXP } from './xp';
import {
  collection, getDocs, query, where,
  deleteDoc, updateDoc, addDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { criarNotificacao } from './demandas';



export async function processarDemandasPPExpiradas() {
  const agora = new Date();
  try {
    const snap    = await getDocs(collection(db,'demandas_pp'));
    const demandas = snap.docs.map(d=>({id:d.id,...d.data()}));
    for (const d of demandas) {
      const prazo       = d.prazo?.toDate       ? d.prazo.toDate()       : d.prazo       ? new Date(d.prazo)       : null;
      const expiracao24 = d.expiracao24h?.toDate ? d.expiracao24h.toDate() : d.expiracao24h ? new Date(d.expiracao24h) : null;

      if (d.status === 'aguardando' && expiracao24 && agora > expiracao24) {
        const mSnap = await getDocs(query(collection(db,'usuarios'),
          where('cargo','in',['Membro P&P','Coordenador P&P'])));
        for (const m of mSnap.docs) {
          await aplicarXP(m.data().matricula, -30);
          await criarNotificacao(m.data().matricula,'⚠️ Demanda P&P expirada',
            `A demanda "${d.titulo}" não foi aceita em 24h. -30 XP aplicados.`,'xp_perda');
        }
        await deleteDoc(doc(db,'demandas_pp',d.id));
        continue;
      }

      if (d.status === 'em_progresso' && prazo && agora > prazo) {
        for (const part of (d.participantes||[])) {
          const eSnap = await getDocs(query(collection(db,'envios_demanda_pp'),
            where('demandaId','==',d.id), where('userId','==',part.userId)));
          if (eSnap.empty) {
            await aplicarXP(part.userId, -50);
            await criarNotificacao(part.userId,'❌ Prazo P&P encerrado',
              `Você não entregou a demanda "${d.titulo}" no prazo. -50 XP aplicados.`,'xp_perda');
          }
        }
        await deleteDoc(doc(db,'demandas_pp',d.id));
      }
    }
  } catch(e) { console.log('processarPP error:',e); }
}
