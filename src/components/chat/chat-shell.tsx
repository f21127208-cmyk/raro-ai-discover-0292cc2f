import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, deleteThread } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, LogOut, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/raro-logo.png";
import { cn } from "@/lib/utils";

function threadDisplayTitle(title: string) {
  const normalized = title
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!.?,\s]/g, "");

  if (["oi", "ola", "hello", "hi"].includes(normalized)) {
    return "Conversa rápida";
  }

  return title;
}

export function ChatShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const listFn = useServerFn(listThreads);
  const deleteFn = useServerFn(deleteThread);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => listFn(),
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (activeId === id) navigate({ to: "/chat" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-4 flex items-center gap-2">
          <img src={logo} alt="" width={32} height={32} className="drop-shadow-[0_0_20px_oklch(0.70_0.24_320/0.5)]" />
          <div className="flex flex-col">
            <span className="font-semibold text-gradient-rare leading-tight">Raro AI</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">descobertas raras</span>
          </div>
        </div>

        <div className="px-3">
          <Button
            onClick={() => {
              navigate({ to: "/chat" });
              setMobileOpen(false);
            }}
            className="w-full bg-gradient-rare text-primary-foreground hover:opacity-90 shadow-rare"
          >
            <Plus className="size-4" /> Nova conversa
          </Button>
        </div>

        <div className="px-4 pt-6 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="size-3" /> Suas buscas
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {threads.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              Sem conversas ainda.<br />Comece uma nova busca rara.
            </div>
          ) : (
            threads.map((t) => {
              const isActive = activeId === t.id;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm",
                    isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 truncate text-sidebar-foreground"
                  >
                    {threadDisplayTitle(t.title)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Excluir esta conversa?")) del.mutate(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition"
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border flex items-center gap-2">
          <div className="size-8 rounded-full bg-gradient-rare flex items-center justify-center text-xs font-semibold text-primary-foreground">
            {email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate text-sidebar-foreground">{email ?? "—"}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded transition"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center gap-3 px-4 border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded hover:bg-accent"
            aria-label="Abrir menu"
          >
            <Search className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={24} height={24} />
            <span className="font-semibold text-gradient-rare">Raro AI</span>
          </div>
        </header>
        <div className="flex-1 min-h-0">{children}</div>
      </main>
    </div>
  );
}
