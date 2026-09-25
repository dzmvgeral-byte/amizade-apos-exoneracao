import React, { useState, useEffect } from 'react';
import { Lead, AdminUser, getStoredLeads, saveStoredLeads, clearAllStoredLeads, getStoredAdmin, setStoredAdmin } from './data/leadsData';
import { LandingPage } from './components/LandingPage';
import { LoginPortal } from './components/LoginPortal';
import { EditorialDashboard } from './components/EditorialDashboard';
import { EbookReaderModal } from './components/EbookReaderModal';
import { auth, onAuthStateChanged, logoutUser } from './firebase';
import { 
  saveLeadToFirestore, 
  subscribeToFirestoreLeads, 
  updateLeadInFirestore, 
  deleteLeadFromFirestore,
  clearAllLeadsFromFirestore
} from './services/firebaseLeads';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'admin-login' | 'admin-dashboard'>('landing');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
  const [globalNotification, setGlobalNotification] = useState<string | null>(null);

  // Load leads from storage and initialize Firebase sync
  useEffect(() => {
    const loadedLeads = getStoredLeads();
    setLeads(loadedLeads);

    const loadedAdmin = getStoredAdmin();
    if (loadedAdmin) {
      setAdminUser(loadedAdmin);
    }

    // Subscribe to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const initials = firebaseUser.displayName
          ? firebaseUser.displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
          : 'DZ';

        const userObj: AdminUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Administrador',
          email: firebaseUser.email || 'dzmv.geral@gmail.com',
          role: 'Administrador Editorial (Google Cloud)',
          avatarInitials: initials,
          photoURL: firebaseUser.photoURL || undefined,
        };
        setAdminUser(userObj);
        setStoredAdmin(userObj);
      }
    });

    // Subscribe to Firestore Realtime Leads
    const unsubscribeLeads = subscribeToFirestoreLeads((remoteLeads) => {
      if (remoteLeads && remoteLeads.length > 0) {
        setLeads(remoteLeads);
        saveStoredLeads(remoteLeads);
      }
    });

    return () => {
      unsubscribeAuth();
      if (typeof unsubscribeLeads === 'function') {
        unsubscribeLeads();
      }
    };
  }, []);

  const triggerToast = (message: string) => {
    setGlobalNotification(message);
    setTimeout(() => {
      setGlobalNotification(null);
    }, 4500);
  };

  // When a visitor submits their purchase/lead on the landing page
  const handleNewLead = async (newLead: Lead) => {
    const updated = [newLead, ...leads];
    setLeads(updated);
    saveStoredLeads(updated);

    // Persist to Firebase Firestore
    try {
      await saveLeadToFirestore(newLead);
    } catch (e) {
      console.warn('Firebase save notice:', e);
    }

    triggerToast(`Lead de ${newLead.fullName} registado com sucesso!`);
  };

  // Lead status updater from dashboard
  const handleUpdateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    const statusLabels: Record<Lead['status'], string> = {
      novo: 'Novo Lead',
      contactado: 'Contactado no WhatsApp',
      pago: 'Pagamento Confirmado',
      concluido: 'E-book Entregue',
      cancelado: 'Cancelado',
    };

    const newLabel = statusLabels[newStatus];
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, status: newStatus, statusLabel: newLabel } : l
    );
    setLeads(updated);
    saveStoredLeads(updated);

    // Sync to Firestore
    try {
      await updateLeadInFirestore(leadId, { status: newStatus, statusLabel: newLabel });
    } catch (e) {
      console.warn('Firebase update notice:', e);
    }

    triggerToast(`Status do lead atualizado para "${newLabel}"`);
  };

  const handleDeleteLead = async (leadId: string) => {
    const updated = leads.filter((l) => l.id !== leadId);
    setLeads(updated);
    saveStoredLeads(updated);

    // Sync to Firestore
    try {
      await deleteLeadFromFirestore(leadId);
    } catch (e) {
      console.warn('Firebase delete notice:', e);
    }

    triggerToast('Lead removido da base de dados.');
  };

  const handleClearAllLeads = async () => {
    setLeads([]);
    clearAllStoredLeads();
    try {
      await clearAllLeadsFromFirestore();
    } catch (e) {
      console.warn('Firebase clear leads notice:', e);
    }
    triggerToast('Todos os registos de leads e faturamento foram zerados com sucesso!');
  };

  // Admin routing check
  const handleGoToAdmin = () => {
    if (adminUser) {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('admin-login');
    }
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setAdminUser(admin);
    setStoredAdmin(admin);
    setCurrentView('admin-dashboard');
    triggerToast(`Bem-vindo, ${admin.name}! Acesso ao console liberado.`);
  };

  const handleAdminLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.log('Firebase logout notice:', e);
    }
    setAdminUser(null);
    setStoredAdmin(null);
    setCurrentView('landing');
    triggerToast('Sessão administrativa encerrada.');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-[#141B2B] flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {globalNotification && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-md">
          <div className="bg-[#0B0F19] text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 text-xs">
            <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">check_circle</span>
            <span className="font-semibold">{globalNotification}</span>
            <button
              onClick={() => setGlobalNotification(null)}
              className="text-white/40 hover:text-white ml-auto"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: Authentic Sales Landing Page (Default) */}
      {currentView === 'landing' && (
        <LandingPage
          onGoToLogin={handleGoToAdmin}
          onOpenReader={() => setIsReaderModalOpen(true)}
          onNewLead={handleNewLead}
        />
      )}

      {/* VIEW 2: Administrator Login Screen (Only for admins) */}
      {currentView === 'admin-login' && (
        <LoginPortal
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToStore={() => setCurrentView('landing')}
        />
      )}

      {/* VIEW 3: Administrator Dashboard (Lead Management & Sales) */}
      {currentView === 'admin-dashboard' && (
        <EditorialDashboard
          leads={leads}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onDeleteLead={handleDeleteLead}
          onClearAllLeads={handleClearAllLeads}
          adminUser={adminUser}
          onLogout={handleAdminLogout}
          onViewStore={() => setCurrentView('landing')}
          onOpenReader={() => setIsReaderModalOpen(true)}
        />
      )}

      {/* E-book Sample Reader Modal */}
      <EbookReaderModal
        isOpen={isReaderModalOpen}
        onClose={() => setIsReaderModalOpen(false)}
        onBuyClick={() => {
          setIsReaderModalOpen(false);
          const el = document.getElementById('comprar-agora');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />
    </div>
  );
}
