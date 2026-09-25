export interface Transaction {
  id: string;
  initials: string;
  clientName: string;
  credential: string;
  phone: string;
  location: string;
  province: string;
  format: 'ebook' | 'fisico';
  formatLabel: string;
  amountKz: number;
  amountFormatted: string;
  paymentMethod: string;
  paymentStatus: string;
  time: string;
  emisRef: string;
  whatsappStatus: 'read' | 'delivered' | 'dispatch' | 'pending';
  whatsappStatusLabel: string;
  notes?: string;
  wantsPhysicalAlert?: boolean;
}

export interface BankingConfig {
  bank: string;
  iban: string;
  mcxPhone: string;
  beneficiary: string;
  kwikAccountName: string;
  kwikNibOrPhone: string;
  kwikBank: string;
  instructions: string;
}

export const DEFAULT_BANKING_CONFIG: BankingConfig = {
  bank: "Banco Angolano de Investimentos (BAI) / BFA",
  iban: "AO06.0040.0000.9876.5432.1019.2",
  mcxPhone: "+244 923 884 120",
  beneficiary: "DZMV • Lançamento Oficial (Edição: Sábhia)",
  kwikAccountName: "Dénis Zombo Mendonça Vasco (DZMV)",
  kwikNibOrPhone: "+244 923 884 120",
  kwikBank: "Rede KWIK (EMIS) / BAI Directo",
  instructions: "Efetue o pagamento via Multicaixa Express, Transferência IBAN ou Transferência KWIK e anexe o comprovativo no WhatsApp para liberação imediata do seu E-book."
};

const BANKING_STORAGE_KEY = 'dzmv_banking_config_v1';

export function getStoredBankingConfig(): BankingConfig {
  try {
    const raw = localStorage.getItem(BANKING_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BANKING_STORAGE_KEY, JSON.stringify(DEFAULT_BANKING_CONFIG));
      return DEFAULT_BANKING_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BANKING_CONFIG,
      ...parsed,
      kwikAccountName: parsed.kwikAccountName || parsed.quickAccountName || DEFAULT_BANKING_CONFIG.kwikAccountName,
      kwikNibOrPhone: parsed.kwikNibOrPhone || parsed.quickNibOrPhone || DEFAULT_BANKING_CONFIG.kwikNibOrPhone,
      kwikBank: parsed.kwikBank || parsed.quickBank || DEFAULT_BANKING_CONFIG.kwikBank,
    };
  } catch {
    return DEFAULT_BANKING_CONFIG;
  }
}

export function saveStoredBankingConfig(config: BankingConfig) {
  try {
    localStorage.setItem(BANKING_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving banking config', e);
  }
}

export interface GalleryImage {
  id: string | number;
  url: string;
  title: string;
  addedAt?: string;
}

export const DEFAULT_GALLERY: GalleryImage[] = [
  { id: 1, url: "https://i.postimg.cc/mZKpj1cS/5274f511-ce0c-47f3-bf8b-d550e24674ed.jpg", title: "Eng. Denis Zombo Mendonça Vasco" },
  { id: 2, url: "https://i.postimg.cc/L4J0j3sk/galeria-rolando-(1).jpg", title: "Denis Zombo Mendonça Vasco • Presença" },
  { id: 3, url: "https://i.postimg.cc/PfCF1Qqz/galeria-rolando-(2).jpg", title: "Trajetória e Liderança" },
  { id: 4, url: "https://i.postimg.cc/BZjw2BvD/galeria-rolando-(3).jpg", title: "Vivências e Experiência" },
  { id: 5, url: "https://i.postimg.cc/1R8YDrzp/galeria-rolando-(4).jpg", title: "Eng. Dénis Zombo" },
  { id: 6, url: "https://i.postimg.cc/CMR6bsK4/galeria-rolando-(5).jpg", title: "Gestão e Dedicação" },
  { id: 7, url: "https://i.postimg.cc/kM2hWv5c/galeria-rolando-(6).jpg", title: "Lançamento Oficial" },
  { id: 8, url: "https://i.postimg.cc/jqB3cnWn/galeria-rolando-(7).jpg", title: "Maturidade Institucional" },
  { id: 9, url: "https://i.postimg.cc/HWFvz8J7/galeria-rolando-(8).jpg", title: "Presença e Reflexão" },
  { id: 10, url: "https://i.postimg.cc/mZKpj1cH/galeria-rolando-(9).jpg", title: "Amizade após Exoneração" },
  { id: 11, url: "https://i.postimg.cc/Y2TDRL46/galeria-rolando-(10).jpg", title: "Eng. Dénis Zombo Vasco" }
];

const GALLERY_STORAGE_KEY = 'dzmv_author_gallery_v4';

export function getStoredGallery(): GalleryImage[] {
  try {
    // Clean old legacy storage keys if present
    ['dzmv_author_gallery_v1', 'dzmv_author_gallery_v2', 'dzmv_author_gallery_v3'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(DEFAULT_GALLERY));
      return DEFAULT_GALLERY;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GALLERY;
    const sanitized = list.map((img: GalleryImage) => ({
      ...img,
      title: (img.title || '').replace(/Ângelo/gi, 'Zombo').replace(/Angelo/gi, 'Zombo')
    }));
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return DEFAULT_GALLERY;
  }
}

export function saveStoredGallery(gallery: GalleryImage[]) {
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
    window.dispatchEvent(new CustomEvent('dzmv_gallery_updated', { detail: gallery }));
  } catch (e) {
    console.error('Error saving gallery', e);
  }
}

export function resetDefaultGallery(): GalleryImage[] {
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(DEFAULT_GALLERY));
    window.dispatchEvent(new CustomEvent('dzmv_gallery_updated', { detail: DEFAULT_GALLERY }));
    return DEFAULT_GALLERY;
  } catch {
    return DEFAULT_GALLERY;
  }
}

export const BOOK_METADATA = {
  title: "Amizade após Exoneração",
  subtitle: "Como devemos agir com amizade que simplesmente está conosco por causa do cargo de Direção e chefia",
  coverFooterQuote: "Quando a exoneração encerra um ciclo, mas não interrompe os laços que constroem o futuro.",
  author: "Engenheiro Dénis Zombo Mendonça Vasco",
  authorShort: "Eng. Dénis Zombo",
  publisher: "Editora Sábhia",
  isbn: "978-989-53-482-1",
  edition: "1ª Edição Oficial • Angola 2025",
  prices: {
    ebookKz: 8500,
    ebookFormatted: "8.500 Kz",
    ebookOriginalFormatted: "18.000 Kz",
    physicalKz: 0,
    physicalFormatted: "Reserva Gratuita (Pague na Entrega)",
    usdReference: "1 USD ≈ 920 Kz"
  },
  academicBackground: [
    { title: "Técnico Superior em Electromedicina", institution: "Instituto Superior Politécnico do Huambo", year: "2015" },
    { title: "Técnico Médio de Saúde", institution: "Instituto Médio de Saúde do Huambo", year: "2003" }
  ],
  professionalExperience: [
    { role: "Director Técnico", place: "Hospital Geral do Cunene", period: "Agosto de 2024 – Presente" },
    { role: "Electromédico", place: "Hospital Municipal da Nharea, Bié", period: "2022 – 2023" },
    { role: "Assessor do Gabinete do Director Provincial da Saúde", place: "Huambo", period: "2020 – 2023" },
    { role: "Director Municipal de Saúde", place: "Longonjo, Huambo", period: "2017 – 2019" },
    { role: "Director do Centro de Saúde", place: "Comuna do Lépí, Huambo", period: "2017" },
    { role: "Chefe da Secção Administrativa", place: "Direcção Municipal da Saúde do Longonjo", period: "2015 – 2016" },
    { role: "Chefe de Recursos Humanos", place: "Hospital Municipal do Longonjo", period: "2009 – 2011" },
    { role: "Enfermeiro", place: "Hospital Municipal do Longonjo", period: "Desde 2007" },
    { role: "Coordenador do Projecto de Apoio a Grupos Vulneráveis", place: "Cachungo-Chiumbo", period: "2006 – 2007" },
    { role: "Coordenador de Voluntários no Combate às DTS/HIV/SIDA", place: "Cruz Vermelha de Angola, Huambo", period: "2004 – 2005" }
  ],
  complementaryTrainings: [
    "Curso de Informática",
    "Seminário de Relações Interpessoais",
    "Educação Cívica, Democracia e Género",
    "Boas Práticas de Saúde na Comunidade",
    "Empreendedorismo",
    "Organização Comunitária"
  ],
  backCoverPoints: [
    "Análise das relações construídas no ambiente profissional e o impacto do fim dos cargos de liderança.",
    "Diferenciação entre aproximações por afeto verdadeiro versus aproximações movidas por influência ou vantagens.",
    "Estratégias para superar os impactos emocionais da exoneração: insegurança, perda de identidade e isolamento.",
    "Reavaliação consciente dos vínculos profissionais e valorização das amizades genuínas.",
    "A importância central do apoio familiar nos momentos de transição e reinvenção.",
    "Prática da empatia, gentileza e respeito na reconstrução da autoestima.",
    "Criação de novas amizades, ampliação da rede de contactos e um recomeço baseado no autoconhecimento."
  ],
  images: {
    mockup3D: "https://i.postimg.cc/gkV50ysH/CAPA-LIVRO-AMIZADE.png",
    coverFront: "https://i.postimg.cc/gkV50ysH/CAPA-LIVRO-AMIZADE.png",
    coverCard: "https://i.postimg.cc/gkV50ysH/CAPA-LIVRO-AMIZADE.png",
    secondaryCover: "https://i.postimg.cc/gkV50ysH/CAPA-LIVRO-AMIZADE.png",
    authorPortrait: "https://i.postimg.cc/cCFj1F1Z/Foto-do-auto-Denis-Zombo.jpg",
    authorSignature: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqoulHnu-w47DgbMPeqy2J4JJfgbk8jyfKtTHZmUAZQv03hcYt3KxeojVtDocp6oOdkAA3NLZ9Lih5fn2pAAjb2qb9rQWGF0b4e0BwRhbPE2emxoq85ewD9cWRLyCFGppVXyAn9pd_lIcOxARZcbAEpsLyHop9dxeJV-ZEfcpBs5fO9bGcpFjdWuhcyIPpmjrFrEV84rItSKpfXl4NwXa24_qkyX0yRkWqAFcrlOPSNX3N-4PK_xNo",
    brandLogo: "https://lh3.googleusercontent.com/aida/AEtjO1VfKAuOzzUPlGF7CPg_CjmYQl4_U8ik9aWB2mLZLCzi90aMLMk2lPO4RL9PoEIh3cJfM-SloGwlr9OlcQq5MCfhaQq4_Z_dvjLN-xwCeFNi1PLsf5CoTBUL4QsGHjolgBpvjyi_C2MLCWSY2UdqY4TyrnhomT7g-mnR59IdKC-kGvfT8FeCnbVcAAk8wQ4JJTbB839fzGyGGDZO9Je-reHR2CjgXgNY6aSHi_PCG6GGKkE47sXjpSA1Yw",
    thumbnail: "https://i.postimg.cc/gkV50ysH/CAPA-LIVRO-AMIZADE.png"
  },
  gallery: [
    { id: 1, url: "https://i.postimg.cc/mZKpj1cS/5274f511-ce0c-47f3-bf8b-d550e24674ed.jpg", title: "Eng. Denis Zombo Mendonça Vasco" },
    { id: 2, url: "https://i.postimg.cc/L4J0j3sk/galeria-rolando-(1).jpg", title: "Denis Zombo Mendonça Vasco • Presença" },
    { id: 3, url: "https://i.postimg.cc/PfCF1Qqz/galeria-rolando-(2).jpg", title: "Trajetória e Liderança" },
    { id: 4, url: "https://i.postimg.cc/BZjw2BvD/galeria-rolando-(3).jpg", title: "Vivências e Experiência" },
    { id: 5, url: "https://i.postimg.cc/1R8YDrzp/galeria-rolando-(4).jpg", title: "Eng. Dénis Zombo" },
    { id: 6, url: "https://i.postimg.cc/CMR6bsK4/galeria-rolando-(5).jpg", title: "Gestão e Dedicação" },
    { id: 7, url: "https://i.postimg.cc/kM2hWv5c/galeria-rolando-(6).jpg", title: "Lançamento Oficial" },
    { id: 8, url: "https://i.postimg.cc/jqB3cnWn/galeria-rolando-(7).jpg", title: "Maturidade Institucional" },
    { id: 9, url: "https://i.postimg.cc/HWFvz8J7/galeria-rolando-(8).jpg", title: "Presença e Reflexão" },
    { id: 10, url: "https://i.postimg.cc/mZKpj1cH/galeria-rolando-(9).jpg", title: "Amizade após Exoneração" },
    { id: 11, url: "https://i.postimg.cc/Y2TDRL46/galeria-rolando-(10).jpg", title: "Eng. Dénis Zombo Vasco" }
  ],
  pillars: [
    {
      id: "respeito",
      number: "01",
      title: "Respeito",
      subtitle: "Dignidade e Gentileza",
      icon: "handshake",
      description: "A postura ética e o respeito humano incondicional, que devem permanecer inalterados mesmo quando os cargos de direção e chefia chegam ao fim."
    },
    {
      id: "amizade",
      number: "02",
      title: "Amizade",
      subtitle: "Vínculos Verdadeiros",
      icon: "diversity_1",
      description: "Identificar e valorizar quem está ao nosso lado por afeto e estima real, distinguindo-os das aproximações motivadas apenas por poder, influência ou vantagens."
    },
    {
      id: "recomecos",
      number: "03",
      title: "Recomeços",
      subtitle: "Autoconhecimento & Família",
      icon: "restart_alt",
      description: "A reconstrução da autoestima, a segurança pessoal e a centralidade da família na superação do isolamento e na reinvenção do propósito de vida."
    },
    {
      id: "oportunidades",
      number: "04",
      title: "Novas Oportunidades",
      subtitle: "Ampliação de Redes",
      icon: "trending_up",
      description: "Transformar a bagagem profissional na ampliação de novas redes de contacto, criação de parcerias e valorização do potencial humano."
    }
  ],
  quote: "Quando a exoneração encerra um ciclo, mas não interrompe os laços que constroem o futuro.",
  banking: {
    bank: "Banco Angolano de Investimentos (BAI) / BFA",
    iban: "AO06.0040.0000.9876.5432.1019.2",
    mcxPhone: "+244 923 884 120",
    entity: "99821",
    subEntity: "001",
    beneficiary: "Editora Sábhia & Veritas Press Angola"
  }
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    initials: "AS",
    clientName: "Dr. António dos Santos",
    credential: "Consultor Jurídico • Ordem Advogados",
    phone: "+244 923 456 789",
    location: "Luanda / Talatona",
    province: "Luanda",
    format: "ebook",
    formatLabel: "E-book Digital",
    amountKz: 10500,
    amountFormatted: "Kz 10.500",
    paymentMethod: "Multicaixa Express",
    paymentStatus: "Multicaixa Exp. Pago",
    time: "Hoje às 14:32",
    emisRef: "EMIS Ref: #MCX-88219",
    whatsappStatus: "read",
    whatsappStatusLabel: "E-book Entregue & Lido",
    notes: "Leitor solicitou fatura pró-forma institucional para dedução fiscal."
  },
  {
    id: "tx-2",
    initials: "MK",
    clientName: "Dra. Maria de Fátima Kapela",
    credential: "Diretora de Recursos Humanos",
    phone: "+244 912 884 920",
    location: "Huambo / Cidade Alta",
    province: "Huambo",
    format: "fisico",
    formatLabel: "Livro Físico (Reserva)",
    amountKz: 0,
    amountFormatted: "Reserva Gratuita",
    paymentMethod: "Pague na Entrega",
    paymentStatus: "Reserva Registada",
    time: "Hoje às 13:18",
    emisRef: "Ref: #RES-88190",
    whatsappStatus: "dispatch",
    whatsappStatusLabel: "Reserva Confirmada Huambo",
    notes: "Solicitou autógrafo nominal. Pagamento a efetuar no momento da entrega física."
  },
  {
    id: "tx-3",
    initials: "BC",
    clientName: "Eng. Bernardo Cassoma",
    credential: "Docente Universitário • Benguela",
    phone: "+244 934 112 550",
    location: "Benguela / Restinga",
    province: "Benguela",
    format: "ebook",
    formatLabel: "E-book Digital",
    amountKz: 10500,
    amountFormatted: "Kz 10.500",
    paymentMethod: "Multicaixa Express",
    paymentStatus: "Multicaixa Exp. Pago",
    time: "Hoje às 11:45",
    emisRef: "EMIS Ref: #MCX-88042",
    whatsappStatus: "read",
    whatsappStatusLabel: "E-book Entregue & Lido",
    notes: "Baixou versão PDF HD e ePub em menos de 10 segundos via WhatsApp."
  },
  {
    id: "tx-4",
    initials: "BV",
    clientName: "Beatriz Van-Dúnem",
    credential: "Gestora Financeira • Banco BFA",
    phone: "+244 945 009 214",
    location: "Cunene / Ondjiva",
    province: "Cunene",
    format: "ebook",
    formatLabel: "E-book Digital",
    amountKz: 10500,
    amountFormatted: "Kz 10.500",
    paymentMethod: "Transferência IBAN BAI",
    paymentStatus: "Multicaixa Exp. Pago",
    time: "Hoje às 10:04",
    emisRef: "EMIS Ref: #MCX-87991",
    whatsappStatus: "delivered",
    whatsappStatusLabel: "Despachado (Aguardando Leitura)",
    notes: "Envio de cópia de segurança efetuado também por e-mail."
  },
  {
    id: "tx-5",
    initials: "CQ",
    clientName: "Carlos Quaresma",
    credential: "Empresário • Setor de Energia",
    phone: "+244 928 300 114",
    location: "Luanda / Miramar",
    province: "Luanda",
    format: "fisico",
    formatLabel: "Livro Impresso",
    amountKz: 28500,
    amountFormatted: "Kz 28.500",
    paymentMethod: "Multicaixa Express",
    paymentStatus: "Multicaixa Exp. Pago",
    time: "Ontem às 18:20",
    emisRef: "EMIS Ref: #MCX-87612",
    whatsappStatus: "read",
    whatsappStatusLabel: "Entregue em Mãos (Motoboy)",
    notes: "Entrega expressa realizada no condomínio Miramar com recibo assinado."
  }
];

export const BOOK_SAMPLE_CHAPTERS = [
  {
    id: "introducao",
    number: "Introdução",
    title: "Uma Conversa Franca e de Coração Aberto",
    subtitle: "Amizade após Exoneração • Eng. Dénis Zombo",
    content: `Que alegria imensa ter você aqui comigo, prestes a embarcar numa jornada que promete ser... ah, como descrever? Transformadora, quem sabe? Ou talvez um abraço apertado no momento exato em que você mais precisa.

Sabe, a gente se conhece de algum lugar? Acho que sim. Essa sensação de intimidade, de sentar para um café e jogar conversa fora sobre a vida... é exatamente o que eu quero oferecer a você aqui, neste cantinho que criamos juntos.

Este livro, "Amizade após Exoneração", nasceu de um lugar bem particular, sabe? Daquele que a gente só acessa quando a vida dá aquela chacoalhada mais forte. A gente passa uma vida construindo coisas, pessoas, relações... e aí, de repente, um cargo vai embora, um título se esvai. E o que fica? É aí que a mágica acontece, ou a tempestade, dependendo do nosso olhar. Eu quero te convidar a olhar isso comigo, de um jeito bem honesto, sem filtros.

Vou te contar um segredo: eu mesmo já me peguei pensando, em noites insones, se as amizades que eu cultivava na minha antiga posição eram reais ou se eram apenas reflexos do poder, sabe? Aquela coisa meio... decadente, de ter gente perto só pelo que você representa, e não por quem você é de verdade. É um questionamento profundo, que mexe com a gente lá no fundo. E a gente vai desbravar isso juntos, devagarinho.`
  },
  {
    id: "pagina2",
    number: "Página 2",
    title: "O Mapa dos Capítulos & Reflexões",
    subtitle: "Do ambiente de trabalho ao reencontro com a nossa essência",
    content: `Pense comigo: a gente começa no Capítulo 1, desvendando essa dinâmica meio complexa das relações no trabalho. Quem é amigo de verdade? Quem tá ali só pra cumprir tabela? É impressionante como a hierarquia pode distorcer tudo, né?

E aí, meu amigo, a coisa aperta. O Capítulo 2 fala justamente dessa transição, de quando a gente sai da chefia e cai — ou sobe, quem sabe? — pra um lugar diferente. É um choque, confesso. Senti um frio na barriga só de pensar nisso. A gente se sente meio perdido, reavaliando tudo.

Mas olha que coisa linda: a família. No Capítulo 3, a gente vai falar desse porto seguro. Ah, a família! Como eles são essenciais para a gente não se perder nesse mar revolto. É fundamental incluir nossos amores nessa conversa, sabe? Contar com eles, sentir o apoio. Já vi histórias hilárias e, ao mesmo tempo, tão tocantes de famílias que se uniram pra dar força em momentos assim.

E as amizades genuínas? Ah, essas são um tesouro! No Capítulo 4, vamos aprender a identificar e a valorizar quem fica, quem realmente se importa. São aquelas relações que nos nutrem, que nos fazem sentir vivos. São inspiradoras, sabe? E o mais legal é que elas nos transformam, nos tornam pessoas melhores.

E, falando em ser melhor, o Capítulo 5 é um convite para uma reflexão: a necessidade de ser humano com todos. Não importa o cargo, a posição... ser gentil, ter empatia, ser hospitaleiro. É isso que constrói vínculos verdadeiros, um ambiente reconfortante, onde a gente se sente acolhido.`
  }
];
