
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Loader, AlertTriangle, Shield } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@portal.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="absolute top-4 right-4">
         <Link to="/" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Cadastro de Fornecedor
          </Link>
       </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
        <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400"/>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
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

            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                <p>Para demonstração, use:</p>
                <p>Email: <span className="font-mono">admin@portal.com</span></p>
                <p>Senha: <span className="font-mono">password</span></p>
            </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 transition-colors"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 text-white" />
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
