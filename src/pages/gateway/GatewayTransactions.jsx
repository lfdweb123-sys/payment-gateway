const loadTransactions = async () => {
  try {
    let snap;
    // Utiliser effectiveMerchantId pour les membres d'équipe
    const merchantId = user?.effectiveMerchantId || user?.uid;
    
    if (isAdmin) {
      snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(500)));
    } else {
      snap = await getDocs(query(
        collection(db, 'gateway_transactions'), 
        where('merchantId', '==', merchantId), 
        orderBy('createdAt', 'desc'), 
        limit(200)
      ));
    }
    setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) { 
    console.error(e); 
    toast.error('Erreur lors du chargement des transactions');
  }
  finally { setLoading(false); }
};