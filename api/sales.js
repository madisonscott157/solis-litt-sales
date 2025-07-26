import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'GET') {
      // Get all sales
      const salesIds = await kv.smembers('sales:all');
      
      if (!salesIds || salesIds.length === 0) {
        return res.status(200).json({ sales: {} });
      }

      const sales = {};
      for (const saleId of salesIds) {
        try {
          const saleData = await kv.hgetall(`sale:${saleId}`);
          if (saleData && Object.keys(saleData).length > 0) {
            sales[saleId] = saleData;
          }
        } catch (error) {
          console.error(`Error fetching sale ${saleId}:`, error);
        }
      }

      return res.status(200).json({ sales });

    } else if (req.method === 'POST') {
      // Create or update sale
      const { saleId, saleData } = req.body;
      
      if (!saleId || !saleData) {
        return res.status(400).json({ error: 'Sale ID and data are required' });
      }

      // Add timestamp
      saleData.lastModified = new Date().toISOString();
      
      // Store sale data
      await kv.hset(`sale:${saleId}`, saleData);
      await kv.sadd('sales:all', saleId);

      return res.status(200).json({ 
        success: true, 
        message: 'Sale saved successfully',
        saleId,
        saleData
      });

    } else if (req.method === 'DELETE') {
      // Delete sale
      const { saleId } = req.query;
      
      if (!saleId) {
        return res.status(400).json({ error: 'Sale ID is required' });
      }

      // Delete sale data and files
      await kv.del(`sale:${saleId}`);
      await kv.del(`sale:${saleId}:files`);
      await kv.srem('sales:all', saleId);

      return res.status(200).json({ 
        success: true, 
        message: 'Sale deleted successfully',
        saleId
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Sales API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}