import { Connection } from '@solana/web3.js';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRpcRotation as _withRpcRotation } from '../../lib/rpc'; // Import the core rotation logic

// This is the higher-order function that wraps your API route handlers
export function withRpcRotation(handler: (req: NextApiRequest, res: NextApiResponse, connection: Connection) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Use the core RPC rotation logic to get a connection and execute the handler
    await _withRpcRotation(async (connection) => {
      await handler(req, res, connection);
    });
  };
}
