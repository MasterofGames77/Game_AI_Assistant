// import formidable, { File } from 'formidable';
// import fs from 'fs';
// import path from 'path';
// import type { NextApiRequest, NextApiResponse } from 'next';

// const uploadDir = path.join(process.cwd(), '/uploads');

// // Ensure upload directory exists
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// export const config = { api: { bodyParser: false } };

// const uploadImage = async (req: NextApiRequest, res: NextApiResponse) => {
//   const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true });

//   form.parse(req, (err, fields, files) => {
//     if (err) {
//       console.error('Image upload error:', err);
//       return res.status(500).json({ error: 'Image upload failed' });
//     }

//     const uploadedFile = files.image as File | File[] | undefined;
//     if (!uploadedFile) {
//       return res.status(400).json({ error: 'No image provided' });
//     }

//     const filePath = Array.isArray(uploadedFile) ? uploadedFile[0].filepath : uploadedFile.filepath;
//     res.status(200).json({ filePath });
//   });
// };

// export default uploadImage;