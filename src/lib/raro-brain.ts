// Deterministic offline "brain" — porta da lógica processBrainWithGoogleAccess (MainActivity.java).
// Retorna markdown pronto para exibir se a consulta bater com um padrão conhecido,
// ou null para deixar a IA responder normalmente.

function normalize(text: string): string {
  return text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const GREETINGS = [
  "oi", "ola", "olá", "eai", "e ai", "hey", "hi", "hello",
  "bom dia", "boa tarde", "boa noite", "tudo bem", "como vai", "como voce esta", "como você está",
];

const CREATOR_TRIGGERS = [
  "quem te fez", "quem te criou", "quem criou voce", "quem criou você",
  "seu criador", "quem e voce", "quem é você", "qual seu nome",
  "voce e uma ia", "você é uma ia", "o que voce e", "o que você é",
];

const HISTORY_TRIGGERS = ["historia", "história", "roteiro", "script", "lenda", "mito", "caso real"];
const MUSIC_TRIGGERS = ["musica", "música", "song", "trilha", "beat", "instrumental"];

function enc(q: string) {
  return encodeURIComponent(q);
}

function generalSearchBlock(query: string): string {
  const q = enc(query);
  return [
    `## 🔎 Busca profunda para: **${query}**`,
    "",
    `- 🔍 **Google Search** — [Abrir busca](https://www.google.com/search?q=${q})`,
    `- 📚 **Google Scholar** — [Artigos acadêmicos](https://scholar.google.com/scholar?q=${q})`,
    `- 📖 **Google Books** — [Livros e trechos](https://www.google.com/search?tbm=bks&q=${q})`,
    `- 🖼️ **Google Images** — [Imagens](https://www.google.com/search?tbm=isch&q=${q})`,
    `- 🌐 **Internet Archive** — [Arquivos históricos](https://archive.org/search?query=${q})`,
    `- 🎬 **YouTube** — [Vídeos](https://www.youtube.com/results?search_query=${q})`,
    `- 💻 **GitHub** — [Repositórios de IA/código](https://github.com/search?q=${q}&type=repositories)`,
    `- 🤗 **Hugging Face** — [Modelos e datasets](https://huggingface.co/search/full-text?q=${q})`,
    `- 👥 **Reddit** — [Discussões de nicho](https://www.reddit.com/search/?q=${q})`,
    "",
    "_Clique em qualquer link acima para abrir a busca em uma nova aba._",
  ].join("\n");
}

export function raroLocalAnswer(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const n = normalize(raw);

  // Saudações
  if (GREETINGS.some((g) => n === g || n === `${g}!` || n === `${g}.`)) {
    return [
      "👋 **Olá!** Eu sou a **Raro AI** — sua caçadora de tesouros digitais.",
      "",
      "Me diga o que você quer descobrir: **arquivos raros**, **histórias esquecidas**, **projetos de IA obscuros**, **fóruns de nicho**, **sites antigos**...",
      "",
      "Exemplos rápidos:",
      "- _\"Encontre lendas urbanas brasileiras pouco conhecidas\"_",
      "- _\"Projetos open source de IA generativa obscuros\"_",
      "- _\"Documentos históricos sobre a Guerra do Paraguai\"_",
    ].join("\n");
  }

  // Criador / identidade
  if (CREATOR_TRIGGERS.some((t) => n.includes(t))) {
    return [
      "## 🔮 Sobre mim",
      "",
      "Eu sou a **Raro AI**, uma inteligência artificial especializada em descobrir conteúdos **raros, obscuros e pouco conhecidos** na internet.",
      "",
      "**O que eu faço:**",
      "- Caço arquivos, sites, fóruns e repositórios difíceis de achar",
      "- Encontro histórias e casos reais esquecidos para roteiros de vídeos com IA",
      "- Localizo projetos de IA de código aberto pouco divulgados",
      "- Vasculho bibliotecas digitais como [Internet Archive](https://archive.org), [Project Gutenberg](https://www.gutenberg.org) e [Domínio Público](http://www.dominiopublico.gov.br)",
      "",
      "Sou o oposto de uma busca genérica — eu **cavo fundo** e sempre entrego links. 💎",
    ].join("\n");
  }

  // Música — cria prompt + links de referência
  if (MUSIC_TRIGGERS.some((t) => n.includes(t))) {
    const q = enc(raw);
    return [
      `## 🎵 Prompt de música: **${raw}**`,
      "",
      "Use o botão 🎵 aqui do lado do microfone para **gerar essa música com IA** (ElevenLabs Music).",
      "",
      "**Referências para se inspirar:**",
      `- 🎧 [YouTube — buscar "${raw}"](https://www.youtube.com/results?search_query=${q})`,
      `- 🎼 [Freesound (samples raros)](https://freesound.org/search/?q=${q})`,
      `- 📻 [Internet Archive Audio](https://archive.org/details/audio?query=${q})`,
      `- 🥁 [Splice (packs de sons)](https://splice.com/sounds/search?q=${q})`,
      "",
      "_Dica: descreva estilo + instrumentos + mood (ex: \"piano sombrio, lo-fi, chuva ao fundo\")._",
    ].join("\n");
  }

  // Histórias / roteiros
  if (HISTORY_TRIGGERS.some((t) => n.includes(t))) {
    const q = enc(raw);
    return [
      `## 📜 Caça de histórias raras: **${raw}**`,
      "",
      "Fontes profundas para roteiros e vídeos com IA:",
      "",
      `- 📚 [Google Scholar](https://scholar.google.com/scholar?q=${q}) — fatos verificáveis`,
      `- 🌐 [Internet Archive](https://archive.org/search?query=${q}) — jornais e livros antigos`,
      `- 👥 [Reddit r/UnresolvedMysteries](https://www.reddit.com/r/UnresolvedMysteries/search/?q=${q}&restrict_sr=1) — casos não resolvidos`,
      `- 🕯️ [Reddit r/nosleep + r/creepy](https://www.reddit.com/search/?q=${q}+subreddit%3Anosleep+OR+subreddit%3Acreepy) — folclore urbano`,
      `- 🎬 [YouTube](https://www.youtube.com/results?search_query=${q}+documentario) — documentários`,
      `- 📖 [Wikipedia PT](https://pt.wikipedia.org/wiki/Special:Search?search=${q})`,
      "",
      "_Peça \"me dê 5 ganchos narrativos sobre **X**\" se quiser que eu monte roteiros completos._",
    ].join("\n");
  }

  // Consulta muito curta (1 palavra) → gera bloco de busca geral
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= 3 && raw.length <= 40) {
    return generalSearchBlock(raw);
  }

  return null;
}
