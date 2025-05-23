// ────────────────────────────── imports ─────────────────────────────
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBalances } from '../../../lib/swap'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  const { user } = req.body as { user: string }
  if (!user) return res.status(400).json({ error: 'Missing user public key' })

  try {
    const balances = await fetchBalances(user)
    return res.status(200).json(balances)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
