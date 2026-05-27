import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, orderBy, query,
} from 'firebase/firestore';

const NENQ_LOGO = "data:image/jpeg;base64,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";
const PTR_THRESHOLD = 72;

function Spinner({ size = 22, color = 'var(--gold)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5"
        strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

function PostCard({ post }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = post.imagens?.length ? post.imagens : (post.imagem ? [post.imagem] : []);
  const ts = post.criadoEm?.toDate
    ? new Date(post.criadoEm.toDate()).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    : 'agora';

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:11, padding:'13px 14px 10px' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, background:'var(--bg3)', border:'2px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--gold)' }}>
          {post.autor?.[0] || '?'}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--cream)' }}>{post.autor}</div>
          <div style={{ fontSize:12, color:'var(--gold)', marginTop:1 }}>{post.cargo}</div>
        </div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>{ts}</div>
      </div>

      {imgs.length > 0 && (
        <div style={{ position:'relative', width:'100%', background:'var(--bg3)' }}>
          <img src={imgs[imgIdx]} alt="post"
            style={{ width:'100%', maxHeight:340, objectFit:'cover', display:'block' }}
            onError={e => { e.target.style.display='none'; }} />
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i-1+imgs.length)%imgs.length)}
                style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(24,1,8,.75)', border:'1px solid rgba(242,228,196,.3)', color:'var(--cream)', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
              <button onClick={() => setImgIdx(i => (i+1)%imgs.length)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:'50%', background:'rgba(24,1,8,.75)', border:'1px solid rgba(242,228,196,.3)', color:'var(--cream)', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
              <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
                {imgs.map((_,i) => <div key={i} style={{ width:i===imgIdx?20:6, height:6, borderRadius:3, background:i===imgIdx?'var(--cream)':'rgba(242,228,196,.4)', transition:'width .2s' }} />)}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding:'11px 14px 13px' }}>
        <div style={{ fontSize:14, color:'var(--cream)', lineHeight:1.6, marginBottom:post.link?10:0 }}>{post.texto || post.legenda}</div>
        {post.link && (
          <a href={post.link} target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:13, fontWeight:600, color:'#E1306C', textDecoration:'none', padding:'7px 14px', borderRadius:20, background:'rgba(225,48,108,.1)', border:'1px solid rgba(225,48,108,.25)' }}>
            🔗 Acessar link
          </a>
        )}
      </div>
    </div>
  );
}

export default function HomeScreen({ user }) {
  const [posts, setPosts]         = useState([]);
  const [refreshing, setRefreshing] = useState(true);
  const [pullY, setPullY]         = useState(0);
  const [pulling, setPulling]     = useState(false);

  const scrollRef  = useRef(null);
  const touchStart = useRef(0);
  const isPulling  = useRef(false);

  const carregarPosts = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db,'posts_marketing'),
      snap => {
        const sorted = snap.docs
          .map(d => ({ id:d.id, ...d.data() }))
          .sort((a,b) => {
            const ta = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(0);
            const tb = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(0);
            return tb - ta;
          });
        setPosts(sorted);
        setRefreshing(false);
      },
      err => { console.log('posts error:', err); setRefreshing(false); }
    );
    return unsub;
  }, []);

  const onTouchStart = e => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStart.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };
  const onTouchMove = e => {
    if (!isPulling.current) return;
    const dy = e.touches[0].clientY - touchStart.current;
    if (dy > 0) { setPulling(true); setPullY(Math.min(dy * 0.45, PTR_THRESHOLD + 20)); }
  };
  const onTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullY >= PTR_THRESHOLD) { setPullY(PTR_THRESHOLD); carregarPosts(); }
    setPullY(0); setPulling(false);
  };

  const ptrOpacity = Math.min(pullY / PTR_THRESHOLD, 1);
  const ptrReady   = pullY >= PTR_THRESHOLD;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', overflow:'hidden' }}>

      {/* PTR indicator */}
      <div style={{ height:pullY, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', opacity:ptrOpacity, transition:pulling?'none':'height .25s, opacity .25s', flexShrink:0 }}>
        {refreshing
          ? <Spinner />
          : <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:ptrReady?'var(--gold)':'var(--muted)', fontWeight:600 }}>
              <span style={{ fontSize:18, display:'inline-block', transform:ptrReady?'rotate(180deg)':'rotate(0deg)', transition:'transform .2s' }}>↓</span>
              {ptrReady ? 'Solte para atualizar' : 'Puxe para atualizar'}
            </div>
        }
      </div>

      <div ref={scrollRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ flex:1, overflowY:'auto', paddingBottom:80, transform:`translateY(${pulling&&!refreshing?pullY*0.15:0}px)`, transition:pulling?'none':'transform .25s' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src={NENQ_LOGO} alt="NEnQ" style={{ width:36, height:36, borderRadius:8, objectFit:'cover' }} />
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--cream)' }}>
              N<span style={{ color:'var(--gold)' }}>En</span>Q
            </div>
          </div>
        </div>

        {/* Feed */}
        <div style={{ padding:'0 14px' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--cream)', opacity:.45, marginBottom:13 }}>
            Publicações do Núcleo
          </div>

          {refreshing && posts.length === 0 && (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
              <Spinner size={32} />
            </div>
          )}

          {!refreshing && posts.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--muted)', fontSize:14, lineHeight:1.7 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              Nenhum post até agora.
            </div>
          )}

          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
