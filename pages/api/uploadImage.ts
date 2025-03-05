// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable from 'formidable';
// import path from 'path';
// import fs from 'fs';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// const uploadDir = path.join(process.cwd(), 'public/uploads');

// // Ensure upload directory exists
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     // Create uploads directory if it doesn't exist
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     const form = formidable({
//       uploadDir,
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // 10MB limit
//       filename: (name, ext, part) => {
//         // Create a unique filename
//         return `${Date.now()}-${part.originalFilename}`;
//       }
//     });

//     const [fields, files] = await form.parse(req);
//     const file = files.image?.[0];

//     if (!file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // Get the path relative to the public directory
//     const relativePath = path.relative(path.join(process.cwd(), 'public'), file.filepath);
    
//     // Convert Windows backslashes to forward slashes for web URLs
//     const webPath = relativePath.replace(/\\/g, '/');

//     return res.status(200).json({ 
//       filePath: webPath,
//       success: true 
//     });

//   } catch (error) {
//     console.error('Error uploading file:', error);
//     return res.status(500).json({ error: 'Error uploading file' });
//   }
// }