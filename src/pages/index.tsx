// ────────────────────────────── imports ─────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet, UnifiedWalletButton } from '@jup-ag/wallet-adapter';
import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { Button } from '@heroui/react';

// ───────────────────────── constants ────────────────────────────
const JUP_MINT   = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
const W_SOL_MINT = 'So11111111111111111111111111111111111111112';
const EXCLUDE_ALWAYS = new Set(['SOL', JUP_MINT]);

// ──────────────────────────── types ─────────────────────────────
type Balances = Record<string, { amount: number }>;
interface TokenMeta {
  symbol: string;
  logoURI?: string;
}
type TokenMap = Record<string, TokenMeta>;

// ───────────────────────── component ────────────────────────────
export default function Home() {
  const { publicKey, signAllTransactions } = useWallet();

  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [sigs, setSigs]         = useState<string[]>([]);

  const [balances, setBalances]   = useState<Balances>({});
  const [keepMints, setKeepMints] = useState<Set<string>>(new Set(EXCLUDE_ALWAYS));
  const [tokens, setTokens]       = useState<TokenMap>({});

  // ───────────── fetch user balances ─────────────
  useEffect(() => {
    if (!publicKey) {
      setBalances({});
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/balances', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ user: publicKey.toBase58() }),
          signal : ac.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        setBalances(await res.json() as Balances);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') console.error(e);
      }
    })();
    return () => ac.abort();
  }, [publicKey]);

  // ───────────── fetch token metadata (one-by-one) ─────────────
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const mints = Object.keys(balances).filter(m => !(m in tokens));
      if (!mints.length) return;

      try {
        const metaPairs = await Promise.all(
  mints.map(async mint => {
    if (mint === W_SOL_MINT || mint === 'SOL') {

      // fallback to Solscan’s SOL icon
      return [mint, { symbol: 'SOL', logoURI: 'https://statics.solscan.io/solscan-img/solana_icon.svg' }] as const;
    }

    try {
      const res = await fetch(`https://lite-api.jup.ag/tokens/v1/token/${mint}`, {
        signal: ac.signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error('meta fetch failed');
      const { symbol, logoURI } = await res.json();
      return [mint, { symbol, logoURI } as TokenMeta] as const;
    } catch {
      return [mint, { symbol: `${mint.slice(0,4)}…${mint.slice(-4)}` } as TokenMeta] as const;
    }
  })
);

        setTokens(prev => {
          const next = { ...prev };
          metaPairs.forEach(([m, meta]) => (next[m] = meta));
          return next;
        });
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') console.error(e);
      }
    })();
    return () => ac.abort();
  }, [balances, tokens]);

  // ───────────── helpers ─────────────
  const nameOf = (mint: string) =>
    tokens[mint]?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;

  const toggleKeep = useCallback((mint: string) => {
    setKeepMints(prev => {
      const next = new Set(prev);
      if (next.has(mint)) {
        next.delete(mint);
      } else {
        next.add(mint);
      }
      return next;
    });
  }, []);

  // Deduplicate SOL vs wSOL
  const displayBalances = useMemo(() => {
    const out: [string, { amount: number }][] = [];
    const seen = new Set<string>();
    for (const [mint, info] of Object.entries(balances)) {
      const key = mint === W_SOL_MINT ? 'SOL' : nameOf(mint);
      if (!seen.has(key)) {
        seen.add(key);
        out.push([mint, info]);
      }
    }
    return out;
  }, [balances, nameOf]);

  // ───────────── main action ─────────────
  const sweep = async () => {
    if (!publicKey) {
      setErrorMsg('Connect your wallet first');
      return;
    }
    setErrorMsg(undefined);
    setLoading(true);
    setSigs([]);

    try {
      const toSwap = displayBalances.filter(
        ([mint, info]) => !keepMints.has(mint) && !EXCLUDE_ALWAYS.has(mint) && info.amount > 0,
      );
      if (!toSwap.length) throw new Error('Nothing to swap 🎉');

      const orders = await Promise.all(
        toSwap.map(async ([mint, info]) => {
          const res = await fetch('/api/order', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
              user      : publicKey.toBase58(),
              inputMint : mint,
              outputMint: JUP_MINT,
              amount    : info.amount.toString(),
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          return res.json() as Promise<{ transaction: string; requestId: string }>;
        })
      );

      const txs = orders.map(o => VersionedTransaction.deserialize(Buffer.from(o.transaction, 'base64')));
      if (!signAllTransactions) throw new Error('Wallet cannot batch-sign');
      const signed = await signAllTransactions(txs);

      const execSigs = await Promise.all(
        signed.map((tx, i) =>
          fetch('/api/execute', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
              signedTransaction: Buffer.from(tx.serialize()).toString('base64'),
              requestId        : orders[i].requestId,
            }),
          })
            .then(r => (r.ok ? r.json() : null))
            .then(j => j?.signature)
        )
      );

      const ok = execSigs.filter(Boolean) as string[];
      if (!ok.length) throw new Error('All swaps failed ❌');
      setSigs(ok);
      } catch (e) {
    
    let friendly = 'Something went wrong. Please try again.';

    if (e instanceof Error) {
     
      try {
        const parsed = JSON.parse(e.message);
        friendly =
          parsed?.error ||
          parsed?.message ||
          e.message.replace(/["{}]/g, '');
      } catch {
        
        friendly = e.message.replace(/["{}]/g, '');
      }

      // route error
      if (friendly.includes('Failed to get quotes'))
        friendly =
          'No swap route found for the selected token(s). Please try again.';
    } else {
      friendly = String(e);
    }

    setErrorMsg(friendly);
  } finally {
    setLoading(false);
  }

  };


  // ───────────── JSX ─────────────
  return (
    <>
      {/* — main centered UI — */}
       <main className="relative min-h-screen w-screen bg-[url('/jupiter-bg.png')] bg-cover bg-center text-white overflow-hidden flex items-center justify-center">
        <aside
          className="
            fixed top-4 left-4
            w-80 sm:w-96 flex flex-col gap-6
            bg-black/60 backdrop-blur-md p-6
            rounded-2xl shadow-2xl
            text-cyan-400
            filter drop-shadow-[0_0_4px_rgba(6,230,230,0.8)]
          "
        >
          {/* ── title ─────────────────────────────── */}
          <h1 className="text-4xl font-bold text-cyan-400">
            Swap All Tokens
            <span className="block text-2xl text-cyan-300 mt-1">
              ↓ IN ONE SWEEP
            </span>
          </h1>

          {/* ── connect wallet button ─────────────── */}
          <UnifiedWalletButton
            buttonClassName="
              relative
              w-full
              px-6 py-2
              font-semibold
              text-cyan-400
              !bg-transparent
              rounded-lg
              filter drop-shadow-[0_0_4px_rgba(6,230,230,0.8)]
              hover:drop-shadow-[0_0_8px_rgba(6,230,230,0.9)]
              hover:text-white
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-cyan-400/50
              active:scale-95
            "
            aria-label="Connect wallet"
          />

          {/* ── keep-tokens list ─────────────────── */}
          {displayBalances.length > 0 && (
            <details open className="bg-white/10 rounded-lg overflow-hidden">
              <summary className="cursor-pointer py-2 px-4 font-semibold select-none">
                <span className="text-cyan-300 hover:text-white transition-colors">
                  Keep Tokens
                </span>
              </summary>
              <ul className="max-h-64 overflow-y-auto">
                {displayBalances.map(([mint, info]) => (
                  <li key={mint} className="flex items-center gap-3 py-2 px-4">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-nebula-blue focus:ring-2 focus:ring-nebula-blue"
                      checked={keepMints.has(mint)}
                      disabled={EXCLUDE_ALWAYS.has(mint)}
                      onChange={() => toggleKeep(mint)}
                      aria-label={`Toggle keep ${nameOf(mint)}`}
                    />

                    {/* ── token icon + name / amount ─────────────────────────────── */}
{(mint === W_SOL_MINT || mint === 'SOL') ? (
  /* 1️ SOL – Solscan icon */
  <>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src="https://statics.solscan.io/solscan-img/solana_icon.svg"
        alt="SOL"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>

    <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
      <span className="font-medium text-cyan-400">SOL</span>
      
    </div>
  </>
) : tokens[mint]?.logoURI ? (
  /* 2️ Any other token that has a logoURI */
  <>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={tokens[mint]!.logoURI!}
        alt={nameOf(mint)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>

    <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
      <span className="font-medium text-cyan-400">{nameOf(mint)}</span>
      
    </div>
  </>
) : (
  /* 3️ Token with no logo */
  <>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, textTransform: 'uppercase',
    }}>
      {nameOf(mint)}
    </div>

    <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
      <span className="text-cyan-300 ml-1">({info.amount})</span>
    </div>
  </>
)}



                   
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* ── sweep button ─────────────────────── */}
          <Button
            onClick={sweep}
            disabled={!publicKey || loading}
            className="
              relative w-full px-6 py-2 font-semibold
              text-cyan-400 bg-transparent rounded-lg
              filter drop-shadow-[0_0_4px_rgba(6,230,230,0.8)]
              hover:drop-shadow-[0_0_8px_rgba(6,230,230,0.9)]
              hover:text-white transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-cyan-400/50
              active:scale-95
            "
            aria-label="Sweep tokens"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-cyan-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Sweeping…
              </>
            ) : (
              'Sweep'
            )}
          </Button>

          {/* ── error message ────────────────────── */}
          {errorMsg && (
  <div
    className="
      mt-1 flex items-start gap-3 rounded-lg
      bg-red-500/15 text-red-300 p-3
      backdrop-blur-sm
    "
  >
    

    {/* error message */}
    <span className="whitespace-pre-line text-sm leading-snug">
      {errorMsg}
    </span>
  </div>
)}


          {/* ── signature list ─────────────────── */}
          {sigs.length > 0 && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg max-h-48 overflow-y-auto font-mono text-sm">
              <p className="font-semibold mb-2">Transaction Signatures:</p>
              {sigs.map(sig => (
                <a
                  key={sig}
                  href={`https://solscan.io/tx/${sig}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-cyan-300 hover:text-white hover:underline"
                >
                  {sig}
                </a>
              ))}
            </div>
          )}
        </aside>
      </main>

       {/* Built-By badge */}
    {/* pinned badge */}
  <div className="built-by-badge flex items-center gap-2 px-3 py-1
                  bg-black/60 backdrop-blur-sm rounded-lg
                  text-cyan-300 text-sm font-semibold
                  filter drop-shadow-[0_0_6px_rgba(6,230,230,0.9)]">
    <span>Built&nbsp;By</span>
    <img src="/dev_rel_SVG.svg" alt="DevRel logo" className="h-3 w-3 rounded-full" style={{ width: '24px', height: '24px' }}/>
  </div>
</>
);
}