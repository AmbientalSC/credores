
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
  // Dados da Empresa
  companyName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string; // Inscrição Estadual
  stateRegistrationType: 'C' | 'I' | 'N'; // C=Contribuinte, I=Isento, N=Não Contribuinte
  municipalRegistration: string; // Inscrição Municipal
  email: string;
  phone: string;
  website?: string; // Site
  personType: 'F' | 'J'; // F=Física, J=Jurídica

  // Endereço
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    cityId?: number; // ID da cidade no Sienge
  };

  // Dados Bancários
  bankData: {
    bank: string; // Nome do Banco
    bankCode: string; // Código do Banco
    agency: string; // Agência
    agencyDigit?: string; // Dígito da Agência
    account: string; // Conta
    accountDigit: string; // Dígito da Conta
    accountType: 'corrente' | 'poupanca'; // Tipo de Conta
    pixKey?: string; // Chave PIX (opcional)
  };

  // Informações Administrativas
  status: SupplierStatus;
  createdAt: Date;
  approvedAt: Date | null;
  approvedBy?: string | null; // UID or identifier of the approver
  approvedByName?: string | null; // display name of who approved
  submittedBy: string;
  rejectionReason: string | null;
  uploadedDocuments: UploadedDocument[];
}

// Interfaces para integração com Sienge
export interface SiengeCreditorRequest {
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
    phoneExtension?: string;
    email?: string;
    skype?: string;
    msn?: string;
  }>;
  procurators?: Array<{
    name: string;
    cpf?: string;
    rg?: string;
    phoneDdd?: string;
    phoneNumber?: string;
    phoneExtension?: string;
    cityId?: number;
    streetName?: string;
    addressNumber?: string;
    neighborhood?: string;
    complement?: string;
    zipCode?: string;
  }>;
  payslipDesonerationYears?: Array<{
    year: number;
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
    accountDac?: string;
    accountType: 'C' | 'P';
    accountBeneficiaryName?: string;
    accountBeneficiaryCpfNumber?: string;
    accountBeneficiaryCnpjNumber?: string;
  };
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Viewer = 'viewer'
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLogin?: Date;
  createdBy: string;
}

export interface AdminUser {
  id: string;
  email: string;
  // role for the currently authenticated user (can be admin, user or viewer)
  role: UserRole;
  displayName?: string;
}
