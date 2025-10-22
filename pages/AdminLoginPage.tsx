
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader, AlertTriangle, Shield, Sun, Moon } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return newMode;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha no login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4"
      style={{
        backgroundImage: "url('/credores/meioambiental.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        // Fix background relative to viewport so crop doesn't change when content height changes
        backgroundAttachment: 'fixed',
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Link to="/" className="font-medium px-4 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Cadastro de Fornecedor
        </Link>
        <button
          onClick={toggleTheme}
          className="ml-2 p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Alternar tema"
          type="button"
        >
          {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
        </button>
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <img
            src="/credores/ambiental.svg"
            alt="Logo Ambiental"
            className="mx-auto h-20 w-auto mb-4"
          />
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Acesso Administrativo
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Use as credenciais fornecidas para acessar o painel.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">E-mail</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Senha</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start bg-red-50 dark:bg-red-900/50 p-3 rounded-md">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="ml-2 text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                <p>Para novos acessos, use:</p>
                <p>Email: <span className="font-mono">admin@portal.com</span></p>
                <p>Senha: <span className="font-mono">password</span></p>
            </div> */}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center w-full px-6 py-3 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-500"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
