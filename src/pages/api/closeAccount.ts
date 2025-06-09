// src/pages/api/closeAccount.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  createCloseAccountInstruction,
} from '@solana/spl-token';
import { withRpcRotation } from '@/utils/rpcRotation';

export default withRpcRotation(async (req: NextApiRequest, res: NextApiResponse, connection: Connection) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { user, tokenAccount } = req.body as { user: string, tokenAccount: string };

    if (!user || !tokenAccount) {
      return res.status(400).json({ message: 'Missing user or tokenAccount in request body' });
    }

    const userPublicKey = new PublicKey(user);
    const tokenAccountPublicKey = new PublicKey(tokenAccount); // Use the provided ATA

    // Create the close account instruction using the imported function
    // You need the owner, token account, and destination for rent
    const rentDestination = userPublicKey; // Send rent back to the user
    const owner = userPublicKey; // The user is the owner

    const closeInstruction = createCloseAccountInstruction(
      tokenAccountPublicKey, // Token account to close
      rentDestination, // Destination for rent
      owner // Authority
      // You might need to pass the SPL token program ID here if not using the default
    );

    // Create a transaction message
    const recentBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [closeInstruction],
    }).compileToV0Message();

    // Create and return the versioned transaction
    const transaction = new VersionedTransaction(messageV0);

    // You might want to log details about the transaction creation
    console.log(`Created close account transaction for ATA: ${tokenAccount}`);

    return res.status(200).json({
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    });
  } catch (error: unknown) { // Cast error to any for logging
    console.error("Error in /api/closeAccount:", error); // More detailed logging
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: 'Failed to create close account transaction', error: msg });
  }
});
