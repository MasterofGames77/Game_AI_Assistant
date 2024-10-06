// import formidable from 'formidable';
// import type { NextApiRequest, NextApiResponse } from 'next';
// import fs from 'fs';

// export const config = {
//   api: {
//     bodyParser: false, // Important: Disabling bodyParser for file uploads
//   },
// };

// const uploadImageHandler = (req: NextApiRequest, res: NextApiResponse) => {
//   const form = formidable({ multiples: false });

//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       res.status(500).json({ message: 'File upload error', error: err.message });
//       return;
//     }

//     const file = files.image as unknown as formidable.File; // Assuming the file is named 'image'

//     // Optional: Save the file somewhere (e.g., local file system or cloud)
//     const data = fs.readFileSync(file.filepath);
//     fs.writeFileSync(`./uploads/${file.originalFilename}`, data); // Example saving locally

//     // TODO: Pass the file for image analysis here (e.g., AWS Rekognition or OpenAI)
//     res.status(200).json({ message: 'File uploaded successfully' });
//   });
// };

// export default uploadImageHandler;