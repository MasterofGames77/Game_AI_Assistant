// import formidable, { File } from "formidable";
// import fs from "fs";
// import path from "path";
// import type { NextApiRequest, NextApiResponse } from "next";

// const uploadDir = path.join(process.cwd(), "/public/uploads");

// // Ensure the upload directory exists
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Disable Next.js's default body parsing
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// const uploadImage = async (req: NextApiRequest, res: NextApiResponse) => {
//   const form = formidable({
//     uploadDir, // Where files will be saved
//     keepExtensions: true, // Keep file extensions
//   });

//   form.parse(req, (err, fields, files) => {
//     if (err) {
//       console.error("Image upload error:", err);
//       return res.status(500).json({ error: "Image upload failed" });
//     }

//     // Cast the `files` object to a known type
//     const uploadedFile = files.image as File | File[] | undefined;

//     if (!uploadedFile) {
//       return res.status(400).json({ error: "No image provided" });
//     }

//     // Handle single or multiple files
//     const filePath = Array.isArray(uploadedFile)
//       ? uploadedFile[0].filepath
//       : uploadedFile.filepath;

//     const publicPath = `/uploads/${path.basename(filePath)}`;
//     res.status(200).json({ filePath: publicPath, message: "Image uploaded successfully" });
//   });
// };

// export default uploadImage;