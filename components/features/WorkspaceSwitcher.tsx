"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
  logo_url: string | null;
  plan: string;
};

export default function WorkspaceSwitcher() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("*").order("created_at");
      return (data || []) as Workspace[];
    },
  });

  const { data: currentId } = useQuery({
    queryKey: ["current-workspace"],
    queryFn: () => localStorage.getItem("current_workspace_id"),
  });

  const current = workspaces.find((w) => w.id === currentId) || workspaces[0];

  const switchMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      localStorage.setItem("current_workspace_id", workspaceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-workspace"] });
      setOpen(false);
      window.location.reload();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("workspaces").insert({ name, owner_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setShowCreate(false);
      setNewName("");
    },
  });

  const PLAN_BADGE: Record<string, string> = {
    free: "bg-gray-100 text-gray-500",
    pro: "bg-[#E1F5EE] text-[#1D9E75]",
    business: "bg-purple-100 text-purple-600",
  };

  if (isLoading) return <div className="h-8 bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/60 rounded-lg transition-all cursor-pointer group"
      >
        <div className="w-7 h-7 rounded-lg bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
          {current?.logo_url ? (
            <img src={current.logo_url} alt="" className="w-full h-full object-cover" />
          ) : current?.name?.[0]?.toUpperCase() || "W"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-gray-900 truncate">{current?.name || "Мой воркспейс"}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${PLAN_BADGE[current?.plan || "free"]}`}>
            {current?.plan?.toUpperCase() || "FREE"}
          </span>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => switchMutation.mutate(w.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left ${w.id === current?.id ? "bg-[#E1F5EE]" : ""}`}
            >
              <div className="w-7 h-7 rounded-lg bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                {w.logo_url ? <img src={w.logo_url} alt="" className="w-full h-full object-cover" /> : w.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{w.name}</p>
              </div>
              {w.id === current?.id && <span className="text-[#1D9E75] text-xs">✓</span>}
            </button>
          ))}

          <div className="border-t border-gray-100">
            {showCreate ? (
              <div className="p-2 flex gap-1.5">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название" autoFocus
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1D9E75]" />
                <button onClick={() => createMutation.mutate(newName)} disabled={!newName || createMutation.isPending}
                  className="px-2.5 py-1.5 bg-[#1D9E75] text-white text-xs rounded-lg cursor-pointer disabled:opacity-50">
                  {createMutation.isPending ? "..." : "OK"}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-gray-400">+</span> Новый воркспейс
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
