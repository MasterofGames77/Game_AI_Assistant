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
//     const form = formidable({
//       uploadDir,
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // 10MB limit
//     });

//     const [, files] = await form.parse(req);
//     const file = files.image?.[0];

//     if (!file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const relativePath = path.relative('./public', file.filepath);
//     return res.status(200).json({ filePath: relativePath });
//   } catch (error) {
//     console.error('Error uploading file:', error);
//     return res.status(500).json({ error: 'Error uploading file' });
//   }
// }