import { getStoredBankingConfig } from './bookData';

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  province: string;
  format: 'ebook' | 'fisico';
  formatLabel: string;
  amountKz: number;
  amountFormatted: string;
  paymentMethod: string;
  status: 'novo' | 'contactado' | 'pago' | 'concluido' | 'cancelado';
  statusLabel: string;
  createdAt: string;
  timestamp: number;
  notes?: string;
  whatsappMessageSent?: boolean;
  wantsPhysicalAlert?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
  photoURL?: string;
  password?: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
}

const DEFAULT_ADMINS: (AdminUser & { password?: string })[] = [
  {
    id: 'admin-super',
    email: 'dzmv.geral@gmail.com',
    password: 'admin123',
    name: 'Eng. Dénis Zombo',
    role: 'Super Administrador & Autor',
    avatarInitials: 'DZ',
    createdAt: '24/09/2026',
    isSuperAdmin: true,
  },
  {
    id: 'admin-gestor',
    email: 'gestor@editorasabhia.ao',
    password: 'admin123',
    name: 'Gestor Editorial Sábhia',
    role: 'Gestor de Vendas & Atendimento',
    avatarInitials: 'GE',
    createdAt: '24/09/2026',
    isSuperAdmin: false,
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    fullName: 'Dr. António dos Santos',
    email: 'antonio.santos@advocacia.ao',
    phone: '+244 923 456 789',
    province: 'Luanda',
    format: 'ebook',
    formatLabel: 'E-book Digital',
    amountKz: 10500,
    amountFormatted: 'Kz 10.500',
    paymentMethod: 'Multicaixa Express',
    status: 'concluido',
    statusLabel: 'E-book Entregue',
    createdAt: 'Hoje às 14:32',
    timestamp: Date.now() - 3600000 * 2,
    notes: 'Consultor Jurídico. Recebeu o link PDF + ePub no WhatsApp.',
    whatsappMessageSent: true,
  },
  {
    id: 'lead-2',
    fullName: 'Dra. Maria de Fátima Kapela',
    email: 'maria.kapela@rh-hospital.ao',
    phone: '+244 912 884 920',
    province: 'Huambo',
    format: 'fisico',
    formatLabel: 'Livro Físico (Reserva Gratuita)',
    amountKz: 0,
    amountFormatted: 'Reserva Gratuita',
    paymentMethod: 'Pague na Entrega',
    status: 'contactado',
    statusLabel: 'Reserva Registada',
    createdAt: 'Hoje às 13:18',
    timestamp: Date.now() - 3600000 * 3,
    notes: 'Diretora de RH. Solicitou reserva de exemplar autografado para quando a impressão for concluída.',
    whatsappMessageSent: true,
  },
  {
    id: 'lead-3',
    fullName: 'Eng. Bernardo Cassoma',
    email: 'b.cassoma@universidade.ao',
    phone: '+244 934 112 550',
    province: 'Benguela',
    format: 'ebook',
    formatLabel: 'E-book Digital',
    amountKz: 8500,
    amountFormatted: 'Kz 8.500',
    paymentMethod: 'Multicaixa Express',
    status: 'concluido',
    statusLabel: 'E-book Entregue',
    createdAt: 'Hoje às 11:45',
    timestamp: Date.now() - 3600000 * 5,
    notes: 'Docente Universitário em Benguela.',
    whatsappMessageSent: true,
  },
  {
    id: 'lead-4',
    fullName: 'Beatriz Van-Dúnem',
    email: 'beatriz.dunen@bfa.ao',
    phone: '+244 945 009 214',
    province: 'Cunene',
    format: 'ebook',
    formatLabel: 'E-book Digital',
    amountKz: 8500,
    amountFormatted: 'Kz 8.500',
    paymentMethod: 'Transferência IBAN',
    status: 'contactado',
    statusLabel: 'Contactado no WhatsApp',
    createdAt: 'Hoje às 10:04',
    timestamp: Date.now() - 3600000 * 7,
    notes: 'Gestora Financeira no Cunene. Aguardando confirmação do talão.',
    whatsappMessageSent: true,
  },
  {
    id: 'lead-5',
    fullName: 'Carlos Quaresma',
    email: 'carlos.quaresma@energia.co.ao',
    phone: '+244 928 300 114',
    province: 'Luanda',
    format: 'fisico',
    formatLabel: 'Livro Físico (Reserva Gratuita)',
    amountKz: 0,
    amountFormatted: 'Reserva Gratuita',
    paymentMethod: 'Pague na Entrega',
    status: 'contactado',
    statusLabel: 'Reserva Registada',
    createdAt: 'Ontem às 18:20',
    timestamp: Date.now() - 3600000 * 24,
    notes: 'Empresário em Luanda. Reservou exemplar para entrega no Miramar.',
    whatsappMessageSent: true,
  },
];

const LEADS_STORAGE_KEY = 'sabhia_leads_v1';
const ADMIN_STORAGE_KEY = 'sabhia_current_admin_v1';
const REGISTERED_ADMINS_KEY = 'sabhia_registered_admins_v1';

export function getStoredLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearAllStoredLeads() {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Error clearing leads', e);
  }
}

export function saveStoredLeads(leads: Lead[]) {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Error saving leads', e);
  }
}

export function getStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: AdminUser | null) {
  try {
    if (admin) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error setting admin', e);
  }
}

export function getRegisteredAdmins(): (AdminUser & { password?: string })[] {
  try {
    const raw = localStorage.getItem(REGISTERED_ADMINS_KEY);
    if (!raw) {
      localStorage.setItem(REGISTERED_ADMINS_KEY, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ADMINS;
  }
}

export function saveRegisteredAdmins(admins: (AdminUser & { password?: string })[]) {
  try {
    localStorage.setItem(REGISTERED_ADMINS_KEY, JSON.stringify(admins));
  } catch (e) {
    console.error('Error saving admins list', e);
  }
}

export function registerNewAdmin(email: string, password: string, name: string, role: string = 'Gestor de Vendas & Atendimento') {
  const admins = getRegisteredAdmins();
  const exists = admins.some((a) => a.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('Já existe um utilizador/administrador registrado com este e-mail.');
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  const newAdmin: AdminUser & { password?: string } = {
    id: `admin-${Date.now()}`,
    email: email.trim().toLowerCase(),
    password: password.trim(),
    name: name.trim(),
    role: role.trim(),
    avatarInitials: initials,
    createdAt: new Date().toLocaleDateString('pt-PT'),
    isSuperAdmin: false,
  };

  admins.push(newAdmin);
  saveRegisteredAdmins(admins);
  return newAdmin;
}

export function deleteRegisteredAdmin(adminEmail: string) {
  const admins = getRegisteredAdmins();
  const target = admins.find(a => a.email.toLowerCase() === adminEmail.toLowerCase());
  if (target?.isSuperAdmin || target?.email === 'dzmv.geral@gmail.com') {
    throw new Error('Não é permitido remover a conta do Super Administrador.');
  }
  const filtered = admins.filter(a => a.email.toLowerCase() !== adminEmail.toLowerCase());
  saveRegisteredAdmins(filtered);
  return filtered;
}

export function updateAdminPassword(email: string, newPassword: string) {
  const admins = getRegisteredAdmins();
  const target = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
  if (!target) {
    throw new Error('Utilizador não encontrado no sistema.');
  }
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }
  target.password = newPassword.trim();
  saveRegisteredAdmins(admins);
  return target;
}

export function buildWhatsAppLink(
  fullName: string,
  email: string,
  phone: string,
  province: string = 'Luanda',
  format: 'ebook' | 'fisico' = 'ebook',
  wantsPhysicalAlert: boolean = false,
  paymentMethod: string = 'Multicaixa Express',
  customWhatsAppPhone?: string
): string {
  let targetNumber = customWhatsAppPhone || '';
  if (!targetNumber) {
    try {
      const cfg = getStoredBankingConfig();
      targetNumber = cfg.redirectWhatsAppPhone || cfg.mcxPhone || '244923884120';
    } catch {
      targetNumber = '244923884120';
    }
  }

  let officialPhone = targetNumber.replace(/[^0-9]/g, '');
  if (officialPhone.length === 9 && (officialPhone.startsWith('9') || officialPhone.startsWith('2'))) {
    officialPhone = `244${officialPhone}`;
  }
  if (!officialPhone) {
    officialPhone = '244923884120';
  }
  
  let physicalAlertNote = '';
  if (wantsPhysicalAlert) {
    physicalAlertNote = `\n🔔 *Interesse Adicional:* Sim, desejo ser avisado(a) quando o Livro Físico Impresso estiver disponível.`;
  }

  const isPhysical = format === 'fisico';
  const formatText = isPhysical ? 'Livro Físico Impresso (Com Capa & Orelhas)' : 'E-book Digital Completo (PDF HD + ePub)';
  const priceText = isPhysical ? '10.000 Kz' : '5.000 Kz';

  const text = `Olá, equipa DZMV! 🇦🇴

Acabei de concluir o meu registo na plataforma oficial para o livro:
📖 *"Amizade após Exoneração"* — Eng. Dénis Zombo
📦 Formato: ${formatText}
💰 Valor: ${priceText}
💳 Forma de Pagamento Escolhida: *${paymentMethod}*

📋 *Meus Dados de Registo:*
👤 Nome: ${fullName.trim()}
📧 E-mail: ${email.trim()}
📱 WhatsApp: ${phone.trim()}${physicalAlertNote}

📎 *Comprovativo:* Finalizei o pagamento e estou a anexar o meu comprovativo aqui nesta mensagem para que possam validar, aprovar e enviar os ficheiros digitais. Muito obrigado!`;

  return `https://wa.me/${officialPhone}?text=${encodeURIComponent(text)}`;
}

export function buildAdminToLeadWhatsAppLink(
  lead: Lead, 
  customBanking?: { 
    bank?: string; 
    iban?: string; 
    mcxPhone?: string; 
    beneficiary?: string;
    kwikAccountName?: string;
    kwikNibOrPhone?: string;
    kwikBank?: string;
    quickAccountName?: string;
    quickNibOrPhone?: string;
    quickBank?: string;
  }
): string {
  const cleanNumber = lead.phone.replace(/[^0-9]/g, '');
  const isPaid = lead.status === 'pago' || lead.status === 'concluido';

  let text = '';
  if (isPaid) {
    text = `Olá, ${lead.fullName}! 🇦🇴

Aqui é da equipa oficial DZMV (Lançamento da obra *"Amizade após Exoneração"* do Eng. Dénis Zombo • Edição: Editora Sábhia).

✅ *Confirmamos com sucesso a validação do seu pagamento para o ${lead.formatLabel}!*

Os seus ficheiros digitais em alta definição (PDF HD + ePub) com assinatura de autenticidade já se encontram prontos para envio.

Por favor, confirme se prefere o envio direto aqui pelo WhatsApp ou no seu e-mail cadastrado (${lead.email}). Estamos à disposição!`;
  } else {
    const isExpress = lead.paymentMethod.toLowerCase().includes('express');
    const isKwik = lead.paymentMethod.toLowerCase().includes('kwik') || lead.paymentMethod.toLowerCase().includes('quick');
    
    let paymentDetail = '';
    if (isKwik) {
      const accName = customBanking?.kwikAccountName || customBanking?.quickAccountName || 'Dénis Zombo Mendonça Vasco (DZMV)';
      const nibPhone = customBanking?.kwikNibOrPhone || customBanking?.quickNibOrPhone || '+244 923 884 120';
      const network = customBanking?.kwikBank || customBanking?.quickBank || 'Rede KWIK (EMIS) / BAI Directo';
      paymentDetail = `⚡ *Transferência KWIK (EMIS / BAI Directo):*\n• Nome da Conta: ${accName}\n• NIB / Telemóvel KWIK: ${nibPhone}\n• Rede: ${network}`;
    } else if (isExpress) {
      paymentDetail = `📱 *Multicaixa Express:* ${customBanking?.mcxPhone || '+244 923 884 120'}`;
    } else {
      paymentDetail = `🏦 *IBAN:* ${customBanking?.iban || 'AO06.0040.0000.9876.5432.1019.2'} (${customBanking?.bank || 'BAI / BFA'})\n👤 *Titular:* ${customBanking?.beneficiary || 'DZMV'}`;
    }

    const physicalNote = lead.wantsPhysicalAlert 
      ? `\n📦 *Nota Registada:* Confirmamos que solicitou aviso prioritário para quando a tiragem impressa física estiver pronta.`
      : '';

    const priceLabel = lead.format === 'fisico' ? '10.000 Kz' : '5.000 Kz';

    text = `Olá, ${lead.fullName}! 🇦🇴

Aqui é da equipa oficial DZMV. Confirmamos a receção do seu pedido para o livro *"Amizade após Exoneração"* do Eng. Dénis Zombo.

📋 *Detalhes do Pedido:*
• Item: ${lead.formatLabel} (${priceLabel})
• Método Escolhido: ${lead.paymentMethod}
• Província: ${lead.province}${physicalNote}

💳 *Coordenadas para Liquidação:*
${paymentDetail}

Assim que efetuar o pagamento (KWIK, Express ou IBAN), basta partilhar o talão/comprovativo aqui neste chat para liberarmos imediatamente o seu E-book. Qualquer dúvida estamos à disposição!`;
  }

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
