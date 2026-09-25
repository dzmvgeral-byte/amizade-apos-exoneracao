import React from 'react';
import { Transaction, BOOK_METADATA } from '../data/bookData';

interface ReaderDossierModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onResendWhatsApp: (phone: string, name: string) => void;
}

export const ReaderDossierModal: React.FC<ReaderDossierModalProps> = ({
  transaction,
  onClose,
  onResendWhatsApp,
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Luxury Obsidian Theme */}
        <div className="bg-[#0B0F19] text-white p-6 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg flex items-center justify-center border border-amber-500/30">
                {transaction.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                    Ficha Editorial do Leitor
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <h3 className="font-semibold text-lg text-white">{transaction.clientName}</h3>
                <p className="text-xs text-white/60">{transaction.credential}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Província</span>
              <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{transaction.province}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Formato</span>
              <span className="text-xs font-semibold text-amber-700 mt-0.5 block">{transaction.formatLabel}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Pago</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block font-mono">{transaction.amountFormatted}</span>
            </div>
          </div>

          {/* Delivery & Security Tracking */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-600">security</span>
              Auditoria de Despacho & Direitos Autorais
            </h4>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200/60 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">ID da Licença Digital:</span>
                <span className="font-mono font-bold text-slate-900">SABHIA-LIC-{transaction.id.toUpperCase()}-2025</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Canal de Envio Primário:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">chat</span>
                  WhatsApp Meta Cloud API (+244 923 884 120)
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Carimbo D'água Anti-Pirataria:</span>
                <span className="font-mono text-slate-800">Assinado com Tel: {transaction.phone}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Download Status:</span>
                <span className="text-emerald-700 font-semibold">100% Concluído (PDF + ePub)</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Alerta de Livro Físico:</span>
                {transaction.wantsPhysicalAlert ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                    <span className="material-symbols-outlined text-[13px] text-amber-700">notifications_active</span>
                    Sim, avisar quando impresso
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Não solicitado</span>
                )}
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Observações Editoriais:</span>
                <span className="text-slate-700 italic">{transaction.notes || "Sem notas adicionais."}</span>
              </div>
            </div>
          </div>

          {/* Dedicated Section for Physical or Ebook */}
          {transaction.format === 'fisico' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                Expedição de Exemplar Físico (28.500 Kz)
              </span>
              <p className="text-amber-800 leading-relaxed">
                Exemplar capa dura com acabamento premium e autógrafo do <strong>Eng. Dénis Zombo</strong>.
                Expedição coordenada através da central editorial em Luanda para a província de {transaction.province}.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">devices</span>
                Licença E-book Digital (10.500 Kz)
              </span>
              <p className="text-blue-800 leading-relaxed">
                Acesso perpétuo nos formatos PDF HD e ePub. Ficheiro encriptado com chaves da Editora Sábhia.
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Fechar Dossiê
          </button>
          
          <button 
            onClick={() => {
              onResendWhatsApp(transaction.phone, transaction.clientName);
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            Reenviar Link via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
