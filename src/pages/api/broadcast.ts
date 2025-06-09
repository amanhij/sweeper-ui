// src/pages/api/broadcast.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { withRpcRotation } from '@/utils/rpcRotation';

export default withRpcRotation(async (req: NextApiRequest, res: NextApiResponse, connection: Connection) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { signedTransaction } = req.body as { signedTransaction: string };
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Missing signedTransaction' });
    }

    const raw = Buffer.from(signedTransaction, 'base64');
    const signature = await connection.sendRawTransaction(raw);
    return res.status(200).json({ signature });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: (err as Error).message || 'Internal error' });
  }
});
