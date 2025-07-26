import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Test 1: Get sales:all set
    const salesIds = await kv.smembers('sales:all');
    console.log('Sales IDs:', salesIds);
    
    // Test 2: Get first sale data
    if (salesIds && salesIds.length > 0) {
      const firstSaleId = salesIds[0];
      const saleData = await kv.hgetall(`sale:${firstSaleId}`);
      console.log('First sale data:', saleData);
      
      return res.status(200).json({
        debug: true,
        salesIds: salesIds,
        firstSaleId: firstSaleId,
        firstSaleData: saleData,
        dataExists: saleData && Object.keys(saleData).length > 0
      });
    }
    
    return res.status(200).json({
      debug: true,
      salesIds: salesIds,
      message: 'No sales found'
    });
    
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: error.message,
      debug: true 
    });
  }
}