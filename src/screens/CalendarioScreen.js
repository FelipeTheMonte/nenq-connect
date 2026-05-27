import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, getDocs, serverTimestamp,
} from 'firebase/firestore';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const TIPOS = [
  { id:'reuniao',  label:'Reunião',   emoji:'🤝', cor:'#6a9fd8', bg:'rgba(106,159,216,.15)' },
  { id:'evento',   label:'Evento',    emoji:'🎉', cor:'#C9A44A', bg:'rgba(201,164,74,.15)'  },
  { id:'prazo',    label:'Prazo',     emoji:'⏰', cor:'#e87f7f', bg:'rgba(232,127,127,.15)' },
  { id:'workshop', label:'Workshop',  emoji:'🛠️', cor:'#4caf8a', bg:'rgba(76,175,138,.15)'  },
  { id:'palestra', label:'Palestra',  emoji:'🎤', cor:'#a78bfa', bg:'rgba(167,139,250,.15)' },
  { id:'outro',    label:'Outro',     emoji:'📌', cor:'#b06080', bg:'rgba(138,64,96,.15)'   },
];

const getTipo  = id => TIPOS.find(t => t.id === id) || TIPOS[5];
const pad      = n  => String(n).padStart(2,'0');
const CAN_EDIT = c  => c === 'Membro de Eventos' || c === 'Coordenador de Eventos' || c === 'Coordenação Geral';

// ── Notificar todos os membros ─────────────────────────────────────────────────
async function notificarTodos(titulo, mensagem) {
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    const batch = snap.docs.map(d => {
      const mat = d.data().matricula;
      if (!mat) return Promise.resolve();
      return addDoc(collection(db, 'notificacoes_membros'), {
        userId: mat, titulo, mensagem,
        tipo: 'calendario', lida: false, criadoEm: serverTimestamp(),
      });
    });
    await Promise.all(batch);
  } catch (e) { console.log('notif error:', e); }
}

// ── Modal: Adicionar / Editar Evento ──────────────────────────────────────────
function EventoModal({ data, evento, autorNome, autorCargo, onClose }) {
  const hoje    = new Date();
  const dataStr = data
    ? `${data.ano}-${pad(data.mes+1)}-${pad(data.dia)}`
    : `${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-${pad(hoje.getDate())}`;

  const [titulo,    setTitulo]    = useState(evento?.titulo    || '');
  const [descricao, setDescricao] = useState(evento?.descricao || '');
  const [tipo,      setTipo]      = useState(evento?.tipo      || 'evento');
  const [hora,      setHora]      = useState(evento?.hora      || '');
  const [local,     setLocal]     = useState(evento?.local     || '');
  const [dataEvt,   setDataEvt]   = useState(evento?.data      || dataStr);
  const [loading,   setLoading]   = useState(false);
  const [erro,      setErro]      = useState('');

  const tipoAtual = getTipo(tipo);
  const isEdicao  = !!evento?.id;

  const salvar = async () => {
    if (!titulo.trim()) { setErro('Digite o título do evento.'); return; }
    if (!dataEvt)       { setErro('Escolha uma data.'); return; }
    setLoading(true); setErro('');
    try {
      const payload = {
        titulo: titulo.trim(), descricao: descricao.trim(),
        tipo, hora: hora.trim(), local: local.trim(),
        data: dataEvt,
        ano:  parseInt(dataEvt.split('-')[0]),
        mes:  parseInt(dataEvt.split('-')[1]) - 1,
        dia:  parseInt(dataEvt.split('-')[2]),
      };
      if (isEdicao) {
        await updateDoc(doc(db, 'calendario_nenq', evento.id), payload);
      } else {
        await addDoc(collection(db, 'calendario_nenq'), {
          ...payload, criadoEm: serverTimestamp(),
          criadoPor: autorNome || '', cargoCriador: autorCargo || '',
        });
        // Notifica todos os membros
        const dataFormatada = `${pad(payload.dia)}/${pad(payload.mes+1)}/${payload.ano}`;
        const horaStr       = hora.trim() ? ` às ${hora.trim()}` : '';
        await notificarTodos(
          `📅 Novo evento na agenda`,
          `${tipoAtual.emoji} ${titulo.trim()} — ${dataFormatada}${horaStr}${local.trim() ? ` · 📍 ${local.trim()}` : ''}`
        );
      }
      onClose();
    } catch (e) {
      console.error(e);
      setErro('Erro ao salvar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.97)', zIndex:400, display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid var(--border)' }}>
        <button onClick={onClose} style={btnCancel}>Cancelar</button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--cream)' }}>
          {isEdicao ? 'Editar evento' : 'Novo evento'}
        </div>
        <button onClick={salvar} disabled={loading} style={{ ...btnSave, opacity: loading ? .6 : 1 }}>
          {loading ? '...' : isEdicao ? 'Atualizar' : 'Publicar'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:16 }}>

        {/* Preview do tipo */}
        <div style={{ background:tipoAtual.bg, border:`1.5px solid ${tipoAtual.cor}55`, borderRadius:16, padding:'14px 16px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:tipoAtual.cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
            {tipoAtual.emoji}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--cream)', lineHeight:1.3 }}>{titulo || 'Título do evento'}</div>
            <div style={{ fontSize:12, color:tipoAtual.cor, marginTop:3 }}>
              {tipoAtual.label}{hora ? ` · 🕐 ${hora}` : ''}{local ? ` · 📍 ${local}` : ''}
            </div>
          </div>
        </div>

        {/* Título */}
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>📋 Título</label>
          <input value={titulo} onChange={e=>{setTitulo(e.target.value);setErro('');}}
            placeholder="Ex: Reunião geral do NEnQ" style={inp} />
        </div>

        {/* Data */}
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>📅 Data</label>
          <input type="date" value={dataEvt} onChange={e=>{setDataEvt(e.target.value);setErro('');}}
            style={{ ...inp, colorScheme:'dark' }} />
        </div>

        {/* Hora + Local */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div>
            <label style={lbl}>🕐 Horário</label>
            <input type="time" value={hora} onChange={e=>setHora(e.target.value)}
              style={{ ...inp, colorScheme:'dark' }} />
          </div>
          <div>
            <label style={lbl}>📍 Local</label>
            <input value={local} onChange={e=>setLocal(e.target.value)} placeholder="Ex: Sala 201" style={inp} />
          </div>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>🏷️ Tipo</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {TIPOS.map(t => (
              <button key={t.id} onClick={()=>setTipo(t.id)}
                style={{ padding:'7px 13px', borderRadius:20, border:tipo===t.id?'none':'1px solid var(--border2)', background:tipo===t.id?t.cor:'var(--card)', color:tipo===t.id?'#fff':'var(--muted)', fontSize:12, fontWeight:tipo===t.id?700:500, fontFamily:'var(--font-body)', display:'flex', alignItems:'center', gap:5 }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>📝 Descrição</label>
          <textarea value={descricao} onChange={e=>setDescricao(e.target.value)}
            placeholder="Detalhes do evento, pauta, observações..."
            maxLength={500} rows={4}
            style={{ ...inp, resize:'none' }} />
          <div style={{ fontSize:11, color:'var(--muted)', textAlign:'right', marginTop:4 }}>{descricao.length}/500</div>
        </div>

        {!isEdicao && (
          <div style={{ background:'rgba(106,159,216,.08)', border:'1px solid rgba(106,159,216,.2)', borderRadius:12, padding:'10px 14px', fontSize:12, color:'#6a9fd8', lineHeight:1.6 }}>
            🔔 Todos os membros serão notificados ao publicar este evento.
          </div>
        )}

        {erro && <div style={{ marginTop:12, fontSize:13, color:'#e87f7f', padding:'9px 13px', background:'rgba(232,127,127,.1)', borderRadius:10 }}>⚠️ {erro}</div>}
      </div>
    </div>
  );
}

// ── Modal: Detalhe do Evento ───────────────────────────────────────────────────
function EventoDetalhe({ evento, canEdit, onEdit, onDelete, onClose }) {
  const tipo = getTipo(evento.tipo);
  const dataFormatada = `${DIAS[new Date(evento.ano, evento.mes, evento.dia).getDay()]}, ${pad(evento.dia)} de ${MESES[evento.mes]} de ${evento.ano}`;

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.75)', zIndex:350, display:'flex', alignItems:'flex-end', justifyContent:'center', maxWidth:430, margin:'0 auto' }}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{ background:'var(--bg3)', borderRadius:'28px 28px 0 0', padding:'10px 0 40px', width:'100%', boxShadow:'0 -8px 40px rgba(0,0,0,.5)' }}>

        {/* Alça */}
        <div style={{ width:40, height:4, borderRadius:2, background:'var(--border2)', margin:'0 auto 18px' }} />

        {/* Cabeçalho colorido */}
        <div style={{ margin:'0 20px 20px', background:tipo.bg, border:`1.5px solid ${tipo.cor}44`, borderRadius:18, padding:'18px 18px 16px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:tipo.cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
              {tipo.emoji}
            </div>
            <button onClick={onClose} style={{ background:'rgba(0,0,0,.2)', border:'none', borderRadius:20, width:30, height:30, color:'var(--cream)', fontSize:18, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:tipo.cor, textTransform:'uppercase', letterSpacing:'.08em', marginTop:12, marginBottom:5 }}>
            {tipo.label}
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--cream)', lineHeight:1.3 }}>
            {evento.titulo}
          </div>
        </div>

        {/* Infos */}
        <div style={{ margin:'0 20px', display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--card)', borderRadius:12, padding:'11px 14px' }}>
            <span style={{ fontSize:18 }}>📅</span>
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:1 }}>Data</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{dataFormatada}</div>
            </div>
          </div>

          {evento.hora && (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--card)', borderRadius:12, padding:'11px 14px' }}>
              <span style={{ fontSize:18 }}>🕐</span>
              <div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:1 }}>Horário</div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{evento.hora}</div>
              </div>
            </div>
          )}

          {evento.local && (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--card)', borderRadius:12, padding:'11px 14px' }}>
              <span style={{ fontSize:18 }}>📍</span>
              <div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:1 }}>Local</div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{evento.local}</div>
              </div>
            </div>
          )}

          {evento.descricao && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'13px 14px' }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>Descrição</div>
              <div style={{ fontSize:14, color:'var(--cream)', lineHeight:1.7 }}>{evento.descricao}</div>
            </div>
          )}

          {evento.criadoPor && (
            <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', paddingTop:2 }}>
              Publicado por {evento.criadoPor} · {evento.cargoCriador || ''}
            </div>
          )}
        </div>

        {canEdit && (
          <div style={{ display:'flex', gap:10, margin:'0 20px' }}>
            <button onClick={onEdit}
              style={{ flex:1, padding:'13px', borderRadius:14, border:'1px solid var(--border2)', background:'var(--card)', color:'var(--cream)', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)' }}>
              ✏️ Editar
            </button>
            <button onClick={onDelete}
              style={{ flex:1, padding:'13px', borderRadius:14, border:'1px solid rgba(232,127,127,.3)', background:'rgba(232,127,127,.08)', color:'#e87f7f', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)' }}>
              🗑️ Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tela Principal ─────────────────────────────────────────────────────────────
export default function CalendarioScreen({ user }) {
  const hoje   = new Date();
  const [viewDate,    setViewDate]    = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [eventos,     setEventos]     = useState([]);
  const [diaAtivo,    setDiaAtivo]    = useState(null);
  const [modal,       setModal]       = useState(null);
  const [detalhe,     setDetalhe]     = useState(null);
  const [filtroTipo,  setFiltroTipo]  = useState('todos');

  const canEdit = CAN_EDIT(user?.cargo);
  const { ano, mes } = viewDate;
  const diasNoMes   = new Date(ano, mes+1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const cells       = Array(primeiroDia).fill(null).concat(Array.from({length:diasNoMes},(_,i)=>i+1));

  useEffect(() => {
    const unsub = onSnapshot(collection(db,'calendario_nenq'),
      snap => {
        const sorted = snap.docs
          .map(d=>({id:d.id,...d.data()}))
          .sort((a,b) => (a.data||'').localeCompare(b.data||''));
        setEventos(sorted);
      },
      err => console.log('cal error:', err)
    );
    return unsub;
  }, []);

  const eventosDoMes   = eventos.filter(e => e.ano===ano && e.mes===mes);
  const eventosDoDia   = d => eventosDoMes.filter(e => e.dia===d);
  const eventosFiltrados = filtroTipo==='todos' ? eventosDoMes : eventosDoMes.filter(e=>e.tipo===filtroTipo);

  const proximosEventos = eventos
    .filter(e => new Date(e.ano, e.mes, e.dia) >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
    .slice(0,5);

  const prevMes = () => setViewDate(v => v.mes===0 ? {ano:v.ano-1,mes:11} : {ano:v.ano,mes:v.mes-1});
  const nextMes = () => setViewDate(v => v.mes===11 ? {ano:v.ano+1,mes:0} : {ano:v.ano,mes:v.mes+1});

  const handleDiaClick = d => {
    if (!d) return;
    const evts = eventosDoDia(d);
    if (evts.length === 1) { setDetalhe(evts[0]); setDiaAtivo(null); return; }
    if (evts.length > 1)  { setDiaAtivo(d===diaAtivo ? null : d); return; }
    if (canEdit) setModal({ type:'novo', data:{ano,mes,dia:d} });
  };

  const handleDelete = async id => {
    if (!window.confirm('Excluir este evento?')) return;
    await deleteDoc(doc(db,'calendario_nenq',id));
    setDetalhe(null);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', paddingBottom:80 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 10px' }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>Calendário</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            {canEdit ? 'Modo edição ativo' : 'Agenda do NEnQ'}
          </div>
        </div>
        {canEdit && (
          <button onClick={()=>setModal({type:'novo', data:{ano,mes,dia:hoje.getDate()}})}
            style={{ background:'linear-gradient(135deg,#C9A44A,#a8832e)', border:'none', borderRadius:20, padding:'9px 18px', color:'var(--bg)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)', boxShadow:'0 4px 14px rgba(201,164,74,.3)' }}>
            + Evento
          </button>
        )}
      </div>

      {/* Navegação do mês */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 12px' }}>
        <button onClick={prevMes} style={navBtn}>‹</button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--cream)' }}>
          {MESES[mes]} {ano}
        </div>
        <button onClick={nextMes} style={navBtn}>›</button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, padding:'0 14px 10px', overflowX:'auto', scrollbarWidth:'none' }}>
        <button onClick={()=>setFiltroTipo('todos')}
          style={{ fontSize:10, fontWeight:700, padding:'5px 12px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0, border:filtroTipo==='todos'?'none':'1px solid var(--border)', background:filtroTipo==='todos'?'var(--gold)':'var(--card)', color:filtroTipo==='todos'?'var(--bg)':'var(--muted)', fontFamily:'var(--font-body)' }}>
          Todos ({eventosDoMes.length})
        </button>
        {TIPOS.map(t => {
          const count = eventosDoMes.filter(e=>e.tipo===t.id).length;
          if (!count) return null;
          return (
            <button key={t.id} onClick={()=>setFiltroTipo(filtroTipo===t.id?'todos':t.id)}
              style={{ fontSize:10, fontWeight:700, padding:'5px 12px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0, border:filtroTipo===t.id?'none':'1px solid var(--border)', background:filtroTipo===t.id?t.cor:'var(--card)', color:filtroTipo===t.id?'#fff':'var(--muted)', fontFamily:'var(--font-body)' }}>
              {t.emoji} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grade */}
      <div style={{ padding:'0 12px 10px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:5 }}>
          {DIAS.map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--muted)', padding:'3px 0', letterSpacing:'.04em' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
          {cells.map((d,i) => {
            const evts    = d ? eventosDoDia(d) : [];
            const isHoje  = d===hoje.getDate() && mes===hoje.getMonth() && ano===hoje.getFullYear();
            const isAtivo = d===diaAtivo;
            const temEvt  = evts.length > 0;
            // cor dominante do dia
            const corDom  = temEvt ? getTipo(evts[0].tipo).cor : null;
            return (
              <div key={i} onClick={()=>handleDiaClick(d)}
                style={{
                  aspectRatio:'1', borderRadius:11, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', cursor:d?'pointer':'default',
                  background: isAtivo ? 'rgba(201,164,74,.22)'
                            : isHoje  ? 'rgba(201,164,74,.14)'
                            : temEvt  ? 'var(--card)' : 'transparent',
                  border: isHoje  ? '2px solid var(--gold)'
                        : isAtivo ? '2px solid rgba(201,164,74,.6)'
                        : temEvt  ? `1px solid ${corDom}44` : '1px solid transparent',
                  position:'relative', transition:'all .15s',
                }}>
                {d && (
                  <>
                    <span style={{ fontSize:12, fontWeight: isHoje||isAtivo ? 800 : 400, color: isHoje ? 'var(--gold)' : 'var(--cream)' }}>{d}</span>
                    {evts.length > 0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2, justifyContent:'center', flexWrap:'wrap' }}>
                        {evts.slice(0,3).map((e,j) => (
                          <div key={j} style={{ width:5, height:5, borderRadius:'50%', background:getTipo(e.tipo).cor }} />
                        ))}
                        {evts.length > 3 && <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--muted)' }} />}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint de edição */}
      {canEdit && (
        <div style={{ textAlign:'center', fontSize:11, color:'var(--muted)', marginBottom:8, opacity:.6 }}>
          Toque em um dia vazio para adicionar evento
        </div>
      )}

      {/* Eventos do dia selecionado */}
      {diaAtivo && eventosDoDia(diaAtivo).length > 0 && (
        <div style={{ padding:'0 14px 12px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--cream)', opacity:.5, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
            {pad(diaAtivo)}/{pad(mes+1)} — {eventosDoDia(diaAtivo).length} evento{eventosDoDia(diaAtivo).length>1?'s':''}
          </div>
          {eventosDoDia(diaAtivo).map(e => {
            const t = getTipo(e.tipo);
            return (
              <div key={e.id} onClick={()=>setDetalhe(e)}
                style={{ display:'flex', alignItems:'center', gap:12, background:'var(--card)', border:`1px solid ${t.cor}33`, borderRadius:14, padding:'13px 14px', marginBottom:8, cursor:'pointer' }}>
                <div style={{ width:40, height:40, borderRadius:11, background:t.bg, border:`1px solid ${t.cor}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {t.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--cream)' }}>{e.titulo}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                    {e.hora ? `🕐 ${e.hora}` : t.label}
                    {e.local ? ` · 📍 ${e.local}` : ''}
                  </div>
                  {e.descricao && <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, lineHeight:1.4 }}>{e.descricao.slice(0,70)}{e.descricao.length>70?'…':''}</div>}
                </div>
                <span style={{ fontSize:18, color:'var(--muted)' }}>›</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Próximos eventos */}
      {proximosEventos.length > 0 && !diaAtivo && (
        <div style={{ padding:'0 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--cream)', opacity:.5, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>
            Próximos eventos
          </div>
          {proximosEventos.map(e => {
            const t = getTipo(e.tipo);
            const isHojeEvt = e.dia===hoje.getDate() && e.mes===hoje.getMonth() && e.ano===hoje.getFullYear();
            return (
              <div key={e.id} onClick={()=>{ setViewDate({ano:e.ano,mes:e.mes}); setDetalhe(e); }}
                style={{ display:'flex', alignItems:'center', gap:12, background:'var(--card)', border: isHojeEvt ? `1.5px solid ${t.cor}66` : '1px solid var(--border)', borderRadius:14, padding:'12px 14px', marginBottom:8, cursor:'pointer', position:'relative' }}>
                {isHojeEvt && (
                  <div style={{ position:'absolute', top:8, right:12, fontSize:10, fontWeight:700, color:t.cor, background:t.bg, padding:'2px 8px', borderRadius:20 }}>HOJE</div>
                )}
                <div style={{ width:46, height:46, borderRadius:12, background:t.bg, border:`1px solid ${t.cor}44`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:t.cor, lineHeight:1 }}>{pad(e.dia)}</div>
                  <div style={{ fontSize:9, color:t.cor, opacity:.8, fontWeight:600 }}>{MESES[e.mes].slice(0,3).toUpperCase()}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{e.titulo}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                    {t.emoji} {t.label}{e.hora ? ` · 🕐 ${e.hora}` : ''}{e.local ? ` · 📍 ${e.local}` : ''}
                  </div>
                </div>
                <span style={{ fontSize:18, color:'var(--muted)' }}>›</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {eventosFiltrados.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 24px', color:'var(--muted)' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📅</div>
          <div style={{ fontSize:14, lineHeight:1.8 }}>
            Nenhum evento em {MESES[mes]}.<br/>
            {canEdit && <span style={{ color:'var(--gold)' }}>Clique em "+ Evento" para adicionar!</span>}
          </div>
        </div>
      )}

      {/* Modais */}
      {modal && (
        <EventoModal
          data={modal.data}
          evento={modal.type==='editar' ? modal.evento : null}
          autorNome={user?.nome}
          autorCargo={user?.cargo}
          onClose={()=>setModal(null)}
        />
      )}

      {detalhe && (
        <EventoDetalhe
          evento={detalhe}
          canEdit={canEdit}
          onEdit={() => { setModal({type:'editar',evento:detalhe}); setDetalhe(null); }}
          onDelete={() => handleDelete(detalhe.id)}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}

// ── Estilos base ──────────────────────────────────────────────────────────────
const lbl       = { display:'block', fontSize:11, fontWeight:700, color:'var(--cream)', opacity:.55, marginBottom:6, letterSpacing:'.06em', textTransform:'uppercase' };
const inp       = { width:'100%', background:'var(--card)', border:'1px solid var(--border2)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'var(--cream)', fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box' };
const navBtn    = { width:38, height:38, borderRadius:10, background:'var(--card)', border:'1px solid var(--border2)', color:'var(--cream)', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };
const btnCancel = { background:'none', border:'none', color:'var(--muted)', fontSize:15, fontFamily:'var(--font-body)', fontWeight:600 };
const btnSave   = { background:'linear-gradient(135deg,#C9A44A,#a8832e)', border:'none', borderRadius:20, padding:'8px 20px', color:'var(--bg)', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)', boxShadow:'0 4px 14px rgba(201,164,74,.3)' };
