// ────────────────────────────── imports ─────────────────────────────
import fetch from 'node-fetch'

// ─── Types ────────────────────────────────────────────────────────────
export interface BalanceInfo { amount: number }
export interface Balances { [mint: string]: BalanceInfo }

export interface OrderData {
  /** Base64-encoded VersionedTransaction; not yet signed or fee-paid */
  transaction: string
  /** requestId to pass back when executing */
  requestId: string
}

export interface ExecData {
  status: 'Success' | 'Failure'
  /** present on success */
  signature?: string
  /** present on failure */
  code?: number
  /** present on failure */
  error?: string
}

// ─── Fetch all SPL balances for a given wallet ─────────────────────────
export async function fetchBalances(
  taker: string
): Promise<Balances> {
  const res = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${taker}`)
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`fetchBalances failed: ${err}`)
  }
  return (await res.json()) as Balances
}

// ─── Create an unsigned swap order on Jupiter Ultra ──────────────────
export async function createOrder(
  taker: string,
  inputMint: string,
  outputMint: string,
  amount: string
): Promise<OrderData> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    taker,
  })
  const res = await fetch(
    `https://lite-api.jup.ag/ultra/v1/order?${params.toString()}`
  )
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`createOrder failed: ${err}`)
  }
  return (await res.json()) as OrderData
}

// ─── Execute a previously-created order (signed by the client) ───────
export async function executeOrder(
  signedTransaction: string, // base64
  requestId: string
): Promise<string> {
  const res = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTransaction, requestId }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`executeOrder failed: ${err}`)
  }
  const data = (await res.json()) as ExecData
  if (data.status !== 'Success' || !data.signature) {
    throw new Error(`Swap failed: ${data.code} ${data.error}`)
  }
  return data.signature
}
