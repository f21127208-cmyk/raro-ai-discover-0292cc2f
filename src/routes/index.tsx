import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Compass, Layers3, Search, Sparkles, WandSparkles } from "lucide-react";
import logo from "@/assets/raro-logo.png";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Raro AI — Descubra o que a internet esconde" },
      {
        name: "description",
        content:
          "Uma IA para encontrar arquivos, projetos, histórias e ideias que merecem ser descobertos.",
      },
    ],
  }),
  component: HomePage,
});

const discoveries = [
  {
    icon: Search,
    label: "Busca com intenção",
    text: "Vá além das palavras-chave e encontre respostas que fazem sentido para você.",
  },
  {
    icon: Layers3,
    label: "Curadoria inteligente",
    text: "A Raro organiza sinais espalhados pela web em descobertas claras e úteis.",
  },
  {
    icon: Compass,
    label: "Novos caminhos",
    text: "Cada conversa abre uma trilha diferente para explorar ideias pouco óbvias.",
  },
];

function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_12%,oklch(0.7_0.24_320/0.16),transparent_28%),radial-gradient(circle_at_15%_68%,oklch(0.7_0.18_280/0.12),transparent_25%)]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="Raro AI - início">
          <img src={logo} alt="" width={42} height={42} className="drop-shadow-[0_0_20px_oklch(0.70_0.24_320/0.5)]" />
          <span className="text-lg font-semibold tracking-tight">Raro AI</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <a href="#como-funciona" className="hidden text-muted-foreground transition hover:text-foreground sm:inline-flex">
            Como funciona
          </a>
          <Link to="/auth" className="rounded-full border border-border/80 px-4 py-2 font-medium transition hover:border-primary/60 hover:bg-accent">
            Entrar
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            A internet ainda guarda coisas incríveis
          </div>
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Descubra o lado <span className="text-gradient-rare">raro</span> da internet.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Raro é sua companheira de exploração: uma IA conversacional que encontra arquivos, projetos, histórias e ideias que não aparecem na primeira busca.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth" className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-rare px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-rare transition hover:-translate-y-0.5 hover:opacity-90">
              Começar a explorar
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#como-funciona" className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-sm font-semibold transition hover:bg-accent">
              Conhecer a Raro
            </a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Gratuito para começar · Sem complicação</p>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-8 rounded-[3rem] bg-primary/15 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-card/80 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border/70 pb-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-rare shadow-rare">
                <Bot className="size-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Converse com a Raro</p>
                <p className="text-xs text-muted-foreground">Sua próxima descoberta começa aqui</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-primary"><span className="size-1.5 rounded-full bg-primary" /> online</span>
            </div>
            <div className="space-y-4">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-chat-user px-4 py-3 text-sm leading-6 text-chat-user-foreground">
                Quero encontrar projetos criativos e diferentes sobre inteligência artificial.
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/70 bg-background/70 px-4 py-3 text-sm leading-6 text-foreground">
                <div className="mb-2 flex items-center gap-2 text-primary"><WandSparkles className="size-4" /><span className="font-medium">Boa busca.</span></div>
                Vou procurar além do óbvio: projetos independentes, experimentos open source e ideias que estão começando a ganhar forma.
              </div>
              <div className="flex items-center gap-2 px-2 pt-1 text-xs text-muted-foreground"><span className="flex gap-1"><span className="size-1.5 animate-pulse rounded-full bg-primary" /><span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" /><span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" /></span> explorando possibilidades</div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border/60 bg-background/35">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Feito para curiosos</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Menos ruído. Mais descobertas.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Você traz a curiosidade. A Raro ajuda a transformar uma pergunta em uma jornada.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {discoveries.map(({ icon: Icon, label, text }, index) => (
              <article key={label} className="group rounded-2xl border border-border/70 bg-card/45 p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:bg-card/75">
                <div className="mb-8 flex items-center justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><span className="text-sm text-muted-foreground">0{index + 1}</span></div>
                <h3 className="text-lg font-semibold">{label}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-20 sm:flex-row sm:items-center lg:px-10">
        <div><h2 className="text-3xl font-semibold tracking-tight">Pronto para encontrar algo raro?</h2><p className="mt-3 text-muted-foreground">Abra uma conversa e veja até onde sua curiosidade pode levar.</p></div>
        <Link to="/auth" className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:bg-foreground/90">Explorar agora <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
      </section>

      <footer className="border-t border-border/60 px-6 py-6 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Raro AI</span><span>Descobertas para quem olha duas vezes.</span></div></footer>
    </main>
  );
}
