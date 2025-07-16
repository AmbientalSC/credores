
import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebaseService';
import { Supplier, SupplierStatus } from '../types';
import { Loader, ArrowLeft, Check, X, FileText, Download, AlertTriangle } from 'lucide-react';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">{value}</dd>
  </div>
);

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReproveModalOpen, setReproveModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchSupplier = async () => {
      setLoading(true);
      const data = await firebaseService.getSupplierById(id);
      if (data) {
        setSupplier(data);
      } else {
        // handle not found
      }
      setLoading(false);
    };
    fetchSupplier();
  }, [id]);

  const handleAction = async (status: SupplierStatus) => {
    if (!id) return;
    setActionLoading(true);
    try {
        const updatedSupplier = await firebaseService.updateSupplierStatus(id, status, rejectionReason);
        setSupplier(updatedSupplier);
        if (isReproveModalOpen) setReproveModalOpen(false);
    } catch (error) {
        console.error(`Failed to ${status} supplier`, error);
    } finally {
        setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader className="animate-spin h-8 w-8 text-indigo-500" /></div>;
  }

  if (!supplier) {
    return <div className="text-center py-10">Fornecedor não encontrado.</div>;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4">
                <ArrowLeft className="h-4 w-4 mr-2"/>
                Voltar para a lista
            </button>
          <h3 className="text-2xl font-bold leading-6 text-gray-900 dark:text-gray-100">{supplier.companyName}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Detalhes do cadastro e documentos.</p>
        </div>
        <div className="p-6">
          <dl className="divide-y divide-gray-200 dark:divide-gray-700">
            <DetailItem label="Status" value={<span className={`px-2 py-1 text-sm font-bold rounded-md ${ {
                [SupplierStatus.Aprovado]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                [SupplierStatus.Reprovado]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                [SupplierStatus.EmAnalise]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                [SupplierStatus.Pendente]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            }[supplier.status]}`}>{supplier.status.replace('_', ' ')}</span>} />
            <DetailItem label="Nome Fantasia" value={supplier.tradeName} />
            <DetailItem label="CNPJ" value={<span className="font-mono">{supplier.cnpj}</span>} />
            <DetailItem label="E-mail Principal" value={supplier.email} />
            <DetailItem label="Telefone" value={supplier.phone} />
            <DetailItem label="Endereço" value={`${supplier.address.street}, ${supplier.address.city}, ${supplier.address.state} - ${supplier.address.zipCode}`} />
            <DetailItem label="Data de Cadastro" value={new Date(supplier.createdAt).toLocaleString()} />
            <DetailItem label="Contato" value={supplier.submittedBy} />
            {supplier.status === SupplierStatus.Aprovado && supplier.approvedAt && (
                 <DetailItem label="Data de Aprovação" value={new Date(supplier.approvedAt).toLocaleString()} />
            )}
             {supplier.status === SupplierStatus.Reprovado && supplier.rejectionReason && (
                 <DetailItem label="Motivo da Reprovação" value={<span className="text-red-700 dark:text-red-300">{supplier.rejectionReason}</span>} />
            )}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Documentos Anexados</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                <ul role="list" className="border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-200 dark:divide-gray-600">
                  {supplier.uploadedDocuments.length > 0 ? supplier.uploadedDocuments.map((doc, index) => (
                    <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                      <div className="w-0 flex-1 flex items-center">
                        <FileText className="flex-shrink-0 h-5 w-5 text-gray-400" aria-hidden="true" />
                        <span className="ml-2 flex-1 w-0 truncate">{doc.docName}</span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <a href={doc.url} download={doc.docName} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </a>
                      </div>
                    </li>
                  )) : (
                    <li className="pl-3 pr-4 py-3 text-sm text-gray-500">Nenhum documento anexado.</li>
                  )}
                </ul>
              </dd>
            </div>
          </dl>
          
           { (supplier.status === SupplierStatus.Pendente || supplier.status === SupplierStatus.EmAnalise) &&
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-end gap-4">
                <button
                    onClick={() => setReproveModalOpen(true)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto flex justify-center items-center px-4 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-200 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                    <X className="h-5 w-5 mr-2" />
                    Reprovar
                </button>
                 <button
                    onClick={() => handleAction(SupplierStatus.Aprovado)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
                >
                    {actionLoading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                    Aprovar
                </button>
            </div>
           }
        </div>
      </div>

      {isReproveModalOpen && (
         <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                                    Reprovar Cadastro
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Por favor, insira o motivo da reprovação. Esta informação será enviada ao fornecedor.
                                    </p>
                                    <textarea
                                        rows={4}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="mt-4 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md"
                                        placeholder="Ex: Documentação fiscal inconsistente."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" onClick={() => handleAction(SupplierStatus.Reprovado)} disabled={!rejectionReason || actionLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-red-400">
                           {actionLoading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : 'Confirmar Reprovação'}
                        </button>
                        <button type="button" onClick={() => setReproveModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default SupplierDetailPage;
