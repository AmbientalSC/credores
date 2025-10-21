/**
 * Firebase Cloud Function - Integração com Sienge API
 * 
 * Esta função deve ser implementada no Firebase Functions para
 * enviar credores aprovados para a API do Sienge de forma segura.
 * 
 * Setup:
 * 1. npm install firebase-functions firebase-admin axios
 * 2. firebase functions:config:set sienge.apikey="YOUR_API_KEY"
 * 3. firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"
 * 4. firebase deploy --only functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

interface SiengeCreditorRequest {
    name: string;
    personType: 'F' | 'J';
    typesId: string[];
    registerNumber: string;
    stateRegistrationNumber?: string;
    stateRegistrationType: 'C' | 'I' | 'N';
    municipalSubscription?: string;
    paymentTypeId: number;
    phone?: {
        ddd: string;
        number: string;
        type: string;
    };
    agents?: Array<{
        agentId: number;
    }>;
    contacts?: Array<{
        name: string;
        phoneDdd?: string;
        phoneNumber?: string;
        email?: string;
    }>;
    address?: {
        cityId: number;
        streetName: string;
        number: string;
        complement?: string;
        neighborhood: string;
        zipCode: string;
    };
    accountStatement?: {
        bankCode: string;
        bankBranchNumber: string;
        bankBranchDigit?: string;
        accountNumber: string;
        accountDigit: string;
        accountType: 'C' | 'P';
        accountBeneficiaryName?: string;
        accountBeneficiaryCpfNumber?: string;
        accountBeneficiaryCnpjNumber?: string;
    };
}

/**
 * Mapeia os dados do fornecedor para o formato aceito pela API Sienge
 */
function mapSupplierToSiengeCreditor(
    supplier: any,
    cityId: number = 1,
    agentId: number = 48
): SiengeCreditorRequest {
    // Extrair DDD e número do telefone
    const phoneMatch = supplier.phone.replace(/\D/g, '').match(/^(\d{2})(\d+)$/);
    const phoneDdd = phoneMatch ? phoneMatch[1] : '';
    const phoneNumber = phoneMatch ? phoneMatch[2] : supplier.phone.replace(/\D/g, '');

    // Converter tipo de conta
    const accountType = supplier.bankData.accountType === 'corrente' ? 'C' : 'P';

    const siengeRequest: SiengeCreditorRequest = {
        name: supplier.companyName,
        personType: supplier.personType || 'J',
        typesId: ['FO'], // FO = Fornecedor
        registerNumber: supplier.cnpj.replace(/\D/g, ''),
        stateRegistrationNumber: supplier.stateRegistration,
        stateRegistrationType: supplier.stateRegistrationType || 'C',
        paymentTypeId: 1, // Default
        phone: phoneDdd && phoneNumber ? {
            ddd: phoneDdd,
            number: phoneNumber,
            type: '1' // 1 = Comercial
        } : undefined,
        agents: [
            {
                agentId: agentId
            }
        ],
        contacts: [
            {
                name: supplier.tradeName || supplier.companyName,
                phoneDdd: phoneDdd,
                phoneNumber: phoneNumber,
                email: supplier.email,
            }
        ],
        address: {
            cityId: supplier.address.cityId || cityId,
            streetName: supplier.address.street,
            number: supplier.address.number,
            complement: supplier.address.complement,
            neighborhood: supplier.address.neighborhood,
            zipCode: supplier.address.zipCode.replace(/\D/g, ''),
        },
        accountStatement: {
            bankCode: supplier.bankData.bankCode.padStart(3, '0'),
            bankBranchNumber: supplier.bankData.agency,
            bankBranchDigit: supplier.bankData.agencyDigit,
            accountNumber: supplier.bankData.account,
            accountDigit: supplier.bankData.accountDigit,
            accountType: accountType,
            accountBeneficiaryName: supplier.companyName,
            accountBeneficiaryCnpjNumber: supplier.personType === 'J'
                ? supplier.cnpj.replace(/\D/g, '')
                : undefined,
            accountBeneficiaryCpfNumber: supplier.personType === 'F'
                ? supplier.cnpj.replace(/\D/g, '')
                : undefined,
        }
    };

    // Adicionar inscrição municipal apenas para pessoa jurídica
    if (supplier.personType === 'J' && supplier.municipalRegistration) {
        siengeRequest.municipalSubscription = supplier.municipalRegistration;
    }

    return siengeRequest;
}

/**
 * Cloud Function: Criar Credor no Sienge
 * 
 * Parâmetros:
 * - supplierId: ID do fornecedor no Firestore
 * - cityId: (opcional) ID da cidade no Sienge (padrão: 1)
 * - agentId: (opcional) ID do agente no Sienge (padrão: 48)
 * 
 * Retorno:
 * - success: boolean
 * - siengeCreditorId: ID do credor criado no Sienge
 * - message: mensagem de sucesso ou erro
 */
export const createSiengeCreditor = functions
    .region('southamerica-east1') // São Paulo
    .https.onCall(async (data, context) => {
        // 1. Verificar autenticação
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Usuário não autenticado'
            );
        }

        // 2. Validar parâmetros
        const { supplierId, cityId = 1, agentId = 48 } = data;

        if (!supplierId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'supplierId é obrigatório'
            );
        }

        try {
            // 3. Buscar fornecedor do Firestore
            const supplierDoc = await admin
                .firestore()
                .collection('suppliers')
                .doc(supplierId)
                .get();

            if (!supplierDoc.exists) {
                throw new functions.https.HttpsError(
                    'not-found',
                    'Fornecedor não encontrado'
                );
            }

            const supplier = supplierDoc.data();

            // 4. Verificar se fornecedor está aprovado
            if (supplier?.status !== 'aprovado') {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Fornecedor precisa estar aprovado para ser enviado ao Sienge'
                );
            }

            // 5. Verificar se já foi enviado ao Sienge
            if (supplier?.siengeCreditorId) {
                return {
                    success: true,
                    siengeCreditorId: supplier.siengeCreditorId,
                    message: 'Fornecedor já cadastrado no Sienge',
                    alreadyExists: true
                };
            }

            // 6. Mapear dados para formato Sienge
            const siengeData = mapSupplierToSiengeCreditor(supplier, cityId, agentId);

            console.log('Enviando credor para Sienge:', {
                supplierId,
                companyName: siengeData.name,
                cnpj: siengeData.registerNumber
            });

            // 7. Chamar API Sienge
            const siengeApiKey = functions.config().sienge?.apikey;
            const siengeBaseUrl = functions.config().sienge?.baseurl || 'https://api.sienge.com.br';

            if (!siengeApiKey) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'API Key do Sienge não configurada. Execute: firebase functions:config:set sienge.apikey="YOUR_KEY"'
                );
            }

            const response = await axios.post(
                `${siengeBaseUrl}/creditor/v1/creditors`,
                siengeData,
                {
                    headers: {
                        'Authorization': `Bearer ${siengeApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 segundos
                }
            );

            // 8. Atualizar Firestore com ID do Sienge
            await supplierDoc.ref.update({
                siengeCreditorId: response.data.id,
                sentToSiengeAt: admin.firestore.FieldValue.serverTimestamp(),
                siengeIntegrationStatus: 'success',
                siengeResponse: response.data
            });

            console.log('Credor criado no Sienge com sucesso:', {
                supplierId,
                siengeCreditorId: response.data.id
            });

            return {
                success: true,
                siengeCreditorId: response.data.id,
                message: 'Fornecedor cadastrado no Sienge com sucesso'
            };

        } catch (error: any) {
            console.error('Erro ao criar credor no Sienge:', {
                supplierId,
                error: error.message,
                response: error.response?.data
            });

            // Salvar erro no Firestore para análise
            if (supplierId) {
                await admin
                    .firestore()
                    .collection('suppliers')
                    .doc(supplierId)
                    .update({
                        siengeIntegrationStatus: 'error',
                        siengeIntegrationError: {
                            message: error.message,
                            response: error.response?.data,
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
            }

            // Tratamento de erros específicos da API Sienge
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                if (status === 400) {
                    throw new functions.https.HttpsError(
                        'invalid-argument',
                        `Dados inválidos: ${JSON.stringify(errorData)}`
                    );
                } else if (status === 401) {
                    throw new functions.https.HttpsError(
                        'unauthenticated',
                        'API Key do Sienge inválida'
                    );
                } else if (status === 409) {
                    throw new functions.https.HttpsError(
                        'already-exists',
                        'Credor já existe no Sienge'
                    );
                } else if (status === 500) {
                    throw new functions.https.HttpsError(
                        'internal',
                        'Erro interno no servidor do Sienge'
                    );
                }
            }

            throw new functions.https.HttpsError(
                'internal',
                `Erro ao integrar com Sienge: ${error.message}`
            );
        }
    });

/**
 * Cloud Function: Obter preview dos dados que seriam enviados ao Sienge
 * Útil para testes e validação antes do envio real
 */
export const previewSiengeCreditor = functions
    .region('southamerica-east1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Usuário não autenticado'
            );
        }

        const { supplierId, cityId = 1, agentId = 48 } = data;

        if (!supplierId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'supplierId é obrigatório'
            );
        }

        const supplierDoc = await admin
            .firestore()
            .collection('suppliers')
            .doc(supplierId)
            .get();

        if (!supplierDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'Fornecedor não encontrado'
            );
        }

        const supplier = supplierDoc.data();
        const siengeData = mapSupplierToSiengeCreditor(supplier, cityId, agentId);

        return {
            preview: siengeData,
            supplier: {
                id: supplierId,
                companyName: supplier?.companyName,
                status: supplier?.status
            }
        };
    });

/**
 * Trigger: Automaticamente enviar ao Sienge quando fornecedor for aprovado
 * (Opcional - comentado por padrão)
 */
/*
export const onSupplierApproved = functions
  .region('southamerica-east1')
  .firestore.document('suppliers/{supplierId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const supplierId = context.params.supplierId;

    // Verificar se status mudou para aprovado
    if (before.status !== 'aprovado' && after.status === 'aprovado') {
      console.log('Fornecedor aprovado, enviando para Sienge:', supplierId);

      try {
        // Chamar a função createSiengeCreditor internamente
        // Nota: adaptar conforme necessidade
        const siengeData = mapSupplierToSiengeCreditor(after);
        
        // Implementar lógica de envio aqui
        // ...
        
      } catch (error) {
        console.error('Erro ao enviar fornecedor aprovado para Sienge:', error);
      }
    }
  });
*/
