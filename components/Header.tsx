
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              Portal de Fornecedores
            </h1>
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Painel Administrativo</span>
          </div>
          <div className="flex items-center">
            {user && (
              <>
                <span className="text-gray-700 dark:text-gray-300 mr-4 hidden md:inline">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
