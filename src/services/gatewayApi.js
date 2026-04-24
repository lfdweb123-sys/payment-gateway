const API_URL = import.meta.env.VITE_APP_URL || '';

// Initier un paiement via la passerelle
export async function initGatewayPayment({ token, amount, country, method, phone, email, description, provider }) {
  try {
    const response = await fetch(`${API_URL}/api/gateway/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token
      },
      body: JSON.stringify({
        token,
        amount: parseFloat(amount),
        country,
        method,
        phone,
        email,
        description,
        provider
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur paiement:', error);
    return { success: false, error: error.message };
  }
}

// Vérifier le statut d'une transaction
export async function verifyGatewayPayment(reference) {
  try {
    const response = await fetch(`${API_URL}/api/gateway/verify/${reference}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtenir les méthodes de paiement pour un pays
export async function getCountryMethods(country) {
  try {
    const response = await fetch(`${API_URL}/api/gateway/methods/${country}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtenir le solde du marchand
export async function getMerchantBalance(apiKey) {
  try {
    const response = await fetch(`${API_URL}/api/gateway/balance`, {
      headers: { 'x-api-key': apiKey }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtenir l'historique des transactions d'un marchand
export async function getMerchantTransactions(apiKey, page = 1) {
  try {
    const response = await fetch(`${API_URL}/api/gateway/transactions?page=${page}`, {
      headers: { 'x-api-key': apiKey }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}