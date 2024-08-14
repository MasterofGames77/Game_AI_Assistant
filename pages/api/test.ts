import { NextApiRequest, NextApiResponse } from 'next';

const testHandler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ message: 'API is working' });
};

export default testHandler;