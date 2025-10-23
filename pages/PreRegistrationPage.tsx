import React, { useState, useEffect } from 'react';
import { getInitialTheme, applyTheme, toggleTheme as toggleThemeUtil } from '../src/theme';
import { firebaseService } from '../services/firebaseService';
import FileUpload from '../components/FileUpload';
import CityAutocomplete from '../components/CityAutocomplete';
import { UploadedDocument, Supplier } from '../types';
import { Loader, CheckCircle, AlertTriangle, Send, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const PreRegistrationPage: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    tradeName: '',
    cnpj: '',
    stateRegistration: '',
    stateRegistrationType: 'C' as 'C' | 'I' | 'N', // C=Contribuinte, I=Isento, N=Não Contribuinte
    municipalRegistration: '',
    personType: 'J' as 'F' | 'J', // F=Física, J=Jurídica
    email: '',
    phone: '',
    website: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    bankData: {
      bank: '',
      bankCode: '',
      agency: '',
      agencyDigit: '',
      account: '',
      accountDigit: '',
      accountType: 'corrente' as 'corrente' | 'poupanca',
      pixKey: ''
    },
    submittedBy: '',
  });
  const [cities, setCities] = useState<Array<{ id: number; name: string; state?: any }>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const t = getInitialTheme();
    if (typeof document !== 'undefined') applyTheme(t);
    return t === 'dark';
  });
  const [activeTab, setActiveTab] = useState<'empresa' | 'endereco' | 'bancario'>('empresa');

  useEffect(() => {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  useEffect(() => {
    fetch('/cities_all.json')
      .then(r => r.json())
      .then(data => setCities(data.results || data))
      .catch(() => setCities([]));
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const current = prev ? 'dark' : 'light';
      const nextTheme = toggleThemeUtil(current);
      return nextTheme === 'dark';
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      const lookupName = value.split(' - ')[0].trim();
      const match = cities.find(c => c.name?.toLowerCase() === lookupName.toLowerCase());
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [name]: value, cityId: match ? match.id : undefined },
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleBankDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      bankData: { ...prev.bankData, [name]: value },
    }));
  };

  const handleFilesChange = (files: UploadedDocument[]) => {
    setUploadedFiles(files);
  };

  const handleCepLookup = async (cepRaw: string) => {
    const cep = (cepRaw || '').toString().replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setMessage({ type: 'error', text: 'CEP não encontrado.' });
        return;
      }

      // Atualiza campos retornados
      const street = data.logradouro || '';
      const neighborhood = data.bairro || '';
      const cityName = data.localidade || '';
      const uf = data.uf || '';
      // tenta resolver cityId a partir da lista de cidades já carregada usando normalização
      const normalize = (s: string) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
      let match = (cities || []).find((c: any) => normalize(c.name) === normalize(cityName) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
      if (!match) {
        // tentar correspondências mais flexíveis
        match = (cities || []).find((c: any) => normalize(c.name).startsWith(normalize(cityName)) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
      }
      if (!match) {
        match = (cities || []).find((c: any) => normalize(c.name).includes(normalize(cityName)) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
      }

      if (match) {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: street || prev.address.street,
            neighborhood: neighborhood || prev.address.neighborhood,
            city: match.name,
            cityId: match.id,
            state: match.state?.name || uf,
            stateCode: match.state?.code || uf,
          } as any,
        }));
      } else {
        // se não encontrou correspondência exata, NÃO sobrescreve o campo cidade (manterá o que o usuário escolher)
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            street: street || prev.address.street,
            neighborhood: neighborhood || prev.address.neighborhood,
            // NÃO atualizar city/cityId para evitar inconsistência com cities_all.json
            state: uf || prev.address.state,
            stateCode: uf || (prev.address as any).stateCode,
          } as any,
        }));
        setMessage({ type: 'error', text: 'Cidade retornada pelo CEP não encontrada em cities_all.json. Por favor selecione a cidade correta no campo Cidade.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao buscar CEP.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Faz upload dos arquivos (se houver)
      if (uploadedFiles.length > 0) {
        const uploadPromises = uploadedFiles.map(doc =>
          firebaseService.uploadFile(doc.file!, createdSupplier.id)
        );
        const uploadedDocumentsMetadata = await Promise.all(uploadPromises);
        // Atualiza o fornecedor com os arquivos
        await firebaseService.updateSupplier(createdSupplier.id, {
          uploadedDocuments: uploadedDocumentsMetadata,
        });
      }
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
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4 top-nav"
      style={{
        backgroundImage: "url('/credores/meioambiental.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        // Fix background relative to viewport so crop doesn't change when content height changes
        backgroundAttachment: 'fixed',
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Link to="/admin/login"
          className="admin-access font-medium px-4 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-indigo-500 dark:hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
          Acesso Admin
        </Link>
        <button
          onClick={toggleTheme}
          className="theme-toggle ml-2 p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Alternar tema"
          type="button"
        >
          {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
        </button>
      </div>
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6 content-surface form-wrapper card">
        <div className="text-center">
          <div className="mx-auto logo-surface">
            <img
              src="/credores/ambiental.svg"
              alt="Logo Ambiental"
              className="mx-auto h-40 w-auto text-blue-700 dark:text-indigo-400"
            />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-gray-100 drop-shadow-sm text-center tracking-tight">
            Cadastro de Fornecedor
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Preencha todos os campos para finalizar seu cadastro.
          </p>
        </div>
        {/* Abas de navegação */}
        <div className="flex justify-center mb-6 gap-2 flex-wrap tabs">
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg font-semibold focus:outline-none transition-colors border-b-2 ${activeTab === 'empresa' ? 'border-blue-700 text-blue-800 bg-blue-50 dark:bg-gray-700 dark:text-indigo-400 dark:border-indigo-600 active' : 'border-transparent text-gray-700 dark:text-gray-300 bg-transparent'}`}
            onClick={() => setActiveTab('empresa')}
          >
            Dados da Empresa
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg font-semibold focus:outline-none transition-colors border-b-2 ${activeTab === 'endereco' ? 'border-blue-700 text-blue-800 bg-blue-50 dark:bg-gray-700 dark:text-indigo-400 dark:border-indigo-600 active' : 'border-transparent text-gray-700 dark:text-gray-300 bg-transparent'}`}
            onClick={() => setActiveTab('endereco')}
          >
            Endereço
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-t-lg font-semibold focus:outline-none transition-colors border-b-2 ${activeTab === 'bancario' ? 'border-blue-700 text-blue-800 bg-blue-50 dark:bg-gray-700 dark:text-indigo-400 dark:border-indigo-600 active' : 'border-transparent text-gray-700 dark:text-gray-300 bg-transparent'}`}
            onClick={() => setActiveTab('bancario')}
          >
            Dados Bancários
          </button>
        </div>
        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Abas: Dados da Empresa */}
          {activeTab === 'empresa' && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
              <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Dados da Empresa</h2>
              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="companyName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Razão Social *</label>
                  <input type="text" name="companyName" id="companyName" required onChange={handleInputChange} value={formData.companyName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="tradeName" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Nome Fantasia</label>
                  <input type="text" name="tradeName" id="tradeName" onChange={handleInputChange} value={formData.tradeName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cnpj" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CNPJ *</label>
                  <input type="text" name="cnpj" id="cnpj" required onChange={handleInputChange} value={formData.cnpj} placeholder="00.000.000/0000-00" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="personType" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Tipo de Pessoa *</label>
                  <select name="personType" id="personType" required onChange={(e) => setFormData(prev => ({ ...prev, personType: e.target.value as 'F' | 'J' }))} value={formData.personType} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3">
                    <option value="J">Jurídica</option>
                    <option value="F">Física</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="stateRegistrationType" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Tipo de IE *</label>
                  <select name="stateRegistrationType" id="stateRegistrationType" required onChange={(e) => setFormData(prev => ({ ...prev, stateRegistrationType: e.target.value as 'C' | 'I' | 'N' }))} value={formData.stateRegistrationType} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3">
                    <option value="C">Contribuinte</option>
                    <option value="I">Isento</option>
                    <option value="N">Não Contribuinte</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="stateRegistration" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Inscrição Estadual {formData.stateRegistrationType === 'C' ? '*' : ''}</label>
                  <input type="text" name="stateRegistration" id="stateRegistration" required={formData.stateRegistrationType === 'C'} onChange={handleInputChange} value={formData.stateRegistration} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="municipalRegistration" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Inscrição Municipal {formData.personType === 'J' ? '*' : ''}</label>
                  <input type="text" name="municipalRegistration" id="municipalRegistration" required={formData.personType === 'J'} onChange={handleInputChange} value={formData.municipalRegistration} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Telefone *</label>
                  <input type="text" name="phone" id="phone" required onChange={handleInputChange} value={formData.phone} placeholder="(00) 00000-0000" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail Principal *</label>
                  <input type="email" name="email" id="email" required onChange={handleInputChange} value={formData.email} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="website" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Site</label>
                  <input type="url" name="website" id="website" onChange={handleInputChange} value={formData.website} placeholder="https://www.exemplo.com" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="submittedBy" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">E-mail do Contato *</label>
                  <input type="email" name="submittedBy" id="submittedBy" required onChange={handleInputChange} value={formData.submittedBy} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
              </div>
            </div>
          )}
          {/* Abas: Endereço */}
          {activeTab === 'endereco' && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
              <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Endereço</h2>
              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label htmlFor="zipCode" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">CEP *</label>
                  <input type="text" name="zipCode" id="zipCode" required onChange={handleAddressChange} onBlur={(e) => handleCepLookup(e.target.value)} value={formData.address.zipCode} placeholder="00000-000" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-4">
                  <label htmlFor="street" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Logradouro *</label>
                  <input type="text" name="street" id="street" required onChange={handleAddressChange} value={formData.address.street} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="number" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Número *</label>
                  <input type="text" name="number" id="number" required onChange={handleAddressChange} value={formData.address.number} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="complement" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Complemento</label>
                  <input type="text" name="complement" id="complement" onChange={handleAddressChange} value={formData.address.complement} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="neighborhood" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Bairro *</label>
                  <input type="text" name="neighborhood" id="neighborhood" required onChange={handleAddressChange} value={formData.address.neighborhood} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="city" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Cidade *</label>
                  <CityAutocomplete
                    value={formData.address.city}
                    onChange={(v: string) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: v } }))}
                    onSelect={(name: string, id?: number, stateName?: string, stateCode?: string) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: name, cityId: id, state: stateName || prev.address.state, stateCode: stateCode || (prev.address as any).stateCode } }))}
                    placeholder="Digite para buscar cidade..."
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="state-display" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Estado</label>
                  <input type="text" id="state-display" readOnly value={formData.address.state || (formData.address as any).stateCode || ''} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-3" />
                </div>
              </div>
            </div>
          )}
          {/* Abas: Dados Bancários */}
          {activeTab === 'bancario' && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
              <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Dados Bancários</h2>
              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="bank" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Banco</label>
                  <input type="text" name="bank" id="bank" onChange={handleBankDataChange} value={formData.bankData.bank} placeholder="Nome do Banco" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="bankCode" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Código do Banco</label>
                  <input type="text" name="bankCode" id="bankCode" onChange={handleBankDataChange} value={formData.bankData.bankCode} placeholder="000" maxLength={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="agency" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Agência</label>
                  <input type="text" name="agency" id="agency" onChange={handleBankDataChange} value={formData.bankData.agency} placeholder="0000" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="agencyDigit" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Dígito</label>
                  <input type="text" name="agencyDigit" id="agencyDigit" onChange={handleBankDataChange} value={formData.bankData.agencyDigit} placeholder="0" maxLength={1} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="accountType" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Tipo de Conta</label>
                  <select name="accountType" id="accountType" onChange={handleBankDataChange} value={formData.bankData.accountType} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3">
                    <option value="">Selecione...</option>
                    <option value="corrente">Conta Corrente</option>
                    <option value="poupanca">Conta Poupança</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="account" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Número da Conta</label>
                  <input type="text" name="account" id="account" onChange={handleBankDataChange} value={formData.bankData.account} placeholder="00000000" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="accountDigit" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Dígito</label>
                  <input type="text" name="accountDigit" id="accountDigit" onChange={handleBankDataChange} value={formData.bankData.accountDigit} placeholder="0" maxLength={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="pixKey" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Chave PIX</label>
                  <input type="text" name="pixKey" id="pixKey" onChange={handleBankDataChange} value={formData.bankData.pixKey} placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3" />
                </div>
              </div>
            </div>
          )}
          {/* Upload de Documentos */}
          <div>
            <h2 className="text-xl font-semibold leading-7 text-gray-900 dark:text-gray-100">Upload de Documentos (Opcional)</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Se desejar, anexe documentos como Contrato Social, Certidões Negativas, etc.</p>
            <div className="mt-6">
              <FileUpload onFilesChange={handleFilesChange} />
            </div>
          </div>
          {/* Botão de Envio */}
          <div className="flex items-center justify-end gap-x-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" disabled={loading} className="inline-flex justify-center items-center px-6 py-3 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-500">
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
