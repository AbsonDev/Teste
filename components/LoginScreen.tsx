import React, { useState } from 'react';
import { signIn, signInWithEmail, signUpWithEmail } from '../services/firebase';

export const LoginScreen: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Email/Pass State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn();
    } catch (e: any) {
      console.error("Login Error:", e);
      handleAuthError(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e: any) {
      handleAuthError(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (e: any) => {
      // Check specifically for API Key errors which suggest missing config
      if (e.message && e.message.includes('api-key-not-valid')) {
          setError('Erro de configuração do servidor. Contate o suporte.');
      } else {
        switch (e.code) {
            case 'auth/invalid-email':
            setError('E-mail inválido.');
            break;
            case 'auth/user-disabled':
            setError('Usuário desativado.');
            break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
            setError('E-mail ou senha incorretos.');
            break;
            case 'auth/email-already-in-use':
            setError('Este e-mail já está em uso.');
            break;
            case 'auth/weak-password':
            setError('A senha é muito fraca.');
            break;
            default:
            setError(`Erro: ${e.message || 'Tente novamente mais tarde.'}`);
        }
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-100 dark:bg-brand-900 rounded-full blur-3xl opacity-50 dark:opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-100 dark:bg-blue-900 rounded-full blur-3xl opacity-50 dark:opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-sm flex flex-col items-center z-10 animate-slide-up">
        <div className="w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-200 dark:shadow-none mb-6 rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">ListaInteligente</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-lg">
          Suas compras organizadas.
        </p>

        {error && (
          <div className="w-full mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-300 animate-fade-in flex flex-col gap-2">
             <div className="flex gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
             </div>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
          <div>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:placeholder-gray-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:placeholder-gray-500"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="flex items-center gap-2 mb-6 w-full">
           <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
           <span className="text-gray-400 dark:text-gray-600 text-sm font-medium">ou</span>
           <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="mt-8 text-sm text-center text-gray-600 dark:text-gray-400">
          {isSignUp ? 'Já tem uma conta? ' : 'Não tem conta? '}
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }} 
            className="text-brand-600 dark:text-brand-400 font-bold hover:underline focus:outline-none"
          >
            {isSignUp ? 'Entrar' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
};