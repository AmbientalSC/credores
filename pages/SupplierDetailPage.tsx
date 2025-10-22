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
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../services/firebaseService';
import { Supplier, SupplierStatus, UserRole } from '../types';

const statusLabels: Record<SupplierStatus, string> = {
  [SupplierStatus.Aprovado]: 'Aprovado',
  [SupplierStatus.Reprovado]: 'Reprovado',
  [SupplierStatus.EmAnalise]: 'Em análise',
  [SupplierStatus.Pendente]: 'Pendente',
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

  const handleStatusUpdate = async (status: SupplierStatus) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updatedSupplier = await firebaseService.updateSupplierStatus(
        id,
        status,
        status === SupplierStatus.Reprovado ? rejectionReason : undefined,
      );
      setSupplier(updatedSupplier);

      if (status === SupplierStatus.Aprovado) {
        try {
          const functions = getFunctions(undefined, 'southamerica-east1');
          const createSiengeCreditor = httpsCallable(functions, 'createSiengeCreditor');
          await createSiengeCreditor({ supplierId: id });
          alert('Fornecedor aprovado e enviado ao Sienge com sucesso!');
        } catch (error: any) {
          console.error('Erro ao enviar para Sienge:', error);
          alert(`Fornecedor aprovado, mas ocorreu erro ao enviar ao Sienge: ${error.message}`);
        }
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
          <h1>{supplier.companyName}</h1>
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
          {activeTab === 'dados-gerais' && (
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

          {activeTab === 'endereco' && (
            <div className="detail-grid" role="region" aria-label="Endereço do fornecedor">
              <DetailItem label="CEP" value={supplier.address.zipCode} />
              <DetailItem label="Estado" value={supplier.address.state} />
              <DetailItem label="Cidade" value={supplier.address.city} />
              <DetailItem label="Bairro" value={supplier.address.neighborhood} />
              <DetailItem label="Rua/Avenida" value={supplier.address.street} />
              <DetailItem label="Número" value={supplier.address.number} />
              <DetailItem label="Complemento" value={supplier.address.complement} />
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
          {supplier.uploadedDocuments && supplier.uploadedDocuments.length > 0 ? (
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
