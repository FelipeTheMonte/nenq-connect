import { aplicarXP } from './xp';
import {
  collection, getDocs, query, where,
  deleteDoc, updateDoc, addDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export async function criarNotificacao(userId, titulo, mensagem, tipo = 'info') {
  try {
    await addDoc(collection(db, 'notificacoes_membros'), {
      userId, titulo, mensagem, tipo, lida: false, criadoEm: serverTimestamp(),
    });
  } catch (e) { console.log('notif error:', e); }
}

export async function processarDemandasExpiradas() {
  const agora = new Date();
  try {
    const snap    = await getDocs(collection(db, 'demandas_marketing'));
    const demandas = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    for (const d of demandas) {
      const prazo       = d.prazo?.toDate       ? d.prazo.toDate()       : d.prazo       ? new Date(d.prazo)       : null;
      const expiracao24 = d.expiracao24h?.toDate ? d.expiracao24h.toDate() : d.expiracao24h ? new Date(d.expiracao24h) : null;

      // 24h sem aceite
      if (d.status === 'aguardando' && expiracao24 && agora > expiracao24) {
        const mSnap = await getDocs(query(collection(db,'usuarios'),
          where('cargo','in',['Membro de Marketing','Coordenador de Marketing'])));
        for (const m of mSnap.docs) {
          await aplicarXP(m.data().matricula, -30);
          await criarNotificacao(m.data().matricula, '⚠️ Demanda expirada sem aceite',
            `A demanda "${d.titulo}" não foi aceita em 24h. -30 XP aplicados.`, 'xp_perda');
        }
        await deleteDoc(doc(db,'demandas_marketing',d.id));
        continue;
      }

      // Prazo de entrega venceu
      if (d.status === 'em_progresso' && prazo && agora > prazo) {
        for (const part of (d.participantes||[])) {
          const eSnap = await getDocs(query(collection(db,'envios_demanda'),
            where('demandaId','==',d.id), where('userId','==',part.userId)));
          if (eSnap.empty) {
            await aplicarXP(part.userId, -50);
            await criarNotificacao(part.userId, '❌ Prazo encerrado sem entrega',
              `Você não entregou a demanda "${d.titulo}" no prazo. -50 XP aplicados.`, 'xp_perda');
          }
        }
        await deleteDoc(doc(db,'demandas_marketing',d.id));
      }
    }
  } catch (e) { console.log('processarDemandas error:', e); }
}
