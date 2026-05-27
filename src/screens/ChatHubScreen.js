import React from 'react';

const CHATS = [
  {
    id:    'chat',
    icon:  '📢',
    label: 'Chat Marketing',
    desc:  'Canal da coordenadoria de Marketing',
    cor:   '#C9A44A',
  },
  {
    id:    'chat_eventos',
    icon:  '🎯',
    label: 'Chat Eventos',
    desc:  'Canal da coordenadoria de Eventos',
    cor:   '#4caf8a',
  },
  {
    id:    'chat_pp',
    icon:  '🔬',
    label: 'Chat P&P',
    desc:  'Canal da coordenadoria de Projetos & Pesquisa',
    cor:   '#a78bfa',
  },
  {
    id:    'chat_gp',
    icon:  '👥',
    label: 'Chat GP',
    desc:  'Canal da coordenadoria de Gestão de Pessoas',
    cor:   '#6a9fd8',
  },
];

export default function ChatHubScreen({ onNavegar }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', paddingBottom:80 }}>

      {/* Header */}
      <div style={{ padding:'20px 16px 16px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>
          Chats
        </div>
        <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>
          Acesso a todas as coordenadorias
        </div>
      </div>

      {/* Lista de chats */}
      <div style={{ padding:'0 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {CHATS.map(chat => (
          <button
            key={chat.id}
            onClick={() => onNavegar(chat.id)}
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           14,
              padding:       '18px 16px',
              background:    'var(--card)',
              border:        '1px solid var(--border2)',
              borderRadius:  18,
              textAlign:     'left',
              width:         '100%',
              cursor:        'pointer',
            }}
          >
            {/* Ícone */}
            <div style={{
              width:          52,
              height:         52,
              borderRadius:   14,
              background:     `${chat.cor}18`,
              border:         `1px solid ${chat.cor}33`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       26,
              flexShrink:     0,
            }}>
              {chat.icon}
            </div>

            {/* Texto */}
            <div style={{ flex:1 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize:   16,
                fontWeight: 700,
                color:      'var(--cream)',
              }}>
                {chat.label}
              </div>
              <div style={{
                fontSize:   12,
                color:      'var(--muted)',
                marginTop:  3,
                lineHeight: 1.5,
              }}>
                {chat.desc}
              </div>
            </div>

            <span style={{ fontSize:20, color:'var(--muted)' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
