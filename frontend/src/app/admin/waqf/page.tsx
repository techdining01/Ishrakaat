"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

interface WaqfInterest {
  id: number;
  waqf_category: string;
  project_type: string;
  contribution_method: string;
  on_behalf_of: string;
  preferred_date: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  additional_notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  username: string | null;
  user_email: string | null;
}

export default function AdminWaqfTracking() {
  const [records, setRecords] = useState<WaqfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<WaqfInterest | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    const data = await apiGet("/donations/admin/waqf-interests/", true);
    if (Array.isArray(data)) {
      setRecords(data);
    }
    setLoading(false);
  }

  async function handleUpdate() {
    if (!selectedRecord) return;
    setUpdating(true);
    const res = await apiPatch(`/donations/admin/waqf-interests/${selectedRecord.id}/`, {
      status: selectedRecord.status,
      admin_notes: selectedRecord.admin_notes,
    }, true);
    if (!res.error) {
      setSelectedRecord(null);
      loadRecords();
    }
    setUpdating(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "FOLLOWED_UP": return "text-sky-400 bg-sky-400/10 border-sky-400/20";
      case "COMPLETED": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500 tracking-tight">
            Waqf Tracking
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and follow up on Waqf project interests</p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/donations/admin/waqf-interests/export/csv/`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <span>📊</span> Export CSV
          </a>
          <a 
            href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/donations/admin/waqf-interests/export/pdf/`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
          >
            <span>📄</span> Export PDF
          </a>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Submitter</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Method</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 animate-pulse">Loading records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No Waqf interests found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{r.username || r.guest_name}</span>
                        <span className="text-[10px] text-slate-500">{r.user_email || r.guest_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{r.waqf_category}</span>
                        <span className="text-[10px] text-slate-400">{r.project_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs text-slate-300">{r.contribution_method}</span>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs text-slate-400">{r.preferred_date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedRecord(r)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-all active:scale-95"
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}></div>
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Waqf Case Details</h2>
                    <button onClick={() => setSelectedRecord(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Submitter</p>
                            <p className="text-sm font-bold">{selectedRecord.username || selectedRecord.guest_name}</p>
                            <p className="text-[10px] text-slate-400">{selectedRecord.user_email || selectedRecord.guest_email}</p>
                            <p className="text-[10px] text-slate-400">{selectedRecord.guest_phone}</p>
                        </div>
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Project</p>
                            <p className="text-sm font-bold text-amber-400">{selectedRecord.waqf_category}</p>
                            <p className="text-[10px] text-slate-400">{selectedRecord.project_type}</p>
                            <p className="text-[10px] text-slate-400">On behalf of: {selectedRecord.on_behalf_of || "N/A"}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Method & Notes</p>
                        <p className="text-xs text-slate-300 mb-2"><strong>Method:</strong> {selectedRecord.contribution_method}</p>
                        <p className="text-xs text-slate-400 italic">"{selectedRecord.additional_notes || "No additional notes"}"</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Status</label>
                            <select 
                                value={selectedRecord.status}
                                onChange={(e) => setSelectedRecord({...selectedRecord, status: e.target.value})}
                                className="w-full bg-slate-800 border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="FOLLOWED_UP">Followed Up</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Admin Notes</label>
                            <textarea 
                                value={selectedRecord.admin_notes}
                                onChange={(e) => setSelectedRecord({...selectedRecord, admin_notes: e.target.value})}
                                placeholder="Add follow-up details..."
                                className="w-full h-32 bg-slate-800 border-white/10 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                    <button 
                        onClick={() => setSelectedRecord(null)}
                        className="px-6 py-2 rounded-2xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpdate}
                        disabled={updating}
                        className="px-8 py-2 rounded-2xl bg-emerald-500 text-slate-950 text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {updating ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
