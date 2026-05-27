import React from 'react';

export default function OutrosScreen({ onNavegar, badgeNotif, cargo }) {
  const opcoes = [
    { id:'ranking',       icon:'🏆', label:'Ranking XP',         desc:'Veja o ranking dos membros mais ativos'        },
    { id:'calendario',    icon:'📅', label:'Agenda NEnQ',         desc:'Calendário de eventos e prazos do núcleo'      },
    { id:'notificacoes',  icon:'🔔', label:'Notificações',        desc:'Avisos, XP e atualizações', badge: badgeNotif  },
    ...(cargo === 'Coordenação Geral' ? [
      { id:'marketing', icon:'📢', label:'Posts de Marketing', desc:'Visualize e modere publicações de Marketing', cor:'#C9A44A' },
    ] : []),
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', paddingBottom:80 }}>
      <div style={{ padding:'20px 16px 16px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>Outros</div>
        <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>Explore mais ferramentas</div>
      </div>

      <div style={{ padding:'0 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {opcoes.map(op => (
          <button key={op.id} onClick={() => onNavegar(op.id)}
            style={{ display:'flex', alignItems:'center', gap:14, padding:'18px 16px', background:'var(--card)', border:'1px solid var(--border2)', borderRadius:18, textAlign:'left', width:'100%', cursor:'pointer', position:'relative' }}>
            <div style={{ width:52, height:52, borderRadius:14, background: op.cor ? `${op.cor}18` : 'rgba(201,164,74,.1)', border: op.cor ? `1px solid ${op.cor}33` : '1px solid rgba(201,164,74,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
              {op.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--cream)' }}>{op.label}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, lineHeight:1.5 }}>{op.desc}</div>
            </div>
            {op.badge > 0 && (
              <div style={{ position:'absolute', top:12, right:12, minWidth:20, height:20, borderRadius:10, background:'#e87f7f', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>
                {op.badge > 9 ? '9+' : op.badge}
              </div>
            )}
            <span style={{ fontSize:20, color:'var(--muted)' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
