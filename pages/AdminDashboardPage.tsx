
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebaseService';
import { Supplier, SupplierStatus } from '../types';
import { Loader, Search, Filter } from 'lucide-react';

const StatusBadge: React.FC<{ status: SupplierStatus }> = ({ status }) => {
  const statusStyles = {
    [SupplierStatus.Aprovado]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [SupplierStatus.Reprovado]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [SupplierStatus.EmAnalise]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [SupplierStatus.Pendente]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };
  const statusText = {
     [SupplierStatus.Aprovado]: 'Aprovado',
     [SupplierStatus.Reprovado]: 'Reprovado',
     [SupplierStatus.EmAnalise]: 'Em Análise',
     [SupplierStatus.Pendente]: 'Pendente',
  }
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
      {statusText[status]}
    </span>
  );
};


const AdminDashboardPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<SupplierStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const data = await firebaseService.getSuppliers();
        setSuppliers(data);
      } catch (error) {
        console.error("Failed to fetch suppliers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .filter(s => 
        s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cnpj.includes(searchTerm)
      );
  }, [suppliers, filterStatus, searchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lista de Fornecedores</h2>
                 <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gerencie e analise os cadastros de fornecedores.</p>
            </div>
            <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                 <input
                    type="text"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 />
            </div>
        </div>
         <div className="mt-6 flex items-center space-x-2 overflow-x-auto pb-2">
            <Filter className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0"/>
            {(['all', ...Object.values(SupplierStatus)] as const).map(status => (
                <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                >
                    {status === 'all' ? 'Todos' : {
                        [SupplierStatus.Aprovado]: 'Aprovados',
                        [SupplierStatus.Reprovado]: 'Reprovados',
                        [SupplierStatus.EmAnalise]: 'Em Análise',
                        [SupplierStatus.Pendente]: 'Pendentes',
                    }[status]}
                </button>
            ))}
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Empresa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CNPJ</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data de Cadastro</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ver</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.companyName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{supplier.tradeName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{supplier.cnpj}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(supplier.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={supplier.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => navigate(`/admin/supplier/${supplier.id}`)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                    Ver Detalhes
                  </button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                        Nenhum fornecedor encontrado com os filtros atuais.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
