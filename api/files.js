import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { saleId } = req.query;
    
    // Get file IDs - either for specific sale or all files
    let fileIds;
    if (saleId) {
      fileIds = await kv.smembers(`sale:${saleId}:files`);
    } else {
      fileIds = await kv.smembers('files:all');
    }
    
    if (!fileIds || fileIds.length === 0) {
      return res.status(200).json({ files: [] });
    }

    // Get metadata for all files
    const files = [];
    for (const fileId of fileIds) {
      try {
        const fileData = await kv.hgetall(`file:${fileId}`);
        if (fileData && fileData.id) {
          files.push(fileData);
        }
      } catch (error) {
        console.error(`Error fetching file ${fileId}:`, error);
        // Continue with other files
      }
    }

    // Sort files by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    res.status(200).json({ files });

  } catch (error) {
    console.error('Files list error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
}