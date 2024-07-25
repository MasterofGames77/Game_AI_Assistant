import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

interface GameData {
  title: string;
  platform: string;
  release_year: string;
  genre: string;
  publisher: string;
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