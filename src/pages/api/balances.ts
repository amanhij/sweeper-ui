// src/pages/api/balances.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { withRpcRotation } from "../../../lib/rpc";

interface ParsedAccount { parsed: { info: { mint: string; tokenAmount: { uiAmount: number; amount: string } } } }

/**
 * Response shape:
 * {
 *   [mint: string]: { amount: number, tokenAccount?: string }
 * }
 *
 * We return:
 *   • "SOL": { amount: <SOL balance in SOL> }
 *   • For every SPL token account (including zero), an entry like:
 *         "<mintAddress>": { amount: <UI amount (float)>, tokenAccount: "<ataAddress>" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user } = req.body as { user: string };
    if (!user) {
      return res.status(400).json({ error: 'Missing "user" field in request body' });
    }

    const ownerPubkey = new PublicKey(user);

    const balances = await withRpcRotation(async (conn) => {
      // 1) Fetch native SOL balance (in lamports), convert to SOL
      const lamports = await conn.getBalance(ownerPubkey);
      const solAmount = lamports / 1e9; // convert lamports to SOL

      // 2) Fetch *all* token accounts owned by this wallet
      const parsedTokenAccounts = await conn.getParsedTokenAccountsByOwner(
        ownerPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );
      // parsedTokenAccounts.value is an array of { pubkey, account: { data: { parsed: { info: { mint, tokenAmount: { uiAmount, amount } } } } } }

      // 3) Build a map: mintAddress -> { amount, tokenAccount }. Include zero‐balance ATAs.
      const balances: Record<string, { amount: number, tokenAccount?: string, rawAmount?: string }> = {
        // Always include SOL at key "SOL"
        SOL: { amount: solAmount },
      };

      for (const { pubkey, account } of parsedTokenAccounts.value) {
        const parsedInfo = (account.data as ParsedAccount).parsed.info;
        const mintAddress: string = parsedInfo.mint;
        // uiAmount is a floating‐point number (e.g. 0.0, 1.234, etc.)
        const uiAmount: number = parsedInfo.tokenAmount.uiAmount || 0;
        // raw amount is the precise integer amount in base units
        const rawAmount: string = parsedInfo.tokenAmount.amount;

        // Store both amount (UI) and rawAmount (for transactions) and token account address
        balances[mintAddress] = { amount: uiAmount, rawAmount: rawAmount, tokenAccount: pubkey.toBase58() };
      }

      return balances;
    });

    return res.status(200).json(balances);
  } catch (err) {
    console.error('API /api/balances error:', err);
    return res
      .status(500)
      .json({ error: (err as Error).message || 'Internal error' });
  }
}
