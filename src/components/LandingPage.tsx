import React, { useState, useRef, useEffect } from 'react';
import { BOOK_METADATA, BankingConfig, getStoredBankingConfig, getStoredGallery, GalleryImage } from '../data/bookData';
import { Lead, buildWhatsAppLink } from '../data/leadsData';
import { loadGalleryFromFirestore, subscribeToGallery } from '../services/firebaseGallery';
import { loadBankingFromFirestore, subscribeToBanking } from '../services/firebaseBanking';

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
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [showMobileBottomBar, setShowMobileBottomBar] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [deliveryAddress, setDeliveryAddress] = useState('');
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
    // 1. Initial sync with Firestore cloud database
    loadGalleryFromFirestore().then((imgs) => {
      if (imgs && imgs.length > 0) {
        setGalleryImages(imgs);
      }
    });

    // 2. Real-time subscription to cloud gallery changes
    const unsub = subscribeToGallery((imgs) => {
      if (imgs && imgs.length > 0) {
        setGalleryImages(imgs);
      }
    });

    // 3. Fallback for cross-tab local updates
    const handleGalleryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setGalleryImages(e.detail);
      } else {
        setGalleryImages(getStoredGallery());
      }
    };
    window.addEventListener('dzmv_gallery_updated', handleGalleryUpdate);
    window.addEventListener('storage', handleGalleryUpdate);

    return () => {
      unsub();
      window.removeEventListener('dzmv_gallery_updated', handleGalleryUpdate);
      window.removeEventListener('storage', handleGalleryUpdate);
    };
  }, []);

  // Dynamic banking config synchronized in real-time with Cloud Firestore
  const [bankingConfig, setBankingConfig] = useState<BankingConfig>(getStoredBankingConfig);

  useEffect(() => {
    loadBankingFromFirestore().then((cfg) => {
      if (cfg) setBankingConfig(cfg);
    });

    const unsub = subscribeToBanking((cfg) => {
      if (cfg) setBankingConfig(cfg);
    });

    return () => unsub();
  }, []);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Smooth scroll directly to name input and focus with blinking cursor
  const scrollToCheckoutAndFocus = (
    options?: 'ebook' | 'fisico' | { requestPhysicalAlert?: boolean }
  ) => {
    if (options === 'fisico') {
      setFormat('fisico');
    } else if (options === 'ebook') {
      setFormat('ebook');
    }
    if (typeof options === 'object' && options?.requestPhysicalAlert) {
      setWantsPhysicalAlert(true);
    }

    const nameEl = document.getElementById('campo-nome') || nameInputRef.current || document.getElementById('order-name');
    if (nameEl) {
      nameEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const checkoutEl = document.getElementById('comprar-agora');
      if (checkoutEl) {
        checkoutEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
    if (format === 'fisico' && !deliveryAddress.trim()) {
      if (addressInputRef.current) {
        addressInputRef.current.focus();
      }
      return;
    }
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

    const isPhysical = format === 'fisico';
    const price = isPhysical ? BOOK_METADATA.prices.physicalKz : BOOK_METADATA.prices.ebookKz;
    const priceFormatted = isPhysical ? '10.000 Kz' : BOOK_METADATA.prices.ebookFormatted;
    const formatLabelText = isPhysical ? 'Livro Físico Impresso (Com Capa & Orelhas)' : 'E-book Digital (PDF + ePub)';

    const fullAddress = isPhysical
      ? deliveryAddress.trim()
      : '';

    const cleanPhone = whatsapp.startsWith('+244') ? whatsapp : `+244 ${whatsapp.trim()}`;
    const paymentMethodLabel = paymentMethod === 'express' 
      ? 'Multicaixa Express' 
      : paymentMethod === 'iban' 
      ? 'Transferência IBAN' 
      : 'Transferência KWIK';

    // 1. Build the personalized WhatsApp message URL
    const whatsappUrl = buildWhatsAppLink(
      fullName, 
      email, 
      cleanPhone, 
      province, 
      format, 
      wantsPhysicalAlert, 
      paymentMethodLabel,
      bankingConfig.redirectWhatsAppPhone || '+244 943 793 069',
      fullAddress
    );
    setSubmittedWhatsAppUrl(whatsappUrl);

    // 2. Register lead
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: cleanPhone,
      province: province,
      address: fullAddress,
      format: format,
      formatLabel: formatLabelText,
      amountKz: price,
      amountFormatted: priceFormatted,
      paymentMethod: paymentMethodLabel,
      status: 'novo',
      statusLabel: 'Novo Lead',
      createdAt: 'Agora mesmo',
      timestamp: Date.now(),
      notes: isPhysical
        ? `Pagamento: ${paymentMethodLabel}. Livro Físico Impresso (10.000 Kz). Endereço de Entrega: ${fullAddress} (${province}).`
        : `Pagamento: ${paymentMethodLabel}. E-book Digital (5.000 Kz).`,
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
      {/* STICKY TOP CONTAINER: RUNNING TICKER + HEADER */}
      <div className="sticky top-0 left-0 right-0 w-full z-40 shadow-xs">
        {/* CONTINUOUS RUNNING TICKER / MARQUEE BAR */}
        <aside aria-label="Avisos e Preços Disponíveis" className="w-full bg-[#0B0F19] text-white py-2 sm:py-2.5 overflow-hidden border-b border-amber-500/20 relative select-none">
          <div className="flex animate-marquee-rtl items-center">
            {/* We repeat the ticker list twice for a seamless infinite scroll */}
            {[0, 1].map((copyIndex) => (
              <div key={copyIndex} className="flex items-center gap-6 sm:gap-10 shrink-0 pr-6 sm:pr-10 text-xs sm:text-[13px]">
                {/* Item 1: Angola E-book */}
                <a
                  href="#formatos"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToCheckoutAndFocus('ebook');
                  }}
                  className="inline-flex items-center gap-2 hover:text-amber-300 transition-colors group cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-amber-300">🇦🇴 Angola:</span>
                  <span className="text-slate-200">E-book Digital disponível por</span>
                  <span className="font-mono font-bold text-white bg-amber-600/40 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
                    5.000 Kz
                  </span>
                </a>

                <span className="text-amber-500/40 font-bold">•</span>

                {/* Item 2: Angola Livro Físico */}
                <a
                  href="#formatos"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToCheckoutAndFocus('fisico');
                  }}
                  className="inline-flex items-center gap-2 hover:text-amber-300 transition-colors group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-400">menu_book</span>
                  <span className="font-bold text-amber-300">🇦🇴 Angola:</span>
                  <span className="text-slate-200">Livro Físico Impresso por</span>
                  <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded text-amber-200 border border-white/20">
                    10.000 Kz
                  </span>
                </a>

                <span className="text-amber-500/40 font-bold">•</span>

                {/* Item 3: Brasil e Exterior Livro Físico */}
                <a
                  href="#formatos"
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.getElementById('formatos');
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 hover:text-amber-300 transition-colors group cursor-pointer"
                >
                  <span className="text-base">🇧🇷 🌍</span>
                  <span className="font-bold text-amber-300">Brasil & Exterior:</span>
                  <span className="text-slate-200">Livro Físico Impresso disponível por</span>
                  <span className="font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/40">
                    R$ 47,40
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">na <strong>Amazon</strong> e <strong>Mercado Livre Brasil</strong></span>
                </a>

                <span className="text-amber-500/40 font-bold">•</span>

                {/* Item 4: Lançamento Oficial */}
                <div className="inline-flex items-center gap-2 text-slate-300">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">verified</span>
                  <span className="font-bold text-white">Lançamento Oficial DZMV 2026</span>
                  <span className="text-white/30">|</span>
                  <span className="text-amber-200 font-medium">Eng. Dénis Zombo</span>
                  <span className="text-white/30">•</span>
                  <span className="text-slate-400 text-[11px]">Editora Sábhia (Brasil)</span>
                </div>

                <span className="text-amber-500/40 font-bold">•</span>
              </div>
            ))}
          </div>
        </aside>

        {/* HEADER BAR */}
        <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
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
            <nav className="hidden md:flex items-center gap-5 lg:gap-8 text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
              <a href="#a-obra" className="hover:text-amber-800 transition-colors">A Obra</a>
              <a href="#formatos" className="hover:text-amber-800 transition-colors">Formatos & Preços</a>
              <a href="#sobre-o-autor" className="hover:text-amber-800 transition-colors">O Autor</a>
              <a href="#faq" className="hover:text-amber-800 transition-colors">Dúvidas</a>
            </nav>
          </div>
        </header>
      </div>

      {/* HERO SECTION */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FBFBFE] via-[#F4F6FC] to-[#FBFBFE] py-16 lg:py-24" id="a-obra">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
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
                      E-book + Impresso 2026
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
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 my-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[17px] text-amber-600">auto_stories</span>
                  <span>Formatos Disponíveis</span>
                </div>
                <div className="mt-1">
                  <strong className="text-lg sm:text-xl font-bold text-[#0B0F19] font-serif-editorial block leading-snug">
                    Edição Digital (E-book) & Livro Físico Impresso
                  </strong>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Opções para Angola (Kwanzas) e Brasil/Exterior (Amazon & Mercado Livre Brasil)
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  id="hero-buy-btn"
                  onClick={() => scrollToCheckoutAndFocus('ebook')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-all shadow-md text-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                  <span>Comprar Livro</span>
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
                      Edição Oficial
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
              Edição Oficial • Opções de Adquirição Globais
            </span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl text-[#0B0F19] tracking-tight font-bold">
              Garantir o Seu Exemplar (E-book ou Físico)
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Disponível em formato <strong>E-book Digital (5.000 Kz)</strong> para Angola e em <strong>Livro Físico Impresso</strong> no Brasil/Internacional (Amazon e Mercado Livre).
            </p>
          </div>

          {/* GLOBAL PURCHASING CHANNELS CARD (ANGOLA VS INTERNATIONAL / BRASIL) */}
          <div className="bg-[#0B0F19] text-white p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                  <span>Canais de Venda Globais</span>
                </div>
                <h3 className="font-serif-editorial text-xl sm:text-2xl font-bold text-white">
                  Onde Adquirir a Obra Segundo a Sua Localização
                </h3>
              </div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold shrink-0 self-start sm:self-center">
                Edição Oficial 2026
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Card A: Angola */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇦🇴</span>
                    <span className="font-bold text-sm text-amber-300 uppercase tracking-wider">Leitores em Angola</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Adquira o <strong>E-book Digital (5.000 Kz)</strong> com envio imediato no WhatsApp via Multicaixa Express, IBAN ou KWIK.
                  </p>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
                    <strong className="block font-semibold text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">print</span>
                      <span>Livro Físico em Angola:</span>
                    </strong>
                    <p className="text-[11px] text-slate-300">
                      Impressão local brevemente em Angola. Inscreva-se no formulário abaixo para ativar o alerta gratuito por WhatsApp!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToCheckoutAndFocus('ebook')}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>Comprar E-book em Kwanzas (5.000 Kz)</span>
                </button>
              </div>

              {/* Card B: Brasil / Exterior */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇧🇷 🌍</span>
                      <span className="font-bold text-sm text-amber-300 uppercase tracking-wider">Brasil & Exterior</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Físico Já Disponível
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Para quem está no Brasil ou no exterior, o <strong>Livro Físico Impresso</strong> já está disponível para envio imediato:
                  </p>

                  <div className="space-y-3 pt-1">
                    {/* Card Amazon */}
                    <a
                      href={BOOK_METADATA.prices.externalStores.amazon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 sm:p-5 rounded-2xl bg-white/10 hover:bg-white/[0.15] border border-amber-400/30 hover:border-amber-400 transition-all shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-200 block">
                            Livro Impresso
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-base sm:text-lg font-bold text-amber-300 block leading-tight">
                            R$ 47,40
                          </span>
                          <span className="text-[10px] text-amber-200/80 block mt-0.5">
                            ou 2x R$ 24,95/mês
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-300 hidden sm:inline">Entrega Internacional & Brasil</span>
                        <span className="w-full sm:w-auto py-2.5 px-4 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs">
                          <span>Comprar na Amazon</span>
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </span>
                      </div>
                    </a>

                    {/* Card Mercado Livre Brasil */}
                    <a
                      href={BOOK_METADATA.prices.externalStores.mercadoLivre.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 sm:p-5 rounded-2xl bg-white/10 hover:bg-white/[0.15] border border-amber-400/30 hover:border-amber-400 transition-all shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-200 block">
                            Livro Impresso
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-base sm:text-lg font-bold text-amber-300 block leading-tight">
                            R$ 47,40
                          </span>
                          <span className="text-[10px] text-emerald-300 block mt-0.5 font-medium">
                            Entrega no Brasil
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-300 hidden sm:inline">Envio em Todo o Brasil</span>
                        <span className="w-full sm:w-auto py-2.5 px-4 bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs">
                          <span>Comprar no Mercado Livre Brasil</span>
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-6">
            <form onSubmit={handleInitiateRegistration} className="space-y-6">
              {/* Formato Selecionado: Escolha entre E-book Digital (5.000 Kz) e Livro Físico Impresso (10.000 Kz) */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-900 block">
                  Escolha o Formato do Seu Pedido em Kwanzas *
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção E-book Digital */}
                  <div
                    onClick={() => setFormat('ebook')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      format === 'ebook'
                        ? 'border-amber-600 bg-amber-50/80 shadow-md ring-1 ring-amber-500'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[20px] ${format === 'ebook' ? 'text-amber-700' : 'text-slate-400'}`}>
                          {format === 'ebook' ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          E-book Digital
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                        PDF HD + ePub
                      </span>
                    </div>

                    <div>
                      <strong className="text-sm sm:text-base font-bold text-slate-900 block leading-snug font-serif-editorial">
                        E-book Digital Completo
                      </strong>
                      <span className="text-xs text-slate-600 block mt-0.5">
                        Envio imediato no WhatsApp e e-mail
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-200/60 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400 line-through">10.000 Kz</span>
                      <span className="font-mono text-lg font-bold text-amber-900">5.000 Kz</span>
                    </div>
                  </div>

                  {/* Opção Livro Físico Impresso */}
                  <div
                    onClick={() => setFormat('fisico')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      format === 'fisico'
                        ? 'border-amber-600 bg-amber-50/80 shadow-md ring-1 ring-amber-500'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[20px] ${format === 'fisico' ? 'text-amber-700' : 'text-slate-400'}`}>
                          {format === 'fisico' ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Livro Físico
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                        Edição Impressa
                      </span>
                    </div>

                    <div>
                      <strong className="text-sm sm:text-base font-bold text-slate-900 block leading-snug font-serif-editorial">
                        Livro Físico Impresso
                      </strong>
                      <span className="text-xs text-slate-600 block mt-0.5">
                        Impressão em Angola Brevemente
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-200/60 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Angola</span>
                      <span className="font-mono text-sm sm:text-base font-bold text-slate-900">Brevemente (10.000 Kz)</span>
                    </div>
                  </div>
                </div>

                {/* Helpful Context banner when Physical format is selected */}
                {format === 'fisico' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-slate-800 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <span className="material-symbols-outlined text-amber-700 text-lg">info</span>
                      <span>Disponibilidade do Livro Físico:</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      🇦🇴 <strong>Em Angola:</strong> A edição impressa será lançada brevemente. Ao preencher o formulário abaixo, ficará automaticamente registado(a) na lista prioritária de reserva local!
                    </p>
                    <p className="leading-relaxed text-slate-700 pt-1 border-t border-amber-200/60">
                      🇧🇷 🌍 <strong>No Brasil / Exterior:</strong> Se reside no Brasil ou no exterior, já pode adquirir o livro físico impresso por <strong>R$ 47,40</strong> na <a href={BOOK_METADATA.prices.externalStores.amazon.url} target="_blank" rel="noopener noreferrer" className="font-bold underline text-amber-900 hover:text-amber-950">Amazon</a> ou no <a href={BOOK_METADATA.prices.externalStores.mercadoLivre.url} target="_blank" rel="noopener noreferrer" className="font-bold underline text-amber-900 hover:text-amber-950">Mercado Livre Brasil</a>.
                    </p>
                  </div>
                )}
              </div>

              {/* Name */}
              <div id="campo-nome" className="space-y-1.5 scroll-mt-24 sm:scroll-mt-28">
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

              {/* Delivery Address Section ONLY when Livro Físico is selected */}
              {format === 'fisico' ? (
                <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-400 space-y-4 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                      <span className="material-symbols-outlined text-amber-700 text-[22px]">local_shipping</span>
                      <span>Endereço de Entrega do Livro Físico em Angola *</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                      Obrigatório para Envio
                    </span>
                  </div>

                  {/* Província */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800" htmlFor="order-province">
                      Província de Entrega *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                        location_city
                      </span>
                      <select
                        id="order-province"
                        required
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                      >
                        {['Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Cuanza Sul', 'Cuanza Norte', 'Uíge', 'Zaire', 'Malanje', 'Bié', 'Moxico', 'Lunda Norte', 'Lunda Sul', 'Namibe', 'Cunene', 'Quando Cubango', 'Bengo'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Endereço Completo & Ponto de Referência */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800" htmlFor="order-address">
                      Endereço Completo (Rua, Nº da Casa e Ponto de Referência) *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[20px]">
                        home_pin
                      </span>
                      <input
                        ref={addressInputRef}
                        id="order-address"
                        type="text"
                        required={format === 'fisico'}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Ex: Talatona, Bairro Benfica, Rua Direita das Acácias, Casa 14, próximo ao Banco BAI"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Indique o seu endereço completo para que a transportadora ou equipa editorial possa entregar o seu livro em mãos.
                    </p>
                  </div>
                </div>
              ) : (
                /* Checkbox: Desejo ser avisado quando o livro físico estiver pronto (apenas para quem compra e-book) */
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 transition-all hover:bg-amber-50">
                  <label className="flex items-start sm:items-center gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={wantsPhysicalAlert}
                      onChange={(e) => setWantsPhysicalAlert(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col text-xs text-slate-700 min-w-0">
                      <span className="font-bold text-slate-900 text-sm flex items-start sm:items-center gap-2 leading-snug">
                        <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5 sm:mt-0">notifications_active</span>
                        <span>Desejo ser avisado(a) quando o Livro Físico Impresso estiver pronto</span>
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Recap Bar */}
              <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <img
                    src={BOOK_METADATA.images.secondaryCover}
                    alt={format === 'fisico' ? "Livro Físico Impresso" : "E-book Digital"}
                    className="w-8 h-11 sm:w-10 sm:h-14 object-cover rounded-md sm:rounded-lg shadow-2xs border border-slate-300 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight line-clamp-2 sm:line-clamp-none">
                      {format === 'fisico' ? 'Amizade após Exoneração • Livro Físico' : 'Amizade após Exoneração • E-book Digital'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-base sm:text-xl font-bold text-slate-900 block whitespace-nowrap">
                    {format === 'fisico' ? '10.000 Kz' : BOOK_METADATA.prices.ebookFormatted}
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
                  <strong className="text-slate-900 text-right">
                    {format === 'fisico' ? 'Livro Físico Impresso (Com Orelhas)' : 'E-book Digital (PDF HD + ePub)'}
                  </strong>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-amber-600">payments</span>
                    Valor Total:
                  </span>
                  <strong className="text-slate-900 font-mono text-base font-bold text-amber-800">
                    {format === 'fisico' ? '10.000 Kz' : BOOK_METADATA.prices.ebookFormatted}
                  </strong>
                </div>

                {format === 'fisico' && (
                  <>
                    <div className="py-2.5 flex justify-between items-center gap-3">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-base text-amber-600">location_city</span>
                        Província:
                      </span>
                      <strong className="text-slate-900 text-right">{province}</strong>
                    </div>

                    <div className="py-2.5 flex justify-between items-start gap-3">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium shrink-0">
                        <span className="material-symbols-outlined text-base text-amber-600">home_pin</span>
                        Endereço de Entrega:
                      </span>
                      <strong className="text-slate-900 text-right text-xs leading-snug">
                        {deliveryAddress}
                      </strong>
                    </div>
                  </>
                )}

                {wantsPhysicalAlert && format === 'ebook' && (
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                      paymentMethod === 'iban'
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/30 font-bold text-amber-950'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">Transferência IBAN</span>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Telemóvel Multicaixa Express DZMV:</span>
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
                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
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
                    <div className="flex flex-wrap justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                      <span>Instituição Bancária: <strong>{bankingConfig.bank}</strong></span>
                      <span>Titular / Beneficiário: <strong>{bankingConfig.beneficiary}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
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
                    <div className="flex flex-wrap justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                      <span>Nome da Conta: <strong>{bankingConfig.kwikAccountName}</strong></span>
                      <span>Rede: <strong>{bankingConfig.kwikBank}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Prominent Instructions & Observation Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-amber-700 text-xl">info</span>
                  <span>Instruções de Pagamento & Envio do Comprovativo:</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed whitespace-pre-line">
                  {bankingConfig.instructions || 'Efetue o pagamento via Multicaixa Express, Transferência IBAN ou Transferência KWIK e anexe o comprovativo no WhatsApp para validação e liberação do seu pedido.'}
                </p>
                {bankingConfig.redirectWhatsAppPhone && (
                  <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">chat</span>
                      Número WhatsApp para Envio do Comprovativo:
                    </span>
                    <strong className="font-mono text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      {bankingConfig.redirectWhatsAppPhone}
                    </strong>
                  </div>
                )}
              </div>

              {/* Big Finalize on WhatsApp Button */}
              <a
                href={buildWhatsAppLink(
                  fullName,
                  email,
                  whatsapp.startsWith('+244') ? whatsapp : `+244 ${whatsapp.trim()}`,
                  province,
                  format,
                  wantsPhysicalAlert,
                  paymentMethod === 'express' 
                    ? 'Multicaixa Express' 
                    : paymentMethod === 'iban' 
                    ? 'Transferência IBAN' 
                    : 'Transferência KWIK',
                  bankingConfig.redirectWhatsAppPhone || '+244 943 793 069',
                  deliveryAddress
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
              O Que Dizem os Leitores
            </h2>
            <p className="text-sm text-slate-600">
              Avaliações e impressões de quem já adquiriu a obra do Eng. Dénis Zombo.
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
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Leitor Verificado</span>
                  <span className="text-xs text-slate-500">Avaliação da Obra</span>
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
                  “Todo dirigente público deveria ter este livro sobre a secretária antes de assinar o primeiro despacho. Ensina-nos a nunca nos embriagarmos pelo cargo, pois o cargo é passageiro, a honra é eterna.”
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Leitor Verificado</span>
                  <span className="text-xs text-slate-500">Avaliação da Obra</span>
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
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">Leitor Verificado</span>
                  <span className="text-xs text-slate-500">Avaliação da Obra</span>
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
        </div>

        {/* Marquee Carousel Container: moving smoothly from Right to Left */}
        <div className="relative w-full overflow-hidden group">
          {/* Subtle gradient edges for professional blending */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-[#070A12] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-[#070A12] to-transparent z-10 pointer-events-none"></div>

          {/* Marquee Track (Seamless continuous infinite flow) */}
          <div className="animate-marquee-rtl flex items-center gap-4 sm:gap-6 py-2">
            {(() => {
              const list = galleryImages.length > 0 ? galleryImages : [];
              const repetitions = list.length < 5 ? 4 : list.length < 10 ? 3 : 2;
              const displayList = Array(repetitions).fill(list).flat();
              return displayList.map((img, index) => (
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
              ));
            })()}
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
                q: 'Como funciona a aquisição da edição física impressa?',
                a: 'No Brasil e no exterior, o livro físico impresso já está disponível para compra imediata na Amazon Brasil (por R$ 47,40) e no Mercado Livre. Em Angola, a edição física será impressa localmente brevemente. Ao preencher o formulário acima e marcar a opção de alerta, ficará automaticamente registado(a) na lista prioritária para ser notificado(a) via WhatsApp assim que os exemplares chegarem em Angola!'
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
      <footer className="w-full bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center justify-center gap-3 text-center text-xs text-slate-500">
          {/* Exclusive Administrator Access Button at Footer */}
          <button
            onClick={onGoToLogin}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs transition-colors flex items-center gap-2 border border-slate-200 cursor-pointer shadow-2xs"
            title="Acesso reservado apenas para administradores e equipa editorial"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-700">admin_panel_settings</span>
            <span>Área Administrativa (Acesso Reservado)</span>
          </button>
          <p>© 2026 DZMV. Todos os direitos reservados • Edição Editora Sábhia (Brasil).</p>
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON (Compact & Collapsible) */}
      <aside aria-label="Apoio ao Leitor WhatsApp" className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 md:z-50 flex items-center">
        <a
          href={`https://wa.me/${(() => {
            const raw = (bankingConfig.redirectWhatsAppPhone || '+244 943 793 069').replace(/[^0-9]/g, '');
            return raw.length === 9 && (raw.startsWith('9') || raw.startsWith('2')) ? `244${raw}` : raw || '244943793069';
          })()}?text=${encodeURIComponent("Olá, Editora Sábhia! Gostaria de saber mais informações sobre o livro 'Amizade após Exoneração' do Eng. Dénis Zombo.")}`}
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
              Edição Oficial
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              Digital & Impresso
            </span>
          </div>

          <button
            onClick={() => scrollToCheckoutAndFocus('ebook')}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Comprar Livro</span>
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
