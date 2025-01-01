import fs from 'fs';
import csv from 'csv-parser';
import { Decimal128 } from 'mongoose';

interface GameData {
  title: string;
  console: string;
  release_date: string;
  genre: string;
  developer: string;
  publisher: string;
  critic_score: Decimal128;
  total_sales: Decimal128;
  // Add other fields as necessary
}

export const readCSVFile = (filePath: string): Promise<GameData[]> => {
  return new Promise((resolve, reject) => {
    const results: GameData[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};