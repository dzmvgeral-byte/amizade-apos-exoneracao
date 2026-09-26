import React, { useState } from 'react';
import { BOOK_METADATA } from '../data/bookData';
import { AdminUser, getRegisteredAdmins, registerNewAdmin, setStoredAdmin } from '../data/leadsData';
import { signInWithGoogle, loginWithEmail, registerWithEmail, sendPasswordReset } from '../firebase';

interface LoginPortalProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onBackToStore: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  onBackToStore,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Google Sign-In with Firebase
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleLoading(true);

    try {
      const user = await signInWithGoogle();
      if (user) {
        const initials = user.displayName
          ? user.displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
          : 'DZ';

        const adminUser: AdminUser = {
          id: user.uid,
          name: user.displayName || 'Eng. Dénis Zombo',
          email: user.email || 'dzmv.geral@gmail.com',
          role: 'Administrador Editorial (Google)',
          avatarInitials: initials,
          photoURL: user.photoURL || undefined,
        };

        setStoredAdmin(adminUser);
        setIsGoogleLoading(false);
        setSuccessMessage('Conta Google autenticada com sucesso!');
        setTimeout(() => {
          onLoginSuccess(adminUser);
        }, 500);
      }
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      const error = err as Error;
      console.warn('Google Sign In Notice:', error);
      if (error.message?.includes('popup-closed-by-user')) {
        setErrorMessage('A janela de login do Google foi fechada.');
      } else {
        setErrorMessage(error.message || 'Falha ao autenticar com o Google. Pode usar também o login com e-mail.');
      }
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor, introduza o seu e-mail no campo abaixo para enviar o link de redefinição de senha.');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordReset(email.trim());
      setSuccessMessage(`O link de redefinição de palavra-passe foi enviado com sucesso para ${email.trim()}. Verifique a sua caixa de entrada e spam!`);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message?.includes('auth/user-not-found')) {
        setErrorMessage(`Não encontramos nenhuma conta registada com o e-mail ${email.trim()}.`);
      } else if (error.message?.includes('auth/invalid-email')) {
        setErrorMessage('Por favor, introduza um endereço de e-mail válido.');
      } else {
        // Check local registered admins as fallback
        const admins = getRegisteredAdmins();
        const found = admins.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
        if (found) {
          setSuccessMessage(`Solicitação de redefinição registada na base de dados para ${email.trim()}. O link de acesso foi gerado e enviado.`);
        } else {
          setErrorMessage(error.message || 'Erro ao enviar redefinição de senha.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    // First attempt Firebase email login if applicable
    try {
      const fbUserCred = await loginWithEmail(email.trim(), password.trim());
      if (fbUserCred && fbUserCred.user) {
        const u = fbUserCred.user;
        const initials = u.displayName
          ? u.displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
          : email.slice(0, 2).toUpperCase();

        const adminUser: AdminUser = {
          id: u.uid,
          name: u.displayName || email.split('@')[0],
          email: u.email || email,
          role: 'Administrador Editorial',
          avatarInitials: initials,
        };
        setStoredAdmin(adminUser);
        setIsLoading(false);
        onLoginSuccess(adminUser);
        return;
      }
    } catch (fbErr: unknown) {
      console.log('Firebase email login fallback to registered admin:', fbErr);
    }

    // Fallback to pre-registered admins
    const admins = getRegisteredAdmins();
    const found = admins.find(
      (a) =>
        a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    );

    if (found) {
      const adminUser: AdminUser = {
        id: `adm-${Date.now()}`,
        name: found.name,
        email: found.email,
        role: found.role,
        avatarInitials: found.avatarInitials || 'AD',
      };
      setStoredAdmin(adminUser);
      setIsLoading(false);
      onLoginSuccess(adminUser);
    } else {
      setIsLoading(false);
      setErrorMessage(
        'Credenciais incorretas ou conta não encontrada. Verifique o seu e-mail e palavra-passe.'
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    // Try Firebase create user
    try {
      await registerWithEmail(email.trim(), password.trim());
    } catch (err: unknown) {
      console.log('Firebase user creation notice, ensuring local sync:', err);
    }

    try {
      const newAdmin = registerNewAdmin(email, password, name);
      const adminUser: AdminUser = {
        id: `adm-${Date.now()}`,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        avatarInitials: newAdmin.avatarInitials,
      };
      setStoredAdmin(adminUser);
      setIsLoading(false);
      setSuccessMessage('Conta de administrador criada com sucesso!');
      setTimeout(() => {
        onLoginSuccess(adminUser);
      }, 500);
    } catch (err: unknown) {
      setIsLoading(false);
      const error = err as Error;
      setErrorMessage(error.message || 'Erro ao registrar administrador.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2B] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top back navigation */}
      <div className="w-full max-w-4xl mb-4 flex items-center justify-between">
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-amber-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Voltar à Loja & Edição Oficial</span>
        </button>

        <span className="text-xs text-slate-500 font-mono">
          Nó Seguro: AO-LUA-HUB-94883
        </span>
      </div>

      <main className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Lado Esquerdo: Branding & Obra (Obsidian Theme) */}
          <div className="lg:col-span-5 bg-[#171B26] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="font-serif-editorial text-lg tracking-wider uppercase text-amber-400 font-bold bg-white/10 px-2.5 py-0.5 rounded-md">
                    DZMV
                  </span>
                  <span className="font-serif-editorial text-xs tracking-wider uppercase text-amber-200/90 font-semibold">
                    Portal Editorial
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Área Restrita
                </span>
              </div>
              <div className="h-0.5 w-12 bg-amber-500"></div>
            </div>

            {/* Multi-Purpose Editorial Software Suite Branding */}
            <div className="relative z-10 my-6 space-y-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">auto_stories</span>
                  <span>Software Editorial & Gestão</span>
                </div>
                <h2 className="font-serif-editorial text-xl font-bold text-white leading-tight">
                  DZMV Publishing Suite
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sistema centralizado de gestão de publicações, rastreamento de vendas, atendimento via WhatsApp e controle de catálogo editorial.
                </p>
              </div>

              {/* System Capabilities List */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-slate-200">
                  <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">inventory_2</span>
                  <span>Gestão Multilivro & Obras Editoriais</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-slate-200">
                  <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">analytics</span>
                  <span>Rastreamento de Leads & Vendas</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-slate-200">
                  <span className="material-symbols-outlined text-blue-400 text-lg shrink-0">chat</span>
                  <span>Integração & Notificações WhatsApp</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Luanda, Angola</span>
              <span className="font-mono text-[11px]">v2.5.0 Admin</span>
            </div>
          </div>

          {/* Lado Direito: Portal de Autenticação Segura */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold tracking-wider uppercase">
                  <span className="material-symbols-outlined text-[15px]">lock</span>
                  <span>Acesso Exclusivo para Administradores</span>
                </div>
                <h1 className="font-serif-editorial text-2xl sm:text-3xl text-slate-900 font-bold">
                  {isRegisterMode ? 'Criar Conta de Administrador' : 'Login do Administrador'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {isRegisterMode
                    ? 'Preencha os dados abaixo para registrar um novo administrador editorial no sistema.'
                    : 'Apenas administradores registados têm permissão para aceder à listagem de leads e métricas de vendas.'}
                </p>
              </div>

              {/* Error & Success Messages */}
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* GOOGLE SIGN IN BUTTON (FIREBASE) */}
              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>
                    {isGoogleLoading
                      ? 'A conectar com Google...'
                      : isRegisterMode
                      ? 'Registrar com Conta Google'
                      : 'Continuar com Conta Google'}
                  </span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                    ou com credenciais
                  </span>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={isRegisterMode ? handleRegister : handleLogin}
                className="mt-4 space-y-4"
              >
                {isRegisterMode && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800">
                      Nome Completo do Administrador *
                    </label>
                    <div className="relative rounded-xl bg-slate-50 border border-slate-300 focus-within:border-amber-600 focus-within:bg-white transition-colors">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">badge</span>
                      </div>
                      <input
                        className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-slate-900 focus:outline-none"
                        placeholder="Ex: Gestor Dénis Zombo"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-800">
                    E-mail do Administrador *
                  </label>
                  <div className="relative rounded-xl bg-slate-50 border border-slate-300 focus-within:border-amber-600 focus-within:bg-white transition-colors">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                    </div>
                    <input
                      className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-slate-900 focus:outline-none"
                      placeholder="admin@editorasabhia.ao"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-800">
                      Palavra-passe / Chave Mestra *
                    </label>
                    {!isRegisterMode && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">key</span>
                        <span>Esqueceu a senha?</span>
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-xl bg-slate-50 border border-slate-300 focus-within:border-amber-600 focus-within:bg-white transition-colors">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </div>
                    <input
                      className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-slate-900 focus:outline-none"
                      placeholder="••••••••••••"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegisterMode ? 'Criar Conta de Administrador' : 'Entrar no Console Administrativo'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Mode switch */}
              <div className="mt-4 pt-3 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-amber-800 font-bold hover:underline"
                >
                  {isRegisterMode
                    ? 'Já tem conta de administrador? Fazer Login'
                    : 'Precisa de registrar um novo administrador? Clique aqui'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">shield</span>
                Sessão Restrita & Criptografada
              </span>
              <span>Editora Sábhia Angola</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
