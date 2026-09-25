import React, { useState, useRef, useEffect } from 'react';
import { BOOK_METADATA, getStoredBankingConfig, getStoredGallery, GalleryImage } from '../data/bookData';
import { Lead, buildWhatsAppLink } from '../data/leadsData';

interface LandingPageProps {
  onGoToLogin: () => void;
  onOpenReader: () => void;
  onNewLead: (lead: Lead) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onOpenReader,
  onNewLead,
}) => {
  // Checkout form state & refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showMobileBottomBar, setShowMobileBottomBar] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [format, setFormat] = useState<'ebook' | 'fisico'>('ebook');
  const [wantsPhysicalAlert, setWantsPhysicalAlert] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'express' | 'iban' | 'kwik'>('express');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copiedCoordinate, setCopiedCoordinate] = useState<string | null>(null);
  
  // 2-Step Modals for Checkout
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{ url: string; title: string } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => getStoredGallery());

  useEffect(() => {
    const handleGalleryUpdate = (e: any) => {
      if (e.detail) {
        setGalleryImages(e.detail);
      } else {
        setGalleryImages(getStoredGallery());
      }
    };
    window.addEventListener('dzmv_gallery_updated', handleGalleryUpdate);
    window.addEventListener('storage', handleGalleryUpdate);
    return () => {
      window.removeEventListener('dzmv_gallery_updated', handleGalleryUpdate);
      window.removeEventListener('storage', handleGalleryUpdate);
    };
  }, []);

  // Dynamic banking config
  const bankingConfig = getStoredBankingConfig();

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Smooth scroll to form and focus name input with blinking cursor
  const scrollToCheckoutAndFocus = (
    options?: 'ebook' | 'fisico' | { requestPhysicalAlert?: boolean }
  ) => {
    setFormat('ebook');
    if (typeof options === 'object' && options?.requestPhysicalAlert) {
      setWantsPhysicalAlert(true);
    }
    const checkoutEl = document.getElementById('comprar-agora');
    if (checkoutEl) {
      checkoutEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus({ preventScroll: true });
        const valLen = nameInputRef.current.value.length;
        nameInputRef.current.setSelectionRange(valLen, valLen);
      }
    }, 450);
  };

  const copyCoordinateText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCoordinate(label);
    setTimeout(() => setCopiedCoordinate(null), 3000);
  };

  // Only show mobile bottom bar when scrolled AND no buy button/checkout form is in viewport
  useEffect(() => {
    const handleScrollAndVisibility = () => {
      // Don't show right at the top
      if (window.scrollY < 180) {
        setShowMobileBottomBar(false);
        return;
      }

      const formEl = document.getElementById('comprar-agora');
      const heroBuyEl = document.getElementById('hero-buy-btn');
      const formatosCtaEl = document.getElementById('formatos-cta');

      const isElementInView = (el: HTMLElement | null) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight - 30 && rect.bottom > 30;
      };

      const isAnyBuyActionVisible =
        isElementInView(formEl) ||
        isElementInView(heroBuyEl) ||
        isElementInView(formatosCtaEl);

      setShowMobileBottomBar(!isAnyBuyActionVisible);
    };

    window.addEventListener('scroll', handleScrollAndVisibility, { passive: true });
    window.addEventListener('resize', handleScrollAndVisibility, { passive: true });
    handleScrollAndVisibility();

    return () => {
      window.removeEventListener('scroll', handleScrollAndVisibility);
      window.removeEventListener('resize', handleScrollAndVisibility);
    };
  }, []);

  const handleInitiateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !whatsapp.trim()) return;
    setShowSummaryModal(true);
  };

  const handleEditData = () => {
    setShowSummaryModal(false);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleConfirmData = () => {
    setIsProcessing(true);

    const price = BOOK_METADATA.prices.ebookKz;
    const priceFormatted = BOOK_METADATA.prices.ebookFormatted;
    const cleanPhone = whatsapp.startsWith('+244') ? whatsapp : `+244 ${whatsapp.trim()}`;
    const paymentMethodLabel = paymentMethod === 'express' 
      ? 'Multicaixa Express' 
      : paymentMethod === 'iban' 
      ? 'Transferência IBAN' 
      : 'Transferência KWIK';

    // 1. Build the personalized WhatsApp message URL
    const whatsappUrl = buildWhatsAppLink(fullName, email, cleanPhone, province, 'ebook', wantsPhysicalAlert, paymentMethodLabel);
    setSubmittedWhatsAppUrl(whatsappUrl);

    // 2. Register lead
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: cleanPhone,
      province: province,
      format: 'ebook',
      formatLabel: 'E-book Digital (PDF + ePub)',
      amountKz: price,
      amountFormatted: priceFormatted,
      paymentMethod: paymentMethodLabel,
      status: 'novo',
      statusLabel: 'Novo Lead',
      createdAt: 'Agora mesmo',
      timestamp: Date.now(),
      notes: wantsPhysicalAlert
        ? `Pagamento: ${paymentMethodLabel}. Solicitou aviso da versão física.`
        : `Pagamento: ${paymentMethodLabel}. Aquisição oficial do E-book.`,
      whatsappMessageSent: true,
      wantsPhysicalAlert: wantsPhysicalAlert,
    };

    setTimeout(() => {
      onNewLead(newLead);
      setIsProcessing(false);
      setShowSummaryModal(false);
      setShowWhatsAppModal(true);
    }, 400);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  return (
    <div className="w-full bg-[#FBFBFE] font-sans text-[#141B2B] antialiased">
      {/* TOP ANNOUNCEMENT RIBBON */}
      <div className="w-full bg-[#0B0F19] text-white py-2.5 px-4 sm:px-6 border-b border-white/10 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 mx-auto md:mx-0">
            <span className="inline-flex w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-bold tracking-widest uppercase text-amber-300 text-[11px]">
              Lançamento Oficial DZMV 2025
            </span>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="text-slate-200 text-xs font-medium hidden sm:inline">
              Edição Oficial Editora Sábhia • Despacho Imediato em PDF + ePub no WhatsApp
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-300">lock</span>
              Ambiente Seguro DZMV
            </span>
            <span className="text-white/20">|</span>
            <span className="font-semibold text-amber-300">Pagamento em Kwanza (Kz)</span>
          </div>
        </div>
      </div>

      {/* HEADER BAR */}
      <header className="sticky top-0 left-0 right-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="h-16 sm:h-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 flex items-center justify-between gap-2 sm:gap-6">
          {/* Brand Crest: DZMV as Top Brand + Editora Sábhia badge */}
          <a href="#" className="flex items-center gap-2 sm:gap-3.5 group shrink-0">
            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#0B0F19] text-amber-400 flex items-center justify-center font-serif-editorial text-base sm:text-xl font-bold tracking-wider shadow-xs group-hover:bg-amber-700 group-hover:text-white transition-colors">
              DZMV
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-900 tracking-tight sm:tracking-wide">
                Lançamento Oficial
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-800 tracking-tight sm:tracking-wide">
                Edição: Editora Sábhia
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-[11px] xl:text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
            <a href="#a-obra" className="hover:text-amber-800 transition-colors">A Obra</a>
            <a href="#formatos" className="hover:text-amber-800 transition-colors">Formatos & Preços</a>
            <a href="#sobre-o-autor" className="hover:text-amber-800 transition-colors">O Autor</a>
            <a href="#faq" className="hover:text-amber-800 transition-colors">Dúvidas</a>
          </nav>

          {/* Action Group */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => scrollToCheckoutAndFocus('ebook')}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-amber-600 text-white text-xs sm:text-sm font-bold hover:bg-amber-700 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">shopping_cart</span>
              <span className="whitespace-nowrap">Comprar E-book</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FBFBFE] via-[#F4F6FC] to-[#FBFBFE] py-16 lg:py-24" id="a-obra">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2.5 w-fit px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <span className="material-symbols-outlined text-[18px] text-amber-600">verified</span>
              <span className="text-amber-900 uppercase tracking-widest text-xs font-bold">
                Lançamento Oficial DZMV
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 text-xs tracking-wide uppercase font-semibold">
                Edição Editora Sábhia 2025
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <h1 className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl text-[#0B0F19] tracking-tight font-bold leading-tight">
                {BOOK_METADATA.title}
              </h1>
              <p className="font-serif-editorial text-xl sm:text-2xl text-amber-800 italic font-medium leading-snug">
                {BOOK_METADATA.subtitle}
              </p>
            </div>

            {/* MOBILE ONLY: 3D Book Showcase Right Below Title & Subtitle */}
            <div className="block lg:hidden my-1">
              <div className="relative w-full max-w-xs sm:max-w-sm mx-auto group">
                <div className="absolute -inset-3 bg-gradient-to-tr from-amber-500/20 via-amber-400/15 to-slate-900/10 rounded-2xl blur-xl opacity-80"></div>
                <div className="relative bg-white rounded-2xl p-4 shadow-xl border border-slate-200">
                  <img
                    src={BOOK_METADATA.images.mockup3D}
                    alt="Livro 3D Amizade após Exoneração - Eng. Dénis Zombo"
                    className="w-full h-auto object-cover rounded-xl"
                  />
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                    <span className="flex items-center gap-1 text-amber-700 font-bold">
                      <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                      E-book + Impresso 2025
                    </span>
                    <span>{BOOK_METADATA.authorShort}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-2xl">
              Uma reflexão profunda sobre as relações construídas no ambiente profissional e sobre o que acontece quando uma posição de liderança chega ao fim. O <strong className="text-slate-900 font-semibold">{BOOK_METADATA.author}</strong> apresenta um guia sobre quem permanece ao nosso lado quando deixamos de ter autoridade ou um cargo de chefia, distinguindo aproximações por interesse de amizades genuínas.
            </p>

            {/* Investment & Conversion Bar */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 my-2">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                  Preço Promocional de Lançamento
                </span>
                <div className="flex items-baseline gap-2.5 sm:gap-3 mt-1.5 flex-wrap">
                  <span className="font-mono text-2xl sm:text-3xl lg:text-4xl text-[#0B0F19] font-bold whitespace-nowrap">
                    {BOOK_METADATA.prices.ebookFormatted}
                  </span>
                  <span className="text-sm sm:text-base line-through text-slate-400 font-medium whitespace-nowrap">
                    {BOOK_METADATA.prices.ebookOriginalFormatted}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-900 tracking-wide shrink-0 whitespace-nowrap">
                    -42% OFF
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="hero-buy-btn"
                  onClick={() => scrollToCheckoutAndFocus('ebook')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-all shadow-md text-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Comprar E-book Agora</span>
                </button>
                <button
                  onClick={onOpenReader}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200 transition-all text-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                  <span>Ler Amostra Gratuita</span>
                </button>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                </div>
                <span className="font-semibold text-slate-900">4.9/5 em Angola</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">chat</span>
                <span>Finalização Direta no WhatsApp</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-amber-600">mark_email_read</span>
                <span>Cópia Segura por E-mail</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Hardcover Mockup (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center relative">
            <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-none group">
              <div className="absolute -inset-6 bg-gradient-to-tr from-amber-500/15 via-amber-400/10 to-slate-900/10 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-700"></div>

              <div className="relative bg-white rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_-12px_rgba(11,15,25,0.18)] border border-slate-200 transition-transform duration-500 group-hover:-translate-y-1">
                <div className="relative overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center">
                  <img
                    src={BOOK_METADATA.images.mockup3D}
                    alt="Livro 3D Amizade após Exoneração - Eng. Dénis Zombo"
                    className="w-full h-auto object-cover object-center transform transition duration-700 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">auto_stories</span>
                    <span className="text-[11px] uppercase font-bold tracking-wider">
                      Edição Oficial com Orelhas & E-book
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900">{BOOK_METADATA.authorShort}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: EDITORIAL PHILOSOPHY & QUOTE */}
      <section className="w-full bg-[#111726] text-white py-20 px-6 lg:px-12 border-y border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6 relative">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-2xl">format_quote</span>
          </div>

          <blockquote className="font-serif-editorial text-2xl sm:text-3xl md:text-4xl italic text-white leading-relaxed">
            “{BOOK_METADATA.quote}”
          </blockquote>

          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-1"></div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-amber-300">
              {BOOK_METADATA.author}
            </span>
            <span className="text-xs text-slate-400">
              Amizade após Exoneração • Capítulo Fundamental
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 5 & 6: UNIFIED HIGH-CONVERTING CHECKOUT SECTION */}
      <section className="w-full py-20 lg:py-24 px-6 lg:px-12 bg-gradient-to-b from-white via-slate-50 to-white" id="formatos">
        <div className="max-w-3xl mx-auto flex flex-col gap-8" id="comprar-agora">
          {/* Back Cover Highlights (A Mensagem Central do Livro) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-50 via-slate-50 to-amber-50/40 border border-amber-200/90 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-700 text-2xl">menu_book</span>
              <div>
                <span className="text-xs uppercase font-bold text-amber-900 block">Síntese da Contracapa</span>
                <h3 className="font-serif-editorial text-xl font-bold text-slate-900">
                  O Que o Livro Aborda e Transforma no Leitor
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
              {BOOK_METADATA.backCoverPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">check_circle</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Edição Digital Oficial • Formato & Aquisição
            </span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl text-[#0B0F19] tracking-tight font-bold">
              Garantir o Seu E-book Interativo
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Preencha os seus dados de contacto para registo da encomenda e receba o ficheiro diretamente no seu WhatsApp com garantia editorial.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-6">
            <form onSubmit={handleInitiateRegistration} className="space-y-6">
              {/* Formato Selecionado: Foco 100% no E-book Digital */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-amber-50/40 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <img
                    src={BOOK_METADATA.images.secondaryCover}
                    alt="Edição do Livro Amizade após Exoneração"
                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl shadow-md border border-amber-300/80 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-amber-900">
                        Item Selecionado
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 uppercase tracking-wide whitespace-nowrap">
                        PDF HD + ePub Fluído
                      </span>
                    </div>
                    <strong className="text-base sm:text-lg text-slate-900 block leading-snug font-serif-editorial">
                      E-book Digital Completo
                    </strong>
                    <span className="text-xs text-slate-600 block leading-normal">
                      Envio imediato no WhatsApp e para o seu e-mail
                    </span>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 line-through block font-medium">
                    18.000 Kz
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold text-amber-900 block">
                    8.500 Kz
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800" htmlFor="order-name">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                    person
                  </span>
                  <input
                    ref={nameInputRef}
                    id="order-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Dr. António Manuel dos Santos"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="order-email">
                    Seu E-mail para Contacto *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                      mail
                    </span>
                    <input
                      id="order-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@dominio.ao"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="order-phone">
                    WhatsApp para Envio dos Ficheiros *
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-amber-500 bg-slate-50">
                    <span className="inline-flex items-center px-3.5 bg-slate-100 text-slate-900 font-semibold text-sm border-r border-slate-300 shrink-0">
                      🇦🇴 +244
                    </span>
                    <input
                      id="order-phone"
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="923 000 000"
                      className="w-full px-3.5 py-3 bg-transparent text-sm text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox: Desejo ser avisado quando o livro físico estiver pronto */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 transition-all hover:bg-amber-50">
                <label className="flex items-start gap-3.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wantsPhysicalAlert}
                    onChange={(e) => setWantsPhysicalAlert(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-1 accent-amber-600 cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col text-xs text-slate-700 min-w-0">
                    <span className="font-bold text-slate-900 text-sm flex items-start sm:items-center gap-2 leading-snug">
                      <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5 sm:mt-0">notifications_active</span>
                      <span>Desejo ser avisado(a) quando o Livro Físico Impresso estiver pronto</span>
                    </span>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      Será notificado(a) gratuitamente via WhatsApp assim que a edição impressa estiver disponível.
                    </p>
                  </div>
                </label>
              </div>

              {/* Recap Bar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={BOOK_METADATA.images.secondaryCover}
                    alt="E-book Amizade após Exoneração"
                    className="w-10 h-14 object-cover rounded-lg shadow-2xs border border-slate-300 shrink-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Amizade após Exoneração • E-book Digital
                    </span>
                    <span className="text-xs text-slate-500">
                      {BOOK_METADATA.author} {wantsPhysicalAlert ? '• (+ Alerta Livro Físico Ativado)' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 block">
                    {BOOK_METADATA.prices.ebookFormatted}
                  </span>
                </div>
              </div>

              {/* SUBMIT BUTTON TO OPEN SUMMARY REVIEW MODAL */}
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer hover:shadow-lg"
              >
                <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                <span>Avançar para Registo</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>

              <p className="text-xs text-slate-500 text-center">
                * Ao clicar, irá rever os seus dados e selecionar o método de pagamento no passo seguinte.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* MODAL 1: RESUMO & CONFIRMAÇÃO DE DADOS */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0B0F19] text-white p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                  1/2
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Passo 1: Confirmação de Dados</h3>
                  <p className="text-xs text-slate-300">Confirme as suas informações antes do pagamento</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Body: Customer Data Summary */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 divide-y divide-slate-200/80 text-xs sm:text-sm">
                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">person</span>
                    Nome Completo:
                  </span>
                  <strong className="text-slate-900 text-right truncate">{fullName}</strong>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">mail</span>
                    E-mail:
                  </span>
                  <strong className="text-slate-900 text-right font-mono truncate">{email}</strong>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">call</span>
                    WhatsApp:
                  </span>
                  <strong className="text-slate-900 text-right font-mono">
                    {whatsapp.startsWith('+244') ? whatsapp : `+244 ${whatsapp}`}
                  </strong>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">menu_book</span>
                    Produto / Item:
                  </span>
                  <strong className="text-slate-900 text-right">E-book Digital (PDF HD + ePub)</strong>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">payments</span>
                    Valor Total:
                  </span>
                  <strong className="text-slate-900 font-mono text-base font-bold text-amber-800">
                    {BOOK_METADATA.prices.ebookFormatted}
                  </strong>
                </div>

                {wantsPhysicalAlert && (
                  <div className="py-2.5 flex justify-between items-center gap-3 bg-amber-50/70 -mx-4 px-4 rounded-b-xl">
                    <span className="text-amber-900 flex items-center gap-1.5 font-medium text-xs">
                      <span className="material-symbols-outlined text-base text-amber-700">notifications_active</span>
                      Aviso Livro Físico:
                    </span>
                    <strong className="text-emerald-700 text-xs font-bold">✓ Ativado (Sem custo agora)</strong>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg shrink-0 mt-0.5">info</span>
                <p>
                  Ao confirmar, o seu registo será guardado e abrirá a página com as opções de pagamento (Express, IBAN, KWIK).
                </p>
              </div>
            </div>

            {/* Modal Actions: Edit vs Confirm */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleEditData}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Editar Dados</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmData}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>A Processar...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar & Escolher Pagamento</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAGAMENTO & FINALIZAÇÃO VIA WHATSAPP */}
      {showWhatsAppModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0B0F19] text-white p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                  2/2
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Passo 2: Dados de Pagamento 🇦🇴</h3>
                  <p className="text-xs text-slate-300">Escolha como pretende efetuar o pagamento de {BOOK_METADATA.prices.ebookFormatted}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block">
                  Selecione o Método de Pagamento:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('express')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'express'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30 font-bold text-amber-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">Multicaixa Express</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Telemóvel Imediato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('iban')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'iban'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30 font-bold text-amber-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">Transferência IBAN</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">BAI, BFA ou Outros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('kwik')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === 'kwik'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30 font-bold text-amber-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">Transferência KWIK</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">NIB / Rede EMIS</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Box for Reference */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">account_balance_wallet</span>
                    Coordenadas: {paymentMethod === 'express' ? 'Multicaixa Express' : paymentMethod === 'iban' ? 'IBAN Oficial' : 'KWIK'}
                  </span>
                  {copiedCoordinate && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-fade-in">
                      {copiedCoordinate} copiado!
                    </span>
                  )}
                </div>

                {paymentMethod === 'express' ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Telemóvel Multicaixa Express:</span>
                      <strong className="font-mono text-sm sm:text-base text-slate-900">{bankingConfig.mcxPhone}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCoordinateText(bankingConfig.mcxPhone, 'Número Express')}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span>Copiar Número</span>
                    </button>
                  </div>
                ) : paymentMethod === 'iban' ? (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">IBAN Oficial DZMV:</span>
                        <strong className="font-mono text-xs sm:text-sm text-slate-900">{bankingConfig.iban}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCoordinateText(bankingConfig.iban, 'IBAN')}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>Copiar IBAN</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span>Banco: <strong>{bankingConfig.bank}</strong></span>
                      <span>Beneficiário: <strong>{bankingConfig.beneficiary}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">NIB / Telemóvel KWIK:</span>
                        <strong className="font-mono text-xs sm:text-sm text-slate-900">{bankingConfig.kwikNibOrPhone}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCoordinateText(bankingConfig.kwikNibOrPhone, 'KWIK')}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        <span>Copiar KWIK</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span>Nome: <strong>{bankingConfig.kwikAccountName}</strong></span>
                      <span>Rede: <strong>{bankingConfig.kwikBank}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Prominent Observation Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300/80 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-amber-700 text-xl">warning</span>
                  <span>Observação Importante:</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                  Após efetuar o pagamento, por favor <strong>anexe o comprovativo</strong> na conversa do WhatsApp para que a equipa oficial DZMV possa validar e aprovar o envio imediato do seu <strong>E-book (PDF HD + ePub)</strong>.
                </p>
              </div>

              {/* Big Finalize on WhatsApp Button */}
              <a
                href={buildWhatsAppLink(
                  fullName,
                  email,
                  whatsapp.startsWith('+244') ? whatsapp : `+244 ${whatsapp.trim()}`,
                  province,
                  'ebook',
                  wantsPhysicalAlert,
                  paymentMethod === 'express' 
                    ? 'Multicaixa Express' 
                    : paymentMethod === 'iban' 
                    ? 'Transferência IBAN' 
                    : 'Transferência KWIK'
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppModal(false)}
                className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3 text-center cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Já Paguei • Finalizar no WhatsApp</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Atendimento Oficial DZMV • Editora Sábhia</span>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: ABOUT THE AUTHOR & BOOK CONTEXT */}
      <section className="w-full py-20 lg:py-24 px-6 lg:px-12 bg-white" id="sobre-o-autor">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          {/* Header & Author Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Photo & Badges */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative rounded-3xl overflow-hidden bg-[#0B0F19] p-3 shadow-xl">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 relative flex items-center justify-center">
                  <img
                    src={BOOK_METADATA.images.authorPortrait}
                    alt={BOOK_METADATA.author}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-85"></div>
                  <div className="absolute bottom-6 left-6 right-6 flex flex-col text-white">
                    <span className="font-serif-editorial font-bold text-xl sm:text-2xl">{BOOK_METADATA.author}</span>
                    <span className="text-amber-300 text-xs uppercase tracking-wider font-semibold mt-1">
                      Especialista em Electromedicina & Gestão Hospitalar
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Role Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs text-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0">local_hospital</span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">Cargo Atual</span>
                    <strong className="text-slate-900 text-xs sm:text-sm block">Director Técnico • Hospital Geral do Cunene</strong>
                  </div>
                </div>
                <span className="text-amber-800 font-bold text-xs bg-amber-200/80 px-2 py-1 rounded-md shrink-0">Desde Aug/2024</span>
              </div>

              {/* Academic Background Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-amber-700 text-xl">school</span>
                  <span>Formação Académica</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {BOOK_METADATA.academicBackground.map((degree, idx) => (
                    <li key={idx} className="flex items-start gap-2 border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                      <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5 shrink-0">verified</span>
                      <div>
                        <strong className="text-slate-900 block font-semibold">{degree.title}</strong>
                        <span className="text-slate-500 block">{degree.institution} ({degree.year})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Biography & Mission Statement */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
                  Biografia & Trajetória Oficial
                </span>
                <h2 className="font-serif-editorial text-3xl sm:text-4xl text-[#0B0F19] tracking-tight font-bold">
                  {BOOK_METADATA.author}
                </h2>
              </div>

              <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                <p>
                  O <strong className="text-slate-900 font-semibold">{BOOK_METADATA.author}</strong> possui uma vasta e sólida experiência no sector da saúde pública em Angola, aliando profundos conhecimentos técnicos em <strong className="text-slate-900 font-semibold">Electromedicina</strong> à <strong className="text-slate-900 font-semibold">Gestão Administrativa</strong> e à liderança institucional de topo, com forte atuação em saúde comunitária e gestão de recursos humanos.
                </p>
                <p>
                  Ao longo de quase duas décadas de dedicação ao serviço público, atuou em posições de grande responsabilidade e liderança nas províncias do <strong className="text-slate-900 font-semibold">Huambo, Bié e Cunene</strong> — tendo exercido como Director Municipal de Saúde do Longonjo, Assessor do Gabinete Provincial de Saúde do Huambo, e atualmente como Director Técnico do Hospital Geral do Cunene.
                </p>
                <p className="p-4 rounded-2xl bg-[#0B0F19] text-white text-xs sm:text-sm font-serif-editorial italic leading-relaxed border-l-4 border-amber-500">
                  “O livro não fala apenas de exoneração de um cargo. A proposta é discutir abertamente quem permanece ao nosso lado quando deixamos de ter poder, autoridade ou uma posição de chefia, distinguindo relações baseadas em interesse profissional de relações pautadas por amizade verdadeira.”
                </p>
              </div>

              {/* Formações Complementares Badges */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Formações Complementares & Especializações:
                </span>
                <div className="flex flex-wrap gap-2">
                  {BOOK_METADATA.complementaryTrainings.map((course, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200/80 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-amber-700 text-sm">workspace_premium</span>
                      {course}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200">
                <div className="flex flex-col space-y-1">
                  <span className="font-serif-editorial italic text-slate-900 text-sm sm:text-base leading-snug">
                    “Quando a exoneração encerra um ciclo, mas não interrompe os laços que constroem o futuro.”
                  </span>
                  <span className="text-xs text-amber-700 font-bold">— Engenheiro Dénis Zombo</span>
                </div>
                <img
                  src={BOOK_METADATA.images.authorSignature}
                  alt="Assinatura de Dénis Zombo"
                  className="h-10 sm:h-12 w-auto opacity-80 object-contain shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Detailed Professional Experience Timeline (10 Official Roles) */}
          <div className="pt-8 border-t border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block">
                  Histórico Profissional Detalhado
                </span>
                <h3 className="font-serif-editorial text-2xl font-bold text-slate-900">
                  Percurso Profissional & Cargos de Liderança
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                10 Cargos Registados • Experiência Institucional Comprovada
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BOOK_METADATA.professionalExperience.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 transition-colors flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                      <span>#{idx + 1} • {exp.period}</span>
                    </div>
                    <strong className="text-sm font-bold text-slate-900 block leading-snug">
                      {exp.role}
                    </strong>
                    <span className="text-xs text-slate-600 block flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                      {exp.place}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 8: TESTIMONIALS */}
      <section className="w-full py-20 lg:py-24 px-6 lg:px-12 bg-[#F5F6FC] border-y border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Repercussão & Leitura Crítica
            </span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl text-[#0B0F19] font-bold">
              O Que Dizem os Líderes em Angola
            </h2>
            <p className="text-sm text-slate-600">
              Depoimentos de gestores públicos, profissionais de saúde e quadros executivos em Luanda e nas províncias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-500">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  “Li o e-book em uma única madrugada. É um bálsamo para quem já viveu a dor da exoneração e viu colegas de ontem fingirem que não nos conhecem hoje. O Eng. Dénis escreve com a coragem da verdade.”
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-900 text-xs">
                  AM
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Dr. A. Morais</span>
                  <span className="text-xs text-slate-500">Ex-Diretor Provincial de Saúde, Huambo</span>
                </div>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-500">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  “Todo dirigente público em Angola deveria ter este livro sobre a secretária antes de assinar o primeiro despacho. Ensina-nos a nunca nos embriagarmos pelo cargo, pois o cargo é passageiro, a honra é eterna.”
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-900 text-xs">
                  EC
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Eng.ª Esperança Costa</span>
                  <span className="text-xs text-slate-500">Consultora de Gestão de Ativos, Luanda</span>
                </div>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex text-amber-500">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="material-symbols-outlined text-[18px]">star</span>
                </div>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  “Recebi o ficheiro no WhatsApp segundos após enviar o comprovativo do MCX Express. Diagramação impecável, leitura fluída e profunda. O capítulo sobre Recomeços vale dez vezes o valor do e-book.”
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-900 text-xs">
                  JV
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Joaquim Valente</span>
                  <span className="text-xs text-slate-500">Administrador Hospitalar, Cunene</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALERIA DE IMAGENS & VIVÊNCIAS DA OBRA */}
      <section className="w-full bg-[#070A12] text-white py-14 overflow-hidden border-t border-white/10 relative select-none">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>Galeria de Imagens & Vivências</span>
            </div>
            <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Eng. Denis Zombo Mendonça Vasco em Registos Oficiais
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Momentos de liderança, trajetória institucional e bastidores da obra. Passe o cursor ou toque para ver em detalhe.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-amber-400 text-sm">swipe</span>
              <span>Arrastamento suave contínuo (Direita ➔ Esquerda)</span>
            </span>
          </div>
        </div>

        {/* Marquee Carousel Container: moving smoothly from Right to Left */}
        <div className="relative w-full overflow-hidden group">
          {/* Subtle gradient edges for professional blending */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-[#070A12] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-[#070A12] to-transparent z-10 pointer-events-none"></div>

          {/* Marquee Track (Repeated twice for continuous infinite flow) */}
          <div className="animate-marquee-rtl flex items-center gap-4 sm:gap-6 py-2">
            {[...galleryImages, ...galleryImages].map((img, index) => (
              <div
                key={`${img.id}-${index}`}
                onClick={() => setSelectedGalleryImage(img)}
                className="relative w-40 sm:w-52 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-white/15 shadow-lg group/item cursor-pointer shrink-0 transition-transform duration-300 hover:scale-105 hover:border-amber-400 hover:shadow-amber-500/10 hover:shadow-2xl"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transform transition duration-500 group-hover/item:scale-110"
                />
                
                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-75 group-hover/item:opacity-90 transition-opacity"></div>

                {/* Overlay Caption & Zoom Icon */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">person</span>
                    Dénis Zombo
                  </span>
                  <span className="text-xs font-semibold text-white/95 truncate leading-snug mt-0.5">
                    {img.title.replace(/Ângelo/gi, 'Zombo').replace(/Angelo/gi, 'Zombo')}
                  </span>
                </div>

                {/* Hover zoom indicator icon */}
                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white/90 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-sm">zoom_in</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: 14-DAY GUARANTEE */}
      <section className="w-full py-16 px-6 lg:px-12 bg-white">
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-50 border border-slate-200 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0 w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-3xl">verified_user</span>
          </div>
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Compromisso Veritas Press
            </span>
            <h3 className="font-serif-editorial text-2xl font-bold text-slate-900">
              Garantia Editorial de 14 Dias
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Se nas primeiras duas semanas após a leitura você sentir que os ensinamentos, análises comportamentais e os 4 pilares não agregaram valor real ao seu discernimento humano e liderança, basta enviar uma mensagem e efetuamos o reembolso integral do seu investimento.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 10: FAQ */}
      <section className="w-full py-20 px-6 lg:px-12 bg-[#F5F6FC] border-t border-slate-200" id="faq">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Esclarecimento Direto
            </span>
            <h2 className="font-serif-editorial text-3xl font-bold text-[#0B0F19]">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Como e quando recebo o e-book após o pagamento?',
                a: 'O envio é imediato. Ao clicar em finalizar compra, o seu pedido é registado e o WhatsApp oficial abre com os dados. Após validar o pagamento via Multicaixa Express, KWIK ou IBAN, o atendente despacha os links diretos para download do PDF HD e ePub.'
              },
              {
                q: 'Posso ler no meu telemóvel Android, iPhone ou computador?',
                a: 'Sim. A obra foi diagramada no formato duplo: PDF de Alta Resolução (ideal para computadores e tablets) e formato ePub adaptativo (para telemóveis Android, iPhones e leitores digitais Kindle/Kobo).'
              },
              {
                q: 'Como funciona a reserva da edição física impressa?',
                a: 'A reserva do livro físico é 100% gratuita neste período de pré-venda. A obra física está em fase de produção gráfica e revisão. Ao submeter o formulário de reserva gratuita, o seu nome entra na lista prioritária para receber o exemplar com autógrafo nominal do Eng. Denis Zombo. Você só efetuará o pagamento depois de o livro estar impresso e pronto para entrega!'
              },
              {
                q: 'Quais são os bancos disponíveis para transferência?',
                a: 'Dispomos de contas institucionais no BAI e BFA, além do canal direto via Multicaixa Express e KWIK através do número autorizado +244 923 884 120.'
              }
            ].map((faq, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-slate-200 transition-all cursor-pointer"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex items-center justify-between font-semibold text-slate-900 text-sm sm:text-base">
                  <span>{faq.q}</span>
                  <span className={`material-symbols-outlined text-amber-700 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
                {openFaq === i && (
                  <p className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEDICATED SECONDARY COVER SHOWCASE SECTION (Between FAQ and Final Banner) */}
      <section className="w-full py-16 px-6 lg:px-12 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0B0F19] via-[#141B2B] to-[#1E293B] rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden border border-amber-500/20">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Secondary Cover Image */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 to-amber-700/30 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <img
                  src={BOOK_METADATA.images.secondaryCover}
                  alt="Capa Secundária - Amizade após Exoneração"
                  className="relative w-48 sm:w-56 md:w-64 h-auto object-cover rounded-2xl shadow-2xl border border-amber-400/40 transform group-hover:scale-[1.02] transition duration-500"
                />
              </div>
            </div>

            {/* Description & Details */}
            <div className="md:col-span-7 flex flex-col gap-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider w-fit mx-auto md:mx-0">
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Edição Especial • Arte Complementar</span>
              </div>

              <h3 className="font-serif-editorial text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                Amizade após Exoneração
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Arte complementar da capa oficial do livro, desenvolvida para ilustrar a transição da liderança e o valor inegociável da lealdade humana.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                <button
                  onClick={() => scrollToCheckoutAndFocus('ebook')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  <span>Comprar E-book Agora ({BOOK_METADATA.prices.ebookFormatted})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* LIGHTBOX MODAL FOR GALLERY PREVIEW */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#0B0F19] rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">photo</span>
                <span className="text-sm font-bold truncate">
                  {selectedGalleryImage.title.replace(/Ângelo/gi, 'Zombo').replace(/Angelo/gi, 'Zombo')}
                </span>
              </div>
              <button
                onClick={() => setSelectedGalleryImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Lightbox Full Picture */}
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black">
              <img
                src={selectedGalleryImage.url}
                alt={selectedGalleryImage.title}
                className="max-h-[75vh] w-auto object-contain mx-auto"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-amber-300">Eng. Dénis Zombo Mendonça Vasco • Fotografia Oficial</span>
              <button
                onClick={() => setSelectedGalleryImage(null)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFINED FOOTER */}
      <footer className="w-full bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="flex items-center gap-2">
              <span className="font-serif-editorial text-lg text-slate-900 font-bold">
                DZMV • {BOOK_METADATA.title}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-amber-800 font-semibold">{BOOK_METADATA.author}</span>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Lançamento e distribuição oficial DZMV. Edição, diagramação e revisão técnica da Editora Sábhia Angola.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 text-xs text-slate-500">
            {/* Exclusive Administrator Access Button at Footer */}
            <button
              onClick={onGoToLogin}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs transition-colors flex items-center gap-2 border border-slate-200 cursor-pointer shadow-2xs"
              title="Acesso reservado apenas para administradores e equipa editorial"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-700">admin_panel_settings</span>
              <span>Área Administrativa (Acesso Reservado)</span>
            </button>
            <p>© 2025 DZMV. Todos os direitos reservados • Edição Editora Sábhia Angola.</p>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON (Compact & Collapsible) */}
      <aside aria-label="Apoio ao Leitor WhatsApp" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 md:z-50 flex items-center">
        <a
          href="https://wa.me/244923884120?text=Ol%C3%A1%2C%20Editora%20S%C3%A1bhia!%20Gostaria%20de%20saber%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20livro%20'Amizade%20ap%C3%B3s%20Exonera%C3%A7%C3%A3o'%20do%20Eng.%20D%C3%A9nis%20Zombo."
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-start gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 p-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 max-w-[48px] hover:max-w-[280px] overflow-hidden whitespace-nowrap"
          title="Dúvidas? Fale connosco pelo WhatsApp"
        >
          <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span className="font-bold text-xs sm:text-sm tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 pr-2">
            Dúvidas? Fale no WhatsApp
          </span>
        </a>
      </aside>

      {/* MOBILE STICKY FLOATING BUY BAR (Follows user on mobile, only appears when no buy action is in viewport) */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ${
          showMobileBottomBar
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              E-book Oficial
            </span>
            <span className="font-mono text-base font-bold text-slate-900 leading-tight">
              8.500 Kz
            </span>
          </div>

          <button
            onClick={() => scrollToCheckoutAndFocus('ebook')}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Comprar E-book</span>
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
