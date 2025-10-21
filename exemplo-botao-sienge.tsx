/**
 * Exemplo de código para adicionar no SupplierDetailPage.tsx
 * 
 * Este código adiciona um botão "Enviar para Sienge" que:
 * - Aparece apenas para fornecedores aprovados
 * - Mostra preview dos dados antes de enviar
 * - Chama a Cloud Function para criar o credor no Sienge
 * - Exibe feedback de sucesso/erro
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';

// ... dentro do componente SupplierDetailPage

const [sendingToSienge, setSendingToSienge] = useState(false);
const [siengePreview, setSiengePreview] = useState<any>(null);
const [showPreview, setShowPreview] = useState(false);

// Função para obter preview dos dados
const handlePreviewSienge = async () => {
    try {
        setSendingToSienge(true);
        const functions = getFunctions();
        const previewFunc = httpsCallable(functions, 'previewSiengeCreditor');

        const result = await previewFunc({
            supplierId: supplier.id,
            cityId: 1,  // Ajustar conforme necessário
            agentId: 48 // Ajustar conforme necessário
        });

        setSiengePreview(result.data);
        setShowPreview(true);
    } catch (error: any) {
        alert(`Erro ao gerar preview: ${error.message}`);
    } finally {
        setSendingToSienge(false);
    }
};

// Função para enviar para Sienge
const handleSendToSienge = async () => {
    if (!confirm('Deseja realmente enviar este fornecedor para o Sienge?')) {
        return;
    }

    try {
        setSendingToSienge(true);
        const functions = getFunctions();
        const createFunc = httpsCallable(functions, 'createSiengeCreditor');

        const result = await createFunc({
            supplierId: supplier.id,
            cityId: 1,  // Ajustar conforme necessário
            agentId: 48 // Ajustar conforme necessário
        });

        const data = result.data as any;

        if (data.success) {
            alert(`✅ Fornecedor cadastrado no Sienge!\nID: ${data.siengeCreditorId}`);
            // Recarregar dados do fornecedor para mostrar siengeCreditorId
            window.location.reload();
        }
    } catch (error: any) {
        console.error('Erro ao enviar para Sienge:', error);
        alert(`❌ Erro ao enviar para Sienge:\n${error.message}`);
    } finally {
        setSendingToSienge(false);
        setShowPreview(false);
    }
};

// JSX - Adicionar no final da página, após os botões de aprovar/reprovar

return (
    <div>
        {/* ... código existente ... */}

        {/* Botão Enviar para Sienge */}
        {supplier.status === 'aprovado' && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Integração Sienge
                </h3>

                {supplier.siengeCreditorId ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                            ✅ Cadastrado no Sienge
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            ID do Credor: <code className="font-mono">{supplier.siengeCreditorId}</code>
                        </p>
                        {supplier.sentToSiengeAt && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Enviado em: {new Date(supplier.sentToSiengeAt).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={handlePreviewSienge}
                                disabled={sendingToSienge}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {sendingToSienge ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Gerando Preview...
                                    </>
                                ) : (
                                    <>
                                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview Dados
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleSendToSienge}
                                disabled={sendingToSienge}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {sendingToSienge ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Enviar para Sienge
                                    </>
                                )}
                            </button>
                        </div>

                        {supplier.siengeIntegrationStatus === 'error' && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                    ❌ Erro na última tentativa de integração
                                </p>
                                {supplier.siengeIntegrationError?.message && (
                                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                        {supplier.siengeIntegrationError.message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Modal de Preview */}
        {showPreview && siengePreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Preview - Dados para Sienge
                        </h3>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(siengePreview.preview, null, 2)}
                        </pre>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            onClick={() => setShowPreview(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={() => {
                                setShowPreview(false);
                                handleSendToSienge();
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                            Confirmar e Enviar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
