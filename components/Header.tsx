
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Sun, Moon } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const [darkMode, setDarkMode] = React.useState(() => {
    return document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    setDarkMode((prev: boolean) => {
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

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md w-full">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Portal de Fornecedores</h1>
          <span className="ml-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Painel Administrativo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-700 dark:text-gray-300 hidden md:inline">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Alternar tema"
            type="button"
          >
            {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
