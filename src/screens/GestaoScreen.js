import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, query, where, onSnapshot,
} from 'firebase/firestore';
import { aplicarXP as aplicarXPCentral } from '../utils/xp';

const CARGOS_PADRAO = ['Trainee','Membro de Marketing','Coordenador de Marketing','Membro P&P','Coordenador P&P','Membro de Eventos','Coordenador de Eventos','Membro de GP','Gestão de Pessoas'];

function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300, ratio = Math.min(SIZE/img.width, SIZE/img.height);
        const canvas = document.createElement('canvas');
        canvas.width = img.width*ratio; canvas.height = img.height*ratio;
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',0.82));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

function Avatar({ foto, nome, size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--bg3)', border:'2px solid var(--gold)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {foto ? <img src={foto} alt={nome} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
             : <span style={{ fontFamily:'var(--font-display)', fontSize:size*.36, fontWeight:700, color:'var(--gold)' }}>{nome?.[0]||'?'}</span>}
    </div>
  );
}

// ── Criar Novo Membro ─────────────────────────────────────────────────────────
function CriarMembro({ cargosExtras, onCriado }) {
  const [nome, setNome]         = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail]       = useState('');
  const [cargo, setCargo]       = useState('Membro');
  const [periodo, setPeriodo]   = useState('');
  const [foto, setFoto]         = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState(null);
  const [erro, setErro]         = useState('');
  const fileRef = useRef();

  const todosOsCargos = CARGOS_PADRAO;

  const [cropSrc, setCropSrc]   = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const imgCropRef = useRef(null);

  const handleFoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCropSrc(ev.target.result); setCropMode(true); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const aplicarCrop = () => {
    setCompressing(true);
    try {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const ox = (img.width  - minSide) / 2;
        const oy = (img.height - minSide) / 2;
        ctx.drawImage(img, ox, oy, minSide, minSide, 0, 0, SIZE, SIZE);
        const c = canvas.toDataURL('image/jpeg', 0.85);
        setFoto(c); setFotoPreview(c);
        setCropMode(false); setCropSrc(null);
        setCompressing(false);
      };
      img.onerror = () => setCompressing(false);
      img.src = cropSrc;
    } catch { setErro('Erro ao recortar.'); setCompressing(false); }
  };

  const criar = async () => {
    if (!nome.trim() || !matricula.trim()) { setErro('Nome e matrícula são obrigatórios.'); return; }
    setLoading(true); setErro('');
    try {
      const codigo = gerarCodigo();
      await addDoc(collection(db,'codigos_acesso'), {
        nome:nome.trim(), matricula:matricula.trim(), email:email.trim().toLowerCase(),
        cargo, periodo:periodo.trim(), foto:foto||null,
        codigo, usado:false, criadoEm:new Date().toISOString(),
      });
      setCodigoGerado(codigo);
      setNome(''); setMatricula(''); setEmail(''); setCargo('Membro'); setPeriodo(''); setFoto(null); setFotoPreview(null);
      setLoading(false);
    } catch { setErro('Erro ao criar. Tente novamente.'); setLoading(false); }
  };

  if (codigoGerado) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px', textAlign:'center' }}>
      <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--cream)', marginBottom:8 }}>Membro criado!</div>
      <div style={{ fontSize:13, color:'var(--muted)', marginBottom:28, lineHeight:1.7 }}>Envie o código abaixo para o novo membro. Expira após o primeiro uso.</div>
      <div style={{ background:'var(--bg3)', border:'2px solid var(--gold)', borderRadius:20, padding:'24px 28px', width:'100%', marginBottom:20, boxShadow:'0 0 28px rgba(201,164,74,.15)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Código de acesso</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:700, color:'var(--gold)', letterSpacing:10, marginBottom:8 }}>{codigoGerado}</div>
        <div style={{ fontSize:12, color:'var(--muted)' }}>Uso único</div>
      </div>
      <button onClick={() => navigator.clipboard?.writeText(codigoGerado)}
        style={{ width:'100%', padding:'12px', borderRadius:14, border:'1px solid var(--border2)', background:'var(--card)', color:'var(--cream)', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)', marginBottom:10 }}>
        📋 Copiar código
      </button>
      <button onClick={() => { setCodigoGerado(null); onCriado?.(); }}
        style={{ width:'100%', padding:'12px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#C9A44A,#a8832e)', color:'var(--bg)', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)' }}>
        + Criar outro membro
      </button>
    </div>
  );

  return (
    <div style={{ padding:'0 16px', paddingBottom:24 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display:'none' }} />
        <div onClick={() => fileRef.current.click()} style={{ width:84, height:84, borderRadius:'50%', background:'var(--bg3)', border:'2px dashed var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', marginBottom:8 }}>
          {fotoPreview ? <img src={fotoPreview} alt="foto" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            : <div style={{ textAlign:'center' }}><div style={{ fontSize:26 }}>📷</div><div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Foto</div></div>}
        </div>
        <div style={{ fontSize:12, color:'var(--muted)' }}>{compressing ? '⏳ Processando...' : 'Adicionar foto'}</div>
      </div>

      {[
        { label:'👤 Nome',      value:nome,      set:setNome,      ph:'Nome completo', type:'text' },
        { label:'🎓 Matrícula', value:matricula, set:setMatricula, ph:'Ex: 202510854', type:'number' },
        { label:'📅 Período',   value:periodo,   set:setPeriodo,   ph:'Ex: 5º período', type:'text' },
        { label:'✉️ Email',     value:email,     set:setEmail,     ph:'email@exemplo.com', type:'email' },
      ].map(({label,value,set,ph,type}) => (
        <div key={label} style={{ marginBottom:14 }}>
          <label style={lbl}>{label}</label>
          <input type={type} value={value} onChange={e=>{set(e.target.value);setErro('');}} placeholder={ph} style={inp} />
        </div>
      ))}

      <div style={{ marginBottom:20 }}>
        <label style={lbl}>🏷️ Cargo</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {todosOsCargos.map(c => {
            const custom = cargosExtras.find(x=>x.nome===c);
            return (
              <button key={c} onClick={()=>setCargo(c)}
                style={{ padding:'7px 13px', borderRadius:20, border:cargo===c?'none':'1px solid var(--border2)', background:cargo===c?(custom?.cor||'var(--gold)'):' var(--card)', color:cargo===c?'var(--bg)':'var(--muted)', fontSize:12, fontWeight:cargo===c?700:500, fontFamily:'var(--font-body)' }}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {erro && <div style={{ fontSize:13, color:'#e87f7f', padding:'9px 13px', background:'rgba(232,127,127,.1)', borderRadius:10, marginBottom:14 }}>⚠️ {erro}</div>}
      <button onClick={criar} disabled={loading||compressing}
        style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:loading?'rgba(201,164,74,.3)':'linear-gradient(135deg,#C9A44A,#a8832e)', color:loading?'rgba(24,1,8,.5)':'var(--bg)', fontSize:15, fontWeight:700, fontFamily:'var(--font-body)' }}>
        {loading ? '⏳ Criando...' : '✨ Criar membro e gerar código'}
      </button>

      {cropMode && cropSrc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.95)', zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--cream)', marginBottom:16 }}>Ajustar foto</div>
          <div style={{ width:'100%', maxWidth:320, aspectRatio:'1', borderRadius:160, overflow:'hidden', border:'3px solid var(--gold)', marginBottom:20 }}>
            <img src={cropSrc} alt="crop" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20, textAlign:'center', lineHeight:1.6 }}>
            A foto será recortada em círculo automaticamente.<br/>Centralize o rosto na prévia acima.
          </div>
          <div style={{ display:'flex', gap:12, width:'100%', maxWidth:320 }}>
            <button onClick={()=>{ setCropMode(false); setCropSrc(null); }} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid var(--border2)', background:'transparent', color:'var(--muted)', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)' }}>
              Cancelar
            </button>
            <button onClick={aplicarCrop} disabled={compressing} style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C9A44A,#a8832e)', color:'var(--bg)', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)' }}>
              {compressing ? '⏳...' : '✅ Usar foto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lista de Membros ──────────────────────────────────────────────────────────

function DemandasMembro({ matricula }) {
  const [demandas, setDemandas] = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    const cols = [
      { col:'demandas_marketing', label:'Marketing' },
      { col:'demandas_pp',        label:'P&P'       },
      { col:'demandas_eventos',   label:'Eventos'   },
      { col:'demandas_gp',        label:'GP'        },
    ];
    let all  = [];
    let done = 0;
    cols.forEach(({ col, label }) => {
      getDocs(collection(db, col))
        .then(snap => {
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.participantes?.some(p => p.userId === matricula)) {
              all.push({ titulo: data.titulo, status: data.status, label });
            }
          });
        })
        .catch(() => {})
        .finally(() => {
          done++;
          if (done === cols.length) { setDemandas([...all]); setLoading(false); }
        });
    });
  }, [matricula]);

  if (loading) return (
    <div style={{ fontSize:13, color:'var(--muted)', padding:'12px 0', textAlign:'center' }}>Carregando demandas...</div>
  );
  if (demandas.length === 0) return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Demandas</div>
      <div style={{ fontSize:13, color:'var(--muted)', fontStyle:'italic' }}>Nenhuma demanda registrada.</div>
    </div>
  );

  const ativas     = demandas.filter(d => d.status === 'em_progresso');
  const concluidas = demandas.filter(d => d.status === 'encerrada');
  const statusCor = { em_progresso:'#6a9fd8', encerrada:'#4caf8a', aguardando:'#C9A44A' };
  const statusLabel = { em_progresso:'Em progresso', encerrada:'Concluída', aguardando:'Aguardando' };

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:11, color:'var(--muted)' }}>Demandas ({demandas.length})</div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>
          🔵 {ativas.length} ativa{ativas.length!==1?'s':''} · ✅ {concluidas.length} concluída{concluidas.length!==1?'s':''}
        </div>
      </div>
      {demandas.map((d,i) => {
        const cor = statusCor[d.status] || 'var(--muted)';
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderTop:i>0?'1px solid var(--border)':'none' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:cor, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:'var(--cream)', fontWeight:600 }}>{d.titulo}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{d.label}</div>
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:cor, padding:'2px 8px', borderRadius:10, background:cor+'18' }}>
              {statusLabel[d.status]||d.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function PerfilEditModal({ membro, cargos, emblemas, onClose, onSaved }) {
  const [editando,   setEditando]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [compressing,setCompressing]= useState(false);
  const fileRef = useRef(null);

  // Campos editáveis
  const [nome,      setNome]      = useState(membro.nome      || '');
  const [matricula, setMatricula] = useState(membro.matricula || '');
  const [email,     setEmail]     = useState(membro.email     || '');
  const [cargo,     setCargo]     = useState(membro.cargo     || 'Trainee');
  const [periodo,   setPeriodo]   = useState(membro.periodo   || '');
  const [foto,      setFoto]      = useState(membro.foto      || null);
  const [emblemasSel, setEmblemasSel] = useState(membro.emblemas || []);

  const handleFoto = e => {
    const file = e.target.files[0]; if (!file) return;
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300, ratio = Math.min(SIZE/img.width, SIZE/img.height);
        const canvas = document.createElement('canvas');
        canvas.width = img.width*ratio; canvas.height = img.height*ratio;
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        setFoto(canvas.toDataURL('image/jpeg',0.85));
        setCompressing(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleEmblema = e => {
    setEmblemasSel(prev =>
      prev.find(x=>x.nome===e.nome)
        ? prev.filter(x=>x.nome!==e.nome)
        : [...prev, e]
    );
  };

  const salvar = async () => {
    if (!nome.trim()) { setMsg('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const dados = { nome:nome.trim(), matricula:matricula.trim(), email:email.trim().toLowerCase(), cargo, periodo:periodo.trim(), foto, emblemas:emblemasSel };
      await updateDoc(doc(db,'usuarios',membro.id), dados);
      onSaved(dados);
      setMsg('Perfil salvo!');
      setEditando(false);
    } catch { setMsg('Erro ao salvar.'); }
    setSaving(false);
  };

  const removerEmblema = async (e) => {
    const novos = emblemasSel.filter(x=>x.nome!==e.nome);
    setEmblemasSel(novos);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.97)', zIndex:300, display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:22 }}>‹</button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--cream)' }}>
          {editando ? 'Editar perfil' : 'Perfil do membro'}
        </div>
        <button onClick={()=>editando ? salvar() : setEditando(true)}
          disabled={saving||compressing}
          style={{ background:editando?'var(--gold)':'rgba(201,164,74,.15)', border:editando?'none':'1px solid rgba(201,164,74,.3)', borderRadius:20, padding:'6px 16px', color:editando?'var(--bg)':'var(--gold)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
          {saving ? '...' : editando ? 'Salvar' : '✏️ Editar'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 16px 32px' }}>
        {msg && (
          <div style={{ fontSize:13, padding:'9px 13px', borderRadius:10, marginBottom:14,
            background: msg.includes('Erro') ? 'rgba(232,127,127,.1)' : 'rgba(76,175,138,.1)',
            color:      msg.includes('Erro') ? '#e87f7f' : '#4caf8a',
            border:`1px solid ${msg.includes('Erro')?'rgba(232,127,127,.25)':'rgba(76,175,138,.25)'}` }}>
            {msg}
          </div>
        )}

        {/* Foto */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display:'none' }} />
          <div onClick={()=>editando&&fileRef.current?.click()}
            style={{ width:90, height:90, borderRadius:'50%', border:'3px solid var(--gold)', overflow:'hidden', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:editando?'pointer':'default', position:'relative' }}>
            {foto
              ? <img src={foto} alt={nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:'var(--gold)' }}>{nome?.[0]||'?'}</span>
            }
            {editando && (
              <div style={{ position:'absolute', inset:0, background:'rgba(24,1,8,.45)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                {compressing ? '⏳' : '📷'}
              </div>
            )}
          </div>
          {editando && <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>Toque para trocar a foto</div>}
        </div>

        {/* Campos */}
        {editando ? (
          <div>
            {[
              { label:'👤 Nome',       val:nome,       set:setNome,       ph:'Nome completo',     type:'text'   },
              { label:'🎓 Matrícula',  val:matricula,  set:setMatricula,  ph:'Ex: 202510854',     type:'number' },
              { label:'✉️ Email',      val:email,      set:setEmail,      ph:'email@exemplo.com', type:'email'  },
              { label:'📅 Período',   val:periodo,    set:setPeriodo,    ph:'Ex: 5º período',    type:'text'   },
            ].map(({label,val,set,ph,type}) => (
              <div key={label} style={{ marginBottom:14 }}>
                <label style={lbl}>{label}</label>
                <input type={type} value={val} onChange={e=>set(e.target.value)}
                  placeholder={ph} style={inp} />
              </div>
            ))}

            {/* Cargo */}
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>🏷️ Cargo</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {cargos.map(c => (
                  <button key={c} onClick={()=>setCargo(c)}
                    style={{ padding:'7px 12px', borderRadius:20, border:cargo===c?'none':'1px solid var(--border2)', background:cargo===c?'var(--gold)':'var(--card)', color:cargo===c?'var(--bg)':'var(--muted)', fontSize:12, fontWeight:cargo===c?700:500, fontFamily:'var(--font-body)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Emblemas */}
            {emblemas.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>🏅 Emblemas</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {emblemas.map((e,i) => {
                    const ativo = emblemasSel.find(x=>x.nome===e.nome);
                    return (
                      <button key={i} onClick={()=>toggleEmblema(e)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:12, border:ativo?'1.5px solid var(--gold)':'1px solid var(--border2)', background:ativo?'rgba(201,164,74,.12)':'var(--card)', fontFamily:'var(--font-body)' }}>
                        <span style={{ fontSize:18 }}>{e.emoji}</span>
                        <span style={{ fontSize:12, color:ativo?'var(--gold)':'var(--muted)' }}>{e.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Visualização */}
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--cream)' }}>{nome}</div>
              <div style={{ fontSize:13, color:'var(--gold)', marginTop:4 }}>{cargo}</div>
              {periodo && <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{periodo}</div>}
            </div>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:14 }}>
              {[['🎓','Matrícula',matricula],['✉️','Email',email||'—'],['⭐','XP Total',`${membro.xp||0} XP`]].map(([icon,label,value],i,arr)=>(
                <div key={label} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom:i<arr.length-1?'1px solid var(--border)':'none' }}>
                  <span style={{ fontSize:16 }}>{icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{label}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
            {membro.bio && (
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Bio</div>
                <div style={{ fontSize:14, color:'var(--cream)', lineHeight:1.6 }}>{membro.bio}</div>
              </div>
            )}
            {emblemasSel.length > 0 && (
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:10 }}>Emblemas</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {emblemasSel.map((e,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border2)' }}>
                      <span style={{ fontSize:18 }}>{e.emoji}</span>
                      <span style={{ fontSize:12, color:'var(--cream)' }}>{e.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demandas */}
        <DemandasMembro matricula={matricula} />
      </div>
    </div>
  );
}

function ListaMembros({ cargosExtras, emblemasExtras }) {
  const [membros, setMembros]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [membro, setMembro]       = useState(null); // membro selecionado
  const [verPerfil, setVerPerfil] = useState(null); // perfil detalhado
  const [xpInput, setXpInput]     = useState('');
  const [cargoSel, setCargoSel]   = useState('');
  const [emblemaSel, setEmblemaSel] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db,'usuarios'),
      snap => {
        setMembros(snap.docs.map(d=>({id:d.id,...d.data()})));
        setLoading(false);
      },
      err => {
        console.log('GestaoScreen error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const abrirMembro = m => { setMembro(m); setXpInput(''); setCargoSel(m.cargo||'Membro'); setEmblemaSel(null); setMsg(''); };
  const fechar = () => setMembro(null);

  const darXP = async () => {
    const pts = parseInt(xpInput);
    if (isNaN(pts)||pts<=0) { setMsg('XP inválido.'); return; }
    setSaving(true);
    try {
      await aplicarXPCentral(membro.matricula, pts);
      setMembro(m=>({...m, xp:(m.xp||0)+pts}));
      setMembros(ms=>ms.map(m=>m.id===membro.id?{...m,xp:(m.xp||0)+pts}:m));
      setXpInput(''); setMsg(`+${pts} XP adicionados!`);
    } catch {}
    setSaving(false);
  };

  const mudarCargo = async () => {
    setSaving(true);
    await updateDoc(doc(db,'usuarios',membro.id),{ cargo:cargoSel });
    setMembro(m=>({...m,cargo:cargoSel}));
    setMembros(ms=>ms.map(m=>m.id===membro.id?{...m,cargo:cargoSel}:m));
    setMsg('Cargo atualizado!'); setSaving(false);
  };

  const darEmblema = async () => {
    if (!emblemaSel) { setMsg('Selecione um emblema.'); return; }
    setSaving(true);
    const atuais = membro.emblemas||[];
    if (atuais.find(e=>e.nome===emblemaSel.nome)) { setMsg('Membro já tem esse emblema.'); setSaving(false); return; }
    const novos = [...atuais, emblemaSel];
    await updateDoc(doc(db,'usuarios',membro.id),{ emblemas:novos });
    setMembro(m=>({...m,emblemas:novos}));
    setMembros(ms=>ms.map(m=>m.id===membro.id?{...m,emblemas:novos}:m));
    setMsg('Emblema concedido!'); setSaving(false);
  };

  const banir = async () => {
    if (!window.confirm(`Banir ${membro.nome}? Ele perderá acesso imediatamente.`)) return;
    setSaving(true);
    await updateDoc(doc(db,'usuarios',membro.id),{ status:'banido' });
    setMembros(ms=>ms.filter(m=>m.id!==membro.id));
    fechar(); setSaving(false);
  };

  const todosOsCargos = CARGOS_PADRAO;

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div style={{ fontSize:14, color:'var(--muted)' }}>Carregando...</div></div>;

  return (
    <div style={{ padding:'0 16px' }}>
      {membros.length === 0 && <div style={{ textAlign:'center', color:'var(--muted)', padding:40, fontSize:14 }}>Nenhum membro cadastrado.</div>}
      {membros.map(m => (
        <div key={m.id}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, marginBottom:9 }}>
          <div onClick={()=>setVerPerfil(m)} style={{ cursor:'pointer' }}>
            <Avatar foto={m.foto} nome={m.nome} size={44} />
          </div>
          <div style={{ flex:1, minWidth:0 }} onClick={()=>setVerPerfil(m)} >
            <div style={{ fontSize:14, fontWeight:700, color:'var(--cream)', cursor:'pointer' }}>{m.nome}</div>
            <div style={{ fontSize:12, color:'var(--gold)', marginTop:2 }}>{m.cargo||'Membro'}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>🎓 {m.matricula} · ⭐ {m.xp||0} XP</div>
          </div>
          {m.status==='banido' && <div style={{ fontSize:10, fontWeight:700, color:'#e87f7f', background:'rgba(232,127,127,.15)', padding:'3px 8px', borderRadius:20, border:'1px solid rgba(232,127,127,.3)' }}>BANIDO</div>}
          <button onClick={()=>abrirMembro(m)} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'6px 10px', color:'var(--muted)', fontSize:12, fontFamily:'var(--font-body)' }}>Gerir</button>
        </div>
      ))}

      {/* Modal ver/editar perfil completo */}
      {verPerfil && (
        <PerfilEditModal
          membro={verPerfil}
          cargos={CARGOS_PADRAO}
          emblemas={emblemasExtras}
          onClose={()=>setVerPerfil(null)}
          onSaved={dados=>{
            setVerPerfil(v=>({...v,...dados}));
            setMembros(ms=>ms.map(m=>m.id===verPerfil.id?{...m,...dados}:m));
          }}
        />
      )}

      {/* Modal membro */}
      {membro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(24,1,8,.95)', zIndex:300, display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid var(--border)' }}>
            <button onClick={fechar} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:15, fontFamily:'var(--font-body)', fontWeight:600 }}>‹ Voltar</button>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--cream)' }}>Gerenciar membro</div>
            <div style={{ width:60 }} />
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 32px' }}>
            {/* Perfil */}
            <div style={{ display:'flex', alignItems:'center', gap:14, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:16, padding:16, marginBottom:20 }}>
              <Avatar foto={membro.foto} nome={membro.nome} size={56} />
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--cream)' }}>{membro.nome}</div>
                <div style={{ fontSize:12, color:'var(--gold)', marginTop:3 }}>{membro.cargo}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>🎓 {membro.matricula} · ⭐ {membro.xp||0} XP</div>
              </div>
            </div>

            {msg && <div style={{ fontSize:13, color:'#4caf8a', padding:'9px 13px', background:'rgba(76,175,138,.1)', borderRadius:10, marginBottom:16, border:'1px solid rgba(76,175,138,.25)' }}>✅ {msg}</div>}

            {/* Dar XP */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--cream)', marginBottom:10 }}>⭐ Dar XP</div>
              <div style={{ display:'flex', gap:8 }}>
                <input type="number" value={xpInput} onChange={e=>setXpInput(e.target.value)} placeholder="Quantidade de XP" style={{ ...inp, flex:1 }} />
                <button onClick={darXP} disabled={saving} style={{ padding:'11px 16px', borderRadius:12, border:'none', background:'var(--gold)', color:'var(--bg)', fontWeight:700, fontSize:13, fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
                  Dar XP
                </button>
              </div>
            </div>

            {/* Cargo */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--cream)', marginBottom:10 }}>🏷️ Cargo</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {todosOsCargos.map(c => {
                  const custom = cargosExtras.find(x=>x.nome===c);
                  return (
                    <button key={c} onClick={()=>setCargoSel(c)}
                      style={{ padding:'6px 12px', borderRadius:20, border:cargoSel===c?'none':'1px solid var(--border2)', background:cargoSel===c?(custom?.cor||'var(--gold)'):'var(--bg3)', color:cargoSel===c?'var(--bg)':'var(--muted)', fontSize:12, fontWeight:cargoSel===c?700:500, fontFamily:'var(--font-body)' }}>
                      {c}
                    </button>
                  );
                })}
              </div>
              <button onClick={mudarCargo} disabled={saving} style={{ width:'100%', padding:'10px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C9A44A,#a8832e)', color:'var(--bg)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
                Salvar cargo
              </button>
            </div>

            {/* Emblemas */}
            {emblemasExtras.length > 0 && (
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--cream)', marginBottom:10 }}>🏅 Dar emblema</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                  {emblemasExtras.map((e,i) => (
                    <button key={i} onClick={()=>setEmblemaSel(e)}
                      style={{ padding:'8px 12px', borderRadius:12, border:emblemaSel?.nome===e.nome?'1.5px solid var(--gold)':'1px solid var(--border2)', background:emblemaSel?.nome===e.nome?'rgba(201,164,74,.15)':'var(--bg3)', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-body)', cursor:'pointer' }}>
                      <span style={{ fontSize:20 }}>{e.emoji}</span>
                      <span style={{ fontSize:12, color:'var(--cream)' }}>{e.nome}</span>
                    </button>
                  ))}
                </div>
                <button onClick={darEmblema} disabled={saving} style={{ width:'100%', padding:'10px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C9A44A,#a8832e)', color:'var(--bg)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
                  Conceder emblema
                </button>
              </div>
            )}

            {/* Banir + Excluir */}
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button onClick={banir} disabled={saving}
                style={{ flex:1, padding:'13px', borderRadius:14, border:'1px solid rgba(232,127,127,.4)', background:'rgba(232,127,127,.08)', color:'#e87f7f', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
                🚫 Banir
              </button>
              <button onClick={async () => {
                if (!window.confirm(`Excluir ${membro.nome} permanentemente?`)) return;
                setSaving(true);
                await deleteDoc(doc(db,'usuarios',membro.id));
                setMembros(ms=>ms.filter(m=>m.id!==membro.id));
                fechar(); setSaving(false);
              }} disabled={saving}
                style={{ flex:1, padding:'13px', borderRadius:14, border:'1px solid rgba(150,150,150,.3)', background:'rgba(150,150,150,.08)', color:'var(--muted)', fontSize:13, fontWeight:700, fontFamily:'var(--font-body)' }}>
                🗑️ Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Criar Cargos e Emblemas ───────────────────────────────────────────────────
function CriarCargosEmblemas({ cargosExtras, emblemasExtras, onAtualizar }) {
  const [emojiEmblema, setEmojiEmblema] = useState('');
  const [nomeEmblema, setNomeEmblema]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  const criarEmblema = async () => {
    if (!emojiEmblema.trim()||!nomeEmblema.trim()) { setMsg('Preencha emoji e nome.'); return; }
    setSaving(true);
    await addDoc(collection(db,'emblemas_custom'),{ emoji:emojiEmblema.trim(), nome:nomeEmblema.trim(), criadoEm:new Date().toISOString() });
    setEmojiEmblema(''); setNomeEmblema(''); setMsg('Emblema criado!'); onAtualizar(); setSaving(false);
  };

  return (
    <div style={{ padding:'0 16px', paddingBottom:24 }}>
      {msg && <div style={{ fontSize:13, color:'#4caf8a', padding:'9px 13px', background:'rgba(76,175,138,.1)', borderRadius:10, marginBottom:14, border:'1px solid rgba(76,175,138,.25)' }}>✅ {msg}</div>}

      {/* Cargos fixos */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--cream)', marginBottom:12 }}>🏷️ Cargos do NEnQ</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {CARGOS_PADRAO.map((c,i) => {
            const colors = ['#C9A44A','#4caf8a','#6a9fd8','#a78bfa','#e87f7f'];
            return <div key={i} style={{ padding:'6px 14px', borderRadius:20, background:colors[i%colors.length], color:'var(--bg)', fontSize:12, fontWeight:700 }}>{c}</div>;
          })}
        </div>
      </div>

      {/* Criar emblema */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--cream)', marginBottom:14 }}>🏅 Criar novo emblema</div>
        <label style={lbl}>Emoji do emblema</label>
        <input value={emojiEmblema} onChange={e=>{setEmojiEmblema(e.target.value);setMsg('');}} placeholder="Ex: 🔬" style={{ ...inp, fontSize:24, textAlign:'center', marginBottom:12 }} maxLength={2} />
        <label style={lbl}>Nome do emblema</label>
        <input value={nomeEmblema} onChange={e=>{setNomeEmblema(e.target.value);setMsg('');}} placeholder="Ex: Pesquisador Destaque" style={{ ...inp, marginBottom:14 }} />
        {emojiEmblema && nomeEmblema && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{emojiEmblema}</div>
            <span style={{ fontSize:13, color:'var(--cream)' }}>{nomeEmblema}</span>
          </div>
        )}
        <button onClick={criarEmblema} disabled={saving} style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#C9A44A,#a8832e)', color:'var(--bg)', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)' }}>
          Criar emblema
        </button>
      </div>

      {/* Emblemas existentes */}
      {emblemasExtras.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--cream)', opacity:.45, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Emblemas criados</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {emblemasExtras.map((e,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', background:'var(--card)', borderRadius:12, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:18 }}>{e.emoji}</span>
                <span style={{ fontSize:12, color:'var(--cream)' }}>{e.nome}</span>
                <button onClick={async()=>{ if(!window.confirm(`Excluir emblema "${e.nome}"?`))return; await deleteDoc(doc(db,'emblemas_custom',e.id)); onAtualizar(); }}
                  style={{ width:18, height:18, borderRadius:'50%', background:'rgba(232,127,127,.2)', border:'1px solid rgba(232,127,127,.3)', color:'#e87f7f', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:700, marginLeft:2 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function GestaoScreen({ user }) {
  const [aba, setAba]                       = useState('membros');
  const [cargosExtras, setCargosExtras]     = useState([]);
  const [emblemasExtras, setEmblemasExtras] = useState([]);

  const carregarCustom = () => {
    getDocs(collection(db,'cargos_custom'))
      .then(s => setCargosExtras(s.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(() => {});
    getDocs(collection(db,'emblemas_custom'))
      .then(s => setEmblemasExtras(s.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(() => {});
  };

  useEffect(() => { carregarCustom(); }, []);

  const abas = [
    { id:'membros',  label:'👥 Membros'  },
    { id:'criar',    label:'➕ Novo'     },
    { id:'config',   label:'⚙️ Config'   },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', paddingBottom:80 }}>
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>Gestão de Pessoas</div>
        <div style={{ fontSize:13, color:'var(--muted)', marginTop:3, marginBottom:16 }}>Área exclusiva · NEnQ</div>

        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {abas.map(a => (
            <button key={a.id} onClick={()=>setAba(a.id)}
              style={{ flex:1, padding:'10px 0', borderRadius:12, border:aba===a.id?'none':'1px solid var(--border)', background:aba===a.id?'linear-gradient(135deg,#C9A44A,#a8832e)':'var(--card)', color:aba===a.id?'var(--bg)':'var(--muted)', fontSize:12, fontWeight:aba===a.id?700:500, fontFamily:'var(--font-body)' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {aba==='membros' && <ListaMembros cargosExtras={cargosExtras} emblemasExtras={emblemasExtras} />}
      {aba==='criar'   && <CriarMembro  cargosExtras={cargosExtras} onCriado={()=>setAba('membros')} />}
      {aba==='config'  && <CriarCargosEmblemas cargosExtras={cargosExtras} emblemasExtras={emblemasExtras} onAtualizar={carregarCustom} />}
    </div>
  );
}

const lbl = { display:'block', fontSize:12, fontWeight:700, color:'var(--cream)', opacity:.55, marginBottom:6, letterSpacing:'.05em', textTransform:'uppercase' };
const inp = { width:'100%', background:'var(--bg)', border:'1px solid var(--border2)', borderRadius:12, padding:'12px 14px', fontSize:14, color:'var(--cream)', fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box' };
