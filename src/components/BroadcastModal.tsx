import React, { useState } from 'react';
import { BOOK_METADATA } from '../data/bookData';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string, targetGroup: string) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  onSend,
}) => {
  const [targetGroup, setTargetGroup] = useState('all');
  const [template, setTemplate] = useState('update');
  const [customText, setCustomText] = useState(
    'Estimado(a) leitor(a), aqui é o Eng. Dénis Zombo. Acabamos de disponibilizar uma adenda especial ao capítulo "Recomeços" na plataforma oficial da Editora Sábhia. Aceda à sua área de leitor para baixar a versão 2.0.'
  );
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      onSend(customText, targetGroup);
      onClose();
    }, 1200);
  };

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
              <span className="material-symbols-outlined text-2xl">campaign</span>
            </div>
            <div>
              <h3 className="font-semibold text-base">Disparo de Broadcast WhatsApp</h3>
              <p className="text-xs text-white/60">Meta Cloud API • Transmissão em Massa Luanda Node</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Público-Alvo do Disparo
            </label>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Leitores Autenticados (5.710 contatos)</option>
              <option value="ebook">Compradores do E-book Digital (4.820 contatos)</option>
              <option value="fisico">Compradores do Livro Físico (890 contatos)</option>
              <option value="provincia">Leitores das Províncias fora de Luanda</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Modelo de Mensagem Pré-Aprovado Meta
            </label>
            <select
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                if (e.target.value === 'upgrade') {
                  setCustomText('Convite Especial do Autor: Adquira agora o exemplar impresso de "Amizade após Exoneração" com dedicatória nominal do Eng. Dénis Zombo e entrega sem custos adicionais em Luanda.');
                } else if (e.target.value === 'evento') {
                  setCustomText('Sessão Solene de Autógrafos no Huambo e Luanda com o Eng. Dénis Zombo. Confirme a sua presença VIP gratuita respondendo a esta mensagem.');
                } else {
                  setCustomText('Estimado(a) leitor(a), aqui é o Eng. Dénis Zombo. Acabamos de disponibilizar uma adenda especial ao capítulo "Recomeços" na plataforma oficial da Editora Sábhia. Aceda à sua área de leitor para baixar a versão 2.0.');
                }
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="update">Actualização Editorial & Novo Capítulo (Adenda)</option>
              <option value="upgrade">Oferta de Upgrade para Livro Físico com Autógrafo</option>
              <option value="evento">Convite para Sessão Solene de Lançamento em Angola</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Corpo da Mensagem (WhatsApp Oficial)
            </label>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * A mensagem incluirá carimbo verificado institucional da Editora Sábhia & Veritas Press.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">verified_user</span>
            <span>
              Disparo em conformidade com as diretrizes da Meta Cloud API e do INACOM em Angola.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          
          <button 
            disabled={isSending}
            onClick={handleSend}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0B0F19] text-white hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSending ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Despachando broadcast...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px] text-amber-400">forward_to_inbox</span>
                <span>Iniciar Transmissão Oficial</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
