import { del } from '@vercel/blob';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    try {
      // Delete from Vercel Blob Storage
      await del(fileData.blobUrl);
    } catch (blobError) {
      console.error('Error deleting from blob storage:', blobError);
      // Continue with Redis cleanup even if blob deletion fails
    }

    try {
      // Remove from Redis
      await kv.del(`file:${fileId}`);
      await kv.srem('files:all', fileId);
    } catch (redisError) {
      console.error('Error deleting from Redis:', redisError);
      return res.status(500).json({ error: 'Failed to delete file metadata' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'File deleted successfully',
      deletedFile: fileData.filename
    });

  } catch (error) {
    console.error('Delete handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}