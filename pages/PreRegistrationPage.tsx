import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import FileUpload from '../components/FileUpload';
import { UploadedDocument, Supplier } from '../types';
import { Loader, CheckCircle, AlertTriangle, Send, Building, Mail, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const PreRegistrationPage: React.FC = () => {
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return newMode;
    });
  };

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
    setMessage(null);
    try {
      // Cria o fornecedor no Firestore
      const initialSupplierData: Omit<Supplier, 'id' | 'createdAt' | 'status' | 'approvedAt'> = {
        ...formData,
        rejectionReason: null,
        uploadedDocuments: [],
      };
      const createdSupplier = await firebaseService.createSupplier(initialSupplierData);
      // Faz upload dos arquivos
      const uploadPromises = uploadedFiles.map(doc =>
        firebaseService.uploadFile(doc.file!, createdSupplier.id)
      );
      const uploadedDocumentsMetadata = await Promise.all(uploadPromises);
      // Atualiza o fornecedor com os arquivos
      await firebaseService.updateSupplier(createdSupplier.id, {
        uploadedDocuments: uploadedDocumentsMetadata,
      });
      setSubmitted(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Falha ao enviar cadastro. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Cadastro Enviado com Sucesso!</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Sua solicitação foi recebida e está em análise. Entraremos em contato em breve.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Novo Cadastro</button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4"
      style={{
        backgroundImage: "url('/credores/meioambiental.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Link to="/admin/login"
          className="font-medium px-4 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          Acesso Admin
        </Link>
        <button
          onClick={toggleTheme}
          className="ml-2 p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Alternar tema"
          type="button"
        >
          {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
        </button>
      </div>
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <img 
            src="/credores/ambiental.svg" 
            alt="Logo Ambiental"
            className="mx-auto h-40 w-auto text-indigo-600 dark:text-indigo-400"
          />
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-gray-100 drop-shadow-sm text-center tracking-tight">
            Cadastro de Fornecedor
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Preencha todos os campos para finalizar seu cadastro.
          </p>
        </div>
        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Dados da Empresa */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Dados da Empresa</h2>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Razão Social</label>
                <input type="text" name="companyName" id="companyName" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="tradeName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Nome Fantasia</label>
                <input type="text" name="tradeName" id="tradeName" onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="cnpj" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CNPJ</label>
                <input type="text" name="cnpj" id="cnpj" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Telefone</label>
                <input type="text" name="phone" id="phone" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail Principal</label>
                <input type="email" name="email" id="email" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="submittedBy" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail do Contato</label>
                <input type="email" name="submittedBy" id="submittedBy" required onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
            </div>
          </div>
          {/* Endereço */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Endereço</h2>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
              <div className="col-span-full">
                <label htmlFor="street" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Logradouro</label>
                <input type="text" name="street" id="street" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="city" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Cidade</label>
                <input type="text" name="city" id="city" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="state" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Estado</label>
                <input type="text" name="state" id="state" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="zipCode" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CEP</label>
                <input type="text" name="zipCode" id="zipCode" required onChange={handleAddressChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
              </div>
            </div>
          </div>
          {/* Upload de Documentos */}
          <div>
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Upload de Documentos</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Anexe os documentos necessários, como Contrato Social e Certidões Negativas.</p>
            <div className="mt-6">
              <FileUpload onFilesChange={handleFilesChange} />
            </div>
          </div>
          {/* Botão de Envio */}
          <div className="flex items-center justify-end gap-x-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" disabled={loading} className="inline-flex justify-center items-center px-6 py-3 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500">
              {loading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              {loading ? 'Enviando...' : 'Cadastro de Fornecedor'}
            </button>
          </div>
        </form>
        {message && (
          <div className={`flex items-start p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/50' : 'bg-red-50 dark:bg-red-900/50'}`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
            <p className={`ml-3 text-sm font-medium ${message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {message.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreRegistrationPage;
