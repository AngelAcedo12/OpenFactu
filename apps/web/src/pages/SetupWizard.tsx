import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Database,
  User,
  Building,
  Settings,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { Loader, useToast } from '@openfactu/ui';

export const SetupWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const toast = useToast();
  const isDocker = window.location.port === '8080';
  const [formData, setFormData] = useState({
    dbHost: isDocker ? 'db' : '127.0.0.1',
    dbPort: isDocker ? '5432' : '5439',
    dbUser: 'openfactu',
    dbPassword: 'openfactu_pass',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    companyName: '',
    companyNif: '',
    companyAddress: '',
    companyCity: '',
    companyZip: '',
    companyCountry: 'ES',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyCurrency: 'EUR',
    companyFiscalYearStart: '01-01',
  });

  const [showDbPass, setShowDbPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbConfig: {
            host: formData.dbHost,
            port: parseInt(formData.dbPort),
            user: formData.dbUser,
            password: formData.dbPassword,
          },
          admin: {
            email: formData.adminEmail,
            username: formData.adminUsername,
            password: formData.adminPassword,
          },
          company: {
            name: formData.companyName,
            nif: formData.companyNif,
            address: formData.companyAddress,
            city: formData.companyCity,
            zipCode: formData.companyZip,
            country: formData.companyCountry,
            email: formData.companyEmail,
            phone: formData.companyPhone,
            website: formData.companyWebsite,
            currency: formData.companyCurrency,
            fiscalYearStart: formData.companyFiscalYearStart,
          },
        }),
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fallo en la configuración. Revisa los logs.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al intentar configurar el sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-300">OpenFactu</h1>
          <p className="text-gray-500 mt-2">Asistente de Configuración Inicial</p>
          <div className="flex justify-center mt-4 gap-4">
            {[
              { id: 1, icon: Database },
              { id: 2, icon: User },
              { id: 3, icon: Building },
              { id: 4, icon: Settings },
            ].map((s) => (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${step >= s.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                >
                  <s.icon size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold">1. Base de Datos</h2>
            <p className="text-sm text-gray-600">Configura la conexión principal de PostgreSQL.</p>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Host (ej: localhost)"
              value={formData.dbHost}
              onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
            />
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Puerto (ej: 5432)"
              value={formData.dbPort}
              onChange={(e) => setFormData({ ...formData, dbPort: e.target.value })}
            />
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Usuario (ej: openfactu)"
              value={formData.dbUser}
              onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
            />
            <div className="relative">
              <input
                type={showDbPass ? 'text' : 'password'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10 transition-all"
                placeholder="Contraseña DB"
                value={formData.dbPassword}
                onChange={(e) => setFormData({ ...formData, dbPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:text-blue-300 transition-colors"
                onClick={() => setShowDbPass(!showDbPass)}
              >
                {showDbPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              onClick={nextStep}
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 group"
            >
              Siguiente{' '}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold">2. Administrador</h2>
            <p className="text-sm text-gray-600">Crea la cuenta de superusuario global.</p>
            <input
              type="email"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            />
            <input
              type="text"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nombre de Usuario (ej: angel)"
              value={formData.adminUsername}
              onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
            />
            <div className="relative">
              <input
                type={showAdminPass ? 'text' : 'password'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10 transition-all"
                placeholder="Contraseña"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:text-blue-300 transition-colors"
                onClick={() => setShowAdminPass(!showAdminPass)}
              >
                {showAdminPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-100 p-3 rounded-lg font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} /> Atrás
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 group"
              >
                Siguiente{' '}
                <ChevronRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold">3. Primera Empresa</h2>
            <p className="text-sm text-gray-600">Datos fiscales de tu empresa principal.</p>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nombre de la Empresa"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="NIF / CIF"
              value={formData.companyNif}
              onChange={(e) => setFormData({ ...formData, companyNif: e.target.value })}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={prevStep}
                className="flex-[0.4] bg-gray-50 p-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2 text-gray-500 border border-gray-100"
              >
                <ChevronLeft size={18} /> Atrás
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.companyName || !formData.companyNif}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 group"
              >
                Siguiente{' '}
                <ChevronRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold">4. Configuración de Empresa</h2>
            <p className="text-sm text-gray-600">
              Datos de contacto, domicilio y preferencias. Podrás editarlos después en Ajustes.
            </p>
            <input
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Dirección"
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ciudad"
                value={formData.companyCity}
                onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
              />
              <input
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Código Postal"
                value={formData.companyZip}
                onChange={(e) => setFormData({ ...formData, companyZip: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                value={formData.companyCountry}
                onChange={(e) => setFormData({ ...formData, companyCountry: e.target.value })}
              >
                <option value="ES">España</option>
                <option value="PT">Portugal</option>
                <option value="FR">Francia</option>
                <option value="IT">Italia</option>
                <option value="DE">Alemania</option>
                <option value="GB">Reino Unido</option>
                <option value="US">Estados Unidos</option>
              </select>
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                value={formData.companyCurrency}
                onChange={(e) => setFormData({ ...formData, companyCurrency: e.target.value })}
              >
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
            <input
              type="email"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Email de contacto"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Teléfono"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
              />
              <input
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Web"
                value={formData.companyWebsite}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Inicio del año fiscal (MM-DD)
              </label>
              <input
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="01-01"
                value={formData.companyFiscalYearStart}
                onChange={(e) =>
                  setFormData({ ...formData, companyFiscalYearStart: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={prevStep}
                className="flex-[0.4] bg-gray-50 p-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2 text-gray-500 border border-gray-100"
              >
                <ChevronLeft size={18} /> Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <Loader size="sm" variant="white" className="mr-0" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>{loading ? 'Inicializando...' : 'Finalizar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
