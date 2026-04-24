import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TrendingUp, Users, DollarSign, Activity, CreditCard, Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GatewayStats() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month');

  const statCards = stats ? [
    { icon: TrendingUp, label: 'Transactions', value: stats.totalTransactions, change: '+12%', positive: true, color: 'bg-blue-50 text-blue-600' },
    { icon: DollarSign, label: 'Revenus', value: `${stats.totalRevenue.toLocaleString()} XOF`, change: '+8%', positive: true, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Users, label: 'Marchands', value: stats.activeMerchants, change: '+5', positive: true, color: 'bg-purple-50 text-purple-600' },
    { icon: Activity, label: 'Taux succès', value: `${stats.successRate}%`, change: '-2%', positive: false, color: 'bg-orange-50 text-orange-600' }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Statistiques</h2>
        <div className="flex gap-2">
          {['day', 'week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon size={18} />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${card.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {card.positive ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {card.change}
              </div>
            </div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenus</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Transactions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Providers</h3>
          <div className="space-y-3">
            {['FeexPay', 'Stripe', 'Paystack', 'KKiaPay', 'FedaPay'].map((name, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${[85, 65, 50, 40, 30][i]}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{[85, 65, 50, 40, 30][i]}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Pays</h3>
          <div className="space-y-3">
            {[
              { name: '🇧🇯 Bénin', pct: 35 },
              { name: '🇨🇮 Côte d\'Ivoire', pct: 25 },
              { name: '🇸🇳 Sénégal', pct: 15 },
              { name: '🇫🇷 France', pct: 12 },
              { name: '🇳🇬 Nigeria', pct: 8 }
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{c.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}