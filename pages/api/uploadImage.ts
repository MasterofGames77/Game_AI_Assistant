// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable, { File } from 'formidable';
// import fs from 'fs';
// import path from 'path';

// export const config = {
//   api: {
//     bodyParser: false, // Disable bodyParser to handle file uploads
//   },
// };

// // Utility to ensure the uploads directory exists
// const ensureUploadsDir = (uploadsPath: string) => {
//   if (!fs.existsSync(uploadsPath)) {
//     fs.mkdirSync(uploadsPath, { recursive: true });
//   }
// };

// // Handler for the image upload
// const uploadImageHandler = async (req: NextApiRequest, res: NextApiResponse) => {
//   const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
//   ensureUploadsDir(uploadsDir);

//   const form = new formidable.IncomingForm({
//     uploadDir: uploadsDir,     // Set upload directory
//     keepExtensions: true,      // Preserve file extensions
//     multiples: false           // Only accept a single file upload
//   });

//   form.parse(req, (err, fields, files) => {
//     if (err) {
//       console.error("Error parsing form:", err);
//       return res.status(500).json({ error: "Error uploading file" });
//     }

//     // Type assertion for accessing the uploaded file
//     const uploadedFile = files.file as File | File[]; // Allowing for File or File[] type
//     if (!uploadedFile || Array.isArray(uploadedFile)) {
//       return res.status(400).json({ error: "No file uploaded or multiple files provided" });
//     }

//     // Access the file path properly
//     const filePath = uploadedFile.filepath; // Access filepath safely

//     return res.status(200).json({ message: "File uploaded successfully", filePath });
//   });
// };

// export default uploadImageHandler;