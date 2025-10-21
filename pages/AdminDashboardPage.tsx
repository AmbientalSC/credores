
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Supplier, SupplierStatus } from '../types';
import { Loader, Search, Filter, Trash2 } from 'lucide-react';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;

    setDeleteLoading(true);
    try {
      await firebaseService.deleteSupplier(supplierToDelete.id);
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
      setDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Failed to delete supplier", error);
      alert("Erro ao excluir fornecedor. Tente novamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setSupplierToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center space-x-2 overflow-x-auto pb-2">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
            {(['all', ...Object.values(SupplierStatus)] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${filterStatus === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Empresa</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">CNPJ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Data de Cadastro</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.companyName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{supplier.tradeName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400 font-mono">{supplier.cnpj}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">{new Date(supplier.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={supplier.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/supplier/${supplier.id}`)}
                        className="text-blue-700 hover:text-blue-900 dark:text-indigo-400 dark:hover:text-indigo-200 font-semibold"
                      >
                        Ver Detalhes
                      </button>
                      {user?.role === UserRole.Admin && (
                        <button
                          onClick={() => handleDeleteClick(supplier)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-600 dark:text-gray-400">
                    Nenhum fornecedor encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmação para exclusão */}
      {deleteModalOpen && supplierToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir o fornecedor <strong>{supplierToDelete.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSupplierToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboardPage;
