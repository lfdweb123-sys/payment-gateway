// api/gateway/methods/[country].js
import { getMethodsForCountry } from '../../../src/services/countryMethods';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const { country } = req.query;
  
  if (!country) {
    return res.status(400).json({ error: 'Paramètre country requis' });
  }

  const methods = getMethodsForCountry(country.toLowerCase());
  
  if (!methods) {
    return res.status(404).json({ error: 'Pays non supporté' });
  }

  return res.status(200).json({
    success: true,
    ...methods
  });
}