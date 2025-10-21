
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebaseService';
import FileUpload from '../components/FileUpload';
import { UploadedDocument, Supplier } from '../types';
import { Loader, AlertTriangle, CheckCircle, Send } from 'lucide-react';

const SupplierRegistrationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    submittedBy: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        return;
      }
      const valid = await firebaseService.validateRegistrationToken(token);
      setIsValidToken(valid);
    };
    validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleFilesChange = (files: UploadedDocument[]) => {
    setUploadedFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) {
      alert('Por favor, anexe pelo menos um documento.');
      return;
    }
    setLoading(true);

    try {
      // Step 1: Create supplier document in Firestore to get an ID.
      const initialSupplierData: Omit<Supplier, 'id' | 'createdAt' | 'status' | 'approvedAt'> = {
        ...formData,
        rejectionReason: null,
        uploadedDocuments: [], // Start with an empty array
      };
      const createdSupplier = await firebaseService.createSupplier(initialSupplierData);

      // Step 2: Upload files to Storage using the new supplier ID.
      const uploadPromises = uploadedFiles.map(doc =>
        firebaseService.uploadFile(doc.file!, createdSupplier.id)
      );
      const uploadedDocumentsMetadata = await Promise.all(uploadPromises);

      // Step 3: Update the supplier document with the file metadata.
      await firebaseService.updateSupplier(createdSupplier.id, {
        uploadedDocuments: uploadedDocumentsMetadata,
      });

      setSubmitted(true);

    } catch (error) {
      console.error('Submission failed', error);
      alert('Falha ao enviar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="animate-spin h-16 w-16 text-blue-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Link de Cadastro Inválido</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Este link é inválido ou já expirou. Por favor, solicite um novo link de cadastro.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Voltar ao Início</button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Cadastro Enviado com Sucesso!</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Sua solicitação foi recebida e está em análise. Entraremos em contato em breve.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="p-8">
          <div className="text-center mb-6">
            <img
              src="/credores/ambiental.svg"
              alt="Logo Ambiental"
              className="lucide lucide-building mx-auto h-12 w-12 text-blue-600 dark:text-indigo-400 mb-4"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Formulário de Cadastro</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Preencha todos os campos para finalizar seu cadastro.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {/* Company Info */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Dados da Empresa</h2>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Razão Social</label>
                <input type="text" name="companyName" id="companyName" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="tradeName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Nome Fantasia</label>
                <input type="text" name="tradeName" id="tradeName" onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="cnpj" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CNPJ</label>
                <input type="text" name="cnpj" id="cnpj" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Telefone</label>
                <input type="text" name="phone" id="phone" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail Principal</label>
                <input type="email" name="email" id="email" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="submittedBy" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail do Contato</label>
                <input type="email" name="submittedBy" id="submittedBy" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </div>
          </div>

          {/* Address Info */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Endereço</h2>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="col-span-full">
                <label htmlFor="street" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Logradouro</label>
                <input type="text" name="street" id="street" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Cidade</label>
                <input type="text" name="city" id="city" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Estado</label>
                <input type="text" name="state" id="state" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="zipCode" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CEP</label>
                <input type="text" name="zipCode" id="zipCode" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Upload de Documentos</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Anexe os documentos necessários, como Contrato Social e Certidões Negativas.</p>
            <div className="mt-6">
              <FileUpload onFilesChange={handleFilesChange} />
            </div>
          </div>

          {/* Submission */}
          <div className="flex items-center justify-end gap-x-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" disabled={loading} className="inline-flex justify-center items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 transition-colors">
              {loading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierRegistrationPage;