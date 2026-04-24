import { getMethodsForCountry } from '../../../src/services/countryMethods.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { country } = req.query;
  if (!country) return res.status(400).json({ error: 'Paramètre country requis' });

  const methods = getMethodsForCountry(country.toLowerCase());
  if (!methods) return res.status(404).json({ error: 'Pays non supporté' });

  return res.status(200).json({ success: true, ...methods });
}