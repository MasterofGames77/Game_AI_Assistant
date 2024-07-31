import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const csvFilePath = path.join(process.cwd(), 'data/Video Games Data.csv');
        const fileContent = await readFile(csvFilePath, 'utf8');
        const records = parse(fileContent, { columns: true });
        
        // Extract game titles
        const titles = records.map((record: any) => record.title);
        res.status(200).json(titles);
    } catch (error) {
        console.error('Error reading the CSV file:', error);
        res.status(500).json({ message: 'Failed to read CSV data' });
    }
}