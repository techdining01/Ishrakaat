"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface UserSummary {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  state: string;
  local_govt: string;
  ward: string;
  profile_pic?: string;
  profile_picture?: string;
}

interface Profile extends UserSummary {
  admin_level: "NONE" | "WARD" | "LOCAL_GOVT" | "STATE" | "NATIONAL";
}

type MessageType = "TEXT" | "CALL" | "VIDEO";

interface ChatMessage {
  id: number;
  sender_name: string;
  recipient_name: string | null;
  state: string;
  local_govt: string;
  ward: string;
  message_type: MessageType;
  content: string;
  created_at: string;
}

export default function AdminChatPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatContent, setChatContent] = useState("");
  const [chatType, setChatType] = useState<MessageType>("TEXT");
  const [filterType, setFilterType] = useState<"ALL" | MessageType>("ALL");
  const [chatSending, setChatSending] = useState(false);
  
  // Jitsi State
  const [activeJitsiRoom, setActiveJitsiRoom] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profile, usersList] = await Promise.all([
          apiGet("/auth/me/", true),
          apiGet("/auth/admin/users/", true),
        ]);
        setMe(profile);
        setUsers(usersList);
        if (usersList.length > 0) {
          setSelectedUserId(usersList[0].id);
        }
      } catch {
        setUserError("Could not load admin chat data. Ensure you are signed in as admin.");
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedUserId) {
        setChatMessages([]);
        return;
      }
      setChatLoading(true);
      setChatError("");
      try {
        const data = await apiGet(
          `/auth/admin/chat/messages/?recipient=${selectedUserId}`,
          true
        );
        setChatMessages(data);
      } catch {
        setChatError("Could not load messages.");
      } finally {
        setChatLoading(false);
      }
    };
    loadMessages();
  }, [selectedUserId]);

  async function sendChatMessage() {
    const isModeCall = chatType === "CALL" || chatType === "VIDEO";
    if (!chatContent.trim() && !isModeCall) return;
    
    const targets =
      selectedRecipientIds.length > 0
        ? selectedRecipientIds
        : selectedUserId
        ? [selectedUserId]
        : [];
    if (targets.length === 0) return;
    
    setChatSending(true);
    setChatError("");
    
    try {
      let finalContent = chatContent.trim();
      
      // For Call/Video, we ALWAYS want a meeting room if it's an initiation
      if (isModeCall) {
        const roomName = `Ishrapay_Meeting_${Math.random().toString(36).substring(7)}`;
        const prefix = "JOIN_MEETING:";
        // If content exists, wrap it; if not, just the link
        finalContent = finalContent ? `${prefix}${roomName}|${finalContent}` : `${prefix}${roomName}`;
      }

      await Promise.all(
        targets.map(async (recipientId) => {
          const created = await apiPost(
            "/auth/admin/chat/messages/",
            {
              recipient_id: recipientId,
              message_type: chatType,
              content: finalContent,
            },
            true
          );
          if (recipientId === selectedUserId) {
            setChatMessages((prev) => [...prev, created]);
          }
        })
      );
      setChatContent("");
      
      // Reset to TEXT mode after sending a call/video invite
      if (isModeCall) {
        const room = finalContent.startsWith("JOIN_MEETING:") ? finalContent.split(":")[1].split("|")[0] : null;
        if (room) setActiveJitsiRoom(room);
        setChatType("TEXT");
      }

    } catch {
      setChatError("Could not send session request.");
    } finally {
      setChatSending(false);
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  function toggleRecipient(id: number) {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans">
      <header className="flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-emerald-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg font-bold text-emerald-400 overflow-hidden shadow-xl">
              {me?.profile_pic || me?.profile_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.profile_pic || me.profile_picture} alt="Me" className="h-full w-full object-cover" />
              ) : (
                (me?.first_name || me?.username || "?").charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">Communications</h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
                {me?.admin_level || "Admin"} • Secure Channel
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all active:scale-[0.97]"
          >
            Return to Console
          </Link>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden lg:p-4 lg:gap-4 lg:bg-slate-900/20">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full h-full max-w-[1600px] mx-auto overflow-hidden">
          
          {/* User Sidebar */}
          <aside className={`w-full md:w-80 flex flex-col bg-slate-950/40 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-5 border-b border-slate-900/50">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Registry</h2>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Search administrators..." 
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {loadingUsers ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 w-full bg-slate-900/30 animate-pulse rounded-xl"></div>)}
                </div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all relative group ${
                      selectedUserId === user.id 
                        ? "bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                        : "hover:bg-slate-900/40 border border-transparent"
                    }`}
                  >
                    <div className="relative">
                      <div className="h-11 w-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                        {(user.first_name || user.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950"></div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-bold truncate ${selectedUserId === user.id ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {user.first_name || user.username}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">
                        {user.local_govt || "Local Govt"} • {user.state || "State"}
                      </p>
                    </div>
                    {selectedRecipientIds.includes(user.id) && (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-slate-950 font-black">
                        ✓
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Chat Window */}
          <section className={`flex-1 flex flex-col bg-slate-950/40 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-xl transition-all ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
            {selectedUser ? (
              <>
                <div className="px-6 py-4 border-b border-slate-900/50 flex items-center justify-between bg-slate-950/20">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUserId(null)} className="md:hidden text-slate-400 p-2">
                       ←
                    </button>
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                        {selectedUser.first_name?.charAt(0) || selectedUser.username.charAt(0)}
                      </div>
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{selectedUser.first_name} {selectedUser.last_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">@{selectedUser.username} • Online</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    {["Msg", "Call", "Video"].map((type, idx) => {
                      const types: MessageType[] = ["TEXT", "CALL", "VIDEO"];
                      const t = types[idx];
                      return (
                        <button
                          key={t}
                          onClick={() => setChatType(t)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            chatType === t 
                              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-950/10">
                  {chatLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
                      Retrieving secure transmission...
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                      <div className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-4xl">💬</div>
                      <p className="text-sm font-medium">No prior communications found.<br/><span className="text-xs">Security clearance: Authorized</span></p>
                    </div>
                  ) : (
                    chatMessages
                      .filter(m => filterType === "ALL" ? true : m.message_type === filterType)
                      .map((msg) => {
                      const isMine = me && msg.sender_name === (me.first_name || me.username);
                      const isMeeting = msg.content.startsWith("JOIN_MEETING:");
                      const meetingRoomFull = isMeeting ? msg.content.split(":")[1] : null;
                      const meetingRoom = meetingRoomFull?.split("|")[0];
                      const meetingText = meetingRoomFull?.includes("|") ? meetingRoomFull.split("|")[1] : null;

                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] group relative ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && (
                              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 ml-4 tracking-tighter">
                                {msg.sender_name}
                              </p>
                            )}
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-2xl border transition-all hover:scale-[1.01] ${
                              isMine 
                                ? "bg-emerald-500/90 text-slate-950 border-emerald-400 shadow-emerald-500/10 rounded-tr-none" 
                                : "bg-slate-900/80 text-slate-100 border-slate-800 shadow-black/20 rounded-tl-none"
                            }`}>
                              {msg.message_type !== "TEXT" && (
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase mb-2 ${
                                  isMine ? 'bg-slate-900/20 text-slate-900' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {msg.message_type === "CALL" ? "📞 Call" : "🎥 Video"}
                                </div>
                              )}
                              
                              {isMeeting ? (
                                <div className="space-y-3">
                                  {meetingText && <p className="mb-2 italic opacity-80">{meetingText}</p>}
                                  <p className="font-bold">Secure meeting link established.</p>
                                  <button
                                    onClick={() => setActiveJitsiRoom(meetingRoom || null)}
                                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                      isMine ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950 shadow-xl'
                                    }`}
                                  >
                                    Join Session Now
                                  </button>
                                </div>
                              ) : (
                                <p>{msg.content}</p>
                              )}
                              
                              <div className="mt-2 flex items-center justify-between gap-4 text-[9px] font-medium opacity-60">
                                <span className="uppercase tracking-tighter">{msg.ward || msg.local_govt || "Official Channel"}</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-900/50">
                  <div className="flex flex-col gap-2">
                    {chatType !== 'TEXT' && (
                      <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 animate-pulse">
                           {chatType} Link Mode Active
                        </p>
                        <button onClick={() => setChatType('TEXT')} className="text-[10px] text-slate-500 hover:text-slate-200">Cancel</button>
                      </div>
                    )}
                    <div className="flex items-end gap-3 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/80">
                      <textarea
                        rows={1}
                        value={chatContent}
                        onChange={(e) => setChatContent(e.target.value)}
                        placeholder={chatType === 'TEXT' ? "Type a secure message..." : `Add optional note for ${chatType.toLowerCase()} session...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-100 p-2.5 resize-none min-h-[44px] max-h-32 scrollbar-hide"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatSending || (chatType === 'TEXT' && !chatContent.trim())}
                        className={`px-4 h-11 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          (chatContent.trim() || chatType !== 'TEXT')
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30" 
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {chatSending ? (
                          <div className="h-5 w-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-tight">
                              {chatType === 'TEXT' ? 'Send' : `Initiate ${chatType}`}
                            </span>
                            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {chatError && <p className="mt-2 text-xs text-rose-400 font-medium px-2">{chatError}</p>}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 opacity-30">
                <div className="h-32 w-32 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                  <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200">Secure Comms Hub</h3>
                  <p className="text-sm text-slate-400 mt-2">Select a regional administrator from the directory <br/> to establish an encrypted link.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Jitsi Overlay */}
      {activeJitsiRoom && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Secure Live Internal Session</p>
            </div>
            <button
              onClick={() => setActiveJitsiRoom(null)}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
            >
              Terminate Session
            </button>
          </header>
          <div className="flex-1 bg-black overflow-hidden relative">
            <iframe
              src={`https://meet.jit.si/${activeJitsiRoom}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="absolute inset-0 w-full h-full border-none"
              title="Secure Jitsi Meeting"
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </div>
  );
}
