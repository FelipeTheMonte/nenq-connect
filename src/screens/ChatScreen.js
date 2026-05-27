import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
  writeBatch, getDocs, where,
} from 'firebase/firestore';

// Qual grupo de chat o usuário pertence
const getGrupo = cargo => {
  if (['Membro de Marketing','Coordenador de Marketing'].includes(cargo)) return 'marketing';
  if (['Membro P&P','Coordenador P&P'].includes(cargo))                   return 'pp';
  if (['Membro de Eventos','Coordenador de Eventos'].includes(cargo))     return 'eventos';
  if (['Membro de GP','Gestão de Pessoas','Coordenação Geral'].includes(cargo))               return 'gp';
  return null;
};

const GRUPO_LABEL = {
  marketing: '📢 Chat — Marketing',
  pp:        '🔬 Chat — P&P',
  eventos:   '🎯 Chat — Eventos',
  gp:        '👥 Chat — Gestão de Pessoas',
};

function Avatar({ foto, nome, size = 34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:'var(--bg3)', border:'1.5px solid var(--border2)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {foto
        ? <img src={foto} alt={nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <span style={{ fontFamily:'var(--font-display)', fontSize:size*.36, fontWeight:700, color:'var(--gold)' }}>{nome?.[0]||'?'}</span>
      }
    </div>
  );
}

function StatusIcon({ msg, isOwn, membrosCount }) {
  if (!isOwn) return null;
  if (msg._status === 'enviando') return <span style={{ fontSize:10, color:'var(--muted)', marginLeft:4 }}>⏳</span>;
  if (msg._status === 'erro')     return <span style={{ fontSize:10, color:'#e87f7f', marginLeft:4 }}>⚠️</span>;
  const lidasCount = Object.keys(msg.lidas||{}).length;
  const allRead    = lidasCount >= membrosCount;
  return (
    <span style={{ fontSize:11, marginLeft:4, color: allRead ? '#6a9fd8' : 'var(--muted)', letterSpacing:-1 }}>✓✓</span>
  );
}

export default function ChatScreen({ user }) {
  const grupo = getGrupo(user.cargo);
  const [msgs, setMsgs]         = useState([]);
  const [texto, setTexto]       = useState('');
  const [sending, setSending]   = useState(false);
  const [editando, setEditando] = useState(null); // { id, texto }
  const [longPress, setLongPress] = useState(null); // id da mensagem
  const [membrosCount, setMembrosCount] = useState(1);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const lpTimer    = useRef(null);

  useEffect(() => {
    if (!grupo) return;
    // Conta membros do grupo
    getDocs(query(collection(db,'usuarios'), where('cargo','in', getCargos(grupo))))
      .then(snap => setMembrosCount(Math.max(1, snap.docs.length)))
      .catch(()=>{});

    const unsub = onSnapshot(collection(db,`chat_${grupo}`),
      snap => {
        const lista = snap.docs
          .map(d => ({ id:d.id, ...d.data() }))
          .sort((a,b) => {
            const ta = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm||0);
            const tb = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm||0);
            return ta - tb;
          });
        setMsgs(lista);
        // Marca mensagens não lidas como lidas
        const batch = writeBatch(db);
        let hasBatch = false;
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.autorId !== user.matricula && !(data.lidas||{})[user.matricula]) {
            batch.update(doc(db,`chat_${grupo}`,d.id), {
              [`lidas.${user.matricula}`]: true,
            });
            hasBatch = true;
          }
        });
        if (hasBatch) batch.commit().catch(()=>{});
      },
      err => console.log('chat error:', err)
    );
    return unsub;
  }, [grupo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs]);

  const getCargos = g => ({
    marketing: ['Membro de Marketing','Coordenador de Marketing'],
    pp:        ['Membro P&P','Coordenador P&P'],
    eventos:   ['Membro de Eventos','Coordenador de Eventos'],
    gp:        ['Membro de GP','Gestão de Pessoas','Coordenação Geral'],
  }[g] || []);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || sending) return;
    setTexto('');
    setSending(true);

    // Mensagem local otimista
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId, texto: t, autorId: user.matricula,
      autorNome: user.nome, autorFoto: user.foto || null,
      criadoEm: { toDate: () => new Date() }, lidas: {},
      editado: false, deletado: false, _status: 'enviando',
    };
    setMsgs(prev => [...prev, tempMsg]);

    try {
      await addDoc(collection(db,`chat_${grupo}`), {
        texto: t, autorId: user.matricula,
        autorNome: user.nome, autorFoto: user.foto || null,
        criadoEm: serverTimestamp(),
        lidas: { [user.matricula]: true },
        editado: false, deletado: false,
      });
      setMsgs(prev => prev.filter(m => m.id !== tempId));
    } catch {
      setMsgs(prev => prev.map(m => m.id===tempId ? {...m, _status:'erro'} : m));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const salvarEdicao = async () => {
    if (!editando?.texto.trim()) return;
    try {
      await updateDoc(doc(db,`chat_${grupo}`,editando.id), {
        texto: editando.texto.trim(), editado: true,
      });
    } catch {}
    setEditando(null);
  };

  const deletar = async id => {
    try {
      await updateDoc(doc(db,`chat_${grupo}`,id), {
        deletado: true, texto: 'Mensagem apagada',
      });
    } catch {}
    setLongPress(null);
  };

  const formatTime = ts => {
    const d = ts?.toDate ? ts.toDate() : new Date();
    return d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  };

  const formatDate = ts => {
    const d = ts?.toDate ? ts.toDate() : new Date();
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate()-1);
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
  };

  // Agrupa mensagens por data
  const msgsPorData = msgs.reduce((acc, m) => {
    const label = formatDate(m.criadoEm);
    if (!acc.length || acc[acc.length-1].label !== label) acc.push({ label, msgs:[] });
    acc[acc.length-1].msgs.push(m);
    return acc;
  }, []);

  if (!grupo) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>💬</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--cream)', marginBottom:8 }}>Chat não disponível</div>
      <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.7 }}>Você precisa de um cargo de coordenadoria para acessar o chat.</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>

      {/* Header */}
      <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--cream)' }}>{GRUPO_LABEL[grupo]}</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{membrosCount} membro{membrosCount!==1?'s':''}</div>
      </div>

      {/* Mensagens */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:2, paddingBottom:70 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)', fontSize:14 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👋</div>
            Seja o primeiro a mandar uma mensagem!
          </div>
        )}

        {msgsPorData.map(grupo_data => (
          <div key={grupo_data.label}>
            {/* Separador de data */}
            <div style={{ display:'flex', alignItems:'center', gap:10, margin:'10px 0', padding:'0 4px' }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, padding:'2px 10px', background:'var(--card)', borderRadius:20, border:'1px solid var(--border)' }}>{grupo_data.label}</div>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>

            {grupo_data.msgs.map((m, i) => {
              const isOwn    = m.autorId === user.matricula;
              const isDel    = m.deletado;
              const showAvatar = !isOwn && (i===0 || grupo_data.msgs[i-1]?.autorId !== m.autorId);
              const showName   = showAvatar;

              return (
                <div key={m.id}
                  style={{ display:'flex', flexDirection:'column', alignItems:isOwn?'flex-end':'flex-start', marginBottom:1 }}
                  onTouchStart={() => { lpTimer.current = setTimeout(()=>setLongPress(m.id), 600); }}
                  onTouchEnd={() => clearTimeout(lpTimer.current)}
                  onContextMenu={e => { e.preventDefault(); setLongPress(m.id); }}
                >
                  {showName && !isDel && (
                    <div style={{ fontSize:11, color:'var(--gold)', marginBottom:3, marginLeft:46, fontWeight:600 }}>{m.autorNome}</div>
                  )}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:8, maxWidth:'80%', flexDirection:isOwn?'row-reverse':'row' }}>
                    {!isOwn && showAvatar && <Avatar foto={m.autorFoto} nome={m.autorNome} size={32} />}
                    {!isOwn && !showAvatar && <div style={{ width:32, flexShrink:0 }} />}

                    <div style={{
                      background: isDel ? 'transparent' : isOwn ? 'rgba(201,164,74,.25)' : 'var(--card)',
                      border: isDel ? '1px dashed var(--border)' : isOwn ? '1px solid rgba(201,164,74,.4)' : '1px solid var(--border)',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: isDel ? '8px 12px' : '9px 12px',
                      maxWidth:'100%',
                    }}>
                      {editando?.id === m.id ? (
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <input
                            value={editando.texto}
                            onChange={e=>setEditando({...editando,texto:e.target.value})}
                            onKeyDown={e=>{ if(e.key==='Enter') salvarEdicao(); if(e.key==='Escape') setEditando(null); }}
                            style={{ background:'none', border:'none', outline:'none', color:'var(--cream)', fontSize:14, fontFamily:'var(--font-body)', width:140 }}
                            autoFocus
                          />
                          <button onClick={salvarEdicao} style={{ background:'var(--gold)', border:'none', borderRadius:8, padding:'3px 8px', color:'var(--bg)', fontSize:11, fontWeight:700, fontFamily:'var(--font-body)' }}>✓</button>
                          <button onClick={()=>setEditando(null)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:16 }}>×</button>
                        </div>
                      ) : (
                        <div style={{ fontSize:14, color: isDel ? 'var(--muted)' : 'var(--cream)', fontStyle: isDel ? 'italic' : 'normal', lineHeight:1.45 }}>
                          {m.texto}
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:4, marginTop:3 }}>
                        {m.editado && !isDel && <span style={{ fontSize:10, color:'var(--muted)', fontStyle:'italic' }}>editado</span>}
                        <span style={{ fontSize:10, color:'var(--muted)' }}>{formatTime(m.criadoEm)}</span>
                        <StatusIcon msg={m} isOwn={isOwn} membrosCount={membrosCount} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Menu de ação (long press) */}
      {longPress && (() => {
        const m = msgs.find(x=>x.id===longPress);
        const isOwn = m?.autorId === user.matricula;
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.7)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
            onClick={()=>setLongPress(null)}>
            <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'20px 20px 0 0', padding:'16px 16px 32px', width:'100%', maxWidth:430 }}
              onClick={e=>e.stopPropagation()}>
              {isOwn && !m?.deletado && (
                <>
                  <button onClick={()=>{ setEditando({id:m.id, texto:m.texto}); setLongPress(null); }}
                    style={{ display:'block', width:'100%', padding:'14px 16px', textAlign:'left', background:'none', border:'none', borderBottom:'1px solid var(--border)', color:'var(--cream)', fontSize:15, fontFamily:'var(--font-body)' }}>
                    ✏️ Editar mensagem
                  </button>
                  <button onClick={()=>deletar(m.id)}
                    style={{ display:'block', width:'100%', padding:'14px 16px', textAlign:'left', background:'none', border:'none', color:'#e87f7f', fontSize:15, fontFamily:'var(--font-body)' }}>
                    🗑️ Apagar mensagem
                  </button>
                </>
              )}
              {m?._status === 'erro' && (
                <button onClick={()=>{ setTexto(m.texto); setMsgs(prev=>prev.filter(x=>x.id!==m.id)); setLongPress(null); }}
                  style={{ display:'block', width:'100%', padding:'14px 16px', textAlign:'left', background:'none', border:'none', borderBottom:'1px solid var(--border)', color:'#C9A44A', fontSize:15, fontFamily:'var(--font-body)' }}>
                  🔄 Tentar reenviar
                </button>
              )}
              <button onClick={()=>setLongPress(null)}
                style={{ display:'block', width:'100%', padding:'14px 16px', textAlign:'center', background:'none', border:'none', color:'var(--muted)', fontSize:14, fontFamily:'var(--font-body)', marginTop:4 }}>
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Input */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'var(--bg2)', borderTop:'1px solid var(--border2)', padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
        <input
          ref={inputRef}
          value={texto}
          onChange={e=>setTexto(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Mensagem..."
          style={{ flex:1, background:'var(--card)', border:'1px solid var(--border2)', borderRadius:22, padding:'10px 14px', fontSize:14, color:'var(--cream)', fontFamily:'var(--font-body)', outline:'none' }}
        />
        <button onClick={enviar} disabled={!texto.trim()||sending}
          style={{ width:40, height:40, borderRadius:'50%', border:'none', background:texto.trim()&&!sending?'var(--gold)':'var(--card)', color:texto.trim()&&!sending?'var(--bg)':'var(--muted)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', transition:'background .15s', flexShrink:0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}
