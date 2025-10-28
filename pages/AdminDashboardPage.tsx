import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Search, Trash2 } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../services/firebaseService';
import { Supplier, SupplierStatus, UserRole } from '../types';

const statusLabels: Record<SupplierStatus, string> = {
  [SupplierStatus.Aprovado]: 'Aprovado',
  [SupplierStatus.Reprovado]: 'Reprovado',
  [SupplierStatus.EmAnalise]: 'Em análise',
  [SupplierStatus.Pendente]: 'Pendente',
  [SupplierStatus.Erro]: 'Erro na Integração'
};

const StatusBadge: React.FC<{ status: SupplierStatus }> = ({ status }) => {
  const variant = status.replace('_', '-');
  return (
    <span className={`status-chip status-chip--${variant}`}>
      <span className="status-chip__dot" aria-hidden />
      {statusLabels[status]}
    </span>
  );
};

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const statusOptions: Array<'all' | SupplierStatus> = [
  'all',
  SupplierStatus.Pendente,
  SupplierStatus.EmAnalise,
  SupplierStatus.Aprovado,
  SupplierStatus.Reprovado,
];

const statusFilterLabels: Record<'all', string> & Record<SupplierStatus, string> = {
  all: 'Todos',
  ...statusLabels,
};

const AdminDashboardPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | SupplierStatus>('all');
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
        console.error('Failed to fetch suppliers', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  const statusCounts = useMemo(() => {
    const base: Record<SupplierStatus, number> = {
      [SupplierStatus.Aprovado]: 0,
      [SupplierStatus.Reprovado]: 0,
      [SupplierStatus.EmAnalise]: 0,
      [SupplierStatus.Pendente]: 0,
      [SupplierStatus.Erro]: 0,
    };

    suppliers.forEach((supplier) => {
      base[supplier.status] += 1;
    });

    return base;
  }, [suppliers]);

  const metrics = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total cadastrados',
        value: suppliers.length,
      },
      {
        id: 'pending',
        label: 'Pendentes',
        value: statusCounts[SupplierStatus.Pendente],
        tone: 'pending' as const,
      },
      {
        id: 'analysis',
        label: 'Em análise',
        value: statusCounts[SupplierStatus.EmAnalise],
        tone: 'warning' as const,
      },
      {
        id: 'approved',
        label: 'Aprovados',
        value: statusCounts[SupplierStatus.Aprovado],
        tone: 'success' as const,
      },
      {
        id: 'rejected',
        label: 'Reprovados',
        value: statusCounts[SupplierStatus.Reprovado],
        tone: 'danger' as const,
      },
      {
        id: 'error',
        label: 'Erro na Integração',
        value: statusCounts[SupplierStatus.Erro],
        tone: 'danger' as const,
      },
    ],
    [statusCounts, suppliers.length],
  );

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return suppliers
      .filter((supplier) => filterStatus === 'all' || supplier.status === filterStatus)
      .filter((supplier) => {
        if (!normalizedSearch) return true;
        return (
          supplier.companyName.toLowerCase().includes(normalizedSearch) ||
          supplier.tradeName?.toLowerCase().includes(normalizedSearch) ||
          supplier.cnpj.includes(normalizedSearch)
        );
      });
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
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== supplierToDelete.id));
      setDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Failed to delete supplier', error);
      alert('Erro ao excluir fornecedor. Tente novamente.');
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
      <div className="admin-page__loading">
        <Loader className="admin-spinner" />
        <span>Carregando fornecedores...</span>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Fornecedores</h1>
          <p className="admin-page__subtitle">
            Acompanhe cada etapa do fluxo de aprovação e mantenha o pipeline organizado.
          </p>
        </div>
      </header>

      <section className="admin-metrics">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className={`metric-card${metric.tone ? ` metric-card--${metric.tone}` : ''}`}
          >
            <span className="metric-card__label">{metric.label}</span>
            <span className="metric-card__value">{metric.value}</span>
          </article>
        ))}
      </section>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h2>Pipeline de fornecedores</h2>
            <p>Controle o andamento dos cadastros enviados.</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <Search className="admin-toolbar__icon" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, fantasia ou CNPJ"
              className="admin-input"
            />
          </div>

          <div className="admin-toolbar__filters" aria-label="Filtrar por status">
            <span className="admin-toolbar__label">Status</span>
            <div className="filter-pill-group">
              {statusOptions.map((statusKey) => {
                const isActive = filterStatus === statusKey;
                const count =
                  statusKey === 'all' ? suppliers.length : statusCounts[statusKey as SupplierStatus];

                return (
                  <button
                    key={statusKey}
                    type="button"
                    className={`filter-pill${isActive ? ' filter-pill--active' : ''}`}
                    onClick={() => setFilterStatus(statusKey)}
                  >
                    <span>{statusFilterLabels[statusKey]}</span>
                    <span className="filter-pill__count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="admin-table-container" role="region" aria-live="polite">
          {filteredSuppliers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Empresa</th>
                  <th scope="col">CNPJ</th>
                  <th scope="col">Cadastro</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table-actions__header">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="table-primary">{supplier.companyName}</div>
                      {supplier.tradeName && <div className="table-secondary">{supplier.tradeName}</div>}
                    </td>
                    <td className="table-mono whitespace-nowrap">{supplier.cnpj}</td>
                    <td className="table-date whitespace-nowrap">{formatDate(supplier.createdAt)}</td>
                    <td>
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="admin-link"
                          onClick={() => navigate(`/admin/supplier/${supplier.id}`)}
                        >
                          Ver detalhes
                        </button>
                        {user?.role === UserRole.Admin && (
                          <button
                            type="button"
                            className="admin-link admin-link--danger"
                            onClick={() => handleDeleteClick(supplier)}
                          >
                            <Trash2 size={16} aria-hidden />
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="table-empty-state">
              <h3>Sem fornecedores neste filtro</h3>
              <p>
                Ajuste os filtros ou refine a busca para visualizar outros fornecedores cadastrados.
              </p>
            </div>
          )}
        </div>
      </section>

      {deleteModalOpen && supplierToDelete && (
        <div className="admin-modal__backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal__body">
              <h3>Excluir fornecedor</h3>
              <p>
                Tem certeza de que deseja remover{' '}
                <strong>{supplierToDelete.companyName}</strong> do sistema? Essa ação não pode ser
                desfeita.
              </p>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={handleDeleteCancel}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
