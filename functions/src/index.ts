/**
 * Firebase Cloud Functions - Integração com Sienge API
 *
 * Setup:
 * 1. Instalar axios: cd functions && npm install axios
 * 2. Configurar API key: firebase functions:config:set sienge.apikey="YOUR_API_KEY"
 * 3. Configurar base URL: firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"
 * 4. Deploy: firebase deploy --only functions
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString, defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

// Definir parâmetros de configuração
// Use defineSecret para credenciais sensíveis (lidas do Secret Manager em runtime)
const siengeUsername = defineSecret("SIENGE_USERNAME");
const siengePassword = defineSecret("SIENGE_PASSWORD");
const siengeBaseUrl = defineString("SIENGE_BASE_URL", {
    default: "https://api.sienge.com.br/ambientallimpeza/public/api/v1",
});

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({
    maxInstances: 10,
    region: "southamerica-east1", // São Paulo
});

/**
 * Mapeia os dados do fornecedor para o formato aceito pela API Sienge
 * Envia apenas campos preenchidos
 */
function mapSupplierToSiengeCreditor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supplier: any,
    cityId = 1,
    agentId = 48
): any {
    // Validar campos obrigatórios
    if (!supplier.companyName) throw new Error("companyName é obrigatório");
    if (!supplier.cnpj) throw new Error("CNPJ é obrigatório");
    if (!supplier.phone) throw new Error("Telefone é obrigatório");
    if (!supplier.email) throw new Error("Email é obrigatório");
    if (!supplier.address) throw new Error("Endereço é obrigatório");

    // Extrair DDD e número do telefone
    const phoneMatch = supplier.phone.replace(/\D/g, "").match(/^(\d{2})(\d+)$/);
    const phoneDdd = phoneMatch ? phoneMatch[1] : "";
    const phoneNumber = phoneMatch ? phoneMatch[2] : supplier.phone.replace(/\D/g, "");

    // Construir objeto base (campos obrigatórios)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siengeRequest: any = {
        name: supplier.companyName,
        personType: supplier.personType || "J",
        typesId: ["FO"], // FO = Fornecedor
        registerNumber: supplier.cnpj.replace(/\D/g, ""),
        paymentTypeId: 1,
        agents: [{ agentId: agentId }],
        contacts: [{
            name: supplier.tradeName || supplier.companyName,
            phoneDdd: phoneDdd,
            phoneNumber: phoneNumber,
            email: supplier.email,
        }],
        address: {
            cityId: supplier.address.cityId || cityId,
            streetName: supplier.address.street,
            number: supplier.address.number,
            neighborhood: supplier.address.neighborhood,
            zipCode: supplier.address.zipCode.replace(/\D/g, ""),
        },
    };

    // Adicionar complemento apenas se preenchido
    if (supplier.address.complement) {
        siengeRequest.address.complement = supplier.address.complement;
    }

    // Adicionar inscrição estadual apenas se preenchida
    if (supplier.stateRegistration) {
        siengeRequest.stateRegistrationNumber = supplier.stateRegistration;
    }

    // Adicionar tipo de inscrição estadual apenas se preenchido
    if (supplier.stateRegistrationType) {
        siengeRequest.stateRegistrationType = supplier.stateRegistrationType;
    }

    // Adicionar inscrição municipal apenas se preenchida
    if (supplier.municipalRegistration) {
        siengeRequest.municipalSubscription = supplier.municipalRegistration;
    }

    // Adicionar telefone apenas se tiver DDD e número
    if (phoneDdd && phoneNumber) {
        siengeRequest.phone = {
            ddd: phoneDdd,
            number: phoneNumber,
            type: "1",
        };
    }

    // Adicionar website apenas se preenchido
    if (supplier.website) {
        siengeRequest.website = supplier.website;
    }

    // Adicionar dados bancários apenas se tiverem informações mínimas
    if (supplier.bankData?.bankCode && supplier.bankData?.account) {
        const accountType = supplier.bankData.accountType === "corrente" ? "C" : "P";
        siengeRequest.accountStatement = {
            bankCode: supplier.bankData.bankCode.padStart(3, "0"),
            accountNumber: supplier.bankData.account,
            accountType: accountType,
            accountBeneficiaryName: supplier.companyName,
        };

        // Adicionar campos opcionais de dados bancários
        if (supplier.bankData.agency) {
            siengeRequest.accountStatement.bankBranchNumber = supplier.bankData.agency;
        }
        if (supplier.bankData.agencyDigit) {
            siengeRequest.accountStatement.bankBranchDigit = supplier.bankData.agencyDigit;
        }
        if (supplier.bankData.accountDigit) {
            siengeRequest.accountStatement.accountDigit = supplier.bankData.accountDigit;
        }
        if (supplier.bankData.bank) {
            siengeRequest.accountStatement.bankName = supplier.bankData.bank;
        }

        // CPF/CNPJ do beneficiário
        const docNumber = supplier.cnpj.replace(/\D/g, "");
        if (supplier.personType === "J") {
            siengeRequest.accountStatement.accountBeneficiaryCnpjNumber = docNumber;
        } else {
            siengeRequest.accountStatement.accountBeneficiaryCpfNumber = docNumber;
        }
    }

    // Adicionar chave PIX apenas se preenchida
    if (supplier.bankData?.pixKey) {
        if (!siengeRequest.accountStatement) {
            siengeRequest.accountStatement = {};
        }
        siengeRequest.accountStatement.pixKey = supplier.bankData.pixKey;
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
// Bind SIENGE secrets to the callable so the runtime can access them
export const createSiengeCreditor = onCall({ secrets: [siengeUsername, siengePassword] } as any, async (request) => {
    // 1. Verificar autenticação
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    // 2. Validar parâmetros
    const { supplierId, cityId = 1, agentId = 48 } = request.data;

    if (!supplierId) {
        throw new HttpsError("invalid-argument", "supplierId é obrigatório");
    }

    try {
        // 3. Buscar fornecedor do Firestore
        const supplierDoc = await admin
            .firestore()
            .collection("suppliers")
            .doc(supplierId)
            .get();

        if (!supplierDoc.exists) {
            throw new HttpsError("not-found", "Fornecedor não encontrado");
        }

        const supplier = supplierDoc.data();

        // 4. Verificar se fornecedor está aprovado
        if (supplier?.status !== "aprovado") {
            throw new HttpsError(
                "failed-precondition",
                "Fornecedor precisa estar aprovado para ser enviado ao Sienge"
            );
        }

        // 5. Verificar se já foi enviado ao Sienge
        if (supplier?.siengeCreditorId) {
            return {
                success: true,
                siengeCreditorId: supplier.siengeCreditorId,
                message: "Fornecedor já cadastrado no Sienge",
                alreadyExists: true,
            };
        }

        // 6. Mapear dados para formato Sienge
        let siengeData;
        try {
            siengeData = mapSupplierToSiengeCreditor(supplier, cityId, agentId);
            logger.info("Dados mapeados com sucesso", {
                supplierId,
                companyName: siengeData.name,
            });
        } catch (mapError: any) {
            logger.error("Erro ao mapear dados do fornecedor:", {
                supplierId,
                error: mapError.message,
                supplierData: supplier,
            });
            throw new HttpsError(
                "invalid-argument",
                `Erro ao processar dados do fornecedor: ${mapError.message}`
            );
        }

        // 7. Obter configurações
        // Read and sanitize secrets (trim to remove trailing newlines or spaces)
        const rawUsername = siengeUsername.value();
        const rawPassword = siengePassword.value();
        const baseUrl = siengeBaseUrl.value();

        const username = rawUsername ? String(rawUsername).trim() : '';
        const password = rawPassword ? String(rawPassword).trim() : '';

        if (!username || !password) {
            throw new HttpsError(
                "failed-precondition",
                "Credenciais do Sienge não configuradas. Defina SIENGE_USERNAME e SIENGE_PASSWORD ao fazer deploy."
            );
        }

        // Codificar username:password em Base64 para Basic Auth
        const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
        const siengeUrl = `${baseUrl}/creditors`;

        // Log minimal info to avoid leaking credentials or payloads
        logger.info("Chamando API Sienge", {
            url: siengeUrl,
            method: "POST",
            companyName: siengeData?.name,
            hasAuth: !!(username && password),
        });

        const response = await axios.post(
            siengeUrl,
            siengeData,
            {
                headers: {
                    "Authorization": `Basic ${base64Credentials}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000, // 30 segundos
            }
        );

        // Log de resposta resumida (não armazenamos cabeçalhos ou payloads completos aqui)
        logger.info("Resposta da API Sienge", {
            status: response.status,
            statusText: response.statusText,
            siengeCreditorId: response.data?.id || response.data?.creditorId || response.data?.entityId || null,
        });

        // Extrair ID do credor da resposta (pode ser 'id', 'creditorId', etc)
        const siengeCreditorId = response.data?.id ||
            response.data?.creditorId ||
            response.data?.entityId ||
            null;

        if (!siengeCreditorId) {
            logger.warn("ID do credor não encontrado na resposta do Sienge", {
                responseData: response.data,
            });
        }

        // 8. Atualizar Firestore com ID do Sienge
        const updateData: any = {
            sentToSiengeAt: admin.firestore.FieldValue.serverTimestamp(),
            siengeIntegrationStatus: "success",
            siengeResponse: response.data,
        };

        // Adicionar siengeCreditorId apenas se existir
        if (siengeCreditorId) {
            updateData.siengeCreditorId = siengeCreditorId;
        }

        await supplierDoc.ref.update(updateData);

        logger.info("Credor criado no Sienge com sucesso", {
            supplierId,
            siengeCreditorId,
        });

        return {
            success: true,
            siengeCreditorId,
            message: "Fornecedor cadastrado no Sienge com sucesso",
            responseData: response.data,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        logger.error("Erro ao criar credor no Sienge:", {
            supplierId,
            error: error.message,
            response: error.response?.data,
        });

        // Salvar erro no Firestore para análise (protege contra undefined em error.response)
        if (supplierId) {
            try {
                const siengeIntegrationError: any = {
                    message: error.message,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (error.response && error.response.data !== undefined) {
                    siengeIntegrationError.response = error.response.data;
                }

                // Remove any undefined properties to avoid Firestore rejecting the update
                Object.keys(siengeIntegrationError).forEach((k) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if ((siengeIntegrationError as any)[k] === undefined) {
                        delete (siengeIntegrationError as any)[k];
                    }
                });

                await admin.firestore().collection("suppliers").doc(supplierId).update({
                    siengeIntegrationStatus: "error",
                    siengeIntegrationError,
                });
            } catch (updateErr: unknown) {
                // Ignore errors when updating error status to avoid masking original error
                const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
                logger.warn('Falha ao registrar erro no Firestore:', { updateErr: msg });
            }
        }

        // Tratamento de erros específicos da API Sienge
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            logger.error("Detalhes do erro da API Sienge:", {
                status,
                statusText: error.response.statusText,
                errorData,
                headers: error.response.headers,
            });

            if (status === 400) {
                throw new HttpsError(
                    "invalid-argument",
                    `Dados inválidos: ${JSON.stringify(errorData)}`
                );
            } else if (status === 401) {
                throw new HttpsError(
                    "unauthenticated",
                    `API Key do Sienge inválida ou expirada. Resposta: ${JSON.stringify(errorData)}`
                );
            } else if (status === 409) {
                throw new HttpsError("already-exists", "Credor já existe no Sienge");
            } else if (status === 500) {
                throw new HttpsError("internal", "Erro interno no servidor do Sienge");
            }
        }

        throw new HttpsError("internal", `Erro ao integrar com Sienge: ${error.message}`);
    }
});/**
 * Cloud Function: Obter preview dos dados que seriam enviados ao Sienge
 * Útil para testes e validação antes do envio real
 */
export const previewSiengeCreditor = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado");
    }

    const { supplierId, cityId = 1, agentId = 48 } = request.data;

    if (!supplierId) {
        throw new HttpsError("invalid-argument", "supplierId é obrigatório");
    }

    const supplierDoc = await admin
        .firestore()
        .collection("suppliers")
        .doc(supplierId)
        .get();

    if (!supplierDoc.exists) {
        throw new HttpsError("not-found", "Fornecedor não encontrado");
    }

    const supplier = supplierDoc.data();
    const siengeData = mapSupplierToSiengeCreditor(supplier, cityId, agentId);

    return {
        preview: siengeData,
        supplier: {
            id: supplierId,
            companyName: supplier?.companyName,
            status: supplier?.status,
        },
    };
});

/**
 * Cloud Function: Criar usuário no Firebase Auth e documento no Firestore
 * Parâmetros:
 * - email, name, role, password, createdBy
 */
export const createAuthUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    // Verificar se solicitante é admin — primeiro por custom claim, depois coleção 'admins'
    const requesterUid = request.auth.uid;
    const requesterClaims = request.auth.token || {};
    const isRequesterAdminByClaim = requesterClaims.role === 'admin' || requesterClaims.admin === true;
    if (!isRequesterAdminByClaim) {
        const adminDoc = await admin.firestore().collection('admins').doc(requesterUid).get();
        if (!adminDoc.exists) {
            // fallback: buscar por email
            const requesterEmail = request.auth.token.email;
            const q = await admin.firestore().collection('admins').where('email', '==', requesterEmail).get();
            if (q.empty) {
                throw new HttpsError('permission-denied', 'Ação restrita a administradores');
            }
        }
    }

    const { email, name, role, password, createdBy } = request.data || {};
    if (!email || !name || !role || !password) {
        throw new HttpsError('invalid-argument', 'Parâmetros incompletos: email, name, role e password são obrigatórios');
    }

    try {
        // Criar usuário no Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: String(email),
            password: String(password),
            displayName: String(name),
            disabled: false,
        });

        // Definir claim de role
        await admin.auth().setCustomUserClaims(userRecord.uid, { role });

        // Criar documento no Firestore (coleção 'users')
        const usersRef = admin.firestore().collection('users');
        const newUserDoc = await usersRef.add({
            email,
            name,
            role,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: createdBy || request.auth.token.email || requesterUid,
        });

        return {
            success: true,
            userId: newUserDoc.id,
            authUid: userRecord.uid,
        };
    } catch (error: any) {
        logger.error('Erro ao criar usuário no Auth/Firestore', { error: error.message });
        // se já existir usuário no Auth, lançar erro claro
        if (error.code && error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Email já cadastrado no Auth');
        }
        throw new HttpsError('internal', `Erro ao criar usuário: ${error.message}`);
    }
});

/**
 * Cloud Function: Ativar / Desativar usuário no Firebase Auth e atualizar status no Firestore
 * Parâmetros:
 * - userId (Firestore doc id) or authUid
 * - status: 'active' | 'inactive'
 */
export const setAuthUserStatus = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    // Verificar se solicitante é admin — primeiro por custom claim, depois coleção 'admins'
    const requesterUid = request.auth.uid;
    const requesterClaims2 = request.auth.token || {};
    const isRequesterAdminByClaim2 = requesterClaims2.role === 'admin' || requesterClaims2.admin === true;
    if (!isRequesterAdminByClaim2) {
        const adminDoc = await admin.firestore().collection('admins').doc(requesterUid).get();
        if (!adminDoc.exists) {
            const requesterEmail = request.auth.token.email;
            const q = await admin.firestore().collection('admins').where('email', '==', requesterEmail).get();
            if (q.empty) {
                throw new HttpsError('permission-denied', 'Ação restrita a administradores');
            }
        }
    }

    const { userId, authUid, status } = request.data || {};
    if (!status || (status !== 'active' && status !== 'inactive')) {
        throw new HttpsError('invalid-argument', 'Status inválido. Use "active" ou "inactive".');
    }

    try {
        // Resolver authUid: se fornecido, usamos diretamente; se fornecer userId (Firestore doc id), buscamos o documento para pegar authUid (se tiver)
        let targetAuthUid = authUid;
        if (!targetAuthUid && userId) {
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'Usuário não encontrado no Firestore');
            }
            const userData = userDoc.data() as any;
            // tentar usar campo authUid se existir, ou encontrar por email
            targetAuthUid = userData.authUid;
            if (!targetAuthUid && userData.email) {
                // buscar usuário no Auth pelo email
                const found = await admin.auth().getUserByEmail(userData.email).catch(() => null);
                if (found) targetAuthUid = found.uid;
            }
        }

        if (!targetAuthUid) {
            // Se não conseguimos achar authUid, podemos atualizar apenas o Firestore
            if (userId) {
                await admin.firestore().collection('users').doc(userId).update({
                    status: status === 'active' ? 'active' : 'inactive',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { success: true, updatedFirestoreOnly: true };
            }
            throw new HttpsError('not-found', 'Não foi possível localizar o usuário no Auth');
        }

        // Atualizar estado no Auth
        await admin.auth().updateUser(targetAuthUid, { disabled: status === 'inactive' });

        // Atualizar Firestore user doc if userId provided
        if (userId) {
            await admin.firestore().collection('users').doc(userId).update({
                status: status === 'active' ? 'active' : 'inactive',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            // tentar atualizar pelo email (get user, então query users by email)
            const userRecord = await admin.auth().getUser(targetAuthUid);
            const q = await admin.firestore().collection('users').where('email', '==', userRecord.email).get();
            if (!q.empty) {
                const docRef = q.docs[0].ref;
                await docRef.update({ status: status === 'active' ? 'active' : 'inactive', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        }

        return { success: true };
    } catch (error: any) {
        logger.error('Erro ao atualizar status do usuário no Auth/Firestore', { error: error.message });
        throw new HttpsError('internal', `Erro ao atualizar status: ${error.message}`);
    }
});
