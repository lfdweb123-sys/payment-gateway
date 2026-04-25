import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  Save, Loader, Palette, Globe, Building2, CheckCircle2,
  Upload, X, ImagePlus, Pipette, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const SETTINGS_DOC = 'config';
const SETTINGS_COLLECTION = 'gateway_settings';

const DESIGNS = [
  {
    id: 'modern',
    label: 'Moderne',
    desc: 'Dark & épuré',
    gradient: 'linear-gradient(135deg,#0A0A0F 0%,#1A1A2E 100%)',
    accent: '#FF6B00',
  },
  {
    id: 'classic',
    label: 'Classique',
    desc: 'Simple & clair',
    gradient: 'linear-gradient(135deg,#EBF0FF 0%,#fff 100%)',
    accent: '#0057FF',
  },
  {
    id: 'bold',
    label: 'Audacieux',
    desc: 'Coloré & vif',
    gradient: 'linear-gradient(135deg,#FF6B00 0%,#FFAA00 100%)',
    accent: '#fff',
  },
];

const CURRENCIES = [
  { value: 'XOF', label: 'XOF — Franc CFA',     flag: '🌍' },
  { value: 'EUR', label: 'EUR — Euro',            flag: '🇪🇺' },
  { value: 'USD', label: 'USD — Dollar US',       flag: '🇺🇸' },
  { value: 'GHS', label: 'GHS — Cedi ghanéen',   flag: '🇬🇭' },
  { value: 'NGN', label: 'NGN — Naira nigérian', flag: '🇳🇬' },
];

const PRESET_COLORS = [
  '#FF6B00', '#0057FF', '#00A550', '#9B00E8',
  '#EF4444', '#EC4899', '#0EA5E9', '#14B8A6',
];

const DEFAULT_SETTINGS = {
  paymentDesign: 'modern',
  primaryColor: '#FF6B00',
  logo: '',          // base64 data URL stocké dans Firestore
  companyName: '',
  redirectUrl: '',
  defaultCurrency: 'XOF',
};

/* ── shared styles ── */
const card = {
  background: '#fff',
  border: '1px solid #EBEBEB',
  borderRadius: 20,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const inputStyle = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #E8E8E8', borderRadius: 11,
  fontSize: 13, color: '#333', outline: 'none',
  background: '#FAFAFA', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s',
};

/* ── helpers ── */
function SectionHeader({ icon: Icon, iconBg, iconColor, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={17} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#AAA', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: '#AAA',
        textTransform: 'uppercase', letterSpacing: '.08em',
      }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#C0C0C0', lineHeight: 1.5 }}>{hint}</span>}
    </div>
  );
}

/* ── LOGO UPLOADER — base64 vers Firestore ── */
function LogoUploader({ value, onChange }) {
  const fileRef = useRef();
  const [converting, setConverting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Fichier image requis (PNG, JPG, SVG…)');
      return;
    }
    // Firestore doc limit ~1 Mo — limite à 300 Ko pour rester safe avec le reste du doc
    if (file.size > 300 * 1024) {
      toast.error('Image trop lourde — max 300 Ko');
      return;
    }
    setConverting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target.result); // data URL base64
      toast.success('Logo chargé ✓');
      setConverting(false);
    };
    reader.onerror = () => {
      toast.error('Erreur de lecture du fichier');
      setConverting(false);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

      {/* Preview carré */}
      <div style={{
        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
        border: `2px dashed ${value ? '#E8E8E8' : '#D4D4D4'}`,
        background: '#FAFAFA', overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {value
          ? <img src={value} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
          : <ImagePlus size={22} color="#CCC" />
        }
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={11} color="#fff" />
          </button>
        )}
      </div>

      {/* Zone de dépôt */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          flex: 1, minWidth: 180,
          border: `2px dashed ${dragOver ? '#FF6B00' : '#E0E0E0'}`,
          borderRadius: 14, padding: '18px 16px',
          cursor: 'pointer',
          background: dragOver ? '#FFF3EA' : '#FAFAFA',
          textAlign: 'center', transition: 'all .2s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {converting ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#888' }}>
            <Loader size={15} style={{ animation: 'spin .7s linear infinite' }} />
            Conversion base64…
          </div>
        ) : (
          <>
            <Upload size={18} color={dragOver ? '#FF6B00' : '#CCC'} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: dragOver ? '#FF6B00' : '#777' }}>
              Glissez votre logo ici
            </div>
            <div style={{ fontSize: 11, color: '#BBB', marginTop: 3 }}>
              ou cliquez pour parcourir · PNG, JPG, SVG · max 300 Ko
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── COLOR PICKER ── */
function ColorPicker({ value, onChange }) {
  const nativeRef = useRef();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: c, border: 'none', cursor: 'pointer',
              outline: value === c ? `3px solid ${c}` : '3px solid transparent',
              outlineOffset: 2,
              transform: value === c ? 'scale(1.18)' : 'scale(1)',
              transition: 'all .15s',
            }}
          />
        ))}
      </div>
      {/* Custom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => nativeRef.current?.click()}
          style={{
            width: 42, height: 42, borderRadius: 11,
            background: value, border: '2px solid #E8E8E8',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Pipette size={14} color="rgba(255,255,255,0.85)" />
          <input
            ref={nativeRef} type="color" value={value}
            onChange={e => onChange(e.target.value)}
            style={{ display: 'none' }}
          />
        </div>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, fontFamily: "'Fira Code',monospace", letterSpacing: '.06em', maxWidth: 130 }}
          placeholder="#FF6B00"
        />
        <button
          onClick={() => onChange('#FF6B00')}
          style={{
            background: 'none', border: '1px solid #E8E8E8', borderRadius: 9,
            padding: '8px 12px', cursor: 'pointer', color: '#999',
            fontSize: 11, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>
    </div>
  );
}

/* ── DESIGN CARD ── */
function DesignCard({ d, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        border: `2px solid ${selected ? '#FF6B00' : '#EBEBEB'}`,
        borderRadius: 16, padding: 0, overflow: 'hidden',
        cursor: 'pointer', background: 'none', textAlign: 'left',
        boxShadow: selected ? '0 0 0 4px rgba(255,107,0,.1)' : 'none',
        transition: 'all .2s',
      }}
    >
      <div style={{
        height: 88, background: d.gradient,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 14px 12px', gap: 5,
      }}>
        <div style={{ height: 10, width: '60%', borderRadius: 4, background: `${d.accent}55` }} />
        <div style={{ height: 24, width: '80%', borderRadius: 8, background: d.accent, opacity: .9 }} />
      </div>
      <div style={{
        padding: '10px 14px 12px',
        background: selected ? '#FFF8F3' : '#FAFAFA',
        borderTop: '1px solid #F0F0F0',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{d.label}</div>
        <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{d.desc}</div>
      </div>
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 22, height: 22, borderRadius: '50%',
          background: '#FF6B00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={13} color="#fff" />
        </div>
      )}
    </button>
  );
}

/* ── LIVE PREVIEW ── */
function ColorPreview({ color, companyName, logo }) {
  return (
    <div style={{
      background: '#F7F8FC', border: '1px solid #EBEBEB',
      borderRadius: 14, padding: '14px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#AAA',
        textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10,
      }}>
        Aperçu en direct
      </div>
      <div style={{
        background: '#fff', border: '1px solid #EBEBEB',
        borderRadius: 12, padding: '12px',
        display: 'flex', flexDirection: 'column', gap: 9,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo
            ? <img src={logo} alt="logo" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 5 }} />
            : <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}22` }} />
          }
          <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
            {companyName || 'Mon entreprise'}
          </div>
        </div>
        <div style={{ height: 1, background: '#F0F0F0' }} />
        <div style={{ height: 30, background: '#F7F8FC', borderRadius: 7, border: '1px solid #EBEBEB' }} />
        <div style={{
          height: 34, borderRadius: 8, background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>
          Payer maintenant
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[color, `${color}88`, `${color}44`].map((c, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function GatewaySettings() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC));
      if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
    } catch { toast.error('Impossible de charger les paramètres'); }
    finally { setLoading(false); }
  };

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await setDoc(
        doc(db, SETTINGS_COLLECTION, SETTINGS_DOC),
        { ...settings, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaved(true);
      toast.success('Paramètres enregistrés !');
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error("Erreur lors de l'enregistrement"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid #FF6B00', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#AAA' }}>Chargement…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  function SaveBtn({ full }) {
    return (
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: full ? '100%' : 'auto',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: saved
            ? 'linear-gradient(135deg,#00A550,#00C060)'
            : 'linear-gradient(135deg,#FF6B00,#FFAA00)',
          color: '#fff', border: 'none',
          padding: full ? '14px' : '12px 24px',
          borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saved ? '0 4px 16px rgba(0,165,80,.3)' : '0 4px 16px rgba(255,107,0,.3)',
          opacity: saving ? .7 : 1, transition: 'all .25s',
        }}
      >
        {saving
          ? <><Loader size={15} style={{ animation: 'spin .7s linear infinite' }} /> Enregistrement…</>
          : saved
          ? <><CheckCircle2 size={15} /> Enregistré !</>
          : <><Save size={15} /> {full ? 'Enregistrer les paramètres' : 'Enregistrer'}</>
        }
      </button>
    );
  }

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto', padding: '24px 20px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus {
          border-color: #FF6B00 !important;
          box-shadow: 0 0 0 3px rgba(255,107,0,.1) !important;
          outline: none !important;
          background: #fff !important;
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: 4 }}>
            Paramètres de paiement
          </h1>
          <p style={{ fontSize: 13, color: '#AAA' }}>
            Personnalisez l'expérience de votre page de paiement
          </p>
        </div>
        <SaveBtn />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Design ── */}
        <div style={card}>
          <SectionHeader
            icon={Palette} iconBg="#FFF3EA" iconColor="#FF6B00"
            title="Design de la page de paiement"
            sub="Apparence affichée à vos clients lors du paiement"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
            {DESIGNS.map(d => (
              <DesignCard
                key={d.id} d={d}
                selected={settings.paymentDesign === d.id}
                onClick={() => set('paymentDesign', d.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Identité ── */}
        <div style={card}>
          <SectionHeader
            icon={Building2} iconBg="#EBF0FF" iconColor="#0057FF"
            title="Identité de l'entreprise"
            sub="Ces informations apparaissent sur votre page de paiement"
          />

          <Field
            label="Logo de l'entreprise"
            hint="Converti en base64 et enregistré directement dans Firestore · PNG, JPG, SVG · max 300 Ko"
          >
            <LogoUploader value={settings.logo} onChange={v => set('logo', v)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            <Field label="Nom de l'entreprise">
              <input
                type="text" value={settings.companyName}
                onChange={e => set('companyName', e.target.value)}
                placeholder="Mon entreprise" style={inputStyle}
              />
            </Field>
            <Field label="Devise par défaut">
              <select
                value={settings.defaultCurrency}
                onChange={e => set('defaultCurrency', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Couleur ── */}
        <div style={card}>
          <SectionHeader
            icon={Palette} iconBg="#F4EBFF" iconColor="#9B00E8"
            title="Couleur principale"
            sub="Appliquée aux boutons, accents et éléments interactifs"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, alignItems: 'start' }}>
            <ColorPicker value={settings.primaryColor} onChange={v => set('primaryColor', v)} />
            <ColorPreview
              color={settings.primaryColor}
              companyName={settings.companyName}
              logo={settings.logo}
            />
          </div>
        </div>

        {/* ── Redirection ── */}
        <div style={card}>
          <SectionHeader
            icon={Globe} iconBg="#EDFAF3" iconColor="#00A550"
            title="Redirection après paiement"
            sub="Page affichée après un paiement réussi"
          />
          <Field
            label="URL de redirection"
            hint="Laissez vide pour afficher la page de confirmation par défaut"
          >
            <div style={{ position: 'relative' }}>
              <Globe size={14} color="#CCC" style={{
                position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
              <input
                type="url" value={settings.redirectUrl}
                onChange={e => set('redirectUrl', e.target.value)}
                placeholder="https://mon-site.com/merci"
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
          </Field>
        </div>

      </div>

      {/* Bouton save bas de page */}
      <div style={{ marginTop: 20 }}>
        <SaveBtn full />
      </div>
    </div>
  );
}