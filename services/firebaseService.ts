
import { auth, db, storage } from '../firebase.config';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  Timestamp,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

import { Supplier, SupplierStatus, AdminUser, UploadedDocument, User, UserRole, UserStatus, SiengeCreditorRequest } from '../types';

// Helper to convert Firestore doc to Supplier object, handling Timestamps
const fromFirestore = (docSnap: any): Supplier => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    approvedAt: (data.approvedAt as Timestamp)?.toDate() || null,
  } as Supplier;
}

// Helper to map Supplier data to Sienge Creditor format
const mapSupplierToSiengeCreditor = (supplier: Supplier, cityId: number = 1, agentId: number = 48): SiengeCreditorRequest => {
  // Extrair DDD e número do telefone
  const phoneMatch = supplier.phone.replace(/\D/g, '').match(/^(\d{2})(\d+)$/);
  const phoneDdd = phoneMatch ? phoneMatch[1] : '';
  const phoneNumber = phoneMatch ? phoneMatch[2] : supplier.phone.replace(/\D/g, '');

  // Converter tipo de conta
  const accountType = supplier.bankData.accountType === 'corrente' ? 'C' : 'P';

  const siengeRequest: SiengeCreditorRequest = {
    name: supplier.companyName,
    personType: supplier.personType,
    typesId: ['FO'], // FO = Fornecedor (pode ser customizado)
    registerNumber: supplier.cnpj.replace(/\D/g, ''),
    stateRegistrationNumber: supplier.stateRegistration,
    stateRegistrationType: supplier.stateRegistrationType,
    paymentTypeId: 1, // Default, pode ser customizado
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
      accountBeneficiaryCnpjNumber: supplier.personType === 'J' ? supplier.cnpj.replace(/\D/g, '') : undefined,
      accountBeneficiaryCpfNumber: supplier.personType === 'F' ? supplier.cnpj.replace(/\D/g, '') : undefined,
    }
  };

  // Adicionar inscrição municipal apenas para pessoa jurídica
  if (supplier.personType === 'J' && supplier.municipalRegistration) {
    siengeRequest.municipalSubscription = supplier.municipalRegistration;
  }

  return siengeRequest;
}

class FirebaseService {

  // --- Auth ---
  async login(email: string, pass: string): Promise<AdminUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential.user) {
      // Permitir qualquer usuário autenticado
      const basicUser = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        role: 'user',
      };
      localStorage.setItem('admin_user', JSON.stringify(basicUser));
      return basicUser as AdminUser;
    }
    throw new Error('Credenciais inválidas.');
  }

  async logout(): Promise<void> {
    localStorage.removeItem('admin_user');
    await signOut(auth);
  }

  async getCurrentUser(): Promise<AdminUser | null> {
    const userJson = localStorage.getItem('admin_user');
    if (userJson) {
      return JSON.parse(userJson) as AdminUser;
    }
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          // Permitir qualquer usuário autenticado
          const basicUser = {
            id: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            role: 'user',
          };
          localStorage.setItem('admin_user', JSON.stringify(basicUser));
          resolve(basicUser as AdminUser);
        } else {
          resolve(null);
        }
      });
    });
  }

  private async checkIfAdmin(user: FirebaseUser): Promise<AdminUser | null> {
    // Best practice: admin collection keyed by user UID
    const adminDocRef = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminDocRef);
    if (adminSnap.exists() && adminSnap.data().role === 'admin') {
      return { id: adminSnap.id, ...adminSnap.data() } as AdminUser;
    }
    // Fallback: query by email if UID is not the key
    const q = query(collection(db, 'admins'), where('email', '==', user.email), where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      return { id: adminDoc.id, ...adminDoc.data() } as AdminUser;
    }
    return null;
  }

  // --- Pre-Registration ---
  async createPreRegistration(cnpj: string, email: string): Promise<{ token: string }> {
    const suppliersRef = collection(db, 'suppliers');
    const q = query(suppliersRef, where('cnpj', '==', cnpj));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error('CNPJ já cadastrado.');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Token valid for 24 hours

    const preRegistrationsRef = collection(db, 'pre_registrations');
    await addDoc(preRegistrationsRef, {
      cnpj,
      email,
      token,
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false
    });

    console.log(`A Cloud Function should now send an email to ${email} with token: ${token}`);
    return { token };
  }

  async validateRegistrationToken(token: string): Promise<boolean> {
    const preRegRef = collection(db, 'pre_registrations');
    const q = query(preRegRef, where('token', '==', token));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;

    const regData = snapshot.docs[0].data();
    if (regData.used) return false;

    if (Timestamp.now() > regData.expiresAt) return false;

    return true;
  }

  // --- Supplier Data ---
  async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'status' | 'approvedAt'>): Promise<Supplier> {
    const newSupplierData = {
      ...data,
      status: SupplierStatus.EmAnalise,
      createdAt: serverTimestamp(),
      approvedAt: null,
    };

    const docRef = await addDoc(collection(db, 'suppliers'), newSupplierData);
    const docSnap = await getDoc(docRef);
    return fromFirestore(docSnap);
  }

  async getSuppliers(): Promise<Supplier[]> {
    const q = query(collection(db, 'suppliers'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(fromFirestore);
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return fromFirestore(docSnap);
    }
    return undefined;
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    const supplierRef = doc(db, 'suppliers', id);
    await updateDoc(supplierRef, data as any); // Use 'as any' to allow complex objects like uploadedDocuments
  }

  async updateSupplierStatus(id: string, status: SupplierStatus, rejectionReason?: string): Promise<Supplier> {
    const supplierRef = doc(db, 'suppliers', id);
    const updateData: any = { status };
    if (status === SupplierStatus.Aprovado) {
      updateData.approvedAt = serverTimestamp();
      updateData.rejectionReason = null;
    }
    if (status === SupplierStatus.Reprovado) {
      updateData.rejectionReason = rejectionReason || 'Motivo não especificado.';
    }

    await updateDoc(supplierRef, updateData);

    const updatedDoc = await getDoc(supplierRef);
    return fromFirestore(updatedDoc);
  }

  async deleteSupplier(id: string): Promise<void> {
    const supplierRef = doc(db, 'suppliers', id);
    await deleteDoc(supplierRef);
  }

  // --- User Management ---
  async getUsers(): Promise<import('../types').User[]> {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(query(usersRef, orderBy('createdAt', 'desc')));

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        lastLogin: (data.lastLogin as Timestamp)?.toDate() || undefined,
      } as import('../types').User;
    });
  }

  async createUser(userData: {
    email: string;
    name: string;
    role: import('../types').UserRole;
    password: string;
    createdBy: string;
  }): Promise<string> {
    // Note: In a real implementation, you'd use Firebase Admin SDK to create users
    // For now, we'll just store the user data in Firestore
    const userRef = collection(db, 'users');

    const newUser = {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      status: 'active' as import('../types').UserStatus,
      createdAt: serverTimestamp(),
      createdBy: userData.createdBy,
      // Note: Password should be hashed and handled server-side in production
    };

    const docRef = await addDoc(userRef, newUser);
    return docRef.id;
  }

  async updateUserStatus(userId: string, status: import('../types').UserStatus): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  }

  // --- Sienge Integration ---
  async createCreditorInSienge(supplier: Supplier, cityId?: number, agentId?: number): Promise<any> {
    const siengeData = mapSupplierToSiengeCreditor(supplier, cityId, agentId);

    // A chamada real à API do Sienge deve ser feita via Cloud Function
    // por questões de segurança (API key não deve estar no client)
    // Por enquanto, retornamos os dados mapeados
    console.log('Dados para enviar ao Sienge:', JSON.stringify(siengeData, null, 2));

    // TODO: Implementar Cloud Function para integração com Sienge
    // const response = await fetch('https://api.sienge.com.br/...', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Bearer YOUR_API_KEY',
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(siengeData)
    // });

    return siengeData;
  }

  async getSiengeCreditorData(supplier: Supplier, cityId?: number, agentId?: number): Promise<SiengeCreditorRequest> {
    return mapSupplierToSiengeCreditor(supplier, cityId, agentId);
  }

  // --- Storage ---
  async uploadFile(file: File, supplierId: string): Promise<Omit<UploadedDocument, 'file'>> {
    const storagePath = `supplier_documents/${supplierId}/${uuidv4()}-${file.name}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);

    return {
      docName: file.name,
      storagePath,
      uploadedAt: new Date(),
      url,
    };
  }
}

export const firebaseService = new FirebaseService();