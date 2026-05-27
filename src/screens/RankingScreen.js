import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { mesAtual } from '../utils/xp';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const medalColors  = ['#FFD700','#C0C0C0','#CD7F32'];
const podiumColors = ['rgba(201,164,74,.25)','rgba(192,192,192,.2)','rgba(205,127,50,.2)'];
const podiumBorder = ['rgba(201,164,74,.6)','rgba(192,192,192,.4)','rgba(205,127,50,.4)'];
const podiumHeight = [130, 100, 80];

const cargoColor = cargo => ({
  'Coordenador de Marketing':'#C9A44A','Membro de Marketing':'#C9A44A',
  'Coordenador P&P':'#6a9fd8',         'Membro P&P':'#6a9fd8',
  'Coordenador de Eventos':'#4caf8a',  'Membro de Eventos':'#4caf8a',
  'Gestão de Pessoas':'#a78bfa',       'Membro de GP':'#a78bfa',
}[cargo] || 'var(--muted)');

function Avatar({ foto, nome, size, rank }) {
  const isTop1 = rank === 0;
  return (
    <div style={{ position:'relative', width:isTop1?size+16:size, height:isTop1?size+16:size, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {isTop1 && (
        <>
          <div style={{ position:'absolute', inset:-4, borderRadius:'50%', background:'radial-gradient(circle,#ff6b00 0%,#ff9500 40%,transparent 70%)', animation:'fire1 1.2s ease-in-out infinite alternate', zIndex:0 }} />
          <div style={{ position:'absolute', inset:-6, borderRadius:'50%', background:'radial-gradient(circle,#ff3d00 0%,#ff6b00 35%,transparent 65%)', animation:'fire2 0.9s ease-in-out infinite alternate', zIndex:0, opacity:0.7 }} />
          <div style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'radial-gradient(circle,#ffcc00 0%,#ff9500 30%,transparent 60%)', animation:'fire3 1.5s ease-in-out infinite alternate', zIndex:0, opacity:0.5 }} />
        </>
      )}
      <div style={{ position:'relative', zIndex:1, width:size, height:size, borderRadius:'50%', border:`3px solid ${isTop1?'#ffcc00':medalColors[rank]}`, overflow:'hidden', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:isTop1?'0 0 20px #ff6b0088':'none' }}>
        {foto
          ? <img src={foto} alt={nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontFamily:'var(--font-display)', fontSize:size*0.36, fontWeight:700, color:isTop1?'#ffcc00':medalColors[rank] }}>{nome?.[0]||'?'}</span>
        }
      </div>
    </div>
  );
}

export default function RankingScreen({ user }) {
  const hoje   = new Date();
  const [membros, setMembros]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [mesSel, setMesSel]     = useState(hoje.getMonth());
  const [anoSel, setAnoSel]     = useState(hoje.getFullYear());
  const [modoMensal, setModoMensal] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db,'usuarios'),
      snap => { setMembros(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      err  => { console.log('ranking error:', err); setLoading(false); }
    );
    return unsub;
  }, []);

  const chaveM = `${anoSel}-${String(mesSel+1).padStart(2,'0')}`;
  const isHoje = chaveM === mesAtual();

  // XP a usar dependendo do modo
  const getXP = m => {
    if (!modoMensal) return m.xp || 0;
    return (m.xpMensal || {})[chaveM] || 0;
  };

  const sorted = [...membros]
    .filter(m => m.status !== 'banido' && (modoMensal ? true : m.xp !== undefined))
    .map(m => ({ ...m, _xp: getXP(m) }))
    .filter(m => m._xp > 0 || !modoMensal)
    .sort((a,b) => b._xp - a._xp);

  const top3 = sorted.slice(0,3);
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumRanks = [1, 0, 2];

  // Posição do usuário logado
  const minhaPos   = sorted.findIndex(m => m.matricula === user?.matricula);
  const meuDados   = minhaPos >= 0 ? sorted[minhaPos] : null;
  const euNoTop3   = minhaPos >= 0 && minhaPos < 3;

  const prevMes = () => {
    if (mesSel === 0) { setMesSel(11); setAnoSel(a=>a-1); } else setMesSel(m=>m-1);
  };
  const nextMes = () => {
    if (mesSel === 11) { setMesSel(0); setAnoSel(a=>a+1); } else setMesSel(m=>m+1);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" style={{ animation:'spin .8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <style>{`
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes fire1 { from{transform:scale(1) rotate(0deg);opacity:0.9;} to{transform:scale(1.15) rotate(5deg);opacity:1;} }
        @keyframes fire2 { from{transform:scale(1.1) rotate(-3deg);opacity:0.6;} to{transform:scale(0.95) rotate(8deg);opacity:0.8;} }
        @keyframes fire3 { from{transform:scale(0.95) rotate(4deg);opacity:0.4;} to{transform:scale(1.1) rotate(-6deg);opacity:0.6;} }
      `}</style>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: meuDados && !euNoTop3 ? 80 : 20 }}>

        {/* Header */}
        <div style={{ padding:'16px 16px 8px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>🏆 Ranking XP</div>
        </div>

        {/* Modo: Total vs Mensal */}
        <div style={{ display:'flex', gap:8, padding:'0 16px 12px', justifyContent:'center' }}>
          <button onClick={()=>setModoMensal(false)}
            style={{ padding:'7px 20px', borderRadius:20, border:!modoMensal?'none':'1px solid var(--border)', background:!modoMensal?'var(--gold)':'var(--card)', color:!modoMensal?'var(--bg)':'var(--muted)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
            Total
          </button>
          <button onClick={()=>setModoMensal(true)}
            style={{ padding:'7px 20px', borderRadius:20, border:modoMensal?'none':'1px solid var(--border)', background:modoMensal?'var(--gold)':'var(--card)', color:modoMensal?'var(--bg)':'var(--muted)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
            Mensal
          </button>
        </div>

        {/* Seletor de mês (só no modo mensal) */}
        {modoMensal && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, padding:'0 16px 16px' }}>
            <button onClick={prevMes} style={navBtn}>‹</button>
            <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--cream)', minWidth:150, textAlign:'center' }}>
              {MESES[mesSel]} {anoSel}
              {isHoje && <span style={{ fontSize:11, color:'var(--gold)', marginLeft:8 }}>● atual</span>}
            </div>
            <button onClick={nextMes} style={navBtn}>›</button>
          </div>
        )}

        {/* Empty state mensal */}
        {modoMensal && sorted.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
            <div style={{ fontSize:14, lineHeight:1.7 }}>
              Nenhum XP registrado em {MESES[mesSel]}.<br />
              As demandas concluídas neste mês aparecerão aqui.
            </div>
          </div>
        )}

        {/* Pódio */}
        {sorted.length >= 1 && (
          <div style={{ padding:'0 16px 20px' }}>
            <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:20, padding:'24px 12px 0', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-30, left:'50%', transform:'translateX(-50%)', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,164,74,.08) 0%,transparent 70%)', pointerEvents:'none' }} />
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4 }}>
                {podiumOrder.map((m, i) => {
                  if (!m) return <div key={i} style={{ flex:1 }} />;
                  const rank = podiumRanks[i];
                  const avatarSize = rank===0 ? 68 : 52;
                  const cor  = cargoColor(m.cargo);
                  return (
                    <div key={m.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:medalColors[rank], marginBottom:4 }}>{m._xp} XP</div>
                      <Avatar foto={m.foto} nome={m.nome} size={avatarSize} rank={rank} />
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--cream)', marginTop:6, textAlign:'center', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {m.nome?.split(' ')[0]}
                      </div>
                      <div style={{ fontSize:9, color:cor, fontWeight:600, marginBottom:6, maxWidth:80, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {m.cargo}
                      </div>
                      <div style={{ width:'100%', height:podiumHeight[rank], background:podiumColors[rank], border:`1px solid ${podiumBorder[rank]}`, borderRadius:'10px 10px 0 0', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:rank===0?36:26, fontWeight:900, color:medalColors[rank], opacity:.7 }}>{rank+1}</span>
                        <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', width:26, height:26, borderRadius:'50%', background:medalColors[rank], display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--bg)', border:'2px solid var(--bg3)' }}>{rank+1}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lista completa */}
        {sorted.length > 0 && (
          <div style={{ padding:'0 14px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--cream)', opacity:.45, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
              Classificação completa
            </div>
            {sorted.map((m, i) => {
              const isMe  = m.matricula === user?.matricula;
              const isTop = i < 3;
              const cor   = isTop ? medalColors[i] : isMe ? 'var(--gold)' : 'var(--muted)';
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, background:isMe?'rgba(201,164,74,.08)':'var(--card)', border:`1px solid ${isMe?'rgba(201,164,74,.3)':isTop?medalColors[i]+'44':'var(--border)'}`, borderRadius:14, padding:'10px 14px', marginBottom:8 }}>
                  <div style={{ width:32, textAlign:'center', flexShrink:0 }}>
                    {i < 3
                      ? <span style={{ fontSize:i===0?22:18 }}>{['🥇','🥈','🥉'][i]}</span>
                      : <span style={{ fontSize:14, fontWeight:700, color:'var(--muted)' }}>{i+1}º</span>
                    }
                  </div>
                  <div style={{ width:40, height:40, borderRadius:'50%', border:`2px solid ${isMe?'var(--gold)':cor}`, overflow:'hidden', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {m.foto
                      ? <img src={m.foto} alt={m.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:isMe?'var(--gold)':cor }}>{m.nome?.[0]||'?'}</span>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color: isMe?'var(--gold)':'var(--cream)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
                      {m.nome}
                      {isMe && <span style={{ fontSize:10, fontWeight:600, color:'var(--gold)', background:'rgba(201,164,74,.15)', padding:'1px 7px', borderRadius:10, border:'1px solid rgba(201,164,74,.3)' }}>você</span>}
                    </div>
                    <div style={{ fontSize:11, color:cargoColor(m.cargo), marginTop:2 }}>{m.cargo}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:isMe?'var(--gold)':cor }}>{m._xp}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Posição fixa do usuário (só aparece se não estiver no top 3 visível) */}
      {meuDados && !euNoTop3 && (
        <div style={{ flexShrink:0, background:'var(--bg2)', borderTop:'2px solid rgba(201,164,74,.3)', padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:32, textAlign:'center', flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--gold)' }}>{minhaPos+1}º</span>
            </div>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid var(--gold)', overflow:'hidden', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {meuDados.foto
                ? <img src={meuDados.foto} alt={meuDados.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, color:'var(--gold)' }}>{meuDados.nome?.[0]||'?'}</span>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--gold)', display:'flex', alignItems:'center', gap:6 }}>
                Sua posição
                <span style={{ fontSize:10, background:'rgba(201,164,74,.15)', padding:'1px 7px', borderRadius:10, border:'1px solid rgba(201,164,74,.3)' }}>você</span>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{meuDados.cargo}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--gold)' }}>{meuDados._xp}</div>
              <div style={{ fontSize:10, color:'var(--muted)' }}>XP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = { width:34, height:34, borderRadius:10, background:'var(--card)', border:'1px solid var(--border2)', color:'var(--cream)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'var(--font-body)' };
