import React from 'react';
import { Transaction, BOOK_METADATA } from '../data/bookData';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onPrint?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B0F19] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <h3 className="font-semibold text-base">Comprovativo Oficial EMIS</h3>
              <p className="text-xs text-white/60">Rede Multicaixa • Banco Nacional de Angola</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Receipt Body with Tear Design */}
        <div className="p-6 space-y-5 bg-[#FAFAFA]">
          {/* Status Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs">
            <span className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              Liquidação Concluída com Sucesso
            </span>
            <span className="font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded font-bold">
              {transaction.emisRef}
            </span>
          </div>

          {/* Book Summary */}
          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <img 
              src={BOOK_METADATA.images.coverFront} 
              alt={BOOK_METADATA.title}
              className="w-12 h-16 object-cover rounded shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1 text-xs">
              <h4 className="font-bold text-slate-900 truncate">{BOOK_METADATA.title}</h4>
              <p className="text-slate-500">{BOOK_METADATA.author}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-medium text-[10px]">
                  {transaction.formatLabel}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-mono font-bold text-slate-900">{transaction.amountFormatted}</span>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 divide-y divide-slate-100 text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Titular do Pagamento:</span>
              <span className="font-semibold text-slate-900">{transaction.clientName}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Credencial / Cargo:</span>
              <span className="text-slate-700">{transaction.credential}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Telemóvel / WhatsApp:</span>
              <span className="font-mono text-slate-900">{transaction.phone}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Província / Localidade:</span>
              <span className="text-slate-700">{transaction.location}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Canal de Liquidação:</span>
              <span className="font-medium text-slate-900">{transaction.paymentMethod}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Entidade Receptora:</span>
              <span className="text-slate-900 font-medium">DZMV (Lançamento Oficial • Edição: Sábhia)</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Data & Hora Oficial:</span>
              <span className="text-slate-700">{transaction.time}</span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500">Status da Entrega WhatsApp:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                {transaction.whatsappStatusLabel}
              </span>
            </div>
          </div>

          {/* Security Hash Stamp */}
          <div className="p-3 bg-slate-100 rounded-lg text-center font-mono text-[10px] text-slate-500">
            HASH-EMIS-ANGOLA: 7F29B8-0040-MCX-{transaction.id.toUpperCase()}-DZMV
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>
          <button 
            onClick={() => {
              window.print();
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B0F19] text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Imprimir Comprovativo
          </button>
        </div>
      </div>
    </div>
  );
};
