import React, { useState, useEffect, useRef } from 'react';
import { db }                        from './firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import LoginScreen, { TelaBanida }   from './screens/LoginScreen';
import HomeScreen                    from './screens/HomeScreen';
import PerfilScreen                  from './screens/PerfilScreen';
import GestaoScreen                  from './screens/GestaoScreen';
import MarketingScreen               from './screens/MarketingScreen';
import ProjetosScreen                from './screens/ProjetosScreen';
import EventosScreen                 from './screens/EventosScreen';
import GPDemandaScreen               from './screens/GPDemandaScreen';
import CalendarioScreen              from './screens/CalendarioScreen';
import RankingScreen                 from './screens/RankingScreen';
import NotificacoesScreen            from './screens/NotificacoesScreen';
import WelcomeScreen                 from './screens/WelcomeScreen';
import ChatMarketingScreen           from './screens/ChatMarketingScreen';
import { podeAcessarChat }            from './screens/ChatMarketingScreen';
import ChatEventosScreen              from './screens/ChatEventosScreen';
import { podeAcessarChatEventos }     from './screens/ChatEventosScreen';
import ChatPPScreen                   from './screens/ChatPPScreen';
import { podeAcessarChatPP }          from './screens/ChatPPScreen';
import ChatGPScreen                   from './screens/ChatGPScreen';
import { podeAcessarChatGP }          from './screens/ChatGPScreen';
import ChatHubScreen                  from './screens/ChatHubScreen';
import OutrosScreen                  from './screens/OutrosScreen';
import BottomNav                     from './components/BottomNav';



export default function App() {
  const [user, setUser]               = useState(null);
  const [banido, setBanido]           = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tab, setTab]                 = useState('home');
  const [autoLogging, setAutoLogging] = useState(true);
  const [badgeNotif, setBadgeNotif]   = useState(0);
  const [badgeChat, setBadgeChat]     = useState(0);
  const [badgeChatEventos, setBadgeChatEventos] = useState(0);
  const [badgeChatPP, setBadgeChatPP]           = useState(0);
  const [badgeChatGP, setBadgeChatGP]           = useState(0);

  // Auto-login
  useEffect(() => {
    const tryAutoLogin = async () => {
      try {
        const savedId = localStorage.getItem('nenq_session_id');
        if (!savedId) { setAutoLogging(false); return; }
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'usuarios', savedId));
        if (!snap.exists()) { localStorage.removeItem('nenq_session_id'); setAutoLogging(false); return; }
        const u = { id: snap.id, ...snap.data() };
        if (u.status === 'banido') { setBanido(true); localStorage.removeItem('nenq_session_id'); setAutoLogging(false); return; }
        setUser(u); setTab('home');
      } catch { localStorage.removeItem('nenq_session_id'); }
      setAutoLogging(false);
    };
    tryAutoLogin();
  }, []);

  // Badge de notificações
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,'notificacoes_membros'),
      where('userId','==',user.matricula), where('lida','==',false));
    const unsub = onSnapshot(q,
      snap => setBadgeNotif(snap.docs.length),
      ()  => {},
      err => { console.log('snapshot error:', err); }
    );
    return unsub;
  }, [user]);

  const handleLogin = u => {
    if (u.banido || u.status === 'banido') { setBanido(true); return; }
    localStorage.setItem('nenq_session_id', u.id);
    const key = `nenq_welcomed_${u.id}`;
    setUser(u); setTab('home');
    if (!localStorage.getItem(key)) setShowWelcome(true);
  };

  const handleContinuar = () => {
    localStorage.setItem(`nenq_welcomed_${user.id}`, '1');
    setShowWelcome(false);
  };

  // "Outros" → sub-navegação
  const handleOutros = subtab => setTab(subtab);

  if (autoLogging) return (
    <div style={shell}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'var(--cream)' }}>
          N<span style={{ color:'var(--gold)' }}>En</span>Q
        </div>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" style={{ animation:'spin .8s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
        </svg>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (banido) return (
    <div style={{ ...shell, overflowY:'auto' }}>
      <TelaBanida onVoltar={() => { setBanido(false); setUser(null); }} />
    </div>
  );

  if (!user) return (
    <div style={{ ...shell, overflowY:'auto' }}>
      <LoginScreen onLogin={handleLogin} />
    </div>
  );

  if (showWelcome) return (
    <div style={shell}>
      <WelcomeScreen onContinuar={handleContinuar} />
    </div>
  );

  // Sub-telas de "Outros" que ficam dentro do app mas com botão voltar
  const isSubTab = ['ranking','calendario','notificacoes', ...(user.cargo === 'Coordenação Geral' ? ['marketing'] : [])].includes(tab);

  return (
    <div style={shell}>
      <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
        <div style={{ height:'100%', animation:'fadeIn .18s ease' }}>
          {tab==='home'         && <HomeScreen        user={user} />}
          {tab==='marketing'    && <MarketingScreen   user={user} />}
          {tab==='projetos'     && <ProjetosScreen    user={user} />}
          {tab==='eventos'      && <EventosScreen     user={user} />}
          {tab==='gestao'       && <GestaoScreen      user={user} />}
          {tab==='gpdemanda'    && <GPDemandaScreen   user={user} />}
          {tab==='chat'         && <ChatMarketingScreen user={user} />}
          {tab==='chat_hub'     && <ChatHubScreen       onNavegar={setTab} />}
          {tab==='chat_eventos'  && <ChatEventosScreen   user={user} />}
          {tab==='chat_pp'       && <ChatPPScreen         user={user} />}
          {tab==='chat_gp'       && <ChatGPScreen         user={user} />}
          {tab==='outros'       && <OutrosScreen      onNavegar={handleOutros} badgeNotif={badgeNotif} cargo={user.cargo} />}
          {tab==='ranking'      && (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <button onClick={()=>setTab('outros')} style={backBtn}>‹ Outros</button>
              <div style={{ flex:1, overflow:'hidden' }}><RankingScreen user={user} /></div>
            </div>
          )}
          {tab==='calendario'   && (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <button onClick={()=>setTab('outros')} style={backBtn}>‹ Outros</button>
              <div style={{ flex:1, overflow:'hidden' }}><CalendarioScreen user={user} /></div>
            </div>
          )}
          {tab==='notificacoes' && (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <button onClick={()=>setTab('outros')} style={backBtn}>‹ Outros</button>
              <div style={{ flex:1, overflow:'hidden' }}><NotificacoesScreen user={user} /></div>
            </div>
          )}
          {tab==='marketing' && user.cargo === 'Coordenação Geral' && (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              <button onClick={()=>setTab('outros')} style={backBtn}>‹ Outros</button>
              <div style={{ flex:1, overflow:'hidden' }}><MarketingScreen user={user} /></div>
            </div>
          )}
          {tab==='perfil'       && <PerfilScreen      user={user} onLogout={() => { localStorage.removeItem('nenq_session_id'); setUser(null); setTab('home'); }} />}
        </div>
      </div>

      <BottomNav
        active={isSubTab ? 'outros' : tab}
        onChange={setTab}
        cargo={user.cargo}
        badgeNotif={badgeNotif}
        badgeChat={badgeChat}
        badgeChatEventos={badgeChatEventos}
        badgeChatPP={badgeChatPP}
        badgeChatGP={badgeChatGP}
      />

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

const shell   = { display:'flex', flexDirection:'column', height:'100dvh', maxWidth:430, margin:'0 auto', background:'var(--bg)', position:'relative', overflow:'hidden' };
const backBtn = { display:'flex', alignItems:'center', padding:'12px 16px 8px', background:'none', border:'none', color:'var(--gold)', fontSize:15, fontWeight:700, fontFamily:'var(--font-body)', flexShrink:0, cursor:'pointer' };
