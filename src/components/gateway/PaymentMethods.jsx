import { useState, useEffect } from 'react';
import { getMethodsForCountry, getAllCountries } from '../../services/countryMethods';
import { Search, Smartphone, CreditCard, Banknote, Globe } from 'lucide-react';

export default function PaymentMethods({ onSelectMethod, onSelectCountry, selectedCountry }) {
  const [countries, setCountries] = useState([]);
  const [methods, setMethods] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('countries');

  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const countryMethods = getMethodsForCountry(selectedCountry);
      setMethods(countryMethods);
      setActiveTab('methods');
    }
  }, [selectedCountry]);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const getMethodIcon = (methodId) => {
    if (methodId.includes('card') || methodId === 'paypal') return <CreditCard size={24} />;
    if (methodId.includes('bank') || methodId.includes('eft') || methodId.includes('ach')) return <Banknote size={24} />;
    return <Smartphone size={24} />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button onClick={() => setActiveTab('countries')}
          className={`flex-1 py-3.5 text-sm font-medium transition-all ${activeTab === 'countries' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          🌍 Pays
        </button>
        <button onClick={() => setActiveTab('methods')}
          className={`flex-1 py-3.5 text-sm font-medium transition-all ${activeTab === 'methods' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          disabled={!selectedCountry}>
          💳 Méthodes
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'countries' ? 'Rechercher un pays...' : 'Rechercher une méthode...'}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-gray-900 outline-none"
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="max-h-80 overflow-y-auto">
        {activeTab === 'countries' ? (
          <div className="p-2 grid grid-cols-2 gap-2">
            {filteredCountries.map(country => (
              <button key={country.code} onClick={() => { onSelectCountry(country.code); }}
                className={`p-3 rounded-xl border text-left transition-all ${selectedCountry === country.code ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-lg">{country.flag}</span>
                <p className="text-sm font-medium text-gray-900 mt-1 truncate">{country.name}</p>
                <p className="text-xs text-gray-500">{country.currency}</p>
              </button>
            ))}
          </div>
        ) : methods ? (
          <div className="p-2 space-y-2">
            <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-xl mb-3">
              <span className="text-lg">{methods.flag}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{methods.name}</p>
                <p className="text-xs text-gray-500">Devise: {methods.currency}</p>
              </div>
              <button onClick={() => { setActiveTab('countries'); onSelectCountry(null); }}
                className="ml-auto text-xs text-gray-500 hover:text-gray-900">
                Changer
              </button>
            </div>
            {methods.methods.map(method => (
              <button key={method.id} onClick={() => onSelectMethod(method)}
                className="w-full p-4 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-gray-900 hover:shadow-sm transition-all text-left">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  {getMethodIcon(method.id)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-500">{method.providers?.length || 0} provider{(method.providers?.length || 0) > 1 ? 's' : ''} disponible{(method.providers?.length || 0) > 1 ? 's' : ''}</p>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Globe size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sélectionnez un pays pour voir les méthodes disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}