import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// use global fetch available in Node 18+
admin.initializeApp();

interface ErpCredentials {
    username: string;
    password: string;
}

async function getErpCredentials(): Promise<ErpCredentials> {
    // Option 1: Environment variables (for local testing or cloud env vars)
    if (process.env.ERP_USERNAME && process.env.ERP_PASSWORD) {
        return {
            username: process.env.ERP_USERNAME,
            password: process.env.ERP_PASSWORD
        };
    }

    // Option 2: Firebase functions config (deployed functions)
    const config = functions.config();
    if (config.erp && config.erp.username && config.erp.password) {
        return {
            username: config.erp.username,
            password: config.erp.password
        };
    }

    // Fallback: throw error
    throw new Error('ERP credentials not configured. Set ERP_USERNAME/ERP_PASSWORD env vars or use firebase functions:config:set');
}

export const onSupplierStatusChange = functions
    .region('us-central1')
    .firestore.document('suppliers/{supplierId}')
    .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
        const before = change.before.data();
        const after = change.after.data();
        const supplierId = context.params.supplierId as string;

        // Only act when status changed to 'aprovado'
        if (before?.status === after?.status) return null;
        if (after?.status !== 'aprovado') return null;

        const supplierRef = change.after.ref;

        // Idempotency checks
        const erpIntegration = after?.erpIntegration || {};
        if (erpIntegration.status === 'success') {
            functions.logger.info(`Supplier ${supplierId} already synced to ERP`);
            return null;
        }
        if (erpIntegration.processing) {
            functions.logger.info(`Supplier ${supplierId} is already processing`);
            return null;
        }

        // mark processing
        await supplierRef.update({
            'erpIntegration.processing': true,
            'erpIntegration.lastAttemptAt': admin.firestore.FieldValue.serverTimestamp(),
        });

        let credentials: ErpCredentials;
        try {
            credentials = await getErpCredentials();
        } catch (err) {
            functions.logger.error('Failed to get ERP credentials', err);
            await supplierRef.update({
                'erpIntegration.processing': false,
                'erpIntegration.status': 'failed',
                'erpIntegration.lastError': `Credentials error: ${(err as Error).message}`,
            });
            return null;
        }

        // Helper function to extract DDD and number from phone
        function parsePhone(phoneString: string) {
            // Try to extract DDD (area code) and number from various formats
            const cleanPhone = phoneString.replace(/\D/g, ''); // Remove non-digits
            if (cleanPhone.length >= 10) {
                const ddd = cleanPhone.substring(0, 2);
                const number = cleanPhone.substring(2);
                return { ddd, number };
            }
            return { ddd: "48", number: cleanPhone || "999999999" }; // Default fallback
        }

        const phoneData = parsePhone(after.phone || "");

        // prepare payload - adapted to Sienge API schema
        const payload = {
            name: after.companyName,
            personType: "J", // J = Jurídica (empresa), F = Física  
            typesId: ["FO"], // FO = Fornecedor, CO = Cliente
            registerNumber: after.cnpj.replace(/\D/g, ''), // Remove formatting from CNPJ
            stateRegistrationNumber: "", // Not available in our data
            stateRegistrationType: "I", // I = Isento, C = Contribuinte 
            municipalSubscription: "", // Not available
            paymentTypeId: 1, // Default payment type
            phone: {
                ddd: phoneData.ddd,
                number: phoneData.number,
                type: "1" // 1 = Comercial
            },
            agents: [
                {
                    agentId: 48 // Default agent - adjust as needed
                }
            ],
            contacts: [
                {
                    name: after.submittedBy || "Contato Principal",
                    phoneDdd: phoneData.ddd,
                    phoneNumber: phoneData.number,
                    phoneExtension: "",
                    email: after.email,
                    skype: "",
                    msn: ""
                }
            ],
            address: {
                cityId: 1, // Default city - needs mapping to Sienge cities
                streetName: after.address?.street || "",
                number: "S/N", // Not available in our address structure
                complement: "",
                neighborhood: "",
                zipCode: after.address?.zipCode?.replace(/\D/g, '') || ""
            }
            // Optional fields not included: procurators, payslipDesonerationYears, accountStatement
        };

        try {
            // Create Basic Auth header
            const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

            const res = await fetch('https://api.sienge.com.br/ambientallimpeza/public/api/v1/creditors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${basicAuth}`,
                },
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            if (!res.ok) {
                functions.logger.error('ERP API returned error', { status: res.status, body: text });
                await supplierRef.update({
                    'erpIntegration.processing': false,
                    'erpIntegration.status': 'failed',
                    'erpIntegration.lastError': `HTTP ${res.status}: ${text}`,
                    'erpIntegration.lastAttemptAt': admin.firestore.FieldValue.serverTimestamp(),
                });
                return null;
            }

            // try to parse JSON response, fallback to raw text
            let result: any = null;
            try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }

            await supplierRef.update({
                'erpIntegration.processing': false,
                'erpIntegration.status': 'success',
                'erpIntegration.erpId': result?.id || null,
                'erpIntegration.syncedAt': admin.firestore.FieldValue.serverTimestamp(),
            });

            functions.logger.info(`Supplier ${supplierId} created in ERP`, { erpId: result?.id });
            return null;
        } catch (err) {
            functions.logger.error('Failed to call ERP API', err);
            await supplierRef.update({
                'erpIntegration.processing': false,
                'erpIntegration.status': 'failed',
                'erpIntegration.lastError': (err as Error).message,
                'erpIntegration.lastAttemptAt': admin.firestore.FieldValue.serverTimestamp(),
            });
            return null;
        }
    });
