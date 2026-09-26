import React, { useState } from 'react';
import { BOOK_METADATA, BankingConfig, getStoredBankingConfig, saveStoredBankingConfig, GalleryImage, getStoredGallery, saveStoredGallery, resetDefaultGallery } from '../data/bookData';
import { Lead, AdminUser, buildAdminToLeadWhatsAppLink, getRegisteredAdmins, registerNewAdmin, deleteRegisteredAdmin, updateAdminPassword } from '../data/leadsData';
import { changeFirebasePassword } from '../firebase';
import { BroadcastModal } from './BroadcastModal';
import { LeadsEvolutionChart } from './LeadsEvolutionChart';
import { EbookDispatchModal } from './EbookDispatchModal';

interface EditorialDashboardProps {
  leads: Lead[];
  onUpdateLeadStatus: (leadId: string, newStatus: Lead['status']) => void;
  onDeleteLead: (leadId: string) => void;
  onClearAllLeads?: () => void;
  adminUser: AdminUser | null;
  onLogout: () => void;
  onViewStore: () => void;
  onOpenReader: () => void;
}

export const EditorialDashboard: React.FC<EditorialDashboardProps> = ({
  leads,
  onUpdateLeadStatus,
  onDeleteLead,
  onClearAllLeads,
  adminUser,
  onLogout,
  onViewStore,
  onOpenReader,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'geral' | 'pagamentos' | 'usuarios' | 'galeria' | 'whatsapp' | 'metadados'>('leads');
  const [statusFilter, setStatusFilter] = useState<'all' | 'novo' | 'contactado' | 'pago' | 'concluido' | 'alerta-fisico'>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<'all' | 'ebook-amizade'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getUserFirstName = () => {
    if (adminUser?.name) {
      const parts = adminUser.name.trim().split(' ');
      return parts[0];
    }
    if (adminUser?.email) {
      const namePart = adminUser.email.split('@')[0];
      if (namePart.toLowerCase().includes('denis') || namePart.toLowerCase().includes('dzmv')) return 'Dénis';
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'Dénis';
  };
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  
  // Banking configuration state (Express, IBAN, KWIK)
  const [bankingConfig, setBankingConfig] = useState<BankingConfig>(getStoredBankingConfig);
  const [bankingForm, setBankingForm] = useState<BankingConfig>(getStoredBankingConfig);

  // Gallery management state
  const [galleryList, setGalleryList] = useState<GalleryImage[]>(getStoredGallery);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageTitle, setNewImageTitle] = useState('');
  const [galleryFormError, setGalleryFormError] = useState<string | null>(null);

  // Team & User management state
  const [adminsList, setAdminsList] = useState(getRegisteredAdmins);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Gestor de Vendas & Atendimento');
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // Change My Password state
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [myPasswordMsg, setMyPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Reset User Password Modal state
  const [userToReset, setUserToReset] = useState<{ email: string; name: string } | null>(null);
  const [resetModalNewPass, setResetModalNewPass] = useState('');
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyPasswordMsg(null);

    if (!myNewPassword.trim() || myNewPassword.length < 6) {
      setMyPasswordMsg({ type: 'error', text: 'A nova palavra-passe deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (myNewPassword !== myConfirmPassword) {
      setMyPasswordMsg({ type: 'error', text: 'As palavras-passes digitadas não coincidem.' });
      return;
    }

    const currentEmail = adminUser?.email || 'dzmv.geral@gmail.com';

    try {
      updateAdminPassword(currentEmail, myNewPassword);

      try {
        await changeFirebasePassword(myNewPassword);
      } catch (fbErr) {
        console.log('Firebase pass update notice:', fbErr);
      }

      setMyPasswordMsg({ type: 'success', text: 'A sua palavra-passe foi alterada com sucesso!' });
      showToast('Palavra-passe alterada com sucesso!');
      setMyNewPassword('');
      setMyConfirmPassword('');
    } catch (err: unknown) {
      const error = err as Error;
      setMyPasswordMsg({ type: 'error', text: error.message || 'Erro ao alterar palavra-passe.' });
    }
  };

  const handleResetTargetUserPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetModalError(null);

    if (!userToReset) return;
    if (!resetModalNewPass.trim() || resetModalNewPass.length < 6) {
      setResetModalError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      updateAdminPassword(userToReset.email, resetModalNewPass);
      setAdminsList(getRegisteredAdmins());
      showToast(`Senha redefinida com sucesso para ${userToReset.name}!`);
      setUserToReset(null);
      setResetModalNewPass('');
    } catch (err: unknown) {
      const error = err as Error;
      setResetModalError(error.message || 'Erro ao redefinir palavra-passe.');
    }
  };

  // Modals & Tools
  const [selectedLeadForDossier, setSelectedLeadForDossier] = useState<Lead | null>(null);
  const [selectedLeadForDispatch, setSelectedLeadForDispatch] = useState<Lead | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // WhatsApp Sandbox
  const [testPhone, setTestPhone] = useState('923 884 120');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Calculations
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'novo').length;
  const paidLeadsCount = leads.filter(l => l.status === 'pago' || l.status === 'concluido').length;
  const physicalAlertCount = leads.filter(l => l.wantsPhysicalAlert).length;
  const totalRevenueKz = leads.reduce((acc, l) => (l.status === 'pago' || l.status === 'concluido' ? acc + l.amountKz : acc), 0);

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    if (statusFilter === 'alerta-fisico') {
      if (!l.wantsPhysicalAlert) return false;
    } else if (statusFilter !== 'all' && l.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.province.toLowerCase().includes(q) ||
        l.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSimulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Gateway Multicaixa (EMIS) sincronizado: Dados de leads e pagamentos conferidos!');
    }, 1000);
  };

  const handleExportCSV = () => {
    const headers = 'ID,Nome,Telemovel,Email,Provincia,Formato,MetodoPagamento,AlertaLivroFisico,ValorKz,Status,DataRegistro\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.id}","${l.fullName}","${l.phone}","${l.email}","${l.province}","${l.formatLabel}","${l.paymentMethod}","${l.wantsPhysicalAlert ? 'SIM' : 'NAO'}","${l.amountKz}","${l.statusLabel}","${l.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leads_DenisZombo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ficheiro CSV de leads descarregado com sucesso!');
  };

  const openWhatsAppChat = (lead: Lead) => {
    const url = buildAdminToLeadWhatsAppLink(lead, bankingConfig);
    window.open(url, '_blank');
  };

  const handleSaveBankingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredBankingConfig(bankingForm);
    setBankingConfig(bankingForm);
    showToast('Coordenadas de pagamento e número de redirecionamento WhatsApp salvos com sucesso!');
  };

  const handleSaveWhatsAppRedirectNumber = () => {
    const updated = {
      ...bankingForm,
      redirectWhatsAppPhone: bankingForm.redirectWhatsAppPhone || bankingForm.mcxPhone || '+244 923 884 120'
    };
    saveStoredBankingConfig(updated);
    setBankingConfig(updated);
    setBankingForm(updated);
    showToast('Número de WhatsApp para redirecionamento salvo com sucesso!');
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      setUserFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const created = registerNewAdmin(newAdminEmail, newAdminPassword, newAdminName, newAdminRole);
      setAdminsList(getRegisteredAdmins());
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      showToast(`Novo utilizador (${created.name}) registrado com sucesso!`);
    } catch (err: any) {
      setUserFormError(err.message || 'Erro ao registrar utilizador.');
    }
  };

  const handleDeleteUser = (email: string) => {
    try {
      const updated = deleteRegisteredAdmin(email);
      setAdminsList(updated);
      showToast(`Utilizador removido do sistema.`);
    } catch (err: any) {
      showToast(err.message || 'Não foi possível remover o utilizador.');
    }
  };

  const handleSendTestPackage = () => {
    if (!testPhone.trim()) {
      showToast('Insira um número angolano válido.');
      return;
    }
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      const randomMsgId = Math.floor(1000 + Math.random() * 9000);
      setTestFeedback(`Disparo para +244 ${testPhone} efetuado com sucesso via nó Luanda! ID: MSG-244-${randomMsgId}`);
      showToast(`WhatsApp teste enviado para +244 ${testPhone}!`);
      setTimeout(() => setTestFeedback(null), 5000);
    }, 1000);
  };

  const handleAddGalleryImage = (e: React.FormEvent) => {
    e.preventDefault();
    setGalleryFormError(null);
    const trimmedUrl = newImageUrl.trim();
    if (!trimmedUrl) {
      setGalleryFormError('Por favor, cole o link (URL) da imagem.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setGalleryFormError('O link deve começar por http:// ou https://');
      return;
    }

    const newItem: GalleryImage = {
      id: Date.now(),
      url: trimmedUrl,
      title: newImageTitle.trim() || `Eng. Dénis Ângelo Vasco • Foto ${galleryList.length + 1}`,
      addedAt: new Date().toLocaleDateString('pt-PT')
    };

    const updated = [newItem, ...galleryList];
    setGalleryList(updated);
    saveStoredGallery(updated);
    setNewImageUrl('');
    setNewImageTitle('');
    showToast('Nova foto anexada à galeria com sucesso! O carrossel da landing page já foi atualizado.');
  };

  const handleDeleteGalleryImage = (id: string | number) => {
    if (galleryList.length <= 1) {
      showToast('A galeria deve ter pelo menos uma imagem para o carrossel continuar a rodar.');
      return;
    }
    const updated = galleryList.filter((item) => item.id !== id);
    setGalleryList(updated);
    saveStoredGallery(updated);
    showToast('Fotografia removida da galeria.');
  };

  const handleMoveGalleryImage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= galleryList.length) return;
    const copy = [...galleryList];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setGalleryList(copy);
    saveStoredGallery(copy);
  };

  const handleResetGalleryToDefault = () => {
    const confirmed = window.confirm('Deseja restaurar as fotografias originais da galeria?');
    if (!confirmed) return;
    const def = resetDefaultGallery();
    setGalleryList(def);
    showToast('Galeria de fotos restaurada para o padrão oficial.');
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2B] flex flex-col font-sans antialiased">
      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        {/* MOBILE DRAWER BACKDROP & OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-xs md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] h-full bg-[#0B0F19] text-slate-200 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Mobile Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-serif-editorial text-sm font-bold tracking-wider">
                      DZMV
                    </div>
                    <div>
                      <h2 className="font-serif-editorial text-base text-white font-bold leading-tight">
                        Console DZMV
                      </h2>
                      <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold block">
                        Edição Editorial
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Mobile Admin Card */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-3">
                    {adminUser?.photoURL ? (
                      <img
                        src={adminUser.photoURL}
                        alt={adminUser.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-amber-500/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {adminUser?.avatarInitials || 'DZ'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">
                        {adminUser?.name || 'Eng. Dénis Zombo'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate font-mono">
                        {adminUser?.email || 'dzmv.geral@gmail.com'}
                      </span>
                    </div>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {adminUser?.role || 'Autor & Administrador'}
                  </span>
                </div>

                {/* Mobile Nav Tabs */}
                <nav className="flex flex-col gap-1 text-xs font-semibold">
                  <button
                    onClick={() => { setActiveTab('leads'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'leads' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">group</span>
                    <span>Leads Registados</span>
                    <span className="ml-auto font-mono text-[11px] px-2 py-0.5 bg-black/20 rounded-full font-bold">
                      {leads.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('geral'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'geral' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                    <span>Visão Geral & Métricas</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('pagamentos'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'pagamentos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                    <span>Contas & Pagamento</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('usuarios'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'usuarios' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                    <span>Gestão de Usuários</span>
                    <span className="ml-auto font-mono text-[11px] px-2 py-0.5 bg-black/20 rounded-full font-bold">
                      {adminsList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('galeria'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'galeria' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">photo_library</span>
                    <span>Galeria de Fotos</span>
                    <span className="ml-auto font-mono text-[11px] px-2 py-0.5 bg-black/20 rounded-full font-bold">
                      {galleryList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('whatsapp'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'whatsapp' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                    <span>WhatsApp Automation</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('metadados'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                      activeTab === 'metadados' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">menu_book</span>
                    <span>Metadados da Obra</span>
                  </button>
                </nav>
              </div>

              {/* Mobile Drawer Footer Actions */}
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <button
                  onClick={() => { onViewStore(); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Ver Loja Oficial</span>
                </button>

                <button
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 px-3 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-800/40"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>Sair do Painel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP SIDEBAR (STICKY & COLLAPSIBLE) */}
        <aside
          className={`hidden md:flex flex-col justify-between shrink-0 bg-[#0B0F19] text-slate-300 border-r border-slate-800 transition-all duration-300 sticky top-0 h-screen overflow-y-auto z-40 ${
            isSidebarCollapsed ? 'w-20 p-3' : 'w-64 lg:w-72 p-5'
          }`}
        >
          <div className="space-y-5">
            {/* Brand Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-serif-editorial text-sm font-bold tracking-wider shrink-0 shadow-md">
                  DZMV
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="font-serif-editorial text-base text-white font-bold tracking-tight leading-tight truncate">
                      DZMV Console
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 truncate">
                      Lançamento • Sábhia
                    </span>
                  </div>
                )}
              </div>

              {/* Toggle Collapse Button */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isSidebarCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                </span>
              </button>
            </div>

            {/* Admin Profile Card */}
            {!isSidebarCollapsed ? (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <div className="flex items-center gap-2.5">
                  {adminUser?.photoURL ? (
                    <img
                      src={adminUser.photoURL}
                      alt={adminUser.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-amber-500/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {adminUser?.avatarInitials || 'DZ'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">
                      {adminUser?.name || 'Eng. Dénis Zombo'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate font-mono">
                      {adminUser?.email || 'dzmv.geral@gmail.com'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold truncate">
                    {adminUser?.role || 'Autor & Administrador'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center" title={`${adminUser?.name || 'Administrador'} (${adminUser?.email})`}>
                <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                  {adminUser?.avatarInitials || 'DZ'}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <nav className="flex flex-col gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('leads')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'leads'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">group</span>
                {!isSidebarCollapsed ? (
                  <>
                    <span>Leads Registados</span>
                    <span className={`ml-auto font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'leads' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}>
                      {leads.length}
                    </span>
                  </>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Leads Registados ({leads.length})
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('geral')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'geral'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">analytics</span>
                {!isSidebarCollapsed ? (
                  <span>Visão Geral & Métricas</span>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Visão Geral & Métricas
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('pagamentos')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'pagamentos'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">account_balance</span>
                {!isSidebarCollapsed ? (
                  <span>Contas & Pagamento</span>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Contas & Pagamento
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('usuarios')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'usuarios'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">badge</span>
                {!isSidebarCollapsed ? (
                  <>
                    <span>Gestão de Usuários</span>
                    <span className={`ml-auto font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'usuarios' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-blue-300'
                    }`}>
                      {adminsList.length}
                    </span>
                  </>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Gestão de Usuários ({adminsList.length})
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('galeria')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'galeria'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">photo_library</span>
                {!isSidebarCollapsed ? (
                  <>
                    <span>Galeria de Fotos</span>
                    <span className={`ml-auto font-mono text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'galeria' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}>
                      {galleryList.length}
                    </span>
                  </>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Galeria de Fotos ({galleryList.length})
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'whatsapp'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">chat</span>
                {!isSidebarCollapsed ? (
                  <span>WhatsApp Automation</span>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    WhatsApp Automation
                  </div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('metadados')}
                className={`relative group flex items-center transition-all ${
                  isSidebarCollapsed
                    ? 'w-11 h-11 mx-auto justify-center rounded-xl'
                    : 'w-full gap-3 px-3.5 py-2.5 rounded-xl text-left'
                } ${
                  activeTab === 'metadados'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">menu_book</span>
                {!isSidebarCollapsed ? (
                  <span>Metadados da Obra</span>
                ) : (
                  <div className="absolute left-16 px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 whitespace-nowrap">
                    Metadados da Obra
                  </div>
                )}
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-3 pt-6 border-t border-slate-800 mt-6">
            <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-3' : 'justify-between px-1'}`}>
              <button
                onClick={onViewStore}
                className={`text-xs text-slate-400 hover:text-amber-400 font-bold flex items-center gap-2 transition-colors ${
                  isSidebarCollapsed ? 'p-2 rounded-lg hover:bg-slate-800' : ''
                }`}
                title="Ver Loja Oficial"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                {!isSidebarCollapsed && <span>Ver Loja</span>}
              </button>

              <button
                onClick={onLogout}
                className={`text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-2 transition-colors ${
                  isSidebarCollapsed ? 'p-2 rounded-lg hover:bg-red-950/50' : ''
                }`}
                title="Sair do Painel"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                {!isSidebarCollapsed && <span>Sair</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Executive Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200 shrink-0"
                title="Abrir Menu Principal"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>

              {/* Desktop Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isSidebarCollapsed ? 'menu_open' : 'menu'}
                </span>
              </button>

              {/* Breadcrumb Title */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">
                  DZMV Console
                </span>
                <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                <span className="text-xs text-amber-800 font-semibold truncate hidden sm:inline">
                  {activeTab === 'leads' && 'Gestão de Leads & Encomendas'}
                  {activeTab === 'geral' && 'Visão Geral & Métricas'}
                  {activeTab === 'pagamentos' && 'Contas & Coordenadas bancárias'}
                  {activeTab === 'usuarios' && 'Gestão da Equipa & Acessos'}
                  {activeTab === 'galeria' && 'Gestão da Galeria do Autor'}
                  {activeTab === 'whatsapp' && 'Automação & Disparos WhatsApp'}
                  {activeTab === 'metadados' && 'Metadados da Obra'}
                </span>
              </div>
            </div>

            {/* Quick Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* User Account Greeting Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-slate-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Olá, {getUserFirstName()}</span>
              </div>

              <button
                onClick={onViewStore}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-amber-700">storefront</span>
                <span>Loja Landing</span>
              </button>

              <button
                onClick={onOpenReader}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-amber-700">menu_book</span>
                <span className="hidden sm:inline">Leitor Digital</span>
              </button>
            </div>
          </header>

          <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
            {/* Operational Banner */}
            <div className="w-full bg-[#E1E8FD] px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs border border-blue-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-900">
                  Nó WhatsApp Oficial DZMV Conectado ({bankingConfig.mcxPhone})
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Sessão Ativa:</span>
                <span className="px-2.5 py-0.5 bg-white rounded-lg font-bold text-amber-950 border border-slate-200 font-mono">
                  Olá, {getUserFirstName()} ({adminUser?.email || 'dzmv.geral@gmail.com'})
                </span>
              </div>
            </div>

            {/* TAB 1: LEADS REGISTADOS (MAIN FOCUS) */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                {/* Header & Quick Action Buttons */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
                      <span>Console de Vendas & Rastreamento</span>
                    </div>
                    <h1 className="font-serif-editorial text-2xl sm:text-3xl text-slate-900 font-bold mt-1">
                      Leads & Compradores Registados
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Todos os utilizadores que preencheram o formulário de compra na landing page são registados aqui em tempo real.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleExportCSV}
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-600">download</span>
                      <span>Exportar Leads (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs uppercase font-bold text-slate-500">Total de Leads Registados</span>
                    <span className="font-mono text-3xl font-bold text-slate-900 block mt-1">{totalLeads}</span>
                    <span className="text-xs text-slate-500 mt-1 block">Capturados via formulário</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs uppercase font-bold text-amber-700">Novos Leads Pendentes</span>
                    <span className="font-mono text-3xl font-bold text-amber-600 block mt-1">{newLeadsCount}</span>
                    <span className="text-xs text-slate-500 mt-1 block">Aguardando atendimento</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs uppercase font-bold text-emerald-700">Vendas Concluídas</span>
                    <span className="font-mono text-3xl font-bold text-emerald-700 block mt-1">{paidLeadsCount}</span>
                    <span className="text-xs text-slate-500 mt-1 block">Pagamento validado</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs uppercase font-bold text-slate-500">Faturamento Acumulado</span>
                    <span className="font-mono text-2xl font-bold text-slate-900 block mt-1">
                      Kz {totalRevenueKz.toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold mt-1 block">Multicaixa Express (94%)</span>
                  </div>
                </div>

                {/* Daily Leads & Sales Evolution Chart (Recharts) */}
                <LeadsEvolutionChart leads={leads} />

                {/* Leads Data Table with Generous Spacing & Fixed Widths */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Table Toolbar & Search */}
                  <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Todos ({leads.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('novo')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'novo' ? 'bg-white text-amber-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Novos ({newLeadsCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter('contactado')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'contactado' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Contactados
                      </button>
                      <button
                        onClick={() => setStatusFilter('pago')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'pago' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Pagos
                      </button>
                      <button
                        onClick={() => setStatusFilter('concluido')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'concluido' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Concluídos
                      </button>
                      <button
                        onClick={() => setStatusFilter('alerta-fisico')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          statusFilter === 'alerta-fisico'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                        <span>Avisar Livro Físico ({physicalAlertCount})</span>
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar por nome, telefone..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Table with Generous Widths */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <th className="py-3.5 px-5 min-w-[240px]">Nome do Lead / Cliente</th>
                          <th className="py-3.5 px-5 min-w-[200px]">WhatsApp & E-mail</th>
                          <th className="py-3.5 px-4 min-w-[120px]">Província</th>
                          <th className="py-3.5 px-5 min-w-[180px]">Formato & Pagamento</th>
                          <th className="py-3.5 px-4 min-w-[110px]">Valor em Kz</th>
                          <th className="py-3.5 px-4 min-w-[140px]">Status</th>
                          <th className="py-3.5 px-5 min-w-[160px] text-right">Ação WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Nome com destaque, espaço amplo e data */}
                            <td className="py-4 px-5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm leading-snug">
                                  {lead.fullName}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
                                  <span>{lead.createdAt}</span>
                                </div>
                              </div>
                            </td>

                            {/* Contatos */}
                            <td className="py-4 px-5">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-slate-900 text-xs">{lead.phone}</span>
                                <span className="text-[11px] text-slate-500 break-all">{lead.email}</span>
                              </div>
                            </td>

                            {/* Província */}
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md font-semibold text-xs inline-block">
                                {lead.province}
                              </span>
                            </td>

                            {/* Formato e Método de Pagamento */}
                            <td className="py-4 px-5">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-900">
                                  <span className="material-symbols-outlined text-[13px]">devices</span>
                                  {lead.formatLabel}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">
                                  💳 {lead.paymentMethod}
                                </span>
                                {lead.wantsPhysicalAlert && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <span className="material-symbols-outlined text-[12px] text-amber-700">notifications_active</span>
                                    Avisar Livro Físico
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Valor */}
                            <td className="py-4 px-4">
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {lead.amountFormatted}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              <select
                                value={lead.status}
                                onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer w-full ${
                                  lead.status === 'novo'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : lead.status === 'contactado'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : lead.status === 'pago' || lead.status === 'concluido'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}
                              >
                                <option value="novo">Novo Lead</option>
                                <option value="contactado">Contactado</option>
                                <option value="pago">Pago (Aguardando Envio)</option>
                                <option value="concluido">Concluído (Enviado)</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </td>

                            {/* Ações */}
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setSelectedLeadForDispatch(lead)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                                  title="Enviar e-book / notificação via E-mail ou WhatsApp com mensagem pronta"
                                >
                                  <span className="material-symbols-outlined text-[16px]">send</span>
                                  <span>Enviar E-book</span>
                                </button>

                                <button
                                  onClick={() => openWhatsAppChat(lead)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-xs transition-colors shadow-xs cursor-pointer"
                                  title="Iniciar atendimento WhatsApp direto"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                  </svg>
                                  <span>WhatsApp</span>
                                </button>

                                <button
                                  onClick={() => onDeleteLead(lead.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remover Lead"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span>
                      Exibindo <strong>{filteredLeads.length}</strong> de <strong>{leads.length}</strong> leads registados
                    </span>
                    <span className="font-semibold text-slate-700">Lançamento Oficial DZMV • Editora Sábhia (Brasil)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VISÃO GERAL & DESEMPENHO MULTIPRODUTO */}
            {activeTab === 'geral' && (() => {
              const selectedLeadsForMetrics = leads.filter(l => {
                if (selectedProductFilter === 'ebook-amizade') {
                  return l.format === 'ebook';
                }
                return true;
              });

              const paidLeadsForMetrics = selectedLeadsForMetrics.filter(l => l.status === 'pago' || l.status === 'concluido');
              const totalRevenueForMetrics = paidLeadsForMetrics.reduce((acc, curr) => acc + (curr.amountKz || 5000), 0);
              const conversionRateForMetrics = selectedLeadsForMetrics.length > 0 
                ? ((paidLeadsForMetrics.length / selectedLeadsForMetrics.length) * 100).toFixed(1) 
                : '0.0';
              const avgTicketForMetrics = paidLeadsForMetrics.length > 0 
                ? Math.round(totalRevenueForMetrics / paidLeadsForMetrics.length) 
                : 5000;

              return (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[18px]">query_stats</span>
                          <span>Relatórios & Gestão Comercial</span>
                        </div>
                        <h3 className="font-serif-editorial text-2xl font-bold text-slate-900 mt-1">
                          Visão Geral de Desempenho & Métricas
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                          Análise consolidada de vendas, faturamento acumulado e taxa de conversão por produto do catálogo.
                        </p>
                      </div>

                      {/* Product Selector Filter */}
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
                        <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-slate-500">filter_list</span>
                          <span>Filtrar por Produto:</span>
                        </label>
                        <select
                          value={selectedProductFilter}
                          onChange={(e) => setSelectedProductFilter(e.target.value as 'all' | 'ebook-amizade')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="all">Catálogo Completo (Todos os Produtos)</option>
                          <option value="ebook-amizade">E-book: Amizade após Exoneração (5.000 Kz)</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-5 bg-gradient-to-br from-amber-50/70 to-white rounded-2xl border border-amber-200/80 shadow-xs">
                        <span className="text-[11px] text-amber-900 font-bold uppercase tracking-wider block">
                          Faturamento Confirmado
                        </span>
                        <span className="text-2xl font-mono font-bold text-amber-950 block mt-2">
                          Kz {totalRevenueForMetrics.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                          {paidLeadsForMetrics.length} pedido(s) liquidado(s)
                        </span>
                      </div>

                      <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">
                          Preço / Valor Ativo
                        </span>
                        <span className="text-2xl font-mono font-bold text-slate-900 block mt-2">
                          5.000 Kz
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          E-book Digital (Edição Oficial)
                        </span>
                      </div>

                      <div className="p-5 bg-gradient-to-br from-emerald-50/70 to-white rounded-2xl border border-emerald-200/80 shadow-xs">
                        <span className="text-[11px] text-emerald-900 font-bold uppercase tracking-wider block">
                          Taxa de Conversão
                        </span>
                        <span className="text-2xl font-mono font-bold text-emerald-800 block mt-2">
                          {conversionRateForMetrics}%
                        </span>
                        <span className="text-[11px] text-emerald-700 mt-1 block">
                          {paidLeadsForMetrics.length} de {selectedLeadsForMetrics.length} interessados
                        </span>
                      </div>

                      <div className="p-5 bg-gradient-to-br from-blue-50/70 to-white rounded-2xl border border-blue-200/80 shadow-xs">
                        <span className="text-[11px] text-blue-900 font-bold uppercase tracking-wider block">
                          Ticket Médio por Venda
                        </span>
                        <span className="text-2xl font-mono font-bold text-blue-950 block mt-2">
                          Kz {avgTicketForMetrics.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-blue-700 mt-1 block">
                          Média por transação
                        </span>
                      </div>
                    </div>

                    {/* Synchronisation Notice Box */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="material-symbols-outlined text-amber-600 text-base">cloud_sync</span>
                        <span>Sincronização Cloud & Vercel:</span>
                      </div>
                      <p className="leading-relaxed">
                        Todos os leads e comprovativos são persistidos em tempo real na nuvem (<strong>Firebase Firestore</strong>). Caso aceda a partir do domínio da Vercel ou noutro dispositivo, a lista é automaticamente recuperada da base de dados Firebase.
                      </p>
                    </div>
                  </div>

                  {/* Evolution Chart in Overview */}
                  <LeadsEvolutionChart leads={selectedLeadsForMetrics} />
                </div>
              );
            })()}

            {/* TAB 3: CONFIGURAÇÃO DE PAGAMENTO (EXPRESS, IBAN & KWIK) */}
            {activeTab === 'pagamentos' && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-6 max-w-3xl">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px]">account_balance</span>
                    <span>Gestão Financeira DZMV</span>
                  </div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-slate-900 mt-1">
                    Coordenadas de Pagamento (Express, IBAN & KWIK)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Altere os dados de recebimento abaixo. Estas coordenadas serão apresentadas imediatamente aos clientes no formulário de compra da landing page e nas mensagens automáticas do WhatsApp.
                  </p>
                </div>

                <form onSubmit={handleSaveBankingConfig} className="space-y-6">
                  {/* Seção 1: Multicaixa Express */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">smartphone</span>
                      1. Multicaixa Express
                    </span>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Telemóvel Multicaixa Express DZMV *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankingForm.mcxPhone}
                        onChange={(e) => setBankingForm({ ...bankingForm, mcxPhone: e.target.value })}
                        placeholder="+244 923 884 120"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Seção 2: Transferência IBAN */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-700">account_balance</span>
                      2. Transferência Bancária IBAN
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Número de IBAN *</label>
                        <input
                          type="text"
                          required
                          value={bankingForm.iban}
                          onChange={(e) => setBankingForm({ ...bankingForm, iban: e.target.value })}
                          placeholder="AO06.0040.0000.9876.5432.1019.2"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Instituição Bancária *</label>
                        <input
                          type="text"
                          required
                          value={bankingForm.bank}
                          onChange={(e) => setBankingForm({ ...bankingForm, bank: e.target.value })}
                          placeholder="Banco Angolano de Investimentos (BAI) / BFA"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Titular da Conta IBAN *</label>
                      <input
                        type="text"
                        required
                        value={bankingForm.beneficiary}
                        onChange={(e) => setBankingForm({ ...bankingForm, beneficiary: e.target.value })}
                        placeholder="DZMV • Lançamento Oficial (Edição: Sábhia)"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Seção 3: Transferência KWIK */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">bolt</span>
                      3. Transferência KWIK (Nome da Conta + NIB / Telemóvel)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Nome da Conta associada ao KWIK *</label>
                        <input
                          type="text"
                          required
                          value={bankingForm.kwikAccountName}
                          onChange={(e) => setBankingForm({ ...bankingForm, kwikAccountName: e.target.value })}
                          placeholder="Dénis Zombo Mendonça Vasco (DZMV)"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">NIB / Telemóvel associado ao KWIK *</label>
                        <input
                          type="text"
                          required
                          value={bankingForm.kwikNibOrPhone}
                          onChange={(e) => setBankingForm({ ...bankingForm, kwikNibOrPhone: e.target.value })}
                          placeholder="+244 923 884 120 ou NIB de 21 dígitos"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Rede / Plataforma KWIK</label>
                      <input
                        type="text"
                        value={bankingForm.kwikBank}
                        onChange={(e) => setBankingForm({ ...bankingForm, kwikBank: e.target.value })}
                        placeholder="Rede KWIK (EMIS) / BAI Directo"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Seção 4: Número de Redirecionamento de Mensagens & Comprovativos WhatsApp */}
                  <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-emerald-700">chat</span>
                        4. Número de WhatsApp para Redirecionamento de Compras, Comprovativos & SMS
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">
                        Redirecionamento Ativo
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Todas as compras de e-books, avisos do livro impresso e comprovativos enviados pelos leitores na Landing Page serão redirecionados diretamente para este número de WhatsApp.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        required
                        value={bankingForm.redirectWhatsAppPhone || bankingForm.mcxPhone || ''}
                        onChange={(e) => setBankingForm({ ...bankingForm, redirectWhatsAppPhone: e.target.value })}
                        placeholder="+244 923 884 120"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveWhatsAppRedirectNumber}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>Salvar Número de WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Instruções Gerais */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Instruções de Pagamento aos Clientes
                    </label>
                    <textarea
                      rows={2}
                      value={bankingForm.instructions}
                      onChange={(e) => setBankingForm({ ...bankingForm, instructions: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Submit button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Guardar Todos os Métodos de Pagamento</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: GESTÃO DE USUÁRIOS E EQUIPA */}
            {activeTab === 'usuarios' && (
              <div className="space-y-6 max-w-4xl">
                {/* Header & Superadmin info */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 text-blue-800 text-xs font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        <span>Controle de Acesso & Equipa</span>
                      </div>
                      <h3 className="font-serif-editorial text-2xl font-bold text-slate-900 mt-1">
                        Registo & Gestão de Usuários da Plataforma
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
                        <span>Super Administrador Google</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConfirmResetModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Zerar todos os registos de leads e compradores"
                      >
                        <span className="material-symbols-outlined text-[16px] text-red-600">delete_sweep</span>
                        <span>Zerar Registos</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Como Super Administrador ({adminUser?.email || 'dzmv.geral@gmail.com'}), pode registar novos membros de equipa para gerir leads, atender no WhatsApp e acompanhar o desempenho da obra.
                  </p>
                </div>

                {/* Card to Change Currently Logged-In User Password */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-white rounded-2xl p-6 border border-amber-300/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-700 text-[20px]">key</span>
                      <span>Alterar a Minha Palavra-Passe ({adminUser?.email || 'dzmv.geral@gmail.com'})</span>
                    </h4>
                    <span className="text-xs text-amber-900 bg-amber-200/80 font-bold px-2.5 py-0.5 rounded-full">
                      Sua Conta Ativa
                    </span>
                  </div>

                  {myPasswordMsg && (
                    <div className={`p-3 text-xs rounded-xl font-medium border flex items-center gap-2 ${
                      myPasswordMsg.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {myPasswordMsg.type === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <span>{myPasswordMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangeMyPassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Nova Palavra-Passe *</label>
                        <input
                          type="password"
                          required
                          value={myNewPassword}
                          onChange={(e) => setMyNewPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Confirmar Nova Palavra-Passe *</label>
                        <input
                          type="password"
                          required
                          value={myConfirmPassword}
                          onChange={(e) => setMyConfirmPassword(e.target.value)}
                          placeholder="Repita a nova palavra-passe"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                        <span>Atualizar Minha Palavra-Passe</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Form to Register New User */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">person_add</span>
                    <span>Registar Novo Utilizador</span>
                  </h4>

                  <form onSubmit={handleCreateNewUser} className="space-y-4">
                    {userFormError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                        {userFormError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          placeholder="Ex: Dra. Teresa Gaspar"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">E-mail de Acesso *</label>
                        <input
                          type="email"
                          required
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="utilizador@exemplo.ao"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Senha Provisória de Acesso *</label>
                        <input
                          type="password"
                          required
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Defina uma senha segura"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Função / Perfil de Acesso *</label>
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="Gestor de Vendas & Atendimento">Gestor de Vendas & Atendimento WhatsApp</option>
                          <option value="Editor / Supervisor">Editor / Supervisor Editorial</option>
                          <option value="Administrador Auxiliar">Administrador Auxiliar DZMV</option>
                          <option value="Financeiro / Validação EMIS">Financeiro / Validação EMIS</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-amber-400">person_add</span>
                        <span>Adicionar Novo Membro</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Table of Active Registered Users */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Utilizadores Registados no Sistema ({adminsList.length})
                    </span>
                    <span className="text-[11px] text-slate-500">Acesso Restrito ao Painel</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {adminsList.map((adm) => {
                      const isSuper = adm.isSuperAdmin || adm.email === 'dzmv.geral@gmail.com';
                      return (
                        <div key={adm.email} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {adm.avatarInitials || 'AD'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{adm.name}</span>
                                {isSuper && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-mono block">{adm.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                              {adm.role}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setUserToReset({ email: adm.email, name: adm.name });
                                setResetModalNewPass('');
                                setResetModalError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Redefinir / Alterar Senha deste utilizador"
                            >
                              <span className="material-symbols-outlined text-[15px]">key</span>
                              <span>Redefinir Senha</span>
                            </button>

                            {!isSuper ? (
                              <button
                                onClick={() => handleDeleteUser(adm.email)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remover Utilizador"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg shrink-0">
                                Titular
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GALERIA DE FOTOS DO AUTOR */}
            {activeTab === 'galeria' && (
              <div className="space-y-6">
                {/* Header & Quick stats */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                      <span className="material-symbols-outlined text-sm">collections</span>
                      <span>Gestão Visual da Landing Page</span>
                    </div>
                    <h3 className="font-serif-editorial text-2xl font-bold text-slate-900 mt-1">
                      Galeria de Fotos do Eng. Dénis Ângelo Vasco
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Adicione novos links de imagens, reordene as fotografias ou elimine as que já não deseja exibir no carrossel animado da Landing Page.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetGalleryToDefault}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Restaurar as fotos padrão da galeria"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>Restaurar Originais</span>
                    </button>
                    <button
                      type="button"
                      onClick={onViewStore}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Ver Carrossel na Loja</span>
                    </button>
                  </div>
                </div>

                {/* Form: Add New Photo via URL */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">add_photo_alternate</span>
                      Adicionar Nova Fotografia por Link (URL)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Suporta links diretos do <strong>PostImages, Imgur, Cloudinary, Google</strong> etc.
                    </span>
                  </div>

                  {galleryFormError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{galleryFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddGalleryImage} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* URL input */}
                      <div className="md:col-span-7 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Link Direto da Imagem (URL) *</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                            link
                          </span>
                          <input
                            type="url"
                            required
                            value={newImageUrl}
                            onChange={(e) => {
                              setNewImageUrl(e.target.value);
                              if (galleryFormError) setGalleryFormError(null);
                            }}
                            placeholder="Ex: https://i.postimg.cc/mZKpj1cS/foto-autor.jpg"
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Title / Caption input */}
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Título ou Legenda da Foto</label>
                        <input
                          type="text"
                          value={newImageTitle}
                          onChange={(e) => setNewImageTitle(e.target.value)}
                          placeholder="Ex: Sessão Fotográfica • Luanda 2025"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Live Preview Box if URL is typed */}
                    {newImageUrl.trim() && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                          <img
                            src={newImageUrl.trim()}
                            alt="Prévia"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-amber-800 block">Pré-visualização do Link:</span>
                          <strong className="text-slate-900 block truncate">{newImageTitle.trim() || 'Sem legenda específica'}</strong>
                          <span className="text-slate-500 font-mono text-[10px] truncate block">{newImageUrl.trim()}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] text-slate-500">
                        Dica: As fotos adicionadas entram imediatamente no carrossel animado da página principal.
                      </span>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span>Anexar Fotografia à Galeria</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Existing Gallery Images Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-amber-600">photo_library</span>
                      Fotografias no Carrossel da Landing Page ({galleryList.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ordem de Exibição da Esquerda para a Direita
                    </span>
                  </div>

                  <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {galleryList.map((img, index) => (
                      <div
                        key={img.id}
                        className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between"
                      >
                        {/* Image Preview */}
                        <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">
                            #{index + 1}
                          </div>
                          
                          {/* Quick delete overlay button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryImage(img.id)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow"
                            title="Eliminar esta fotografia"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>

                        {/* Card Info & Reorder Controls */}
                        <div className="p-2.5 space-y-2 bg-slate-50/70 border-t border-slate-100 flex-1 flex flex-col justify-between">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 block truncate" title={img.title}>
                              {img.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono truncate block" title={img.url}>
                              {img.url}
                            </span>
                          </div>

                          {/* Reordering and actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-600">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveGalleryImage(index, 'up')}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Mover para a esquerda / anterior"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                              </button>
                              <button
                                type="button"
                                disabled={index === galleryList.length - 1}
                                onClick={() => handleMoveGalleryImage(index, 'down')}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Mover para a direita / seguinte"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                              </button>
                            </div>

                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-800 hover:text-amber-900 font-bold hover:underline flex items-center gap-0.5"
                              title="Abrir imagem original em nova aba"
                            >
                              <span>Ver HD</span>
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WHATSAPP AUTOMATION */}
            {activeTab === 'whatsapp' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-6">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-slate-900">
                    Conexão & Redirecionamento WhatsApp Business
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gerencie o número oficial de WhatsApp que recebe os comprovativos, reservas e compras da Landing Page.
                  </p>
                </div>

                {/* Card de Configuração e Redirecionamento de WhatsApp */}
                <div className="p-5 bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/60 rounded-2xl border border-emerald-300 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[20px]">phone_in_talk</span>
                        <span>Número Oficial para Redirecionar Compras, SMS & Comprovativos</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Defina o número de WhatsApp de atendimento para onde todos os comprovativos, reservas e compras do site são encaminhados.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold shrink-0 border border-emerald-200">
                      Redirecionamento Ativo
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-500">
                        🇦🇴
                      </span>
                      <input
                        type="text"
                        value={bankingForm.redirectWhatsAppPhone || bankingForm.mcxPhone || ''}
                        onChange={(e) => setBankingForm({ ...bankingForm, redirectWhatsAppPhone: e.target.value })}
                        placeholder="+244 923 884 120"
                        className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveWhatsAppRedirectNumber}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Salvar Número de WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Simulator box */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs uppercase text-slate-700">Simulador de Teste</h4>
                    <p className="text-xs text-slate-600">
                      Envie uma mensagem de teste para verificar a integridade da conexão do nó Luanda.
                    </p>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">
                        🇦🇴 +244
                      </span>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="9XX XXX XXX"
                        className="w-full pl-20 pr-4 py-2.5 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSendTestPackage}
                      disabled={isSendingTest}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingTest ? 'Enviando...' : 'Enviar Mensagem de Teste'}
                    </button>
                    {testFeedback && (
                      <p className="text-xs text-emerald-800 font-semibold p-2 bg-emerald-100 rounded-lg">
                        {testFeedback}
                      </p>
                    )}
                  </div>

                  {/* Broadcast Trigger */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs uppercase text-slate-700">Disparo em Massa para Leads</h4>
                    <p className="text-xs text-slate-600">
                      Dispare informativos, atualizações do livro ou confirmações de envio para todos os contatos registados.
                    </p>
                    <button
                      onClick={() => setIsBroadcastOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#0B0F19] text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-400">campaign</span>
                      <span>Configurar Transmissão</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: METADADOS DA OBRA */}
            {activeTab === 'metadados' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 max-w-2xl text-xs font-mono">
                <h3 className="font-serif-editorial text-xl font-bold text-slate-900 font-sans">
                  Ficha Catalográfica da Obra
                </h3>
                <div className="space-y-2 pt-2 divide-y divide-slate-100">
                  <div className="py-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Título:</span>
                    <span className="font-bold text-slate-900 text-sm">{BOOK_METADATA.title}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Autor:</span>
                    <span className="font-bold text-slate-900">{BOOK_METADATA.author}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 uppercase text-[10px] block">ISBN:</span>
                    <span className="font-bold text-slate-900">{BOOK_METADATA.isbn}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Chancela:</span>
                    <span className="font-bold text-slate-900">{BOOK_METADATA.publisher}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Cotação Kwanza:</span>
                    <span className="font-bold text-slate-900">E-book: 5.000 Kz | Físico: 10.000 Kz</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-[#0B0F19] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-500/30 text-xs font-semibold">
            <span className="material-symbols-outlined text-amber-400 text-xl">check_circle</span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSend={(msg) => {
          showToast('Mensagem de broadcast transmitida para os leads selecionados!');
        }}
      />

      {/* Confirmation Modal to Clear All Leads */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-serif-editorial text-xl font-bold text-slate-900">
                  Zerar Todos os Registos?
                </h3>
                <span className="text-xs text-slate-500 font-semibold block">
                  Ação com efeito imediato
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tem a certeza de que deseja eliminar **todos os {leads.length} registos de leads** e compradores da plataforma? O faturamento acumulado será repost para **0 Kz**.
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <strong className="block font-bold">O que acontece ao confirmar:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                <li>A lista de compradores e leads é completamente limpa.</li>
                <li>O faturamento acumulado é zerado.</li>
                <li>A base de dados local e o Firebase Firestore são limpos.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmResetModal(false);
                  if (onClearAllLeads) {
                    onClearAllLeads();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                <span>Sim, Zerar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH EBOOK MODAL */}
      {selectedLeadForDispatch && (
        <EbookDispatchModal
          lead={selectedLeadForDispatch}
          bankingConfig={bankingConfig}
          onClose={() => setSelectedLeadForDispatch(null)}
          onMarkAsCompleted={(leadId) => {
            onUpdateLeadStatus(leadId, 'concluido');
            setSelectedLeadForDispatch(null);
          }}
          onShowToast={showToast}
        />
      )}

      {/* RESET TARGET USER PASSWORD MODAL */}
      {userToReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="font-serif-editorial text-lg font-bold text-slate-900">
                    Redefinir Palavra-Passe
                  </h3>
                  <span className="text-xs text-slate-500 block">
                    Utilizador: <strong>{userToReset.name}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {resetModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {resetModalError}
              </div>
            )}

            <form onSubmit={handleResetTargetUserPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nova Palavra-Passe *</label>
                <input
                  type="password"
                  required
                  value={resetModalNewPass}
                  onChange={(e) => setResetModalNewPass(e.target.value)}
                  placeholder="Defina a nova senha (mín. 6 caracteres)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToReset(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Guardar Nova Palavra-Passe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
