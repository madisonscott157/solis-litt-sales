import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import multiparty from 'multiparty';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new multiparty.Form();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to parse form data' });
      }

      const uploadedFiles = [];
      const fileArray = Array.isArray(files.files) ? files.files : [files.files];

      for (const file of fileArray) {
        if (!file) continue;

        // Validate file type
        const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                             'application/vnd.ms-excel', 
                             'text/csv'];
        
        if (!allowedTypes.includes(file.headers['content-type'])) {
          continue; // Skip invalid files
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          continue; // Skip files too large
        }

        try {
          // Upload to Vercel Blob
          const blob = await put(file.originalFilename, file, {
            access: 'public',
            addRandomSuffix: true,
          });

          // Create file metadata
          const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const fileMetadata = {
            id: fileId,
            filename: file.originalFilename,
            uploadDate: new Date().toISOString(),
            blobUrl: blob.url,
            size: file.size,
            uploader: fields.uploader ? fields.uploader[0] : 'Anonymous',
            contentType: file.headers['content-type']
          };

          // Store metadata in Redis
          await kv.hset(`file:${fileId}`, fileMetadata);
          await kv.sadd('files:all', fileId);
          
          // If saleId provided, also store in sale-specific list
          if (fields.saleId && fields.saleId[0]) {
            await kv.sadd(`sale:${fields.saleId[0]}:files`, fileId);
          }

          uploadedFiles.push(fileMetadata);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          continue; // Skip this file and continue with others
        }
      }

      res.status(200).json({ 
        success: true, 
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles 
      });
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}