import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Eye, Trash2, Ban, CheckCircle } from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import { firebaseService } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
    const statusStyles = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const statusText = {
        active: 'Ativo',
        inactive: 'Inativo'
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {statusText[status]}
        </span>
    );
};

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleStyles = {
        admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        user: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };

    const roleText = {
        admin: 'Administrador',
        user: 'Usuário',
        viewer: 'Visualizador'
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleStyles[role]}`}>
            {roleText[role]}
        </span>
    );
};

const UserManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
    const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Create user modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: UserRole.User,
        password: ''
    });

    // Delete/Update user modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [userToAction, setUserToAction] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/admin/login');
            return;
        }
        loadUsers();
    }, [user, navigate]);

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

    const filteredUsers = useMemo(() => {
        return users
            .filter(u => filterStatus === 'all' || u.status === filterStatus)
            .filter(u => filterRole === 'all' || u.role === filterRole)
            .filter(u =>
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [users, filterStatus, filterRole, searchTerm]);

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.name || !newUser.password) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        setCreateLoading(true);
        try {
            await firebaseService.createUser({
                ...newUser,
                createdBy: user?.email || 'admin'
            });
            setShowCreateModal(false);
            setNewUser({ email: '', name: '', role: UserRole.User, password: '' });
            await loadUsers();
        } catch (error) {
            console.error('Failed to create user:', error);
            alert('Erro ao criar usuário. Tente novamente.');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToAction) return;

        setActionLoading(true);
        try {
            await firebaseService.deleteUser(userToAction.id);
            setUsers(prev => prev.filter(u => u.id !== userToAction.id));
            setShowDeleteModal(false);
            setUserToAction(null);
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Erro ao excluir usuário. Tente novamente.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleUserStatus = async () => {
        if (!userToAction) return;

        const newStatus = userToAction.status === UserStatus.Active ? UserStatus.Inactive : UserStatus.Active;

        setActionLoading(true);
        try {
            await firebaseService.updateUserStatus(userToAction.id, newStatus);
            setUsers(prev => prev.map(u =>
                u.id === userToAction.id ? { ...u, status: newStatus } : u
            ));
            setShowStatusModal(false);
            setUserToAction(null);
        } catch (error) {
            console.error('Failed to update user status:', error);
            alert('Erro ao atualizar status do usuário. Tente novamente.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600 dark:text-gray-400">Carregando usuários...</div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gerenciamento de Usuários</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gerencie usuários do sistema.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-full sm:w-64">
                                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            {user?.role === UserRole.Admin && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Novo Usuário
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex items-center space-x-2 overflow-x-auto pb-2">
                        {/* Status filters */}
                        {(['all', UserStatus.Active, UserStatus.Inactive] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${filterStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {status === 'all' ? 'Todos' : status === UserStatus.Active ? 'Ativos' : 'Inativos'}
                            </button>
                        ))}

                        {/* Role filters */}
                        {(['all', UserRole.Admin, UserRole.User, UserRole.Viewer] as const).map((role) => (
                            <button
                                key={role}
                                onClick={() => setFilterRole(role)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${filterRole === role
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {role === 'all' ? 'Todas Funções' :
                                    role === UserRole.Admin ? 'Administradores' :
                                        role === UserRole.User ? 'Usuários' : 'Visualizadores'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Função</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wider">Data de Criação</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-700 dark:text-gray-400">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={user.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">
                                        {user.createdAt instanceof Date ? user.createdAt.toLocaleDateString('pt-BR') : new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            {user?.role === UserRole.Admin && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setUserToAction(user);
                                                            setShowStatusModal(true);
                                                        }}
                                                        className={`p-2 rounded-lg transition-colors ${user.status === UserStatus.Active
                                                            ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                            }`}
                                                        title={user.status === UserStatus.Active ? 'Desativar usuário' : 'Ativar usuário'}
                                                    >
                                                        {user.status === UserStatus.Active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setUserToAction(user);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Excluir usuário"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                                        <p className="mt-1">Tente ajustar os filtros ou criar um novo usuário.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Criar Novo Usuário
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="Senha temporária"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Função
                                </label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value={UserRole.User}>Usuário</option>
                                    <option value={UserRole.Admin}>Administrador</option>
                                    <option value={UserRole.Viewer}>Visualizador</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewUser({ email: '', name: '', role: UserRole.User, password: '' });
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={createLoading}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {createLoading ? 'Criando...' : 'Criar Usuário'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            {showDeleteModal && userToAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Confirmar Exclusão
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Tem certeza que deseja excluir o usuário <strong>{userToAction.name}</strong>?
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToAction(null);
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={actionLoading}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {showStatusModal && userToAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Alterar Status
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Deseja {userToAction.status === UserStatus.Active ? 'desativar' : 'ativar'} o usuário <strong>{userToAction.name}</strong>?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowStatusModal(false);
                                    setUserToAction(null);
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleToggleUserStatus}
                                disabled={actionLoading}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${userToAction.status === UserStatus.Active
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {actionLoading
                                    ? (userToAction.status === UserStatus.Active ? 'Desativando...' : 'Ativando...')
                                    : (userToAction.status === UserStatus.Active ? 'Desativar' : 'Ativar')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserManagementPage;