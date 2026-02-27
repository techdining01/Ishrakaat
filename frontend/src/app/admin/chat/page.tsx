"use client";

import { useEffect, useState } from "react";
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

type MessageType = "TEXT" | "CALL" | "VIDEO" | "CONFERENCE";

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
  const [chatSending, setChatSending] = useState(false);

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
          setSelectedRecipientIds([usersList[0].id]);
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
    if (!chatContent.trim()) return;
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
      const trimmed = chatContent.trim();
      await Promise.all(
        targets.map(async (recipientId) => {
          const created = await apiPost(
            "/auth/admin/chat/messages/",
            {
              recipient_id: recipientId,
              message_type: chatType,
              content: trimmed,
            },
            true
          );
          if (recipientId === selectedUserId) {
            setChatMessages((prev) => [...prev, created]);
          }
        })
      );
      setChatContent("");
    } catch {
      setChatError("Could not send message.");
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-0 pb-0 pt-0 md:px-4 md:pb-6 md:pt-4">
      <header className="mb-3 flex items-center justify-between border-b border-slate-900 px-4 py-3 md:mb-4 md:border-none md:px-0 md:py-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-sm font-semibold text-emerald-100 overflow-hidden">
            {me?.profile_pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.profile_pic}
                alt={me.first_name || me.username || "Admin"}
                className="h-full w-full object-cover"
              />
            ) : me?.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.profile_picture}
                alt={me.first_name || me.username || "Admin"}
                className="h-full w-full object-cover"
              />
            ) : me ? (
              (me.first_name || me.username || "?").charAt(0).toUpperCase()
            ) : (
              "?"
            )}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
              Ishrakaat
            </p>
            <p className="text-base font-semibold text-slate-50">
              Admin chat
            </p>
            {me && (
              <p className="text-xs text-emerald-300">
                {me.admin_level === "NATIONAL"
                  ? "National admin"
                  : me.admin_level === "STATE"
                  ? "State admin"
                  : me.admin_level === "LOCAL_GOVT"
                  ? "Local government admin"
                  : me.admin_level === "WARD"
                  ? "Ward admin"
                  : "Admin"}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-slate-700 px-3.5 py-1.5 text-sm text-slate-200"
        >
          Back to admin
        </Link>
      </header>

      <main className="flex-1 rounded-none border-t border-slate-900 md:rounded-2xl md:border md:border-slate-800 md:bg-slate-950/70 md:p-4">
        <div className="grid h-[calc(100vh-120px)] grid-rows-[220px,_minmax(0,1fr)] gap-3 md:h-[500px] md:grid-cols-[280px,_minmax(0,1fr)] md:grid-rows-1 md:gap-4">
          <section className="border-b border-slate-900 bg-slate-950/80 p-4 text-sm md:border-b-0 md:border-r md:border-slate-800 md:bg-slate-950/60 md:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Users
              </p>
            </div>
            {loadingUsers ? (
              <p className="text-sm text-slate-300">
                Loading users...
              </p>
            ) : userError ? (
              <p className="text-sm text-rose-400">{userError}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-300">No users yet.</p>
            ) : (
              <>
                <p className="mb-1 text-xs text-slate-500">
                  Selected for sending: {selectedRecipientIds.length} user
                  {selectedRecipientIds.length === 1 ? "" : "s"}
                </p>
                <div className="mt-1 h-[150px] overflow-y-auto space-y-1 md:h-full">
                  {users.map((user) => {
                    const isSelected = selectedRecipientIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={`flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                          selectedUserId === user.id
                            ? "bg-emerald-500/15 border border-emerald-500/60"
                            : "bg-slate-950 border border-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-sm text-slate-200 border border-slate-700">
                            {(user.first_name || user.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-50">
                              {user.first_name || user.username}
                            </p>
                            <p className="text-xs text-slate-400">
                              {user.state || "No state"} •{" "}
                              {user.local_govt || "No LGA"} •{" "}
                              {user.ward || "No ward"}
                            </p>
                          </div>
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRecipient(user.id);
                          }}
                          className={`ml-2 h-6 w-6 rounded-full border text-xs flex cursor-pointer items-center justify-center ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-500/80 text-slate-950"
                              : "border-slate-600 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col bg-slate-950/80 md:rounded-xl md:border md:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-900 px-3 py-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-100">
                  {selectedUser
                    ? selectedUser.first_name || selectedUser.username
                    : "Select a user"}
                </p>
                {selectedUser && (
                  <p className="text-xs text-slate-400">
                    {selectedUser.country} • {selectedUser.state || "No state"} •{" "}
                    {selectedUser.local_govt || "No LGA"}
                  </p>
                )}
              </div>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChatType("TEXT")}
                  className={`rounded-full px-2 py-0.5 border ${
                    chatType === "TEXT"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Msg
                </button>
                <button
                  type="button"
                  onClick={() => setChatType("CALL")}
                  className={`rounded-full px-2 py-0.5 border ${
                    chatType === "CALL"
                      ? "bg-sky-500 text-slate-950 border-sky-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => setChatType("VIDEO")}
                  className={`rounded-full px-2 py-0.5 border ${
                    chatType === "VIDEO"
                      ? "bg-indigo-500 text-slate-950 border-indigo-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setChatType("CONFERENCE")}
                  className={`rounded-full px-2 py-0.5 border ${
                    chatType === "CONFERENCE"
                      ? "bg-amber-500 text-slate-950 border-amber-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Conf
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto px-3 py-3 space-y-2 text-sm">
                {selectedUserId == null ? (
                  <p className="text-slate-400">
                    Select a user from the list to start chatting.
                  </p>
                ) : chatLoading ? (
                  <p className="text-slate-400">Loading messages...</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-slate-400">No messages yet.</p>
                ) : (
                  chatMessages.map((msg) => {
                    const isMine =
                      me && msg.sender_name === (me.first_name || me.username);
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 border text-sm ${
                            isMine
                              ? "bg-emerald-500 text-slate-950 border-emerald-400 rounded-br-sm"
                              : "bg-slate-900 text-slate-100 border-slate-700 rounded-bl-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-0.5">
                            <p
                              className={`text-xs font-semibold ${
                                isMine ? "text-slate-900/80" : "text-slate-300"
                              }`}
                            >
                              {msg.sender_name}
                            </p>
                            {msg.message_type !== "TEXT" && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                                  msg.message_type === "CALL"
                                    ? isMine
                                      ? "bg-emerald-600/80 text-emerald-50"
                                      : "bg-sky-600/80 text-sky-50"
                                    : msg.message_type === "VIDEO"
                                    ? "bg-indigo-600/80 text-indigo-50"
                                    : "bg-amber-600/80 text-amber-50"
                                }`}
                              >
                                {msg.message_type === "CALL"
                                  ? "Call"
                                  : msg.message_type === "VIDEO"
                                  ? "Video call"
                                  : "Conference"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-snug">
                            {msg.content}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] opacity-70">
                            <span>
                              {msg.state || "All states"} •{" "}
                              {msg.local_govt || "All LGAs"} •{" "}
                              {msg.ward || "All wards"}
                            </span>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString(
                                "en-NG",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-slate-900 bg-slate-950 px-3 py-2">
              <div className="flex items-end gap-2">
                <textarea
                  className="min-h-[48px] max-h-32 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  rows={2}
                  placeholder={
                    !selectedUser
                      ? "Select a user to start chatting..."
                      : chatType === "TEXT"
                      ? "Write a message..."
                      : chatType === "CALL"
                      ? "Describe call details (time, topic)..."
                      : chatType === "VIDEO"
                      ? "Describe video call details..."
                      : "Describe conference call details..."
                  }
                  value={chatContent}
                  onChange={(e) => setChatContent(e.target.value)}
                  disabled={!selectedUserId && selectedRecipientIds.length === 0}
                />
                <button
                  type="button"
                  disabled={
                    chatSending ||
                    (!selectedUserId && selectedRecipientIds.length === 0)
                  }
                  onClick={sendChatMessage}
                  className="h-10 w-10 rounded-full bg-emerald-500 text-slate-950 text-sm font-semibold flex items-center justify-center active:scale-[0.97] disabled:opacity-60"
                >
                  {chatSending ? "…" : "➤"}
                </button>
              </div>
              {chatError && (
                <p className="mt-1 text-xs text-rose-400">{chatError}</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
