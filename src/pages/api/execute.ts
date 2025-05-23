// ────────────────────────────── imports ─────────────────────────────
import type { NextApiRequest, NextApiResponse } from 'next'
import { executeOrder } from '../../../lib/swap'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  try {
    const { signedTransaction, requestId } = req.body
    const signature = await executeOrder(signedTransaction, requestId)
    return res.status(200).json({ signature })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return res.status(500).json({ error: errorMessage })
  }
}
