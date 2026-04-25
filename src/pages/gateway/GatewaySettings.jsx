import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Save, Loader, Palette, Globe, Link, Building2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SETTINGS_DOC = 'settings';
const SETTINGS_COLLECTION = 'gateway_merchants';

const DESIGNS = [
  { id: 'modern',   label: 'Moderne',    desc: 'Dark & épuré',    preview: 'bg-gray-900' },
  { id: 'classic',  label: 'Classique',  desc: 'Simple & clair',  preview: 'bg-blue-600' },
  { id: 'bold',     label: 'Audacieux',  desc: 'Coloré & vif',    preview: 'bg-orange-500' },
];

const CURRENCIES = [
  { value: 'XOF', label: 'XOF — Franc CFA' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar US' },
  { value: 'GHS', label: 'GHS — Cedi ghanéen' },
  { value: 'NGN', label: 'NGN — Naira nigérian' },
];

const DEFAULT_SETTINGS = {
  paymentDesign: 'modern',
  primaryColor: '#f97316',
  logo: '',
  companyName: '',
  redirectUrl: '',
  defaultCurrency: 'XOF',
  defaultCountry: 'bj',
};

export default function GatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC));
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      }
    } catch (e) {
      console.error('Erreur chargement paramètres:', e);
      toast.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { ...settings, updatedAt: new Date().toISOString() };
      await setDoc(
        doc(db, SETTINGS_COLLECTION, SETTINGS_DOC),
        payload,
        { merge: true }
      );
      setSaved(true);
      toast.success('Paramètres enregistrés !');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Chargement des paramètres…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres de paiement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personnalisez l'expérience de votre page de paiement</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm
            ${saved
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
            }`}
        >
          {saving
            ? <Loader size={15} className="animate-spin" />
            : saved
            ? <CheckCircle2 size={15} />
            : <Save size={15} />
          }
          {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      {/* Design de la page */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <Palette size={16} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Design de la page de paiement</h2>
            <p className="text-xs text-gray-400">Apparence affichée à vos clients</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DESIGNS.map(d => (
            <button
              key={d.id}
              onClick={() => set('paymentDesign', d.id)}
              className={`group relative p-4 rounded-xl border-2 text-left transition-all
                ${settings.paymentDesign === d.id
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              {settings.paymentDesign === d.id && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
              <div className={`w-full h-20 ${d.preview} rounded-lg mb-3 overflow-hidden relative`}>
                <div className="absolute inset-x-3 bottom-3 h-2.5 bg-white/20 rounded-full" />
                <div className="absolute inset-x-6 bottom-7 h-1.5 bg-white/10 rounded-full" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{d.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{d.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Personnalisation */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Identité de l'entreprise</h2>
            <p className="text-xs text-gray-400">Informations affichées sur la page de paiement</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Couleur principale */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Couleur principale
            </label>
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={e => set('primaryColor', e.target.value)}
                  className="sr-only"
                />
                <div
                  className="w-11 h-11 rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: settings.primaryColor }}
                />
              </label>
              <input
                type="text"
                value={settings.primaryColor}
                onChange={e => set('primaryColor', e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="#f97316"
              />
            </div>
          </div>

          {/* Nom entreprise */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={e => set('companyName', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Mon entreprise"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              URL du logo
            </label>
            <input
              type="url"
              value={settings.logo}
              onChange={e => set('logo', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="https://..."
            />
          </div>

          {/* Devise par défaut */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Devise par défaut
            </label>
            <select
              value={settings.defaultCurrency}
              onChange={e => set('defaultCurrency', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Redirection */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Link size={16} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Redirection après paiement</h2>
            <p className="text-xs text-gray-400">Page affichée après un paiement réussi</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            URL de redirection
          </label>
          <div className="relative">
            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={settings.redirectUrl}
              onChange={e => set('redirectUrl', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="https://mon-site.com/merci"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Laissez vide pour afficher la page de confirmation par défaut</p>
        </div>
      </section>

      {/* Aperçu des couleurs */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Aperçu des couleurs</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px] h-14 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm"
            style={{ backgroundColor: settings.primaryColor }}>
            Bouton principal
          </div>
          <div className="flex-1 min-w-[160px] h-14 rounded-xl flex items-center justify-center text-sm font-semibold border-2"
            style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}>
            Bouton secondaire
          </div>
          <div className="flex-1 min-w-[160px] h-14 rounded-xl flex items-center justify-center text-sm font-medium"
            style={{ backgroundColor: settings.primaryColor + '18', color: settings.primaryColor }}>
            Accent léger
          </div>
        </div>
      </section>

      {/* Bouton save mobile */}
      <div className="sm:hidden pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all
            ${saved ? 'bg-emerald-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'}`}
        >
          {saving ? <Loader size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </div>
  );
}