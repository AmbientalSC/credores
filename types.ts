
export enum SupplierStatus {
  Pendente = 'pendente',
  EmAnalise = 'em_analise',
  Aprovado = 'aprovado',
  Reprovado = 'reprovado'
}

export interface UploadedDocument {
  docName: string;
  storagePath: string;
  uploadedAt: Date;
  file?: File;
  url?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: SupplierStatus;
  createdAt: Date;
  approvedAt: Date | null;
  submittedBy: string;
  rejectionReason: string | null;
  uploadedDocuments: UploadedDocument[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}
