import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, serverTimestamp, getDocs,
  query, where, writeBatch,
} from 'firebase/firestore';

// ─── Permissão ──────────────────────────────────────────────────────────────
export const podeAcessarChatPP = cargo =>
  ['Membro P&P', 'Coordenador P&P'].includes(cargo);

// ─── Helpers ────────────────────────────────────────────────────────────────
function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        let q = 0.82;
        const tryIt = () => {
          const d = canvas.toDataURL('image/jpeg', q);
          if (d.length * 3 / 4 / 1024 <= 600 || q <= 0.2) resolve(d);
          else { q -= 0.1; tryIt(); }
        };
        tryIt();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve({ base64: e.target.result, nome: file.name, tamanho: file.size });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatHora(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date();
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDia(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date();
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function Avatar({ foto, nome, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'var(--bg3)', border: '1.5px solid var(--border2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {foto
        ? <img src={foto} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.38, fontWeight: 700, color: 'var(--gold)' }}>{nome?.[0] || '?'}</span>
      }
    </div>
  );
}

// ✓✓ Leitura: cinza = enviado, azul = todos leram
function TickIcon({ lidas, totalMembros, isOwn, status }) {
  if (!isOwn) return null;
  if (status === 'enviando') return <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 3 }}>⏳</span>;
  if (status === 'erro') return <span style={{ fontSize: 10, color: '#e87f7f', marginLeft: 3, cursor: 'pointer' }}>⚠️</span>;
  const lidasCount = Object.keys(lidas || {}).length;
  const todosLeram = lidasCount >= totalMembros;
  return (
    <span style={{ fontSize: 12, marginLeft: 3, color: todosLeram ? '#6a9fd8' : 'rgba(242,228,196,.45)', letterSpacing: -2 }}>✓✓</span>
  );
}

// ─── Modal de ação (tap longo) ───────────────────────────────────────────────
function MenuAcao({ msg, onEditar, onDeletar, onFechar }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,1,8,.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onFechar}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '22px 22px 0 0', padding: '8px 0 32px', width: '100%', maxWidth: 430 }}
        onClick={e => e.stopPropagation()}>
        {/* Preview da mensagem */}
        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Mensagem selecionada</div>
          <div style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {msg.deletado ? 'Mensagem apagada' : msg.texto || (msg.imagem ? '📷 Imagem' : '📎 Arquivo')}
          </div>
        </div>
        {!msg.deletado && (
          <>
            {msg.texto && (
              <button onClick={onEditar}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 20px', background: 'none', border: 'none', color: 'var(--cream)', fontSize: 15, fontFamily: 'var(--font-body)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>✏️</span> Editar mensagem
              </button>
            )}
            <button onClick={onDeletar}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 20px', background: 'none', border: 'none', color: '#e87f7f', fontSize: 15, fontFamily: 'var(--font-body)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>🗑️</span> Apagar mensagem
            </button>
          </>
        )}
        <button onClick={onFechar}
          style={{ display: 'block', width: '100%', padding: '15px 20px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 15, fontFamily: 'var(--font-body)', textAlign: 'center', marginTop: 4 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Bolha de mensagem ───────────────────────────────────────────────────────
function Bolha({ msg, isOwn, showAvatar, totalMembros, onLongPress }) {
  const isDel  = msg.deletado;
  const longPressTimer = useRef(null);

  const startPress = () => {
    longPressTimer.current = setTimeout(() => onLongPress(msg), 500);
  };
  const endPress = () => clearTimeout(longPressTimer.current);

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: 7, flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: 3 }}
      onTouchStart={startPress} onTouchEnd={endPress} onTouchMove={endPress}
      onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
      onContextMenu={e => { e.preventDefault(); onLongPress(msg); }}
    >
      {/* Avatar */}
      {!isOwn && (
        showAvatar
          ? <Avatar foto={msg.autorFoto} nome={msg.autorNome} size={30} />
          : <div style={{ width: 30, flexShrink: 0 }} />
      )}

      {/* Conteúdo */}
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {showAvatar && !isOwn && (
          <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 3, marginLeft: 2, fontWeight: 600 }}>
            {msg.autorNome}
          </div>
        )}
        <div style={{
          background: isDel ? 'transparent' : isOwn ? 'rgba(201,164,74,.22)' : 'var(--card)',
          border: isDel ? '1px dashed var(--border)' : isOwn ? '1.5px solid rgba(201,164,74,.35)' : '1px solid var(--border)',
          borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '9px 12px',
          position: 'relative',
        }}>
          {/* Imagem */}
          {msg.imagem && !isDel && (
            <img src={msg.imagem} alt="" style={{ width: '100%', maxWidth: 220, borderRadius: 10, display: 'block', marginBottom: msg.texto ? 6 : 0 }} />
          )}
          {/* Arquivo */}
          {msg.arquivo && !isDel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: 'rgba(242,228,196,.06)', borderRadius: 10, marginBottom: msg.texto ? 6 : 0 }}>
              <span style={{ fontSize: 22 }}>📎</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.arquivo.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{msg.arquivo.tamanho ? `${(msg.arquivo.tamanho / 1024).toFixed(1)} KB` : 'Documento'}</div>
              </div>
            </div>
          )}
          {/* Texto */}
          <div style={{ fontSize: 14, color: isDel ? 'var(--muted)' : 'var(--cream)', fontStyle: isDel ? 'italic' : 'normal', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {msg.texto || (isDel ? 'Mensagem apagada' : '')}
          </div>
          {/* Rodapé: hora + editado + ticks */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
            {msg.editado && !isDel && <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>editado</span>}
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{formatHora(msg.criadoEm)}</span>
            <TickIcon lidas={msg.lidas} totalMembros={totalMembros} isOwn={isOwn} status={msg._status} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de edição ─────────────────────────────────────────────────────────
function ModalEdicao({ msg, onSalvar, onCancelar }) {
  const [texto, setTexto] = useState(msg.texto || '');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,1,8,.92)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '22px 22px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 430 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Editar mensagem</div>
        <textarea
          ref={inputRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none', minHeight: 80, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={onCancelar}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button onClick={() => texto.trim() && onSalvar(texto.trim())}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--gold)', color: 'var(--bg)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)' }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Criar Enquete (só coordenador) ─────────────────────────────────────────
function ModalEnquete({ onEnviar, onFechar }) {
  const [titulo,  setTitulo]  = useState('');
  const [opcoes,  setOpcoes]  = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState('');

  const addOpcao  = () => opcoes.length < 6 && setOpcoes(o => [...o, '']);
  const removeOpcao = i => opcoes.length > 2 && setOpcoes(o => o.filter((_,j) => j !== i));
  const setOpcao = (i, v) => setOpcoes(o => o.map((x,j) => j===i ? v : x));

  const enviar = async () => {
    if (!titulo.trim()) { setErro('Digite o título da enquete.'); return; }
    const validas = opcoes.map(o => o.trim()).filter(Boolean);
    if (validas.length < 2) { setErro('Adicione pelo menos 2 opções.'); return; }
    setLoading(true);
    await onEnviar({ titulo: titulo.trim(), opcoes: validas.map(o => ({ texto: o, votos: [] })) });
    onFechar();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.95)', zIndex:400, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid var(--border)' }}>
        <button onClick={onFechar} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:15, fontFamily:'var(--font-body)', fontWeight:600 }}>Cancelar</button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--cream)' }}>Nova Enquete</div>
        <button onClick={enviar} disabled={loading}
          style={{ background:'var(--gold)', border:'none', borderRadius:20, padding:'7px 18px', color:'var(--bg)', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)' }}>
          {loading ? '...' : 'Enviar'}
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>
        <div style={{ marginBottom:16 }}>
          <label style={lblStyle}>📊 Pergunta</label>
          <input value={titulo} onChange={e=>{setTitulo(e.target.value);setErro('');}}
            placeholder="O que você quer perguntar?"
            style={{ width:'100%', background:'var(--card)', border:'1px solid var(--border2)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'var(--cream)', fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box' }} />
        </div>
        <label style={lblStyle}>Opções de resposta</label>
        {opcoes.map((op, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
            <input value={op} onChange={e=>setOpcao(i, e.target.value)}
              placeholder={`Opção ${i+1}`}
              style={{ flex:1, background:'var(--card)', border:'1px solid var(--border2)', borderRadius:12, padding:'11px 14px', fontSize:14, color:'var(--cream)', fontFamily:'var(--font-body)', outline:'none' }} />
            {opcoes.length > 2 && (
              <button onClick={()=>removeOpcao(i)}
                style={{ width:32, height:32, borderRadius:'50%', background:'rgba(232,127,127,.15)', border:'none', color:'#e87f7f', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            )}
          </div>
        ))}
        {opcoes.length < 6 && (
          <button onClick={addOpcao}
            style={{ width:'100%', padding:'11px', borderRadius:12, border:'1.5px dashed var(--border2)', background:'none', color:'var(--muted)', fontSize:14, fontFamily:'var(--font-body)', marginBottom:16 }}>
            + Adicionar opção
          </button>
        )}
        {erro && <div style={{ fontSize:13, color:'#e87f7f', padding:'9px 13px', background:'rgba(232,127,127,.1)', borderRadius:10 }}>⚠️ {erro}</div>}
      </div>
    </div>
  );
}

// ─── Bolha de Enquete ────────────────────────────────────────────────────────
function BolhaEnquete({ msg, userId, col, onLongPress }) {
  const enquete   = msg.enquete;
  const totalVotos = enquete?.opcoes?.reduce((s, o) => s + (o.votos?.length||0), 0) || 0;
  const meuVoto   = enquete?.opcoes?.findIndex(o => o.votos?.includes(userId)) ?? -1;
  const [votando, setVotando] = useState(false);

  const votar = async opIdx => {
    if (meuVoto >= 0 || votando) return;
    setVotando(true);
    try {
      const novasOpcoes = enquete.opcoes.map((o, i) => ({
        ...o,
        votos: i === opIdx ? [...(o.votos||[]), userId] : (o.votos||[]),
      }));
      await updateDoc(doc(db, col, msg.id), {
        'enquete.opcoes': novasOpcoes,
      });
    } catch {}
    setVotando(false);
  };

  const isOwn = msg.autorId === userId;

  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom:6 }}
      onTouchStart={() => {}}
      onContextMenu={e => { e.preventDefault(); if(isOwn) onLongPress(msg); }}
    >
      {!isOwn && <div style={{ fontSize:11, color:'var(--gold)', marginBottom:3, marginLeft:2, fontWeight:600 }}>{msg.autorNome}</div>}
      <div style={{ maxWidth:'85%', background:'var(--card)', border:'1.5px solid rgba(201,164,74,.3)', borderRadius:16, padding:'12px 14px', minWidth:220 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:18 }}>📊</span>
          <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--cream)' }}>{enquete?.titulo}</div>
        </div>
        {enquete?.opcoes?.map((op, i) => {
          const votos = op.votos?.length || 0;
          const pct   = totalVotos > 0 ? Math.round(votos/totalVotos*100) : 0;
          const meuVotoAqui = meuVoto === i;
          return (
            <button key={i} onClick={() => votar(i)} disabled={meuVoto >= 0 || votando}
              style={{ display:'block', width:'100%', marginBottom:7, padding:'10px 12px', borderRadius:10, border:meuVotoAqui?'1.5px solid var(--gold)':'1px solid var(--border2)', background:'var(--bg3)', cursor:meuVoto>=0?'default':'pointer', position:'relative', overflow:'hidden', textAlign:'left' }}>
              {/* barra de progresso */}
              {meuVoto >= 0 && (
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background: meuVotoAqui?'rgba(201,164,74,.18)':'rgba(242,228,196,.07)', transition:'width .4s', borderRadius:10 }} />
              )}
              <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {meuVotoAqui && <span style={{ fontSize:12 }}>✓</span>}
                  <span style={{ fontSize:13, color:'var(--cream)', fontWeight: meuVotoAqui?700:400 }}>{op.texto}</span>
                </div>
                {meuVoto >= 0 && <span style={{ fontSize:12, color:'var(--muted)' }}>{pct}% · {votos} voto{votos!==1?'s':''}</span>}
              </div>
            </button>
          );
        })}
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, textAlign:'right' }}>
          {totalVotos} voto{totalVotos!==1?'s':''} · {formatHora(msg.criadoEm)}
        </div>
      </div>
    </div>
  );
}

const lblStyle = { display:'block', fontSize:12, fontWeight:700, color:'var(--cream)', opacity:.55, marginBottom:6, letterSpacing:'.05em', textTransform:'uppercase' };

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function ChatPPScreen({ user }) {
  const [msgs, setMsgs]             = useState([]);
  const [texto, setTexto]           = useState('');
  const [enviando, setEnviando]     = useState(false);
  const [msgSelecionada, setMsgSel] = useState(null);
  const [msgEditando, setMsgEdit]   = useState(null);
  const [totalMembros, setTotal]    = useState(2);
  const [uploadando, setUploadando] = useState(false);
  const [showEnquete, setShowEnquete] = useState(false);
  const IS_COORD = ['Coordenador P&P'].includes(user.cargo);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const docRef     = useRef(null);

  // Carrega total de membros do chat
  useEffect(() => {
    getDocs(query(collection(db, 'usuarios'),
      where('cargo', 'in', ['Membro P&P', 'Coordenador P&P'])))
      .then(snap => setTotal(Math.max(1, snap.docs.length)))
      .catch(() => {});
  }, []);

  // Escuta mensagens em tempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'chat_pp'),
      snap => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
            const tb = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
            return ta - tb;
          });
        setMsgs(lista);
        // Marca como lidas pelo usuário atual
        const batch = writeBatch(db);
        let tem = false;
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.autorId !== user.matricula && !(data.lidas || {})[user.matricula]) {
            batch.update(doc(db, 'chat_pp', d.id), {
              [`lidas.${user.matricula}`]: true,
            });
            tem = true;
          }
        });
        if (tem) batch.commit().catch(() => {});
      },
      err => { console.log('chat error:', err); }
    );
    return unsub;
  }, []);

  // Scroll para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const enviarTexto = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto('');
    setEnviando(true);

    const tempId = `temp_${Date.now()}`;
    setMsgs(prev => [...prev, {
      id: tempId, texto: t, autorId: user.matricula,
      autorNome: user.nome, autorFoto: user.foto || null,
      criadoEm: { toDate: () => new Date() },
      lidas: { [user.matricula]: true },
      editado: false, deletado: false, _status: 'enviando',
    }]);

    try {
      await addDoc(collection(db, 'chat_pp'), {
        texto: t, autorId: user.matricula,
        autorNome: user.nome, autorFoto: user.foto || null,
        criadoEm: serverTimestamp(),
        lidas: { [user.matricula]: true },
        editado: false, deletado: false,
        tipo: 'texto',
      });
      setMsgs(prev => prev.filter(m => m.id !== tempId));
    } catch {
      setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'erro' } : m));
    }
    setEnviando(false);
  };

  const enviarImagem = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadando(true);
    e.target.value = '';
    try {
      const b64 = await comprimirImagem(file);
      await addDoc(collection(db, 'chat_pp'), {
        imagem: b64, texto: '', autorId: user.matricula,
        autorNome: user.nome, autorFoto: user.foto || null,
        criadoEm: serverTimestamp(),
        lidas: { [user.matricula]: true },
        editado: false, deletado: false, tipo: 'imagem',
      });
    } catch { alert('Erro ao enviar imagem.'); }
    setUploadando(false);
  };

  const enviarArquivo = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Arquivo muito grande (máx. 5 MB).'); return; }
    setUploadando(true);
    e.target.value = '';
    try {
      const { base64, nome, tamanho } = await fileToBase64(file);
      await addDoc(collection(db, 'chat_pp'), {
        arquivo: { base64, nome, tamanho }, texto: '', autorId: user.matricula,
        autorNome: user.nome, autorFoto: user.foto || null,
        criadoEm: serverTimestamp(),
        lidas: { [user.matricula]: true },
        editado: false, deletado: false, tipo: 'arquivo',
      });
    } catch { alert('Erro ao enviar arquivo.'); }
    setUploadando(false);
  };

  const enviarEnquete = async ({ titulo, opcoes }) => {
    await addDoc(collection(db, 'chat_pp'), {
      tipo: 'enquete', texto: '', enquete: { titulo, opcoes },
      autorId: user.matricula, autorNome: user.nome, autorFoto: user.foto||null,
      criadoEm: serverTimestamp(), lidas: { [user.matricula]: true },
      editado: false, deletado: false,
    }).catch(() => {});
  };

  const deletarMsg = async id => {
    await updateDoc(doc(db, 'chat_pp', id), {
      deletado: true, texto: '', imagem: null, arquivo: null,
    }).catch(() => {});
    setMsgSel(null);
  };

  const editarMsg = async (id, novoTexto) => {
    await updateDoc(doc(db, 'chat_pp', id), {
      texto: novoTexto, editado: true,
    }).catch(() => {});
    setMsgEdit(null);
  };

  // Agrupa msgs por dia
  const grupos = msgs.reduce((acc, m) => {
    const dia = formatDia(m.criadoEm);
    const ult  = acc[acc.length - 1];
    if (!ult || ult.dia !== dia) acc.push({ dia, items: [] });
    acc[acc.length - 1].items.push(m);
    return acc;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,164,74,.12)', border: '1px solid rgba(201,164,74,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          🔬
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--cream)' }}>Chat — P&P</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{totalMembros} membro{totalMembros !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Feed de mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0', minHeight: 0 }}>

        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
            <div style={{ fontSize: 14, lineHeight: 1.7 }}>Seja o primeiro a mandar uma mensagem!<br />Só o time de P&P vê este chat.</div>
          </div>
        )}

        {grupos.map(g => (
          <div key={g.dia}>
            {/* Separador de dia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 4px 8px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '2px 10px', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)' }}>{g.dia}</div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            {g.items.map((m, i) => {
              const isOwn     = m.autorId === user.matricula;
              const showAvatar = !isOwn && (i === 0 || g.items[i - 1]?.autorId !== m.autorId);
              if (m.tipo === 'enquete') return (
                <BolhaEnquete key={m.id} msg={m} userId={user.matricula}
                  col="chat_pp"
                  onLongPress={msg => { if(msg.autorId===user.matricula) setMsgSel(msg); }} />
              );
              return (
                <Bolha
                  key={m.id}
                  msg={m}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  totalMembros={totalMembros}
                  onLongPress={msg => {
                    if (msg.autorId === user.matricula) setMsgSel(msg);
                  }}
                />
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} style={{ height: 10 }} />
      </div>

      {/* Barra de input — em fluxo normal, não absoluta */}
      <div style={{ flexShrink: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border2)', padding: '8px 10px', paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {/* Anexos */}
        <input ref={fileRef}  type="file" accept="image/*" onChange={enviarImagem} style={{ display: 'none' }} />
        <input ref={docRef}   type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={enviarArquivo} style={{ display: 'none' }} />

        {IS_COORD && (
          <button onClick={() => setShowEnquete(true)} disabled={uploadando}
            style={{ width:38, height:38, borderRadius:10, background:'var(--card)', border:'1px solid var(--border2)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            📊
          </button>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={uploadando}
          style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border2)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          📷
        </button>
        <button onClick={() => docRef.current?.click()} disabled={uploadando}
          style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border2)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          📎
        </button>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
          placeholder={uploadando ? 'Enviando...' : 'Mensagem...'}
          rows={1}
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 18, padding: '9px 14px', fontSize: 14, color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none', maxHeight: 100, overflowY: 'auto', lineHeight: 1.4 }}
        />

        {/* Enviar */}
        <button onClick={enviarTexto} disabled={!texto.trim() || enviando || uploadando}
          style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0, background: texto.trim() && !enviando ? 'linear-gradient(135deg,#C9A44A,#a8832e)' : 'var(--card)', color: texto.trim() && !enviando ? 'var(--bg)' : 'var(--muted)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s', boxShadow: texto.trim() ? '0 2px 10px rgba(201,164,74,.3)' : 'none' }}>
          ➤
        </button>
      </div>

      {/* Menu de ação */}
      {msgSelecionada && (
        <MenuAcao
          msg={msgSelecionada}
          onEditar={() => { setMsgEdit(msgSelecionada); setMsgSel(null); }}
          onDeletar={() => deletarMsg(msgSelecionada.id)}
          onFechar={() => setMsgSel(null)}
        />
      )}

      {showEnquete && (
        <ModalEnquete onEnviar={enviarEnquete} onFechar={() => setShowEnquete(false)} />
      )}

      {/* Modal de edição */}
      {msgEditando && (
        <ModalEdicao
          msg={msgEditando}
          onSalvar={novoTexto => editarMsg(msgEditando.id, novoTexto)}
          onCancelar={() => setMsgEdit(null)}
        />
      )}
    </div>
  );
}
