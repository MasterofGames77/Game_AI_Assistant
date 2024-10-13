// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable, { File } from 'formidable';
// import fs from 'fs';
// import path from 'path';
// import axios from 'axios';

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

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error("Error parsing form:", err);
//       return res.status(500).json({ error: "Error uploading file" });
//     }

//     // Type assertion for accessing the uploaded file
//     const uploadedFile = files.file as File | File[];
//     if (!uploadedFile || Array.isArray(uploadedFile)) {
//       return res.status(400).json({ error: "No file uploaded or multiple files provided" });
//     }

//     // Access the file path properly
//     const filePath = uploadedFile.filepath;

//     try {
//       // Send the file path to analyzeImage.ts for analysis
//       const analysisResponse = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/analyzeImage`, {
//         filePath,
//       });

//       // Respond with both file path and analysis result
//       return res.status(200).json({ 
//         message: "File uploaded successfully", 
//         filePath, 
//         analysis: analysisResponse.data 
//       });
//     } catch (analysisError) {
//       console.error("Error analyzing image:", analysisError);
//       return res.status(500).json({ error: "Error analyzing image" });
//     }
//   });
// };

// export default uploadImageHandler;