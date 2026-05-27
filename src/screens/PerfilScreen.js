import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const ratio = Math.min(SIZE / img.width, SIZE / img.height);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Avatar({ foto, nome, size = 80, border = '3px solid var(--gold)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border, background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>
      {foto
        ? <img src={foto} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.36, fontWeight: 700, color: 'var(--gold)' }}>{nome?.[0] || '?'}</span>
      }
    </div>
  );
}

function EmblemaBadge({ emblemas }) {
  const [tooltip, setTooltip] = useState(null);
  if (!emblemas?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {emblemas.map((e, i) => (
        <div key={i} style={{ position: 'relative' }}>
          <button
            onTouchStart={() => setTooltip(i)}
            onTouchEnd={() => setTimeout(() => setTooltip(null), 1500)}
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'default' }}>
            {e.emoji}
          </button>
          {tooltip === i && (
            <div style={{ position: 'absolute', bottom: 42, left: '50%', transform: 'translateX(-50%)', background: 'var(--cream)', color: 'var(--bg)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
              {e.nome}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditarModal({ perfil, onSave, onClose }) {
  const isGP = perfil.cargo === 'Gestão de Pessoas' || perfil.cargo === 'Coordenação Geral';
  const [matricula, setMatricula] = useState(perfil.matricula || '');
  const [bio, setBio]             = useState(perfil.bio || '');
  const [senhaAtual, setSenhaAtual]     = useState('');
  const [novaSenha, setNovaSenha]       = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [erro, setErro]   = useState('');
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    const dados = { bio };
    if (isGP && matricula.trim()) dados.matricula = matricula.trim();
    if (novaSenha) {
      if (senhaAtual !== perfil.senha) { setErro('Senha atual incorreta.'); return; }
      if (novaSenha.length < 6) { setErro('Nova senha precisa ter 6+ caracteres.'); return; }
      if (novaSenha !== confirmSenha) { setErro('Senhas não coincidem.'); return; }
      dados.senha = novaSenha;
    }
    setLoading(true);
    await onSave(dados);
    setLoading(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,1,8,.97)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 15, fontFamily: 'var(--font-body)', fontWeight: 600 }}>Cancelar</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>Editar perfil</div>
        <button onClick={salvar} disabled={loading}
          style={{ background: loading ? 'rgba(201,164,74,.3)' : 'var(--gold)', border: 'none', borderRadius: 20, padding: '7px 18px', color: 'var(--bg)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)' }}>
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {isGP && (
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>🎓 Matrícula</label>
            <input type="number" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Matrícula" style={inp} />
          </div>
        )}
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>📝 Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." maxLength={150}
            style={{ ...inp, minHeight: 90, resize: 'none' }} />
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>{bio.length}/150</div>
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 18px' }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)', opacity: .45, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>
          Alterar senha (opcional)
        </div>
        {[
          { label: '🔒 Senha atual',  value: senhaAtual,   set: setSenhaAtual,   ph: 'Senha atual' },
          { label: '🔑 Nova senha',   value: novaSenha,    set: setNovaSenha,    ph: 'Mínimo 6 caracteres' },
          { label: '🔑 Confirmar',    value: confirmSenha, set: setConfirmSenha, ph: 'Repita a nova senha' },
        ].map(({ label, value, set, ph }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={lbl}>{label}</label>
            <input type="password" value={value} onChange={e => { set(e.target.value); setErro(''); }} placeholder={ph} style={inp} />
          </div>
        ))}
        {erro && <div style={{ fontSize: 13, color: '#e87f7f', padding: '9px 13px', background: 'rgba(232,127,127,.1)', borderRadius: 10 }}>⚠️ {erro}</div>}
      </div>
    </div>
  );
}

export default function PerfilScreen({ user, onLogout }) {
  const [perfil, setPerfil]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editando, setEditando] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [fotoFullscreen, setFotoFullscreen] = useState(false);

  const perfilRef = doc(db, 'usuarios', user.id);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const snap = await getDoc(perfilRef);
        const dados = snap.exists() ? { id: snap.id, ...snap.data() } : user;

        // Busca demandas ativas de todas as coordenadorias
        const colecoes = [
          { col: 'demandas_marketing',  coord: 'Marketing'  },
          { col: 'demandas_pp',         coord: 'P&P'        },
          { col: 'demandas_eventos',    coord: 'Eventos'    },
          { col: 'demandas_gp',         coord: 'GP'         },
        ];
        let demandasAtivas = [];
        let totalDemandas  = 0;
        for (const { col, coord } of colecoes) {
          try {
            const { getDocs, collection, query, where } = await import('firebase/firestore');
            // Conta todas as demandas que o membro aceitou
            const qAll = query(collection(db, col));
            const snapAll = await getDocs(qAll);
            for (const d of snapAll.docs) {
              const data = d.data();
              const isPart = data.participantes?.some(p => p.userId === (user.matricula));
              if (isPart) {
                totalDemandas++;
                if (data.status === 'em_progresso') {
                  demandasAtivas.push({ titulo: data.titulo, coordenadoria: coord });
                }
              }
            }
          } catch {}
        }
        setPerfil({ ...dados, demandasAtivas, totalDemandas });
      } catch {
        setPerfil(user);
      }
      setLoading(false);
    };
    carregarPerfil();
  }, []);

  const salvarPerfil = async dados => {
    await updateDoc(perfilRef, dados);
    setPerfil(p => ({ ...p, ...dados }));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin .8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const cargo = perfil?.cargo || 'Membro';
  const cargoColor = { 'Coordenadoria Geral': '#e87f7f', 'Coordenação Geral': '#e87f7f', 'Marketing': '#C9A44A', 'Gestão de Pessoas': '#6a9fd8', 'Eventos': '#4caf8a' }[cargo] || 'var(--muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--cream)' }}>Meu Perfil</div>
      </div>

      {/* Hero */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 20, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,74,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
            <Avatar foto={perfil?.foto} nome={perfil?.nome} size={76} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 6 }}>
                {perfil?.nome || user.nome}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${cargoColor}18`, border: `1px solid ${cargoColor}44`, color: cargoColor, marginBottom: 4 }}>
                {cargo}
              </div>
              {perfil?.periodo && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{perfil.periodo}</div>
              )}
            </div>
          </div>

          {/* Emblemas */}
          <EmblemaBadge emblemas={perfil?.emblemas} />

          {/* Bio */}
          {perfil?.bio
            ? <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6, margin: '12px 0' }}>{perfil.bio}</div>
            : <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '12px 0', fontStyle: 'italic' }}>Adicione uma bio...</div>
          }

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cream)' }}>{perfil?.totalDemandas ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Demandas</div>
            </div>
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--cream)' }}>{perfil?.xp ?? 0} XP</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Pontuação</div>
            </div>
          </div>

          {/* Demandas ativas */}
          {perfil?.demandasAtivas?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', opacity: .5, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Demandas ativas</div>
              {perfil.demandasAtivas.map((d, i) => (
                <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A44A', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: 'var(--cream)' }}>{d.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{d.coordenadoria}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setEditando(true)}
            style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--card)', color: 'var(--cream)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            ✏️ Editar perfil
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: '🎓', label: 'Matrícula', value: perfil?.matricula || user.matricula },
            { icon: '✉️', label: 'Email',     value: perfil?.email || '—' },
            { icon: '🏷️', label: 'Cargo',     value: cargo },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sair */}
      <div style={{ padding: '16px' }}>
        <button onClick={() => setShowLogout(true)}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid rgba(232,127,127,.3)', background: 'rgba(232,127,127,.08)', color: '#e87f7f', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          🚪 Sair da conta
        </button>
      </div>

      {/* Modal logout */}
      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,1,8,.85)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginBottom: 8, textAlign: 'center' }}>Sair da conta?</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', marginBottom: 28 }}>Você será desconectado do NEnQ Connect.</div>
            <button onClick={onLogout} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#e87f7f', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', marginBottom: 12 }}>Sair</button>
            <button onClick={() => setShowLogout(false)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--cream)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {editando && <EditarModal perfil={{ ...perfil, ...user }} onSave={salvarPerfil} onClose={() => setEditando(false)} />}

      {fotoFullscreen && perfil?.foto && (
        <div onClick={() => setFotoFullscreen(false)}
          style={{ position:'fixed', inset:0, background:'#000', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={perfil.foto} alt={perfil.nome}
            style={{ width:'100vw', height:'100vh', objectFit:'contain', display:'block' }} />
          <button onClick={e => { e.stopPropagation(); setFotoFullscreen(false); }}
            style={{ position:'absolute', top:20, right:20, width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,.6)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', zIndex:501 }}>×</button>
        </div>
      )}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cream)', opacity: .55, marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' };
const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
