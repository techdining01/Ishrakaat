"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiGetBlob } from "@/lib/api";

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
  registration_number: string;
  is_approved_by_admin: boolean;
  admin_level: "NONE" | "WARD" | "LOCAL_GOVT" | "STATE" | "NATIONAL";
}

interface Profile extends UserSummary {
  money_box_balance: string;
}

export default function AdminDashboardPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserSummary[]>(null as any);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState("");

  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    labels: string[];
    inflow: number[];
    outflow: number[];
  } | null>(null);
  const [statsDays, setStatsDays] = useState<7 | 30 | 90>(30);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [statsError, setStatsError] = useState("");
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "APPROVED" | "PENDING"
  >("ALL");
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "ADMINS" | "NON_ADMINS"
  >("ALL");
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newState, setNewState] = useState("");
  const [newLocalGovt, setNewLocalGovt] = useState("");
  const [newWard, setNewWard] = useState("");
  const [createUserMessage, setCreateUserMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await apiGet("/auth/me/", true);
        setMe(profile);

        const usersList = await apiGet("/auth/admin/users/", true);
        setUsers(usersList);
      } catch {
        setUserError("Could not load admin data. Ensure you are signed in as admin.");
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!me) return;
      if (me.admin_level !== "STATE" && me.admin_level !== "NATIONAL") {
        return;
      }
      try {
        setStatsError("");
        const data = await apiGet(
          `/donations/stats/inflow-outflow/?days=${statsDays}`,
          true
        );
        setStats(data);
      } catch {
        setStats(null);
        setStatsError("Could not load inflow/outflow stats.");
      }
    };
    loadStats();
  }, [me, statsDays]);

  async function approveUser(id: number) {
    setApprovingId(id);
    try {
      await apiPost(`/auth/admin/users/${id}/approve/`, undefined, true);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_approved_by_admin: true } : u
        )
      );
    } catch {
    } finally {
      setApprovingId(null);
    }
  }

  async function promoteUser(id: number, level: UserSummary["admin_level"]) {
    setPromotingId(id);
    try {
      await apiPost(
        `/auth/admin/users/${id}/promote/`,
        { level },
        true
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, admin_level: level } : u))
      );
    } catch {
    } finally {
      setPromotingId(null);
    }
  }

  async function downloadCsv() {
    if (!me) return;
    setDownloadingCsv(true);
    try {
      const blob = await apiGetBlob(
        `/donations/stats/inflow-outflow.csv?days=${statsDays}`,
        true
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ishrakaat_daily_report.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setDownloadingCsv(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setCreateUserMessage("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateUserMessage("Enter at least username and password.");
      return;
    }
    setCreatingUser(true);
    try {
      const created = await apiPost(
        "/auth/register/",
        {
          username: newUsername.trim(),
          password: newPassword,
          email: newEmail.trim() || undefined,
          first_name: newFirstName.trim() || undefined,
          last_name: newLastName.trim() || undefined,
          country: newCountry.trim() || undefined,
          state: newState.trim() || undefined,
          local_govt: newLocalGovt.trim() || undefined,
          ward: newWard.trim() || undefined,
        },
        false
      );
      if (created && created.id) {
        try {
          await apiPost(
            `/auth/admin/users/${created.id}/approve/`,
            undefined,
            true
          );
          setCreateUserMessage("User created and approved.");
        } catch {
          setCreateUserMessage("User created, but auto-approve failed.");
        }
        setUsers((prev) =>
          prev ? [{ ...created, is_approved_by_admin: true }, ...prev] : [created]
        );
      } else {
        setCreateUserMessage("User created.");
      }
      setNewUsername("");
      setNewPassword("");
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewCountry("");
      setNewState("");
      setNewLocalGovt("");
      setNewWard("");
    } catch {
      setCreateUserMessage("Could not create user.");
    } finally {
      setCreatingUser(false);
    }
  }

  const adminLevelLabel =
    me?.admin_level === "NATIONAL"
      ? "National admin"
      : me?.admin_level === "STATE"
      ? "State admin"
      : me?.admin_level === "LOCAL_GOVT"
      ? "Local government admin"
      : me?.admin_level === "WARD"
      ? "Ward admin"
      : "Not an admin";

  const totalUsers = users ? users.length : 0;
  const pendingUsers = users
    ? users.filter((u) => !u.is_approved_by_admin).length
    : 0;
  const adminUsers = users
    ? users.filter((u) => u.admin_level !== "NONE").length
    : 0;

  const hasStatsValues =
    !!stats &&
    stats.labels.length > 0 &&
    (stats.inflow.some((v) => v > 0) || stats.outflow.some((v) => v > 0));

  const showStatsCard =
    !!me &&
    (me.admin_level === "STATE" || me.admin_level === "NATIONAL") &&
    hasStatsValues;

  const filteredUsers =
    users?.filter((u) => {
      if (statusFilter === "APPROVED" && !u.is_approved_by_admin) {
        return false;
      }
      if (statusFilter === "PENDING" && u.is_approved_by_admin) {
        return false;
      }
      if (roleFilter === "ADMINS" && u.admin_level === "NONE") {
        return false;
      }
      if (roleFilter === "NON_ADMINS" && u.admin_level !== "NONE") {
        return false;
      }
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const haystack = [
          u.username,
          u.first_name,
          u.last_name,
          u.email,
          u.registration_number,
          u.country,
          u.state,
          u.local_govt,
          u.ward,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    }) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-0 pb-0 pt-0 md:px-4 md:pb-6 md:pt-4">
      <header className="mb-0 flex items-center justify-between border-b border-slate-900 px-4 py-3 md:mb-4 md:border-none md:px-0 md:py-0">
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
            <p className="text-lg font-semibold text-slate-50">
              Admin dashboard
            </p>
            <p className="text-xs text-emerald-300">
              {adminLevelLabel}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-700 px-3.5 py-1.5 text-sm text-slate-200"
        >
          Back to dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col gap-4 md:space-y-4 md:block">
        {showStatsCard && (
          <section className="rounded-2xl border border-emerald-700 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.45)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                National / State overview • Money inflow / outflow
              </p>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setStatsDays(7)}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statsDays === 7
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    7 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsDays(30)}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statsDays === 30
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsDays(90)}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statsDays === 90
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    90 days
                  </button>
                </div>
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={downloadingCsv || !stats}
                  className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-50"
                >
                  {downloadingCsv ? "Preparing..." : "Download report"}
                </button>
                <span className="text-[10px] text-slate-500">
                  {stats ? "Overview" : statsError || "No data"}
                </span>
              </div>
            </div>
            {stats && stats.labels.length > 0 ? (
              <div className="relative h-32 md:h-40">
                <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-500">
                  <div className="flex-1 flex items-end gap-1">
                    {stats.labels.map((label, idx) => {
                      const inflow = stats.inflow[idx] || 0;
                      const outflow = stats.outflow[idx] || 0;
                      const max = Math.max(
                        ...stats.inflow,
                        ...stats.outflow,
                        1
                      );
                      const inflowHeight = Math.round((inflow / max) * 100);
                      const outflowHeight = Math.round((outflow / max) * 100);
                      const isActive = hoverIndex === idx;
                      return (
                        <button
                          key={label}
                          type="button"
                          onMouseEnter={() => setHoverIndex(idx)}
                          onMouseLeave={() => setHoverIndex(null)}
                          className="flex-1 flex flex-col items-center gap-0.5 focus:outline-none"
                        >
                          <div className="flex w-full items-end gap-0.5 h-16 md:h-24">
                            <div
                              className={
                                "flex-1 rounded-full " +
                                (isActive
                                  ? "bg-emerald-400"
                                  : "bg-emerald-500/60")
                              }
                              style={{ height: `${inflowHeight}%` }}
                            />
                            <div
                              className={
                                "flex-1 rounded-full " +
                                (isActive
                                  ? "bg-rose-400"
                                  : "bg-rose-500/60")
                              }
                              style={{ height: `${outflowHeight}%` }}
                            />
                          </div>
                          <span className="mt-0.5 truncate text-[8px] text-slate-500">
                            {label.slice(5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[9px]">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">Inflow</span>
                      <span className="h-2 w-2 rounded-full bg-rose-500 ml-3" />
                      <span className="text-slate-400">Outflow</span>
                    </div>
                    {hoverIndex !== null && stats.labels[hoverIndex] && (
                      <div className="rounded-full bg-slate-900/80 px-3.5 py-1.5 border border-slate-700 text-xs text-slate-200">
                        <span className="mr-2">
                          {stats.labels[hoverIndex]}
                        </span>
                        <span className="mr-2">
                          In: ₦
                          {stats.inflow[hoverIndex].toLocaleString()}
                        </span>
                        <span>
                          Out: ₦
                          {stats.outflow[hoverIndex].toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                No transactions yet for this period.
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Users overview
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateUserMessage("")}
                className="hidden md:inline-flex rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 active:scale-[0.97]"
              >
                Add user below
              </button>
              <Link
                href="/admin/chat"
                className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 active:scale-[0.97]"
              >
                Open chat app
              </Link>
            </div>
          </div>
          <form
            onSubmit={handleCreateUser}
            className="mb-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-[11px] md:grid-cols-4"
          >
            <div className="space-y-1">
              <p className="font-semibold text-slate-100">
                Add new user (admin only)
              </p>
              <p className="text-[10px] text-slate-400">
                Create account for a person, then share username/password with them.
              </p>
            </div>
            <div className="space-y-1">
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="First name"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="Last name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="Email (optional)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="Country"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="State"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="Local govt"
                  value={newLocalGovt}
                  onChange={(e) => setNewLocalGovt(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="Ward"
                  value={newWard}
                  onChange={(e) => setNewWard(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={creatingUser}
                className="mt-1 w-full rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
              >
                {creatingUser ? "Creating..." : "Create user"}
              </button>
              {createUserMessage && (
                <p className="text-[10px] text-emerald-300">
                  {createUserMessage}
                </p>
              )}
            </div>
          </form>
          {me?.admin_level === "NATIONAL" && users && users.length > 0 && (
            <div className="mb-3 space-y-2 md:flex md:items-center md:justify-between md:space-y-0">
              <div className="flex-1 md:max-w-xs">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, location or reg no..."
                  className="w-full rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] md:justify-end">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Status</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statusFilter === "ALL"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("APPROVED")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statusFilter === "APPROVED"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("PENDING")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (statusFilter === "PENDING"
                        ? "border-amber-400 bg-amber-400/10 text-amber-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    Pending
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Role</span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("ALL")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (roleFilter === "ALL"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("ADMINS")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (roleFilter === "ADMINS"
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    Admins
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("NON_ADMINS")}
                    className={
                      "rounded-full border px-2 py-0.5 " +
                      (roleFilter === "NON_ADMINS"
                        ? "border-slate-500 bg-slate-500/10 text-slate-200"
                        : "border-slate-700 text-slate-200")
                    }
                  >
                    Non-admins
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>Total: {totalUsers}</span>
                  <span>Pending: {pendingUsers}</span>
                  <span>Admins: {adminUsers}</span>
                </div>
              </div>
            </div>
          )}
          {loadingUsers ? (
            <p className="text-xs text-slate-400">Loading users...</p>
          ) : userError ? (
            <p className="text-xs text-rose-400">{userError}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto text-xs">
              {users && users.length === 0 ? (
                <p className="text-slate-400">No users yet.</p>
              ) : (
                <>
                  {users &&
                    users.length > 0 &&
                    filteredUsers.length === 0 && (
                      <p className="text-slate-400">
                        No users match the current search or filters.
                      </p>
                    )}
                  {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-50">
                        {user.first_name || user.username}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {user.country} •{" "}
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() =>
                            setSearch(user.state ? user.state : "")
                          }
                        >
                          {user.state || "No state"}
                        </button>{" "}
                        •{" "}
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() =>
                            setSearch(
                              user.local_govt ? user.local_govt : ""
                            )
                          }
                        >
                          {user.local_govt || "No LGA"}
                        </button>{" "}
                        •{" "}
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() =>
                            setSearch(user.ward ? user.ward : "")
                          }
                        >
                          {user.ward || "No ward"}
                        </button>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Reg: {user.registration_number}
                      </p>
                      <p className="text-[10px]">
                        Status:{" "}
                        <span
                          className={
                            user.is_approved_by_admin
                              ? "text-emerald-300"
                              : "text-amber-300"
                          }
                        >
                          {user.is_approved_by_admin
                            ? "Approved"
                            : "Pending approval"}
                        </span>
                      </p>
                      <p className="text-[10px]">
                        Admin role:{" "}
                        <span className="text-sky-300">
                          {user.admin_level}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px]">
                      {!user.is_approved_by_admin && (
                        <button
                          type="button"
                          disabled={approvingId === user.id}
                          onClick={() => approveUser(user.id)}
                          className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                        >
                          {approvingId === user.id
                            ? "Approving..."
                            : "Approve"}
                        </button>
                      )}
                      {me?.admin_level === "LOCAL_GOVT" && (
                        <button
                          type="button"
                          disabled={promotingId === user.id}
                          onClick={() =>
                            promoteUser(user.id, "WARD")
                          }
                          className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                        >
                          Ward admin
                        </button>
                      )}
                      {me?.admin_level === "STATE" && (
                        <>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "WARD")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            Ward admin
                          </button>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "LOCAL_GOVT")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            Local govt admin
                          </button>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "STATE")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            State admin
                          </button>
                        </>
                      )}
                      {me?.admin_level === "NATIONAL" && (
                        <>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "WARD")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            Ward admin
                          </button>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "LOCAL_GOVT")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            Local govt admin
                          </button>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "STATE")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            State admin
                          </button>
                          <button
                            type="button"
                            disabled={promotingId === user.id}
                            onClick={() =>
                              promoteUser(user.id, "NATIONAL")
                            }
                            className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-100 active:scale-[0.97] disabled:opacity-60"
                          >
                            National admin
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                </>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
