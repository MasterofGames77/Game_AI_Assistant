import fs from 'fs';
import csv from 'csv-parser';
import { GameData } from '@/types';

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