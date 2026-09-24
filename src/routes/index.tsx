import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import logo from "@/assets/raro-logo.png";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Raro AI — Descubra o que a internet esconde" },
      {
        name: "description",
        content:
          "Raro AI ajuda a encontrar projetos, arquivos e ideias raras que vale a pena explorar.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="Raro AI home">
            <img src={logo} alt="Raro AI" width={42} height={42} className="drop-shadow-[0_0_20px_oklch(0.70_0.24_320/0.5)]" />
            <span className="text-lg font-semibold tracking-tight">Raro AI</span>
          </Link>

          <div className="flex items-center gap-3">
            <a href="#sobre" className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex">
              Sobre
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full border border-border/80 bg-card/60 px-4 py-2 text-sm font-medium transition hover:border-primary/60 hover:bg-accent"
            >
              Entrar
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:pb-20 lg:pt-16">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Descobertas raras
            </div>

            <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
              <span className="text-gradient-rare">Raro AI</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground sm:text-xl">
              Explore conteúdos, arquivos, histórias e projetos que não aparecem no óbvio da internet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-rare px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-rare transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Começar
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <a
                href="#sobre"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card/40 px-6 py-3.5 text-sm font-semibold transition hover:bg-accent"
              >
                Saber mais
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[500px]">
            <div className="rounded-[2rem] border border-border/70 bg-card/60 p-4 shadow-rare backdrop-blur-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3 border-b border-border/70 pb-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-rare shadow-rare">
                  <Bot className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Assistente de descoberta</p>
                  <p className="text-xs text-muted-foreground">Pesquisa inteligente</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-chat-user px-4 py-3 text-sm leading-6 text-chat-user-foreground">
                  Quero encontrar ideias criativas e pouco conhecidas.
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/70 bg-background/70 px-4 py-3 text-sm leading-6 text-foreground">
                  Posso te ajudar a localizar projetos, materiais e referências fora do caminho mais comum.
                </div>
                <div className="flex items-center gap-2 px-2 pt-1 text-xs text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  explorando o que há de raro
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sobre" className="pb-12">
          <div className="rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur-sm">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Sobre</p>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              A Raro AI foi pensada para quem busca mais do que busca simples: uma forma de explorar a internet com contexto, curiosidade e descoberta real.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
