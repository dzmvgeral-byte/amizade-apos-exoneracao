import React, { useState } from 'react';
import { Lead, buildAdminToLeadWhatsAppLink } from '../data/leadsData';
import { BOOK_METADATA, BankingConfig } from '../data/bookData';

interface EbookDispatchModalProps {
  lead: Lead | null;
  bankingConfig: BankingConfig;
  onClose: () => void;
  onMarkAsCompleted: (leadId: string) => void;
  onShowToast: (msg: string) => void;
}

export const EbookDispatchModal: React.FC<EbookDispatchModalProps> = ({
  lead,
  bankingConfig,
  onClose,
  onMarkAsCompleted,
  onShowToast,
}) => {
  if (!lead) return null;

  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [templateType, setTemplateType] = useState<'approval' | 'pending_payment' | 'thank_you'>('approval');

  // Download Link for the eBook (Direct Interactive Reader & PDF/ePub Delivery)
  const ebookDownloadUrl = `${window.location.origin}/?reader=open`;

  // --- TEMPLATE GENERATION LOGIC ---

  // WhatsApp Message Templates
  const getWhatsAppMessage = () => {
    if (templateType === 'approval') {
      return `Olá, ${lead.fullName}! 🇦🇴

 Confirmamos com sucesso o recebimento do seu pagamento para o livro *"Amizade após Exoneração"* (Eng. Dénis Zombo • Edição Editora Sábhia - Brasil).

 📖 *O seu E-book Digital já está liberado!*
Aceda ao livro completo, PDF HD e leitor interativo no link abaixo:
🔗 ${ebookDownloadUrl}

 Detalhes da Encomenda:
• Leitor: ${lead.fullName}
• Província: ${lead.province}
• Formato: E-book Digital (PDF HD + ePub)
• Valor Pago: ${lead.amountFormatted}

Muito obrigado pela confiança! Qualquer dúvida sobre o leitor ou ficheiros, responda a esta mensagem.`;
    }

    if (templateType === 'pending_payment') {
      const isExpress = lead.paymentMethod.toLowerCase().includes('express');
      const isKwik = lead.paymentMethod.toLowerCase().includes('kwik') || lead.paymentMethod.toLowerCase().includes('quick');
      
      let coord = '';
      if (isKwik) {
        coord = `⚡ *KWIK (EMIS):* ${bankingConfig.kwikNibOrPhone} (${bankingConfig.kwikAccountName})`;
      } else if (isExpress) {
        coord = `📱 *Multicaixa Express:* ${bankingConfig.mcxPhone}`;
      } else {
        coord = `🏦 *IBAN:* ${bankingConfig.iban} (${bankingConfig.bank})\n👤 *Titular:* ${bankingConfig.beneficiary}`;
      }

      const itemPrice = lead.amountFormatted || (lead.format === 'fisico' ? '10.000 Kz' : '5.000 Kz');

      return `Olá, ${lead.fullName}! 🇦🇴

Aqui é da equipa oficial DZMV (Lançamento da obra *"Amizade após Exoneração"* do Eng. Dénis Zombo).

Registamos o seu pedido para o *${lead.formatLabel} (${itemPrice})*.

 Coordenadas para Pagamento (${lead.paymentMethod}):
${coord}

💡 Assim que efetuar a transferência, envie o seu comprovativo nesta conversa para liberação imediata do livro.`;
    }

    // thank_you
    return `Olá, ${lead.fullName}! 🇦🇴

Esperamos que esteja a apreciar a leitura de *"Amizade após Exoneração"* do Eng. Dénis Zombo!

 Gostaria de deixar um comentário sobre a obra ou tirar alguma dúvida diretamente com a equipa editorial? Responda a esta mensagem!

A sua opinião é fundamental para a preservação da memória e integridade das nossas instituições. Boa leitura!`;
  };

  // E-mail Subject & Body Templates
  const getEmailSubject = () => {
    if (templateType === 'approval') {
      return `[Confirmação & Entrega] O seu E-book "Amizade após Exoneração" está disponível - DZMV Editora Sábhia`;
    }
    if (templateType === 'pending_payment') {
      return `[Instruções de Pagamento] "Amizade após Exoneração" - Eng. Dénis Zombo`;
    }
    return `[Agradecimento & Leitura] "Amizade após Exoneração" - Eng. Dénis Zombo`;
  };

  const getEmailBody = () => {
    if (templateType === 'approval') {
      return `Prezado(a) ${lead.fullName},

Com os nossos melhores cumprimentos editoriais.

Confirmamos a validação e aprovação do seu pagamento para o e-book da obra:
"Amizade após Exoneração: O Valor da Lealdade e a Transição da Liderança"
Autor: Eng. Dénis Zombo Mendonça Vasco (DZMV)
Chancela: Editora Sábhia (Edição Oficial 2025)

==================================================
 SEU LINK DE ACESSO E DOWNLOAD IMEDIATO:
${ebookDownloadUrl}
==================================================

DADOS DA ENCOMENDA:
• Beneficiário: ${lead.fullName}
• E-mail Registado: ${lead.email}
• WhatsApp de Envio: ${lead.phone}
• Província: ${lead.province}
• Formato: E-book Digital Completo (PDF HD + ePub Fluído)
• Valor Liquidado: ${lead.amountFormatted}

Caso necessite de suporte técnico no descarregamento ou leitor interativo, responda a este e-mail ou contacte a nossa equipa via WhatsApp (+244 923 884 120).

Atenciosamente,

Equipa Editorial DZMV • Editora Sábhia
Luanda, Angola`;
    }

    if (templateType === 'pending_payment') {
      return `Prezado(a) ${lead.fullName},

Agradecemos o seu interesse na obra "Amizade após Exoneração" do Eng. Dénis Zombo.

Para finalizar o seu pedido e receber imediatamente os ficheiros digitais, por favor efetue a liquidação de ${lead.amountFormatted} através de uma das coordenadas abaixo:

1. Multicaixa Express: ${bankingConfig.mcxPhone}
2. IBAN Oficial: ${bankingConfig.iban} (${bankingConfig.bank} - ${bankingConfig.beneficiary})
3. KWIK / BAI Directo: ${bankingConfig.kwikNibOrPhone} (${bankingConfig.kwikAccountName})

Após a transferência, anexe o comprovativo por resposta a este e-mail ou via WhatsApp.

Atenciosamente,
Equipa Editorial DZMV`;
    }

    return `Prezado(a) ${lead.fullName},

Desejamos que esteja a desfrutar da leitura de "Amizade após Exoneração".

Caso pretenda partilhar as suas impressões ou encomendar novos exemplares, a nossa equipa permanece à total disposição.

Com consideração,
Eng. Dénis Zombo & Editora Sábhia`;
  };

  const whatsappMessageText = getWhatsAppMessage();
  const emailSubjectText = getEmailSubject();
  const emailBodyText = getEmailBody();

  const handleOpenWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(link, '_blank');
    if (templateType === 'approval') {
      onMarkAsCompleted(lead.id);
      onShowToast(`E-book enviado para ${lead.fullName} via WhatsApp! Status atualizado para 'Concluído'.`);
    } else {
      onShowToast(`Atendimento de WhatsApp iniciado para ${lead.fullName}`);
    }
  };

  const handleOpenEmail = () => {
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(emailSubjectText)}&body=${encodeURIComponent(emailBodyText)}`;
    window.open(mailtoLink, '_blank');
    if (templateType === 'approval') {
      onMarkAsCompleted(lead.id);
      onShowToast(`E-mail com e-book disparado para ${lead.email}! Status atualizado para 'Concluído'.`);
    } else {
      onShowToast(`E-mail de cobrança/instruções aberto para ${lead.email}`);
    }
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappMessageText);
    onShowToast('Mensagem para WhatsApp copiada para a área de transferência!');
  };

  const handleCopyEmail = () => {
    const fullEmailContent = `Assunto: ${emailSubjectText}\n\n${emailBodyText}`;
    navigator.clipboard.writeText(fullEmailContent);
    onShowToast('Conteúdo do E-mail copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header Bar */}
        <div className="bg-[#0B0F19] text-white p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">send</span>
            </div>
            <div>
              <h3 className="font-serif-editorial text-xl font-bold text-white">
                Enviar E-book / Notificação Pronta
              </h3>
              <p className="text-xs text-amber-300">
                Cliente: <strong className="text-white">{lead.fullName}</strong> • {lead.phone} • {lead.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Template Selector Bar */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              1. Selecionar Modelo de Mensagem Pronta:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setTemplateType('approval')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  templateType === 'approval'
                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">verified</span>
                <div>
                  <span className="text-xs font-bold block">Entrega do E-book</span>
                  <span className="text-[10px] text-slate-500 block">Confirmação de pagamento + Link</span>
                </div>
              </button>

              <button
                onClick={() => setTemplateType('pending_payment')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  templateType === 'pending_payment'
                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-blue-600 text-lg shrink-0 mt-0.5">account_balance_wallet</span>
                <div>
                  <span className="text-xs font-bold block">Instruções Pagamento</span>
                  <span className="text-[10px] text-slate-500 block">Coordenadas Express/IBAN/KWIK</span>
                </div>
              </button>

              <button
                onClick={() => setTemplateType('thank_you')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  templateType === 'thank_you'
                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">favorite</span>
                <div>
                  <span className="text-xs font-bold block">Agradecimento</span>
                  <span className="text-[10px] text-slate-500 block">Acompanhamento pós-leitura</span>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Selector Tabs (WhatsApp vs E-mail) */}
          <div className="border-b border-slate-200 flex items-center gap-4">
            <button
              onClick={() => setActiveChannel('whatsapp')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeChannel === 'whatsapp'
                  ? 'border-[#25D366] text-[#1EBE5D]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Disparo por WhatsApp ({lead.phone})</span>
            </button>

            <button
              onClick={() => setActiveChannel('email')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeChannel === 'email'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-lg">mail</span>
              <span>Disparo por E-mail ({lead.email})</span>
            </button>
          </div>

          {/* Preview Box for WhatsApp */}
          {activeChannel === 'whatsapp' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider">Pré-visualização da Mensagem WhatsApp:</span>
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>Copiar Mensagem</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#DCF8C6]/40 border border-[#25D366]/30 text-slate-900 font-sans text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-2xs font-medium">
                {whatsappMessageText}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  <span>Copiar para Área de Transferência</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Disparar no WhatsApp do Leitor</span>
                </button>
              </div>
            </div>
          )}

          {/* Preview Box for E-mail */}
          {activeChannel === 'email' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider">Pré-visualização do E-mail Editorial:</span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-blue-800 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>Copiar E-mail</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-slate-900 font-sans text-xs sm:text-sm space-y-3 shadow-2xs">
                <div className="pb-2 border-b border-blue-200/80 font-bold text-slate-900">
                  <span className="text-slate-500 font-normal">Assunto: </span>
                  {emailSubjectText}
                </div>
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                  {emailBodyText}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  <span>Copiar Texto do E-mail</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenEmail}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-lg">mail</span>
                  <span>Disparar E-mail para {lead.email}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-amber-600 text-base">verified</span>
            <span>Sistema de Envio Autorizado DZMV • Editora Sábhia</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
