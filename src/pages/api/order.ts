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
    const order = await createOrder(user, inputMint, outputMint, amount)
    return res.status(200).json(order)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    return res.status(500).json({ error: message })
  }
}
