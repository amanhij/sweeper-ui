// ────────────────────────────── imports ─────────────────────────────
import type { NextApiRequest, NextApiResponse } from 'next'
import { createOrder } from '../../../lib/swap'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  try {
    const { user, inputMint, outputMint, amount } = req.body
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }
    console.log('Sweeping', inputMint, 'amount:', amount);
    const order = await createOrder(user, inputMint, outputMint, amount)
    return res.status(200).json(order)
  } catch (err) {
    console.error('API /api/order error:', err);
    return res.status(500).json({ error: (err as Error).message || 'Internal error' });
  }
}
