// import type { NextApiRequest, NextApiResponse } from 'next';
// import formidable, { File } from 'formidable';
// import fs from 'fs';
// import path from 'path';
// import { analyzeImage } from './analyzeImage';  // Import the utility function

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// const ensureUploadsDir = (uploadsPath: string) => {
//   if (!fs.existsSync(uploadsPath)) {
//     fs.mkdirSync(uploadsPath, { recursive: true });
//   }
// };

// const uploadImageHandler = async (req: NextApiRequest, res: NextApiResponse) => {
//   const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
//   ensureUploadsDir(uploadsDir);

//   const form = new formidable.IncomingForm({
//     uploadDir: uploadsDir,
//     keepExtensions: true,
//     multiples: false,
//   });

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       console.error("Error parsing form:", err);
//       return res.status(500).json({ error: "Error uploading file" });
//     }

//     const uploadedFile = files.file as File | File[];
//     if (!uploadedFile || Array.isArray(uploadedFile)) {
//       return res.status(400).json({ error: "No file uploaded or multiple files provided" });
//     }

//     const filePath = uploadedFile.filepath;

//     try {
//       // Perform analysis directly using analyzeImage
//       const analysisResult = await analyzeImage(filePath);

//       // Respond with both file path and analysis result
//       return res.status(200).json({ 
//         message: "File uploaded successfully", 
//         filePath, 
//         analysis: analysisResult 
//       });
//     } catch (analysisError) {
//       console.error("Error analyzing image:", analysisError);
//       return res.status(500).json({ error: "Error analyzing image" });
//     }
//   });
// };

// export default uploadImageHandler;