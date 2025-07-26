import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Get file metadata from Redis
    const fileData = await kv.hgetall(`file:${fileId}`);
    
    if (!fileData || !fileData.blobUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Fetch the file from Vercel Blob Storage
    const response = await fetch(fileData.blobUrl);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'File not accessible' });
    }

    const buffer = await response.arrayBuffer();

    // Set appropriate headers for file download
    res.setHeader('Content-Type', fileData.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    // Send the file
    res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Download handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}