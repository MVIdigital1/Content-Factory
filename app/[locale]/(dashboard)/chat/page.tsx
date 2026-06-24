"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Send, Plus, X, Hash, ChevronDown, ChevronRight,
  Search, MessageCircle, CornerUpLeft, Paperclip,
  Pencil, Trash2, SmilePlus, ZoomIn, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Room = { id: string; name: string; type: string; project_id: string | null; workspace_id: string | null; created_by: string; created_at: string; };
type Reaction = { emoji: string; count: number; mine: boolean; };
type Message = {
  id: string; room_id: string; user_id: string; content: string;
  type: "text" | "system"; created_at: string; reply_to: string | null;
  user_email?: string; edited_at?: string | null;
  file_url?: string | null; file_type?: string | null; file_name?: string | null;
  reply?: { content: string; user_email?: string; file_url?: string | null };
  reactions?: Reaction[];
};
type Project = { id: string; name: string; };
type Member = { user_id: string; role: string; last_read: string; email?: string };

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = ["#6C63FF","#3B82F6","#EC4899","#10B981","#F97316","#8B5CF6","#EF4444","#06B6D4"];
const QUICK_EMOJIS = ["👍","❤️","😂","🔥","😮","😢","👏","🎉","💯","🤝"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const userColor = (id: string) => COLORS[(id.charCodeAt(0)+(id.charCodeAt(1)||0))%COLORS.length];
const initials = (email?: string) => email ? email.slice(0,2).toUpperCase() : "??";
function fmtTime(d: string) {
  const dt = new Date(d), now = new Date(), diff = (now.getTime()-dt.getTime())/1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff/60)} мин`;
  if (diff < 86400) return dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  return dt.toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
}
const fmtFull = (d: string) => new Date(d).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
const isImage = (url?: string|null) => url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ email, size=32 }: { email?: string; size?: number }) {
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",flexShrink:0,background:userColor(email??"x"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:700,color:"#fff" }}>
      {initials(email)}
    </div>
  );
}

// ── Emoji picker ──────────────────────────────────────────────────────────────
function EmojiPicker({ onPick, onClose }: { onPick:(e:string)=>void; onClose:()=>void }) {
  return (
    <div style={{ position:"absolute",bottom:"calc(100% + 6px)",right:0,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:12,padding:8,display:"flex",gap:4,zIndex:50,boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
      {QUICK_EMOJIS.map(e=>(
        <button key={e} onClick={()=>{onPick(e);onClose();}}
          style={{ fontSize:18,background:"none",border:"none",cursor:"pointer",borderRadius:6,padding:"2px 4px",lineHeight:1 }}
          onMouseEnter={ev=>(ev.currentTarget.style.background="var(--hover)")}
          onMouseLeave={ev=>(ev.currentTarget.style.background="none")}
        >{e}</button>
      ))}
    </div>
  );
}

// ── Lightbox (просмотр медиа в чате) ─────────────────────────────────────────
function Lightbox({ url, name, onClose }: { url: string; name?: string | null; onClose: () => void }) {
  const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }}
    >
      {/* Top bar */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",background:"linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)" }}>
        <span style={{ fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.7)" }}>{name||"Медиафайл"}</span>
        <div style={{ display:"flex",gap:8 }}>
          <a href={url} download={name||"file"} target="_blank" rel="noopener noreferrer"
            style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.8)",cursor:"pointer",textDecoration:"none" }}>
            <Download size={16}/>
          </a>
          <button onClick={onClose}
            style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.8)",cursor:"pointer" }}>
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* Media */}
      <div style={{ maxWidth:"90vw",maxHeight:"82vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
        {isVideo ? (
          <video src={url} controls autoPlay style={{ maxWidth:"90vw",maxHeight:"82vh",borderRadius:12,outline:"none" }}/>
        ) : (
          <img src={url} alt={name||"медиа"} style={{ maxWidth:"90vw",maxHeight:"82vh",objectFit:"contain",borderRadius:12,userSelect:"none" }}/>
        )}
      </div>
    </div>
  );
}

// ── Send Preview Modal (перед отправкой картинки как в Телеграм) ──────────────
function SendPreviewModal({ file, previewUrl, caption, onCaptionChange, onSend, onClose, sending }: {
  file: File; previewUrl: string; caption: string;
  onCaptionChange: (v: string) => void;
  onSend: () => void; onClose: () => void; sending: boolean;
}) {
  const isVideo = file.type.startsWith("video/");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "Enter") onSend(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.88)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" }}
    >
      {/* Close */}
      <button onClick={onClose} style={{ position:"absolute",top:20,right:20,width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",cursor:"pointer" }}>
        <X size={16}/>
      </button>

      {/* Media preview */}
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:20,width:"100%",maxWidth:520,padding:"0 24px" }}>
        <div style={{ width:"100%",maxHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",borderRadius:16 }}>
          {isVideo ? (
            <video src={previewUrl} controls style={{ maxWidth:"100%",maxHeight:"60vh",borderRadius:16 }}/>
          ) : (
            <img src={previewUrl} alt="preview" style={{ maxWidth:"100%",maxHeight:"60vh",objectFit:"contain",borderRadius:16,userSelect:"none" }}/>
          )}
        </div>

        {/* File info */}
        <p style={{ margin:0,fontSize:12,color:"rgba(255,255,255,0.45)",textAlign:"center" }}>
          {file.name} · {(file.size/1024).toFixed(0)} KB
        </p>

        {/* Caption + send row */}
        <div style={{ width:"100%",display:"flex",gap:8,alignItems:"center" }}>
          <div style={{ flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)" }}>
            <input
              ref={inputRef}
              value={caption}
              onChange={e => onCaptionChange(e.target.value)}
              placeholder="Добавить подпись..."
              style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:"#fff" }}
            />
          </div>
          <button
            onClick={onSend}
            disabled={sending}
            style={{ width:44,height:44,borderRadius:13,background:"var(--accent)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:sending?"wait":"pointer",opacity:sending?0.7:1,flexShrink:0 }}
          >
            {sending
              ? <div style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
              : <Send size={16} style={{ color:"var(--on-accent)" }}/>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ projects, workspaceId, userId, onClose, onCreated }: {
  projects:Project[]; workspaceId:string|null; userId:string;
  onClose:()=>void; onCreated:(r:Room)=>void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(""); const [projectId, setProjectId] = useState(""); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  async function create() {
    if (!name.trim()) { setErr("Введите название"); return; }
    setSaving(true); setErr("");
    try {
      const { data:room, error } = await supabase.from("chat_rooms").insert({ name:name.trim(),type:"group",project_id:projectId||null,workspace_id:workspaceId,created_by:userId }).select().single();
      if (error) throw error;
      await supabase.from("chat_room_members").insert({ room_id:room.id,user_id:userId,role:"admin" });
      await supabase.from("chat_messages").insert({ room_id:room.id,user_id:userId,type:"system",content:`Группа «${room.name}» создана` });
      onCreated(room);
    } catch(e:any) { setErr(e.message); }
    setSaving(false);
  }
  return (
    <div style={{ position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:380,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:16,overflow:"hidden" }}>
        <div style={{ padding:"18px 20px 14px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <p style={{ margin:0,fontWeight:700,fontSize:15,color:"var(--tx-1)" }}>Новая группа</p>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)" }}><X size={16}/></button>
        </div>
        <div style={{ padding:20,display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:600,color:"var(--tx-3)",textTransform:"uppercase" }}>Название группы</p>
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,border:"1px solid var(--line)",background:"var(--panel-2)" }}>
              <Hash size={14} style={{ color:"var(--tx-3)",flexShrink:0 }}/>
              <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&create()} placeholder="smm-команда" style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:"var(--tx-1)" }}/>
            </div>
          </div>
          <div>
            <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:600,color:"var(--tx-3)",textTransform:"uppercase" }}>Проект (необязательно)</p>
            <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:"1px solid var(--line)",background:"var(--panel-2)",color:"var(--tx-1)",fontSize:13,outline:"none" }}>
              <option value="">Без проекта</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {err && <p style={{ margin:0,fontSize:12,color:"var(--neg)" }}>{err}</p>}
          <button onClick={create} disabled={saving} style={{ padding:"11px",borderRadius:10,background:"var(--accent)",color:"var(--on-accent)",border:"none",cursor:saving?"wait":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1 }}>
            {saving?"Создаём...":"Создать группу"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Room item ─────────────────────────────────────────────────────────────────
function RoomItem({ room, selected, onClick, indent }: { room:Room; selected:boolean; onClick:()=>void; indent?:boolean }) {
  return (
    <button onClick={onClick} style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:`6px 14px 6px ${indent?28:14}px`,background:selected?"var(--hover)":"transparent",border:"none",cursor:"pointer",textAlign:"left",borderLeft:selected?"2px solid var(--accent)":"2px solid transparent" }}
      onMouseEnter={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.background="var(--hover)"; }}
      onMouseLeave={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
      <Hash size={13} style={{ color:selected?"var(--accent)":"var(--tx-3)",flexShrink:0 }}/>
      <span style={{ flex:1,fontSize:13,fontWeight:selected?600:400,color:selected?"var(--tx-1)":"var(--tx-2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{room.name}</span>
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, grouped, userId, onReply, onEdit, onDelete, onReact, onImageClick }: {
  msg:Message; isMe:boolean; grouped:boolean; userId:string;
  onReply:()=>void; onEdit:()=>void; onDelete:()=>void; onReact:(emoji:string)=>void;
  onImageClick:(url:string, name?:string|null)=>void;
}) {
  const [hover, setHover] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  if (msg.type === "system") return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 0" }}>
      <span style={{ fontSize:11,color:"var(--tx-3)",background:"var(--chip)",padding:"3px 12px",borderRadius:10 }}>{msg.content}</span>
    </div>
  );

  const bubbleBg = isMe ? "var(--accent)" : "var(--panel-2)";
  const bubbleColor = isMe ? "var(--on-accent)" : "var(--tx-1)";

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",marginTop:grouped?2:12 }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{ setHover(false); setEmojiOpen(false); }}>
      {/* Author row */}
      {!grouped && (
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4,flexDirection:isMe?"row-reverse":"row" }}>
          <Avatar email={msg.user_email} size={26}/>
          <span style={{ fontSize:11,fontWeight:600,color:"var(--tx-2)" }}>{msg.user_email?.split("@")[0]||"Пользователь"}</span>
          <span style={{ fontSize:10,color:"var(--tx-3)" }}>{fmtFull(msg.created_at)}</span>
          {msg.edited_at && <span style={{ fontSize:10,color:"var(--tx-3)",fontStyle:"italic" }}>ред.</span>}
        </div>
      )}

      <div style={{ maxWidth:"70%",paddingLeft:grouped&&!isMe?32:0,paddingRight:grouped&&isMe?32:0,position:"relative" }}>
        {/* Action toolbar on hover */}
        {hover && (
          <div style={{ position:"absolute",[isMe?"left":"right"]:"-120px",top:"50%",transform:"translateY(-50%)",display:"flex",gap:4,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:10,padding:"4px 6px",zIndex:10,boxShadow:"0 2px 12px rgba(0,0,0,0.2)" }}>
            <button title="Ответить" onClick={onReply} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)",padding:4,borderRadius:6,display:"flex" }}
              onMouseEnter={e=>(e.currentTarget.style.color="var(--tx-1)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-3)")}>
              <CornerUpLeft size={14}/>
            </button>
            <div style={{ position:"relative" }}>
              <button title="Реакция" onClick={()=>setEmojiOpen(o=>!o)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)",padding:4,borderRadius:6,display:"flex" }}
                onMouseEnter={e=>(e.currentTarget.style.color="var(--tx-1)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-3)")}>
                <SmilePlus size={14}/>
              </button>
              {emojiOpen && <EmojiPicker onPick={onReact} onClose={()=>setEmojiOpen(false)}/>}
            </div>
            {isMe && (
              <>
                <button title="Редактировать" onClick={onEdit} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)",padding:4,borderRadius:6,display:"flex" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="var(--tx-1)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-3)")}>
                  <Pencil size={14}/>
                </button>
                <button title="Удалить" onClick={onDelete} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)",padding:4,borderRadius:6,display:"flex" }}
                  onMouseEnter={e=>(e.currentTarget.style.color="var(--neg)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-3)")}>
                  <Trash2 size={14}/>
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && msg.reply && (
          <div style={{ padding:"4px 10px",borderLeft:"2px solid var(--accent)",background:"var(--panel-2)",borderRadius:"6px 6px 0 0",fontSize:11,color:"var(--tx-3)" }}>
            <span style={{ fontWeight:600,color:"var(--accent)" }}>{(msg.reply as any).user_email?.split("@")[0]}: </span>
            {isImage((msg.reply as any).file_url) ? "🖼 Изображение" : <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block",maxWidth:220 }}>{(msg.reply as any).content}</span>}
          </div>
        )}

        {/* Bubble */}
        <div style={{ padding:isImage(msg.file_url)?"4px":"9px 13px",borderRadius:msg.reply_to?(isMe?"12px 12px 0 12px":"12px 12px 12px 0"):(isMe?"16px 4px 16px 16px":"4px 16px 16px 16px"),background:bubbleBg,color:bubbleColor,fontSize:13,lineHeight:1.45,wordBreak:"break-word",border:isMe?"none":"1px solid var(--line)" }}>
          {/* Image */}
          {isImage(msg.file_url) && (
            <div onClick={()=>onImageClick(msg.file_url!,msg.file_name)} style={{ cursor:"zoom-in",position:"relative",display:"inline-block" }}>
              <img src={msg.file_url!} alt="фото" style={{ maxWidth:280,maxHeight:320,borderRadius:12,display:"block",objectFit:"cover" }}/>
              <div style={{ position:"absolute",inset:0,borderRadius:12,background:"rgba(0,0,0,0)",transition:"background 0.15s",display:"flex",alignItems:"center",justifyContent:"center" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(0,0,0,0.25)"; (e.currentTarget.firstElementChild as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(0,0,0,0)"; (e.currentTarget.firstElementChild as HTMLElement).style.opacity="0"; }}>
                <ZoomIn size={22} style={{ color:"#fff",opacity:0,transition:"opacity 0.15s",filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}/>
              </div>
            </div>
          )}
          {/* File (non-image) */}
          {msg.file_url && !isImage(msg.file_url) && (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"rgba(0,0,0,0.15)",borderRadius:8,textDecoration:"none",color:"inherit" }}>
              <Paperclip size={14}/>
              <span style={{ fontSize:12,fontWeight:500 }}>{msg.file_name||"Файл"}</span>
            </a>
          )}
          {/* Text */}
          {msg.content && <span>{msg.content}</span>}
        </div>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4,justifyContent:isMe?"flex-end":"flex-start" }}>
            {msg.reactions.map(r=>(
              <button key={r.emoji} style={{ display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:12,background:r.mine?"color-mix(in srgb, var(--accent) 20%, transparent)":"var(--chip)",border:r.mine?"1px solid color-mix(in srgb, var(--accent) 40%, transparent)":"1px solid var(--line)",cursor:"pointer",fontSize:12 }}>
                {r.emoji} <span style={{ fontSize:11,color:"var(--tx-2)",fontWeight:600 }}>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time (grouped) */}
        {grouped && hover && (
          <div style={{ textAlign:isMe?"right":"left",marginTop:2,paddingLeft:4,paddingRight:4 }}>
            <span style={{ fontSize:9,color:"var(--tx-3)" }}>{fmtFull(msg.created_at)}{msg.edited_at?" · ред.":""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message|null>(null);
  const [editingMsg, setEditingMsg] = useState<Message|null>(null);
  const [editInput, setEditInput] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [filePreview, setFilePreview] = useState<{ file:File; previewUrl:string }|null>(null);
  const [sendCaption, setSendCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ url:string; name?:string|null }|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => { supabase.auth.getUser().then(({data:{user}})=>setUser(user)); }, []);

  const { data: workspace } = useQuery({
    queryKey: ["chat_workspace", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["chat_projects", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id,name").eq("user_id", user.id).order("created_at");
      return data||[];
    },
  });

  const { data: rooms=[], refetch: refetchRooms } = useQuery<Room[]>({
    queryKey: ["chat_rooms", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data:memberRows } = await supabase.from("chat_room_members").select("room_id").eq("user_id", user.id);
      if (!memberRows?.length) return [];
      const { data } = await supabase.from("chat_rooms").select("*").in("id", memberRows.map((r:any)=>r.room_id)).order("created_at");
      return data||[];
    },
    staleTime: 30000,
  });

  const { data: members=[] } = useQuery<Member[]>({
    queryKey: ["chat_members", selectedRoom?.id], enabled: !!selectedRoom,
    queryFn: async () => {
      const { data } = await supabase.from("chat_room_members").select("*").eq("room_id", selectedRoom!.id);
      return data||[];
    },
  });

  // Load messages + subscribe
  useEffect(() => {
    if (!selectedRoom) return;
    setLoadingMsgs(true); setMessages([]); setReplyTo(null); setEditingMsg(null);

    supabase.from("chat_messages")
      .select("*, reply:reply_to(content, user_email, file_url)")
      .eq("room_id", selectedRoom.id)
      .order("created_at", { ascending: true }).limit(100)
      .then(async ({ data }) => {
        if (!data) { setLoadingMsgs(false); return; }
        // Load reactions
        const ids = data.map((m:any)=>m.id);
        const { data: reactData } = await supabase.from("message_reactions").select("*").in("message_id", ids);
        const reactMap: Record<string, Reaction[]> = {};
        (reactData||[]).forEach((r:any)=>{
          if (!reactMap[r.message_id]) reactMap[r.message_id]=[];
          const ex = reactMap[r.message_id].find(x=>x.emoji===r.emoji);
          if (ex) { ex.count++; if(r.user_id===user?.id) ex.mine=true; }
          else reactMap[r.message_id].push({ emoji:r.emoji, count:1, mine:r.user_id===user?.id });
        });
        setMessages(data.map((m:any)=>({ ...m, reactions: reactMap[m.id]||[] })));
        setLoadingMsgs(false);
      });

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`room_${selectedRoom.id}`)
      .on("postgres_changes",{ event:"INSERT",schema:"public",table:"chat_messages",filter:`room_id=eq.${selectedRoom.id}` },
        async (payload) => {
          const msg = payload.new as Message;
          if (msg.reply_to) {
            const { data:reply } = await supabase.from("chat_messages").select("content,user_email,file_url").eq("id",msg.reply_to).single();
            msg.reply = reply as any;
          }
          setMessages(prev=>[...prev,{ ...msg,reactions:[] }]);
        })
      .on("postgres_changes",{ event:"UPDATE",schema:"public",table:"chat_messages",filter:`room_id=eq.${selectedRoom.id}` },
        (payload) => { setMessages(prev=>prev.map(m=>m.id===payload.new.id?{ ...m,...payload.new }:m)); })
      .on("postgres_changes",{ event:"DELETE",schema:"public",table:"chat_messages" },
        (payload) => { setMessages(prev=>prev.filter(m=>m.id!==payload.old.id)); })
      .subscribe();

    if (user) supabase.from("chat_room_members").update({ last_read: new Date().toISOString() }).eq("room_id",selectedRoom.id).eq("user_id",user.id).then(()=>{});
    return () => { if(channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedRoom?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // File select
  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setSendCaption("");
    setFilePreview({ file, previewUrl });
    e.target.value = "";
  }

  async function uploadFile(file: File): Promise<{ url:string; type:string; name:string }> {
    const ext = file.name.split(".").pop();
    const path = `${selectedRoom!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
    return { url: data.publicUrl, type: file.type.startsWith("image/")?"image":"file", name: file.name };
  }

  async function sendMessage(overrideText?: string) {
    const text = overrideText ?? input;
    if ((!text.trim() && !filePreview) || !selectedRoom || !user || sending) return;
    setSending(true);
    try {
      let fileData: { url:string; type:string; name:string }|null = null;
      if (filePreview) {
        setUploading(true);
        fileData = await uploadFile(filePreview.file);
        URL.revokeObjectURL(filePreview.previewUrl);
        setFilePreview(null);
        setSendCaption("");
        setUploading(false);
      }
      const payload: any = {
        room_id: selectedRoom.id, user_id: user.id,
        content: text.trim(), type: "text", user_email: user.email,
      };
      if (replyTo) payload.reply_to = replyTo.id;
      if (fileData) { payload.file_url=fileData.url; payload.file_type=fileData.type; payload.file_name=fileData.name; }
      setInput(""); setReplyTo(null);
      await supabase.from("chat_messages").insert(payload);
    } catch(e:any) { console.error(e); }
    setSending(false);
  }

  async function saveEdit() {
    if (!editingMsg || !editInput.trim()) return;
    await supabase.from("chat_messages").update({ content: editInput.trim(), edited_at: new Date().toISOString() }).eq("id", editingMsg.id);
    setEditingMsg(null); setEditInput("");
  }

  async function deleteMessage(msg: Message) {
    if (!confirm("Удалить сообщение?")) return;
    await supabase.from("chat_messages").delete().eq("id", msg.id);
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!user) return;
    const msg = messages.find(m=>m.id===msgId);
    const existing = msg?.reactions?.find(r=>r.emoji===emoji&&r.mine);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("message_id",msgId).eq("user_id",user.id).eq("emoji",emoji);
      setMessages(prev=>prev.map(m=>m.id===msgId?{ ...m,reactions:(m.reactions||[]).map(r=>r.emoji===emoji?{ ...r,count:r.count-1,mine:false }:r).filter(r=>r.count>0) }:m));
    } else {
      await supabase.from("message_reactions").insert({ message_id:msgId, user_id:user.id, emoji });
      setMessages(prev=>prev.map(m=>{
        if(m.id!==msgId) return m;
        const reacts = [...(m.reactions||[])];
        const ex = reacts.find(r=>r.emoji===emoji);
        if(ex) { ex.count++; ex.mine=true; }
        else reacts.push({ emoji, count:1, mine:true });
        return { ...m, reactions:reacts };
      }));
    }
  }

  function isSameAuthor(msgs: Message[], i: number) {
    if (i===0) return false;
    const p=msgs[i-1], c=msgs[i];
    if (p.user_id!==c.user_id||p.type==="system"||c.type==="system") return false;
    return (new Date(c.created_at).getTime()-new Date(p.created_at).getTime())/1000 < 300;
  }

  const roomsByProject = useMemo(()=>{
    const map: Record<string,Room[]> = { "__none__":[] };
    projects.forEach(p=>{ map[p.id]=[]; });
    rooms.forEach(r=>{ const k=r.project_id??"__none__"; if(!map[k])map[k]=[]; map[k].push(r); });
    return map;
  },[rooms,projects]);

  const filteredRooms = useMemo(()=>search ? rooms.filter(r=>r.name?.toLowerCase().includes(search.toLowerCase())) : rooms,[rooms,search]);

  return (
    <div style={{ display:"flex",height:"100%",background:"var(--bg)",overflow:"hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{ width:256,flexShrink:0,borderRight:"1px solid var(--line)",background:"var(--panel)",display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <div style={{ padding:"14px 14px 10px",borderBottom:"1px solid var(--line)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ fontSize:15,fontWeight:700,color:"var(--tx-1)" }}>Чат</span>
            <button onClick={()=>setShowCreate(true)} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,background:"var(--accent)",color:"var(--on-accent)",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>
              <Plus size={13}/> Группа
            </button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:9,background:"var(--panel-2)",border:"1px solid var(--line)" }}>
            <Search size={13} style={{ color:"var(--tx-3)",flexShrink:0 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск..." style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:12,color:"var(--tx-1)" }}/>
          </div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"6px 0" }}>
          {search ? filteredRooms.map(r=><RoomItem key={r.id} room={r} selected={selectedRoom?.id===r.id} onClick={()=>setSelectedRoom(r)}/>) : (
            <>
              {projects.map(proj=>{
                const projRooms=roomsByProject[proj.id]||[];
                if(!projRooms.length) return null;
                const open=!collapsed[proj.id];
                return (
                  <div key={proj.id}>
                    <button onClick={()=>setCollapsed(c=>({...c,[proj.id]:!c[proj.id]}))} style={{ width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"none",border:"none",cursor:"pointer" }}>
                      {open?<ChevronDown size={11} style={{color:"var(--tx-3)"}}/>:<ChevronRight size={11} style={{color:"var(--tx-3)"}}/>}
                      <span style={{ fontSize:11,fontWeight:700,color:"var(--tx-3)",textTransform:"uppercase",letterSpacing:"0.06em",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{proj.name}</span>
                      <span style={{ fontSize:10,color:"var(--tx-3)" }}>{projRooms.length}</span>
                    </button>
                    {open && projRooms.map(r=><RoomItem key={r.id} room={r} selected={selectedRoom?.id===r.id} onClick={()=>setSelectedRoom(r)} indent/>)}
                  </div>
                );
              })}
              {(roomsByProject["__none__"]||[]).length>0 && (
                <div>
                  <button onClick={()=>setCollapsed(c=>({...c,__none__:!c.__none__}))} style={{ width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"none",border:"none",cursor:"pointer",marginTop:6 }}>
                    {!collapsed.__none__?<ChevronDown size={11} style={{color:"var(--tx-3)"}}/>:<ChevronRight size={11} style={{color:"var(--tx-3)"}}/>}
                    <span style={{ fontSize:11,fontWeight:700,color:"var(--tx-3)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Общие</span>
                  </button>
                  {!collapsed.__none__ && (roomsByProject["__none__"]||[]).map(r=><RoomItem key={r.id} room={r} selected={selectedRoom?.id===r.id} onClick={()=>setSelectedRoom(r)} indent/>)}
                </div>
              )}
              {rooms.length===0 && (
                <div style={{ padding:"32px 20px",textAlign:"center" }}>
                  <MessageCircle size={32} style={{ color:"var(--tx-3)",margin:"0 auto 10px",display:"block" }}/>
                  <p style={{ margin:"0 0 4px",fontSize:13,fontWeight:600,color:"var(--tx-1)" }}>Нет групп</p>
                  <p style={{ margin:"0 0 12px",fontSize:12,color:"var(--tx-3)" }}>Создай первую группу</p>
                  <button onClick={()=>setShowCreate(true)} style={{ padding:"7px 16px",borderRadius:8,background:"var(--accent)",color:"var(--on-accent)",border:"none",cursor:"pointer",fontSize:12,fontWeight:600 }}>Создать</button>
                </div>
              )}
            </>
          )}
        </div>

        {user && (
          <div style={{ padding:"10px 14px",borderTop:"1px solid var(--line)",display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ position:"relative" }}>
              <Avatar email={user.email} size={28}/>
              <span style={{ position:"absolute",bottom:0,right:0,width:7,height:7,borderRadius:"50%",background:"var(--pos)",border:"2px solid var(--panel)" }}/>
            </div>
            <span style={{ fontSize:12,fontWeight:600,color:"var(--tx-1)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email?.split("@")[0]}</span>
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      {selectedRoom ? (
        <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>
          {/* Header */}
          <div style={{ height:52,borderBottom:"1px solid var(--line)",background:"var(--panel)",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:9,background:"var(--chip)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Hash size={15} style={{ color:"var(--tx-2)" }}/>
              </div>
              <div>
                <p style={{ margin:0,fontSize:14,fontWeight:700,color:"var(--tx-1)" }}>{selectedRoom.name}</p>
                <p style={{ margin:0,fontSize:11,color:"var(--tx-3)" }}>{members.length} участник{members.length===1?"":"ов"}</p>
              </div>
            </div>
            <div style={{ display:"flex",gap:-8 }}>
              {members.slice(0,5).map((m,i)=>(
                <div key={m.user_id} style={{ marginLeft:i>0?-8:0,zIndex:5-i }}>
                  <Avatar email={m.email||m.user_id} size={26}/>
                </div>
              ))}
              {members.length>5 && <span style={{ fontSize:11,color:"var(--tx-3)",marginLeft:6,alignSelf:"center" }}>+{members.length-5}</span>}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1,overflowY:"auto",padding:"12px 20px 4px" }}>
            {loadingMsgs ? (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%" }}>
                <div style={{ width:24,height:24,border:"2px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
              </div>
            ) : messages.length===0 ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8 }}>
                <Hash size={40} style={{ color:"var(--tx-3)" }}/>
                <p style={{ margin:0,fontSize:15,fontWeight:600,color:"var(--tx-1)" }}>#{selectedRoom.name}</p>
                <p style={{ margin:0,fontSize:13,color:"var(--tx-3)" }}>Начни разговор — напиши первое сообщение</p>
              </div>
            ) : (
              messages.map((msg,i)=>{
                const isMe = msg.user_id===user?.id;
                return editingMsg?.id===msg.id ? (
                  <div key={msg.id} style={{ display:"flex",gap:8,alignItems:"center",margin:"4px 0",padding:"8px 12px",background:"var(--panel-2)",borderRadius:10,border:"1px solid var(--accent)" }}>
                    <input value={editInput} onChange={e=>setEditInput(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") saveEdit(); if(e.key==="Escape"){setEditingMsg(null);setEditInput("");} }}
                      autoFocus style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:"var(--tx-1)" }}/>
                    <button onClick={saveEdit} style={{ background:"var(--accent)",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",color:"var(--on-accent)",fontSize:12,fontWeight:600 }}>Сохранить</button>
                    <button onClick={()=>{setEditingMsg(null);setEditInput("");}} style={{ background:"var(--chip)",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",color:"var(--tx-2)",fontSize:12 }}>Отмена</button>
                  </div>
                ) : (
                  <MessageBubble key={msg.id} msg={msg} isMe={isMe} grouped={isSameAuthor(messages,i)} userId={user?.id}
                    onReply={()=>{ setReplyTo(msg); inputRef.current?.focus(); }}
                    onEdit={()=>{ setEditingMsg(msg); setEditInput(msg.content); }}
                    onDelete={()=>deleteMessage(msg)}
                    onReact={(emoji)=>toggleReaction(msg.id,emoji)}
                    onImageClick={(url,name)=>setLightbox({ url,name })}
                  />
                );
              })
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Send preview modal — рендерится поверх всего */}
          {filePreview && (
            <SendPreviewModal
              file={filePreview.file}
              previewUrl={filePreview.previewUrl}
              caption={sendCaption}
              onCaptionChange={setSendCaption}
              sending={sending || uploading}
              onClose={()=>{ URL.revokeObjectURL(filePreview.previewUrl); setFilePreview(null); setSendCaption(""); }}
              onSend={()=>sendMessage(sendCaption)}
            />
          )}

          {/* Reply banner */}
          {replyTo && (
            <div style={{ padding:"7px 20px",borderTop:"1px solid var(--line)",background:"var(--panel-2)",display:"flex",alignItems:"center",gap:10 }}>
              <CornerUpLeft size={14} style={{ color:"var(--accent)",flexShrink:0 }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <span style={{ fontSize:11,fontWeight:600,color:"var(--accent)" }}>{replyTo.user_email?.split("@")[0]}</span>
                <span style={{ fontSize:11,color:"var(--tx-3)",marginLeft:6 }}>{isImage(replyTo.file_url)?"🖼 Изображение":replyTo.content}</span>
              </div>
              <button onClick={()=>setReplyTo(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--tx-3)" }}><X size={14}/></button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"10px 16px",borderTop:"1px solid var(--line)",background:"var(--panel)",display:"flex",gap:8,alignItems:"center" }}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip" style={{ display:"none" }} onChange={onFileSelect}/>
            <button onClick={()=>fileInputRef.current?.click()} title="Прикрепить файл"
              style={{ width:36,height:36,borderRadius:10,border:"1px solid var(--line)",background:"var(--panel-2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,color:"var(--tx-3)" }}
              onMouseEnter={e=>(e.currentTarget.style.color="var(--tx-1)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-3)")}>
              <Paperclip size={15}/>
            </button>
            <div style={{ flex:1,display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderRadius:12,background:"var(--panel-2)",border:"1px solid var(--line)" }}>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
                placeholder={`Написать в #${selectedRoom.name}...`}
                style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:"var(--tx-1)" }}/>
            </div>
            <button onClick={()=>sendMessage()} disabled={(!input.trim()&&!filePreview)||sending||uploading}
              style={{ width:38,height:38,borderRadius:12,background:"var(--accent)",border:"none",cursor:(input.trim()||filePreview)?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",opacity:(input.trim()||filePreview)?1:0.4,transition:"opacity 0.15s",flexShrink:0 }}>
              {uploading ? <div style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/> : <Send size={15} style={{ color:"var(--on-accent)" }}/>}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14 }}>
          <div style={{ width:64,height:64,borderRadius:20,background:"var(--chip)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <MessageCircle size={28} style={{ color:"var(--tx-3)" }}/>
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ margin:"0 0 6px",fontSize:16,fontWeight:700,color:"var(--tx-1)" }}>Выбери группу</p>
            <p style={{ margin:0,fontSize:13,color:"var(--tx-3)" }}>Или создай новую для своей команды</p>
          </div>
          <button onClick={()=>setShowCreate(true)} style={{ padding:"10px 22px",borderRadius:10,background:"var(--accent)",color:"var(--on-accent)",border:"none",cursor:"pointer",fontSize:13,fontWeight:700 }}>
            + Создать группу
          </button>
        </div>
      )}

      {showCreate && user && (
        <CreateRoomModal projects={projects} workspaceId={workspace?.id??null} userId={user.id}
          onClose={()=>setShowCreate(false)}
          onCreated={(room)=>{ setShowCreate(false); refetchRooms(); setSelectedRoom(room); }}/>
      )}

      {lightbox && <Lightbox url={lightbox.url} name={lightbox.name} onClose={()=>setLightbox(null)}/>}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
