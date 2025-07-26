import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  try {
    let filePath;
    let contentType;
    
    if (pathname === '/scripts.js') {
      filePath = join(process.cwd(), 'public', 'scripts.js');
      contentType = 'application/javascript';
    } else if (pathname === '/styles.css') {
      filePath = join(process.cwd(), 'public', 'styles.css');
      contentType = 'text/css';
    } else {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', contentType);
    res.status(200).send(content);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
}