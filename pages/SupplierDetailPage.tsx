import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  FileText,
  Loader,
  X,
} from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../services/firebaseService';
import { Supplier, SupplierStatus, UserRole } from '../types';
import FileUpload from '../components/FileUpload';

const statusLabels: Record<SupplierStatus, string> = {
  [SupplierStatus.Aprovado]: 'Aprovado',
  [SupplierStatus.Reprovado]: 'Reprovado',
  [SupplierStatus.EmAnalise]: 'Em análise',
  [SupplierStatus.Pendente]: 'Pendente',
  [SupplierStatus.Erro]: 'Erro na Integração'
};

const StatusBadge: React.FC<{ status: SupplierStatus }> = ({ status }) => {
  const variant = status.replace('_', '-');
  return <span className={`status-chip status-chip--${variant}`}>{statusLabels[status]}</span>;
};

const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return null;
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return null;
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="detail-grid__item">
      <span className="detail-grid__label">{label}</span>
      <span className="detail-grid__value">
        {isEmpty ? <span className="detail-grid__empty">—</span> : value}
      </span>
    </div>
  );
};

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<'dados-gerais' | 'endereco' | 'dados-bancarios'>('dados-gerais');
  const [isReproveModalOpen, setReproveModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Supplier> | null>(null);
  const [newFiles, setNewFiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await firebaseService.getSupplierById(id);
        if (data) {
          setSupplier(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id]);

  useEffect(() => {
    if (supplier) {
      // initialize edit data when supplier is loaded
      setEditData({ ...supplier });
    }
  }, [supplier]);

  const handleStatusUpdate = async (status: SupplierStatus) => {
    if (!id) return;
    setActionLoading(true);
    try {
      // Para aprovação, só alterar status se a integração Sienge for bem-sucedida
      if (status === SupplierStatus.Aprovado) {
        try {
          const functions = getFunctions(undefined, 'southamerica-east1');
          const createSiengeCreditor = httpsCallable(functions, 'createSiengeCreditor');
          // Preferir cityId cadastrado no supplier (se existir). Caso contrário, não enviar e deixar o backend usar o default.
          const payload: any = { supplierId: id };
          if ((supplier as any)?.address?.cityId) {
            payload.cityId = (supplier as any).address.cityId;
          }
          const result = await createSiengeCreditor(payload);
          // Se chegou aqui, integração foi bem-sucedida, então aprovar
          const returned: any = result?.data;
          const updatedSupplier = await firebaseService.updateSupplierStatus(id, SupplierStatus.Aprovado);
          await firebaseService.updateSupplier(id, {
            siengeCreditorId: returned?.siengeCreditorId || returned?.id || null,
            siengeIntegrationError: null,
          } as any);
          setSupplier(updatedSupplier);
          alert('Fornecedor aprovado e enviado ao Sienge com sucesso!');
        } catch (error: any) {
          console.error('Erro ao enviar para Sienge:', error);
          // Se deu erro na integração, alterar status para "Erro" ao invés de "Aprovado"
          const message = (error?.message && String(error.message)) || JSON.stringify(error) || 'Erro desconhecido';
          const updatedSupplier = await firebaseService.updateSupplierStatus(id, SupplierStatus.Erro);
          await firebaseService.updateSupplier(id, { siengeIntegrationError: message } as any);
          setSupplier(updatedSupplier);
          alert(`Erro na integração com Sienge. O fornecedor foi marcado com status "Erro": ${error.message}`);
        }
      } else {
        // Para outros status (Reprovado, Em Análise), manter lógica atual
        const updatedSupplier = await firebaseService.updateSupplierStatus(
          id,
          status,
          status === SupplierStatus.Reprovado ? rejectionReason : undefined,
        );
        setSupplier(updatedSupplier);
      }

      setReproveModalOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error(`Failed to ${status} supplier`, error);
      alert(
        status === SupplierStatus.Aprovado
          ? 'Erro ao aprovar fornecedor.'
          : 'Erro ao reprovar fornecedor.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendIntegration = async () => {
    if (!id || !supplier) return;
    setActionLoading(true);
    try {
      const functions = getFunctions(undefined, 'southamerica-east1');
      const createSiengeCreditor = httpsCallable(functions, 'createSiengeCreditor');
      const payload: any = { supplierId: id };
      if ((supplier as any)?.address?.cityId) payload.cityId = (supplier as any).address.cityId;
      const result = await createSiengeCreditor(payload);
      // store returned id if present and clear any previous error
      const returned: any = result?.data;
      await firebaseService.updateSupplier(id, {
        siengeCreditorId: returned?.siengeCreditorId || returned?.id || null,
        siengeIntegrationError: null,
      } as any);
      const refreshed = await firebaseService.getSupplierById(id);
      setSupplier(refreshed || null);
      alert('Integração com Sienge executada com sucesso.');
    } catch (error: any) {
      console.error('Erro na integração com Sienge:', error);
      const message = (error?.message && String(error.message)) || JSON.stringify(error) || 'Erro desconhecido';
      try {
        await firebaseService.updateSupplier(id, { siengeIntegrationError: message } as any);
      } catch (e) {
        console.warn('Falha ao registrar erro no Firestore', e);
      }
      const refreshed = await firebaseService.getSupplierById(id);
      setSupplier(refreshed || null);
      alert('Falha na integração com Sienge. O erro foi registrado no credor.');
    } finally {
      setActionLoading(false);
    }
  };

  const canEdit = () => {
    if (!supplier || !user) return false;
    // allow edit if supplier is in analysis OR approved and user is admin or the one who submitted
    // Assumption: both admins and the original submitter can edit approved suppliers. If you
    // want only admins to edit approved suppliers, tell me and I'll tighten this.
    const isSubmitter = user.email && supplier.submittedBy && user.email === supplier.submittedBy;
    return (supplier.status === SupplierStatus.EmAnalise || supplier.status === SupplierStatus.Aprovado) &&
      (user.role === UserRole.Admin || isSubmitter);
  };

  const handleEditChange = (path: string, value: any) => {
    if (!editData) return;
    // support nested address and bankData via dot path
    const next = { ...editData } as any;
    if (path.includes('.')) {
      const [root, key] = path.split('.');
      next[root] = { ...(next[root] || {}), [key]: value };
    } else {
      next[path] = value;
    }
    setEditData(next);
  };

  const saveEdits = async () => {
    if (!id || !editData) return;
    setActionLoading(true);
    try {
      // If supplier is approved and no cityId is present, warn but do not block saving.
      if (supplier?.status === SupplierStatus.Aprovado) {
        const cityId = (editData.address as any)?.cityId;
        if (!cityId) {
          // Do not block — allow editing email/phone/attachments even without cityId.
          // Show a non-blocking warning to the user.
          // eslint-disable-next-line no-console
          console.warn('Credor aprovado sem cityId; ao reenviar para integração pode ocorrer falha.');
        }
      }
      // Only send allowed fields (including any removals of uploadedDocuments)
      const up: Partial<Supplier> = {
        companyName: editData.companyName,
        tradeName: editData.tradeName,
        cnpj: editData.cnpj,
        phone: editData.phone,
        email: editData.email,
        submittedBy: editData.submittedBy,
        address: editData.address,
        bankData: editData.bankData,
      };

      // If the edit removed or reordered uploadedDocuments, include that
      if (editData.uploadedDocuments) {
        up.uploadedDocuments = editData.uploadedDocuments as any;
      }

      // Update basic fields first
      await firebaseService.updateSupplier(id, up as any);

      // If there are new files to upload, upload them and append
      if (newFiles && newFiles.length > 0) {
        try {
          const uploadPromises = newFiles.map((f: any) => firebaseService.uploadFile(f.file, id));
          const uploadedMeta = await Promise.all(uploadPromises);
          // Append uploaded metadata to supplier
          const refreshedAfterUpload = await firebaseService.getSupplierById(id);
          const existing = (refreshedAfterUpload?.uploadedDocuments) || [];
          const merged = [...existing, ...uploadedMeta];
          await firebaseService.updateSupplier(id, { uploadedDocuments: merged } as any);
        } catch (uerr) {
          console.error('Erro ao enviar arquivos:', uerr);
          alert('Erro ao enviar arquivos anexos. As alterações principais foram salvas, mas alguns arquivos não foram enviados.');
        }
      }

      const refreshed = await firebaseService.getSupplierById(id);
      setSupplier(refreshed || null);
      setEditMode(false);
    } catch (err) {
      console.error('Erro ao salvar edição do fornecedor', err);
      alert('Falha ao salvar alterações. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page__loading">
        <Loader className="admin-spinner" />
        <span>Carregando credor...</span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="admin-page__loading">
        <span>Fornecedor não encontrado.</span>
      </div>
    );
  }

  const submittedAt = formatDateTime(supplier.createdAt);
  const approvedAt = formatDateTime(supplier.approvedAt);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="detail-header">
          <button
            type="button"
            className="admin-link detail-header__back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} aria-hidden />
            Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>{supplier.companyName}</h1>
            {canEdit() && !editMode && (
              <button type="button" className="admin-button admin-button--ghost" onClick={() => { setEditMode(true); setEditData({ ...supplier }); setNewFiles([]); }}>
                Editar
              </button>
            )}
            {editMode && (
              <>
                <button type="button" className="admin-button admin-button--ghost" onClick={() => { setEditMode(false); setEditData({ ...supplier }); }} disabled={actionLoading}>
                  Cancelar
                </button>
                <button type="button" className="admin-button admin-button--success" onClick={saveEdits} disabled={actionLoading}>
                  {actionLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            )}
          </div>
          <p className="admin-page__subtitle">
            Dados completos, histórico e documentos enviados pelo credor.
          </p>
        </div>

        <div className="detail-header__meta">
          <StatusBadge status={supplier.status} />
          {submittedAt && (
            <span className="detail-header__timestamp">
              Recebido em {submittedAt}
            </span>
          )}
        </div>
      </header>

      <section className="admin-card detail-summary">
        <div className="detail-summary__grid">
          <div className="detail-summary__item">
            <span className="detail-summary__label">Responsável pelo envio</span>
            <span className="detail-summary__value">{supplier.submittedBy || '—'}</span>
          </div>
          <div className="detail-summary__item">
            <span className="detail-summary__label">E-mail principal</span>
            <span className="detail-summary__value">{supplier.email}</span>
          </div>
          <div className="detail-summary__item">
            <span className="detail-summary__label">Telefone</span>
            <span className="detail-summary__value">{supplier.phone || '—'}</span>
          </div>
          <div className="detail-summary__item">
            <span className="detail-summary__label">Status atual</span>
            <span className="detail-summary__value">
              {statusLabels[supplier.status]}
            </span>
          </div>
          {approvedAt && (
            <div className="detail-summary__item">
              <span className="detail-summary__label">Aprovado em</span>
              <span className="detail-summary__value">{approvedAt}</span>
            </div>
          )}
          {supplier.approvedByName && (
            <div className="detail-summary__item">
              <span className="detail-summary__label">Aprovado por</span>
              <span className="detail-summary__value">{supplier.approvedByName}</span>
            </div>
          )}
          {supplier.status === SupplierStatus.Reprovado && supplier.rejectionReason && (
            <div className="detail-summary__item detail-summary__item--full">
              <span className="detail-summary__label">Motivo da reprovação</span>
              <span className="detail-summary__value detail-summary__value--danger">
                {supplier.rejectionReason}
              </span>
            </div>
          )}
          {supplier.siengeIntegrationError && (
            <div className="detail-summary__item detail-summary__item--full">
              <span className="detail-summary__label">Erro integração Sienge</span>
              <span className="detail-summary__value detail-summary__value--danger">
                {typeof supplier.siengeIntegrationError === 'string'
                  ? supplier.siengeIntegrationError
                  : JSON.stringify(supplier.siengeIntegrationError)}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="admin-card">
        <div className="detail-tabs" role="tablist" aria-label="Seções do cadastro">
          {([
            ['dados-gerais', 'Dados Gerais'],
            ['endereco', 'Endereço'],
            ['dados-bancarios', 'Dados Bancários'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={`detail-tabs__button${activeTab === key ? ' detail-tabs__button--active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="detail-panel">
          {activeTab === 'dados-gerais' && !editMode && (
            <div className="detail-grid" role="region" aria-label="Dados gerais do fornecedor">
              <DetailItem label="Razão Social" value={supplier.companyName} />
              <DetailItem label="Nome Fantasia" value={supplier.tradeName} />
              <DetailItem
                label="Tipo de Pessoa"
                value={supplier.personType === 'J' ? 'Jurídica' : 'Física'}
              />
              <DetailItem label="CNPJ/CPF" value={<span className="table-mono">{supplier.cnpj}</span>} />
              <DetailItem label="Inscrição Estadual" value={supplier.stateRegistration} />
              <DetailItem
                label="Tipo de IE"
                value={
                  supplier.stateRegistrationType === 'C'
                    ? 'Contribuinte'
                    : supplier.stateRegistrationType === 'I'
                      ? 'Isento'
                      : supplier.stateRegistrationType === 'N'
                        ? 'Não contribuinte'
                        : supplier.stateRegistrationType
                }
              />
              <DetailItem label="Inscrição Municipal" value={supplier.municipalRegistration} />
              <DetailItem label="Website" value={supplier.website} />
            </div>
          )}

          {activeTab === 'dados-gerais' && editMode && editData && (
            <div className="detail-grid" role="region" aria-label="Editar dados gerais">
              <div className="detail-grid__item">
                <span className="detail-grid__label">Razão Social</span>
                <input className="admin-input" value={editData.companyName || ''} onChange={(e) => handleEditChange('companyName', e.target.value)} />
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">Nome Fantasia</span>
                <input className="admin-input" value={editData.tradeName || ''} onChange={(e) => handleEditChange('tradeName', e.target.value)} />
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">CNPJ/CPF</span>
                <input className="admin-input table-mono" value={editData.cnpj || ''} onChange={(e) => handleEditChange('cnpj', e.target.value)} />
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">Telefone</span>
                <input className="admin-input" value={editData.phone || ''} onChange={(e) => handleEditChange('phone', e.target.value)} />
              </div>
              <div className="detail-grid__item">
                <span className="detail-grid__label">E-mail</span>
                <input className="admin-input" value={editData.email || ''} onChange={(e) => handleEditChange('email', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="detail-grid" role="region" aria-label="Endereço do fornecedor">
              {!editMode && (
                <>
                  <DetailItem label="CEP" value={supplier.address.zipCode} />
                  <DetailItem label="Estado" value={supplier.address.state} />
                  <DetailItem label="Cidade" value={supplier.address.city} />
                  <DetailItem label="Bairro" value={supplier.address.neighborhood} />
                  <DetailItem label="Rua/Avenida" value={supplier.address.street} />
                  <DetailItem label="Número" value={supplier.address.number} />
                  <DetailItem label="Complemento" value={supplier.address.complement} />
                </>
              )}

              {editMode && editData && (
                <>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">CEP</span>
                    <input className="admin-input" value={editData.address?.zipCode || ''} onChange={(e) => handleEditChange('address.zipCode', e.target.value)} />
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Logradouro</span>
                    <input className="admin-input" value={editData.address?.street || ''} onChange={(e) => handleEditChange('address.street', e.target.value)} />
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Cidade</span>
                    <div>
                      <CityAutocomplete
                        value={editData.address?.city || ''}
                        onChange={(v: string) => handleEditChange('address.city', v)}
                        onSelect={(name: string, id?: number, stateName?: string) => handleEditChange('address', { ...(editData.address || {}), city: name, cityId: id, state: stateName || editData.address?.state })}
                        placeholder="Digite para buscar cidade..."
                      />
                    </div>
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Estado</span>
                    <input className="admin-input" readOnly value={editData.address?.state || ''} />
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Bairro</span>
                    <input className="admin-input" value={editData.address?.neighborhood || ''} onChange={(e) => handleEditChange('address.neighborhood', e.target.value)} />
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Número</span>
                    <input className="admin-input" value={editData.address?.number || ''} onChange={(e) => handleEditChange('address.number', e.target.value)} />
                  </div>
                  <div className="detail-grid__item">
                    <span className="detail-grid__label">Complemento</span>
                    <input className="admin-input" value={editData.address?.complement || ''} onChange={(e) => handleEditChange('address.complement', e.target.value)} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'dados-bancarios' && (
            <div className="detail-grid" role="region" aria-label="Dados bancários do fornecedor">
              <DetailItem label="Banco" value={supplier.bankData?.bank} />
              <DetailItem label="Código do Banco" value={supplier.bankData?.bankCode} />
              <DetailItem label="Agência" value={supplier.bankData?.agency} />
              <DetailItem label="Dígito da Agência" value={supplier.bankData?.agencyDigit} />
              <DetailItem label="Conta" value={supplier.bankData?.account} />
              <DetailItem label="Dígito da Conta" value={supplier.bankData?.accountDigit} />
              <DetailItem
                label="Tipo de Conta"
                value={
                  supplier.bankData?.accountType === 'corrente'
                    ? 'Corrente'
                    : supplier.bankData?.accountType === 'poupanca'
                      ? 'Poupança'
                      : supplier.bankData?.accountType
                }
              />
              <DetailItem label="Chave PIX" value={supplier.bankData?.pixKey} />
            </div>
          )}
        </div>
      </section>

      <section className="admin-card">
        <header className="admin-card__header">
          <div>
            <h2>Documentos enviados</h2>
            <p>Arquivos anexados pelo fornecedor durante o cadastro.</p>
          </div>
        </header>

        <div className="detail-documents" role="list">
          {editMode && editData ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Documentos Atuais</h4>
              {(editData.uploadedDocuments && (editData.uploadedDocuments as any[]).length > 0) ? (
                (editData.uploadedDocuments as any[]).map((doc: any, index: number) => {
                  const uploadedAt = doc.uploadedAt instanceof Date ? formatDate(doc.uploadedAt) : doc.uploadedAt ? formatDate(new Date(doc.uploadedAt)) : null;
                  return (
                    <article className="document-card" role="listitem" key={`${doc.storagePath || doc.docName}-${index}`}>
                      <div className="document-card__icon">
                        <FileText size={20} aria-hidden />
                      </div>
                      <div className="document-card__meta">
                        <span className="document-card__title">{doc.docName}</span>
                        {uploadedAt && <span className="document-card__timestamp">Enviado em {uploadedAt}</span>}
                      </div>
                      <div className="document-card__actions">
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="admin-link mr-2">
                            <Eye size={16} aria-hidden />
                            Abrir
                          </a>
                        )}
                        <button type="button" className="admin-button admin-button--ghost" onClick={() => {
                          // remove from editData.uploadedDocuments
                          const next = { ...(editData || {}) } as any;
                          next.uploadedDocuments = (next.uploadedDocuments || []).filter((d: any) => d.storagePath !== doc.storagePath || d.docName !== doc.docName);
                          setEditData(next);
                        }}>
                          Remover
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="table-empty-state">
                  <FileText size={32} aria-hidden />
                  <h3>Sem arquivos anexados</h3>
                  <p>Nenhum documento foi enviado para este cadastro.</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium">Adicionar anexos</h4>
                <FileUpload onFilesChange={(files) => setNewFiles(files)} />
              </div>
            </div>
          ) : (
            // read-only view
            (supplier.uploadedDocuments && supplier.uploadedDocuments.length > 0) ? (
              supplier.uploadedDocuments.map((doc, index) => {
                const uploadedAt =
                  doc.uploadedAt instanceof Date
                    ? formatDate(doc.uploadedAt)
                    : doc.uploadedAt
                      ? formatDate(new Date(doc.uploadedAt))
                      : null;

                return (
                  <article className="document-card" role="listitem" key={`${doc.storagePath}-${index}`}>
                    <div className="document-card__icon">
                      <FileText size={20} aria-hidden />
                    </div>
                    <div className="document-card__meta">
                      <span className="document-card__title">{doc.docName}</span>
                      {uploadedAt && (
                        <span className="document-card__timestamp">Enviado em {uploadedAt}</span>
                      )}
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-link"
                      >
                        <Eye size={16} aria-hidden />
                        Abrir
                      </a>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="table-empty-state">
                <FileText size={32} aria-hidden />
                <h3>Sem arquivos anexados</h3>
                <p>Nenhum documento foi enviado para este cadastro.</p>
              </div>
            )
          )}
        </div>
      </section>

      {user?.role === UserRole.Admin && supplier.status !== SupplierStatus.Aprovado && (
        <section className="admin-card detail-actions">
          <div className="detail-actions__content">
            <h2>Decisão</h2>
            <p>Valide os documentos e confirme sua decisão para liberar o cadastro.</p>
          </div>
          <div className="detail-actions__buttons">
            <button
              type="button"
              className="admin-button admin-button--danger"
              onClick={() => setReproveModalOpen(true)}
              disabled={actionLoading}
            >
              <X size={18} aria-hidden />
              Reprovar
            </button>
            <button
              type="button"
              className="admin-button admin-button--success"
              onClick={() => handleStatusUpdate(SupplierStatus.Aprovado)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader className="admin-spinner admin-spinner--inline" />
              ) : (
                <Check size={18} aria-hidden />
              )}
              Aprovar
            </button>
          </div>
        </section>
      )}

      {user?.role === UserRole.Admin && supplier.status === SupplierStatus.Aprovado && (
        <section className="admin-card detail-actions">
          <div className="detail-actions__content">
            <h2>Integração</h2>
            <p>Reenviar dados ao Sienge caso necessário.</p>
          </div>
          <div className="detail-actions__buttons">
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={handleResendIntegration}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processando...' : 'Reenviar para integração'}
            </button>
          </div>
        </section>
      )}

      {isReproveModalOpen && (
        <div className="admin-modal__backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal__body">
              <h3>Reprovar cadastro</h3>
              <p>Descreva o motivo para o fornecedor ser notificado com as orientações corretas.</p>
              <div className="detail-reject">
                <div className="detail-reject__icon">
                  <AlertTriangle size={24} aria-hidden />
                </div>
                <textarea
                  className="admin-input admin-textarea"
                  placeholder="Ex: Documentação fiscal incompleta."
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={5}
                />
              </div>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={() => {
                  setReproveModalOpen(false);
                  setRejectionReason('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={() => handleStatusUpdate(SupplierStatus.Reprovado)}
                disabled={!rejectionReason || actionLoading}
              >
                {actionLoading ? 'Enviando...' : 'Confirmar reprovação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetailPage;
