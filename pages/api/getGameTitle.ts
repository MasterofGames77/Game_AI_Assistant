import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

const CSV_FILE_PATH = path.join(process.cwd(), 'data/Video Games Data.csv');

const readCSVFile = async (filePath: string) => {
  const fileContent = await readFile(filePath, 'utf8');
  return parse(fileContent, { columns: true });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await readCSVFile(CSV_FILE_PATH);
    const gameTitles = data.map((game: any) => game.title);
    res.status(200).json(gameTitles);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    res.status(500).json({ error: 'Failed to fetch game titles' });
  }
}