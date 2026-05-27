import { aplicarXP } from './xp';
import { collection, getDocs, query, where, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { criarNotificacao } from './demandas';



export async function processarDemandasExpiradas_demandas_eventos() {
  const agora = new Date();
  try {
    const snap = await getDocs(collection(db,'demandas_eventos'));
    for (const d of snap.docs.map(d=>{return {id:d.id,...d.data()}})) {
      const prazo       = d.prazo?.toDate ? d.prazo.toDate() : d.prazo ? new Date(d.prazo) : null;
      const expiracao24 = d.expiracao24h?.toDate ? d.expiracao24h.toDate() : d.expiracao24h ? new Date(d.expiracao24h) : null;
      if (d.status==='aguardando' && expiracao24 && agora > expiracao24) {
        const mSnap = await getDocs(query(collection(db,'usuarios'), where('cargo','in',['Membro de Eventos', 'Coordenador de Eventos'])));
        for (const m of mSnap.docs) {
          await aplicarXP(m.data().matricula, -30);
          await criarNotificacao(m.data().matricula, '⚠️ Demanda expirada', 'A demanda "' + d.titulo + '" não foi aceita em 24h. -30 XP.', 'xp_perda');
        }
        await deleteDoc(doc(db,'demandas_eventos',d.id));
      } else if (d.status==='em_progresso' && prazo && agora > prazo) {
        for (const part of (d.participantes||[])) {
          const eSnap = await getDocs(query(collection(db,'envios_demandas_eventos'), where('demandaId','==',d.id), where('userId','==',part.userId)));
          if (eSnap.empty) {
            await aplicarXP(part.userId, -50);
            await criarNotificacao(part.userId, '❌ Prazo encerrado', 'Você não entregou a demanda "' + d.titulo + '" no prazo. -50 XP.', 'xp_perda');
          }
        }
        await deleteDoc(doc(db,'demandas_eventos',d.id));
      }
    }
  } catch(e) { console.log('processarDemandas error:',e); }
}
