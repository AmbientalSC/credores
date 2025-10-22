import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, CheckCircle, Loader, Search, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';

import { firebaseService } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { User, UserRole, UserStatus } from '../types';

const userStatusLabels: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Usuario',
  viewer: 'Visualizador',
};

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => (
  <span className={`status-chip status-chip--user-${status}`}>
    <span className="status-chip__dot" aria-hidden />
    {userStatusLabels[status]}
  </span>
);

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`role-chip role-chip--${role}`}>{roleLabels[role]}</span>
);

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const statusOptions: Array<'all' | UserStatus> = ['all', UserStatus.Active, UserStatus.Inactive];
const roleOptions: Array<'all' | UserRole> = ['all', UserRole.Admin, UserRole.User, UserRole.Viewer];

const statusFilterLabels: Record<'all', string> & Record<UserStatus, string> = {
  all: 'Todos',
  active: 'Ativos',
  inactive: 'Inativos',
};

const roleFilterLabels: Record<'all', string> & Record<UserRole, string> = {
  all: 'Todos',
  admin: 'Administradores',
  user: 'Usuarios',
  viewer: 'Visualizadores',
};

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: UserRole.User,
    password: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [userToAction, setUserToAction] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }
    void loadUsers();
  }, [currentUser, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await firebaseService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = useMemo(() => {
    const base: Record<UserStatus, number> = {
      active: 0,
      inactive: 0,
    };

    users.forEach((user) => {
      base[user.status] += 1;
    });

    return base;
  }, [users]);

  const roleCounts = useMemo(() => {
    const base: Record<UserRole, number> = {
      admin: 0,
      user: 0,
      viewer: 0,
    };

    users.forEach((user) => {
      base[user.role] += 1;
    });

    return base;
  }, [users]);

  const metrics = useMemo(
    () => [
      {
        id: 'total',
        label: 'Usuarios ativos na plataforma',
        value: users.length,
      },
      {
        id: 'active',
        label: 'Com acesso habilitado',
        value: statusCounts[UserStatus.Active],
        tone: 'success' as const,
      },
      {
        id: 'inactive',
        label: 'Suspensos',
        value: statusCounts[UserStatus.Inactive],
        tone: 'warning' as const,
      },
      {
        id: 'admins',
        label: 'Administradores',
        value: roleCounts[UserRole.Admin],
        tone: 'accent' as const,
      },
    ],
    [roleCounts, statusCounts, users.length],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users
      .filter((user) => filterStatus === 'all' || user.status === filterStatus)
      .filter((user) => filterRole === 'all' || user.role === filterRole)
      .filter((user) => {
        if (!normalizedSearch) return true;
        return (
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [users, filterStatus, filterRole, searchTerm]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      alert('Preencha todos os campos obrigatorios.');
      return;
    }

    setCreateLoading(true);
    try {
      await firebaseService.createUser({
        ...newUser,
        createdBy: currentUser?.email || 'admin',
      });
      setShowCreateModal(false);
      setNewUser({ email: '', name: '', role: UserRole.User, password: '' });
      await loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Erro ao criar usuario. Tente novamente.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToAction) return;

    setActionLoading(true);
    try {
      await firebaseService.deleteUser(userToAction.id);
      setUsers((prev) => prev.filter((user) => user.id !== userToAction.id));
      setShowDeleteModal(false);
      setUserToAction(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Erro ao excluir usuario. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async () => {
    if (!userToAction) return;

    const nextStatus =
      userToAction.status === UserStatus.Active ? UserStatus.Inactive : UserStatus.Active;

    setActionLoading(true);
    try {
      await firebaseService.updateUserStatus(userToAction.id, nextStatus);
      setUsers((prev) =>
        prev.map((user) => (user.id === userToAction.id ? { ...user, status: nextStatus } : user)),
      );
      setShowStatusModal(false);
      setUserToAction(null);
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page__loading">
        <Loader className="admin-spinner" />
        <span>Carregando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Gestao de usuarios</h1>
          <p className="admin-page__subtitle">
            Centralize perfis, acessos e status da sua equipe em um painel minimalista.
          </p>
        </div>
        {currentUser?.role === UserRole.Admin && (
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus size={18} aria-hidden />
            Novo usuario
          </button>
        )}
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
            <h2>Equipe cadastrada</h2>
            <p>Visualize permissoes e status de acesso em tempo real.</p>
          </div>
        </div>

        <div className="admin-toolbar admin-toolbar--stack">
          <div className="admin-toolbar__search">
            <Search className="admin-toolbar__icon" aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome ou email"
              className="admin-input"
            />
          </div>

          <div className="admin-toolbar__filters">
            <div className="admin-toolbar__filters-group">
              <span className="admin-toolbar__label">Status</span>
              <div className="filter-pill-group">
                {statusOptions.map((statusKey) => {
                  const isActive = filterStatus === statusKey;
                  const count =
                    statusKey === 'all'
                      ? users.length
                      : statusCounts[statusKey as UserStatus];

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

            <div className="admin-toolbar__filters-group">
              <span className="admin-toolbar__label">Perfil</span>
              <div className="filter-pill-group">
                {roleOptions.map((roleKey) => {
                  const isActive = filterRole === roleKey;
                  const count =
                    roleKey === 'all' ? users.length : roleCounts[roleKey as UserRole];

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      className={`filter-pill${isActive ? ' filter-pill--active' : ''}`}
                      onClick={() => setFilterRole(roleKey)}
                    >
                      <span>{roleFilterLabels[roleKey]}</span>
                      <span className="filter-pill__count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-table-container" role="region" aria-live="polite">
          {filteredUsers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Email</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Status</th>
                  <th scope="col">Criado em</th>
                  <th scope="col" className="table-actions__header">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isActive = user.status === UserStatus.Active;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="table-primary">{user.name}</div>
                      </td>
                      <td className="table-mono">{user.email}</td>
                      <td>
                        <RoleBadge role={user.role} />
                      </td>
                      <td>
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="table-date">
                        {user.createdAt
                          ? formatDate(user.createdAt)
                          : 'Sem registro'}
                      </td>
                      <td>
                        <div className="table-actions table-actions--wrap">
                          {currentUser?.role === UserRole.Admin && (
                            <>
                              <button
                                type="button"
                                className={`admin-chip-button ${
                                  isActive
                                    ? 'admin-chip-button--warning'
                                    : 'admin-chip-button--success'
                                }`}
                                onClick={() => {
                                  setUserToAction(user);
                                  setShowStatusModal(true);
                                }}
                              >
                                {isActive ? <Ban size={16} aria-hidden /> : <CheckCircle size={16} aria-hidden />}
                                {isActive ? 'Desativar' : 'Ativar'}
                              </button>
                              <button
                                type="button"
                                className="admin-link admin-link--danger"
                                onClick={() => {
                                  setUserToAction(user);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 size={16} aria-hidden />
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="table-empty-state">
              <UsersIcon size={32} aria-hidden />
              <h3>Nenhum usuario com esse recorte</h3>
              <p>Ajuste filtros ou crie um novo acesso para sua equipe.</p>
            </div>
          )}
        </div>
      </section>

      {showCreateModal && (
        <div className="admin-modal__backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal__body">
              <h3>Criar novo usuario</h3>
              <p>Defina as informacoes iniciais do colaborador e o perfil de acesso.</p>

              <div className="admin-modal__form">
                <div className="admin-field admin-field--full">
                  <label htmlFor="new-user-name">Nome completo</label>
                  <input
                    id="new-user-name"
                    type="text"
                    className="admin-input"
                    value={newUser.name}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex: Ana Ribeiro"
                  />
                </div>
                <div className="admin-field admin-field--full">
                  <label htmlFor="new-user-email">Email</label>
                  <input
                    id="new-user-email"
                    type="email"
                    className="admin-input"
                    value={newUser.email}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="nome@empresa.com"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="new-user-role">Perfil</label>
                  <select
                    id="new-user-role"
                    className="admin-input"
                    value={newUser.role}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, role: event.target.value as UserRole }))
                    }
                  >
                    {roleOptions
                      .filter((role) => role !== 'all')
                      .map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role as UserRole]}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="new-user-password">Senha provisoria</label>
                  <input
                    id="new-user-password"
                    type="password"
                    className="admin-input"
                    value={newUser.password}
                    onChange={(event) =>
                      setNewUser((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder="Minimo 8 caracteres"
                  />
                </div>
              </div>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ email: '', name: '', role: UserRole.User, password: '' });
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={handleCreateUser}
                disabled={createLoading}
              >
                {createLoading ? 'Criando...' : 'Criar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && userToAction && (
        <div className="admin-modal__backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal__body">
              <h3>Excluir usuario</h3>
              <p>
                Tem certeza de que deseja remover <strong>{userToAction.name}</strong>? Essa acao e
                permanente.
              </p>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToAction(null);
                }}
              >
                Manter
              </button>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && userToAction && (
        <div className="admin-modal__backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal__body">
              <h3>Atualizar status</h3>
              <p>
                Deseja {userToAction.status === UserStatus.Active ? 'desativar' : 'ativar'} o usuario{' '}
                <strong>{userToAction.name}</strong>?
              </p>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  setShowStatusModal(false);
                  setUserToAction(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`admin-button ${
                  userToAction.status === UserStatus.Active
                    ? 'admin-button--warning'
                    : 'admin-button--success'
                }`}
                onClick={handleToggleUserStatus}
                disabled={actionLoading}
              >
                {actionLoading
                  ? userToAction.status === UserStatus.Active
                    ? 'Desativando...'
                    : 'Ativando...'
                  : userToAction.status === UserStatus.Active
                  ? 'Desativar'
                  : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
