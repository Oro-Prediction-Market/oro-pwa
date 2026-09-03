import { useEffect, useState } from "react";
import { X, Trophy, Target } from "lucide-react";
import { getPublicProfile, avatarFallback, type PublicProfile } from "@shared/api/client";

export function PublicProfileDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  useEffect(() => { if (userId) { setProfile(null); getPublicProfile(userId).then(setProfile).catch(() => setProfile(null)); } }, [userId]);
  if (!userId) return null;
  const name = profile?.username ? `@${profile.username}` : `${profile?.firstName ?? "Predictor"}${profile?.lastName ? ` ${profile.lastName}` : ""}`;
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,.68)",backdropFilter:"blur(8px)",display:"grid",placeItems:"center",padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{width:"min(420px,100%)",background:"linear-gradient(145deg,#182235,#0d1421)",border:"1px solid var(--glass-border)",borderRadius:24,padding:24,boxShadow:"0 24px 70px rgba(0,0,0,.48)",position:"relative"}}>
      <button onClick={onClose} aria-label="Close profile" style={{position:"absolute",right:14,top:14,border:0,background:"transparent",color:"var(--text-muted)",cursor:"pointer"}}><X size={20}/></button>
      {!profile ? <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)",fontWeight:700}}>Loading predictor…</div> : <>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:64,height:64,borderRadius:"50%",overflow:"hidden",display:"grid",placeItems:"center",background:"var(--bg-secondary)",fontWeight:900,fontSize:24}}>{profile.photoUrl ? <img src={profile.photoUrl} onError={avatarFallback(profile.id)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : name[0]}</div>
          <div><div style={{fontSize:20,fontWeight:900,color:"var(--text-main)"}}>{name}</div><div style={{marginTop:4,color:"var(--color-primary)",fontSize:12,fontWeight:800,textTransform:"uppercase"}}>{profile.reputationTier.replace("_"," ")} predictor</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginTop:24}}>
          <Stat icon={<Trophy size={15}/>} label="Rank" value={profile.rank ? `#${profile.rank}` : "—"}/><Stat icon={<Target size={15}/>} label="Win rate" value={`${profile.winRate}%`}/>
        </div>
        <div style={{marginTop:16,padding:14,borderRadius:14,background:"rgba(255,255,255,.04)",display:"flex",justifyContent:"space-between",color:"var(--text-muted)",fontSize:13,fontWeight:700}}><span>Predictions</span><strong style={{color:"var(--text-main)"}}>{profile.correctPredictions} / {profile.totalPredictions} correct</strong></div>
        {profile.contrarianBadge && <div style={{marginTop:12,color:"#fbbf24",fontSize:13,fontWeight:800}}>🏆 {profile.contrarianBadge} Contrarian · {profile.contrarianWins} wins</div>}
      </>}
    </div>
  </div>;
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div style={{padding:"12px 8px",borderRadius:14,background:"rgba(255,255,255,.05)",textAlign:"center"}}><div style={{color:"var(--color-primary)",display:"flex",justifyContent:"center",marginBottom:5}}>{icon}</div><div style={{fontSize:16,fontWeight:900,color:"var(--text-main)"}}>{value}</div><div style={{fontSize:10,color:"var(--text-subtle)",fontWeight:700,textTransform:"uppercase",marginTop:3}}>{label}</div></div> }
