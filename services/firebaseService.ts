
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
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

import { Supplier, SupplierStatus, AdminUser, UploadedDocument } from '../types';

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
    if(adminSnap.exists() && adminSnap.data().role === 'admin') {
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
      if(regData.used) return false;
      
      if(Timestamp.now() > regData.expiresAt) return false;
      
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