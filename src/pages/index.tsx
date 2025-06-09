// src/pages/index.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet, UnifiedWalletButton } from "@jup-ag/wallet-adapter";
import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherDroplet, FeatherDollarSign, FeatherCodesandbox } from "@subframe/core";

import { Table } from "@/ui/components/Table";
import Image from 'next/image';

// Helper to pause execution for a given number of milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ───────────────────────── constants ────────────────────────────
const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const W_SOL_MINT = "So11111111111111111111111111111111111111112";
const EXCLUDE_ALWAYS = new Set<string>(["SOL", JUP_MINT]);

// ──────────────────────────── types ─────────────────────────────
type Balances = Record<string, { amount: number, tokenAccount?: string, rawAmount?: string }>;
interface TokenMeta {
  symbol: string;
  logoURI?: string;
  decimals?: number;
  price?: number;
}
type TokenMap = Record<string, TokenMeta>;

// ─────────────────────────── Components ──────────────────────────
export default function Home() {
  const { publicKey, signAllTransactions } = useWallet();

  // ─────────────── State Hooks ──────────────
  const [balances, setBalances] = useState<Balances>({});
  const [tokens, setTokens] = useState<TokenMap>({});
  const [keepMints, setKeepMints] = useState<Set<string>>(new Set(EXCLUDE_ALWAYS));
  const [closingMints, setClosingMints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [closeError, setCloseError] = useState<string>();
  const [transactionSignatures, setTransactionSignatures] = useState<Array<{ signature: string; tokens: string[] }>>([]);
  const [isSweepTableOpen, setIsSweepTableOpen] = useState(true);

  // ───────────── helpers ─────────────
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

  // ──────────── Fetch Balances ─────────────────
  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setBalances({});
      return;
    }
    try {
      const res = await fetch("/api/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: publicKey.toBase58() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const fetchedBalances = (await res.json()) as Balances;
      setBalances(fetchedBalances);
    } catch (e) {
      console.error("Error fetching balances:", e);
    }
  }, [publicKey]);

  // Initial fetch on mount
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Clear tokens when publicKey changes
  useEffect(() => {
    if (!publicKey) {
      setTokens({});
    }
  }, [publicKey]);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => publicKey && fetchBalances();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [publicKey, fetchBalances]);

  useEffect(() => {
  }, [balances]);

  // ─────────── Fetch Token Metadata ─────────────
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const mints = Object.keys(balances);
      if (!mints.length) return;

      const metaPairs: (readonly [string, TokenMeta] | null)[] = [];

      for (const mint of mints) {
        // Handle SOL/W_SOL separately as they don't need a Jupiter API fetch
        if (mint === W_SOL_MINT || mint === 'SOL') {
          metaPairs.push([
            mint,
            {
              symbol: 'SOL',
              logoURI: 'https://statics.solscan.io/solscan-img/solana_icon.svg',
              decimals: 9,
              price: undefined,
            },
          ] as const);
          continue; // Move to the next mint
        }

        try {
          // Add a small delay before each fetch to avoid rate limits
          await sleep(100); // 100ms delay

          const res = await fetch(`https://lite-api.jup.ag/tokens/v1/token/${mint}`, {
            signal: ac.signal,
            headers: { accept: 'application/json' },
          });

          if (!res.ok) {
            console.error(`Meta fetch failed for ${mint}:`, await res.text());
            metaPairs.push(null);
            continue; // Move to the next mint
          }

          const { symbol, logoURI, decimals, price, tags } = await res.json();

          // Filter out tokens that are not 'verified'
          if (!tags || !Array.isArray(tags) || !tags.includes('verified')) {
            metaPairs.push(null); // Explicitly push null for unverified tokens
            continue; // Move to the next mint
          }

          metaPairs.push([
            mint,
            { symbol, logoURI, decimals, price } as TokenMeta,
          ] as const);

        } catch (e) {
          console.error("Error fetching metadata for mint", mint, ":", e);
          metaPairs.push(null); // Explicitly push null for failed fetches
        }
      }

      setTokens(prev => {
        const next = { ...prev };
        // Filter out null entries (unverified or failed-to-fetch tokens)
        (metaPairs.filter(Boolean) as [string, TokenMeta][]).forEach(([m, meta]) => (next[m] = meta));
        return next;
      });

    })().catch((e) => { // Catch for any top-level async errors outside the for loop
      if (e instanceof Error && e.name !== 'AbortError') console.error("Top-level error in metadata useEffect:", e);
    });
    return () => ac.abort();
  }, [balances]);

  // ─────────── helper to get display name ──────────
  const nameOf = useCallback(
    (mint: string) => tokens[mint]?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
    [tokens] // nameOf depends on the tokens state
  );

  // ─────────── Dedupe balances by symbol "SOL" / others ───────
  const displayBalances = useMemo(() => {
    const out: [string, { amount: number, tokenAccount?: string }][] = [];
    const seen = new Set<string>();

    for (const [mint, info] of Object.entries(balances)) {
      // Always include SOL and W_SOL (which is also treated as SOL)
      if (mint === W_SOL_MINT || mint === "SOL") {
        const key = "SOL";
        if (!seen.has(key)) {
          seen.add(key);
          out.push([mint, info]);
        }
        continue; // Skip further processing for SOL/WSOL as they are handled
      }

      // For other tokens, only include if they are in the 'tokens' map (meaning they are verified)
      const tokenMeta = tokens[mint];
      if (tokenMeta) { // If tokenMeta exists, it means it's a verified token
        const key = nameOf(mint); // Use the nameOf for deduplication
        if (!seen.has(key)) {
          seen.add(key);
          out.push([mint, info]);
        }
      }
    }
    return out;
  }, [balances, nameOf, tokens]);

  // ─────────── Which tokens can be "swapped" (amount>0 and not excluded) ───────
  const toSwap = useMemo(
    () =>
      displayBalances.filter(
        ([mint, info]) =>
          info.amount > 0 && !EXCLUDE_ALWAYS.has(mint)
      ),
    [displayBalances]
  );

  // ─────────── Which token accounts can be "closed" (amount===0 and not excluded) ──
  const closableAccounts = useMemo(
    () => {
      const result = displayBalances.filter(
        ([mint, info]) => info.amount === 0 && !EXCLUDE_ALWAYS.has(mint)
      );
      return result;
    },
    [displayBalances]
  );

  // ─────────── Walkthrough: sweepSingle (per‐mint) ───────────
  const sweepSingle = useCallback(
    async (mint: string) => {
      if (!publicKey) return;
      setLoading(true);
      try {
        // 1) Get the precise raw amount from the balances state
        const balanceInfo = balances[mint];
        if (!balanceInfo || balanceInfo.rawAmount === undefined) {
          throw new Error(`Missing balance info or raw amount for token ${mint}`);
        }
        const rawAmountStr = balanceInfo.rawAmount;
        // Ensure the raw amount is greater than 0
        if (BigInt(rawAmountStr) <= BigInt(0)) {
          setLoading(false);
          return; // Skip if balance is zero or less
        }

        // 2) call your /api/order with rawAmountStr instead of decimal
        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: publicKey.toBase58(),
            inputMint: mint,
            outputMint: JUP_MINT,
            amount: rawAmountStr,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("API /order failed:", errText);
          throw new Error(errText);
        }

        const { transaction, requestId } = (await res.json()) as {
          transaction: string;
          requestId: string;
        };

        // 3) deserialize, sign, broadcast (unchanged)
        const tx = VersionedTransaction.deserialize(
          Buffer.from(transaction, "base64")
        );
        if (!signAllTransactions) throw new Error("Wallet cannot batch-sign");
        const [signedTx] = await signAllTransactions([tx]);

        const execRes = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedTransaction: Buffer.from(signedTx.serialize()).toString(
              "base64"
            ),
            requestId,
          }),
        });
        if (!execRes.ok) throw new Error("Swap failed");
        
        const execData = await execRes.json();
        if (execData.signature) {
          setTransactionSignatures(prev => [...prev, { signature: execData.signature, tokens: [nameOf(mint)] }]);
        } else {
          console.error("No signature in execute response:", execData);
        }

        // No longer using sweptATAs state here
        // const tokenAccount = balances[mint]?.tokenAccount; // Get the ATA from the balances state
        // if (tokenAccount) {
        //   // We don't need to add to sweptATAs if it's removed
        //   // setSweptATAs(prev => { if (prev.includes(tokenAccount)) return prev; return [...prev, tokenAccount]; });
        // }

        // 5) Update balances immediately after successful sweep
        await fetchBalances();

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signAllTransactions, balances, fetchBalances, nameOf]
  );

  // ─────────── Close / Redeem a single account ───────────
  const onCloseAccount = useCallback(
    async (ata: string) => {
      if (!publicKey || !signAllTransactions) return;
      setClosingMints((prev) => new Set(prev).add(ata));
      setCloseError(undefined);

      try {
        // 1) ask /api/closeAccount for a "close" tx using the ATA
        const res = await fetch("/api/closeAccount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: publicKey.toBase58(), tokenAccount: ata }), // Send ATA
        });
        if (!res.ok) throw new Error(await res.text());
        const { transaction } = (await res.json()) as { transaction: string };

        // 2) deserialize → sign → broadcast
        const tx = VersionedTransaction.deserialize(
          Buffer.from(transaction, "base64")
        );
        const [signedTx] = await signAllTransactions([tx]);

        const sendRes = await fetch("/api/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedTransaction: Buffer.from(signedTx.serialize()).toString(
              "base64"
            ),
          }),
        });
        if (!sendRes.ok) throw new Error(await sendRes.text());
        
        const broadcastData = await sendRes.json();
        if (broadcastData.signature) {
          const tokenMint = Object.entries(balances).find(([, info]) => info.tokenAccount === ata)?.[0];
          setTransactionSignatures(prev => [...prev, { signature: broadcastData.signature, tokens: tokenMint ? [nameOf(tokenMint)] : ['Unknown Token'] }]);
        } else {
          console.error("No signature in broadcast response:", broadcastData);
        }

        // 3) remove from "closing" set + refresh
        setClosingMints((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(ata); // Remove ATA from closing list
          return nextSet;
        });

        // 4) Update balances and remove from sweptATAs after successful close
        await fetchBalances();
        // No longer using sweptATAs state here

      } catch (e) {
        console.error(e);
        setCloseError("Failed to close token account");
        setClosingMints((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(ata); // Remove ATA from closing list
          return nextSet;
        });
      }
    },
    [publicKey, signAllTransactions, setClosingMints, setCloseError, fetchBalances, nameOf, balances]
  );

  const handleCloseAccount = async (ata: string) => {
    await onCloseAccount(ata);
  };

  // ─────────── Accounts to show in Rent & Redeem (must have zero balance) ───
  const rentRedeemAccounts = useMemo((): Array<{ ata: string; mint: string }> => {
    // We now derive this directly from closableAccounts, which already filters by amount === 0
    return closableAccounts.map(([mint, info]) => ({
      ata: info.tokenAccount as string, // We know tokenAccount exists for these
      mint: mint,
    }));
  }, [closableAccounts]); // Depend on closableAccounts

  return (
    <>
      <main className="relative min-h-screen w-screen bg-[url('/jupiter-bg.png')] bg-cover bg-center text-white overflow-hidden flex items-start justify-center p-4 sm:p-8">
        {/* ── Left Panel: Connect / Sweep All Buttons ── */}
        <aside className="relative max-w-sm w-full mx-auto sm:w-80 sm:fixed sm:top-4 sm:left-4 bg-black/50 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-cyan-400 mb-6 sm:mb-0">
          <h1 className="text-4xl font-bold text-cyan-400">
            Sweeper
          </h1>

          <UnifiedWalletButton
            buttonClassName="
              bg-gradient-to-r from-blue-500 to-dark-500
              text-white
              font-bold
              py-2
              px-4
              rounded
              shadow-lg
              hover:from-purple-500
              hover:to-red-500
              transition duration-300
              ease-in-out
            "
            aria-label="Connect wallet"
          />

          <div className="flex gap-2 mt-4">
            
          </div>

          {transactionSignatures.length > 0 && (
            <div className="mt-6 p-3 bg-black/30 rounded-lg max-h-48 overflow-y-auto font-mono text-sm">
              <p className="text-sm text-cyan-300">Last Transactions:</p>
              {transactionSignatures.map(({ signature, tokens }) => (
                <div key={signature} className="flex items-center justify-between">
                  <a
                    href={`https://solscan.io/tx/${signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-cyan-400 hover:text-cyan-300 break-all"
                  >
                    {signature}
                  </a>
                  <span className="text-xs text-neutral-400 ml-2">
                    ({tokens.join(', ')})
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Two Glassmorphic Cards (Right) ── */}
        {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto sm:ml-80">
        
          {/* ── Sweep Tokens Card ── */}
          <div
            className="
              h-full
              w-full
              bg-white/10
              rounded-md
              bg-clip-padding
              backdrop-filter
              backdrop-blur-sm
              border
              border-gray-200/20
              p-6
              hover:scale-105
              transition-transform
              duration-300
            "
          >
            <div className="flex w-full items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <IconWithBackground icon={<FeatherDroplet />} />
                <div className="flex flex-col">
                  <span className="text-heading-3 font-heading-3 text-white">
                    Sweep Tokens
                  </span>
                  <span className="text-caption font-caption text-neutral-400">
                    Tokens eligible to be swept
                  </span>
                </div>
              </div>
              <Button
                variant="brand-tertiary"
                size="small"
                onClick={async () => {
                  if (!publicKey) return;
                  setLoading(true);
                  setCloseError(undefined);
                  setTransactionSignatures([]); // Clear previous signatures

                  try {
                    // 1) Filter tokens to swap, excluding those marked to keep
                    const tokensToSweep = toSwap.filter(([mint, info]) => info.amount > 0 && !keepMints.has(mint));
                    if (tokensToSweep.length === 0) {
                      setCloseError("No tokens to sweep (or all are kept)."); // Set user-friendly message
                      return; // Exit without throwing error
                    }

                    // 2) Fetch all order transactions concurrently
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const orders = await Promise.all(
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      tokensToSweep.map(async ([mint, _info]) => {
                        const balanceInfo = balances[mint];
                        if (!balanceInfo || balanceInfo.rawAmount === undefined) {
                          throw new Error(`Missing balance info or raw amount for token ${mint}`);
                        }
                        const rawAmountStr = balanceInfo.rawAmount;

                        const res = await fetch("/api/order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            user: publicKey.toBase58(),
                            inputMint: mint,
                            outputMint: JUP_MINT,
                            amount: rawAmountStr,
                          }),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        return res.json() as Promise<{ transaction: string; requestId: string }>;
                      })
                    );

                    // 3) Deserialize all transactions
                    const txs = orders.map(o => VersionedTransaction.deserialize(Buffer.from(o.transaction, "base64")));
                    if (!signAllTransactions) throw new Error("Wallet cannot batch-sign");

                    // 4) Sign all transactions at once
                    const signedTxs = await signAllTransactions(txs);

                    // 5) Execute all signed transactions concurrently
                    const execResults = await Promise.allSettled(
                      signedTxs.map((tx, _i) => // _i for unused index
                        fetch("/api/execute", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            signedTransaction: Buffer.from(tx.serialize()).toString("base64"),
                            requestId: orders[_i].requestId,
                          }),
                        }).then(r => r.json())
                      )
                    );

                    const newTransactionEntries: Array<{ signature: string; tokens: string[] }> = [];
                    const newlySweptATAs: string[] = []; // This is still here for clarity but won't be used to set state

                    execResults.forEach((result, _index) => {
                      if (result.status === "fulfilled" && result.value?.signature) {
                        const signature = result.value.signature;
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const tokenMint = tokensToSweep[_index][0]; // Mint is the first element of the tuple
                        const tokenAccount = tokensToSweep[_index][1]?.tokenAccount;

                        if (tokenAccount) {
                          newlySweptATAs.push(tokenAccount); // Still collecting for potential future use or debugging if needed
                        }
                        newTransactionEntries.push({ signature, tokens: [nameOf(tokenMint)] });
                      } else if (result.status === "rejected") {
                        console.error("Sweep transaction failed:", result.reason);
                      } else {
                        console.error("Sweep transaction failed with no signature:", result.value);
                      }
                    });

                    setTransactionSignatures(prev => [...prev, ...newTransactionEntries]);
                    setIsSweepTableOpen(false); // Collapse table after successful sweep

                  } catch (e) {
                    if (e instanceof Error && e.name === 'WalletSignTransactionError') {
                      console.warn("Transaction rejected by wallet.", e);
                      setCloseError("Transaction rejected.");
                    } else {
                      console.error("Error during batch sweep:", e);
                      setCloseError(e instanceof Error ? e.message : String(e));
                    }
                  } finally {
                    await fetchBalances();
                    setLoading(false);
                  }
                }}
                disabled={!publicKey || loading}
              >
                Sweep All
              </Button>
            </div>

            <details open={isSweepTableOpen} onToggle={(e) => setIsSweepTableOpen(e.currentTarget.open)} className="flex w-full flex-col gap-4 overflow-auto max-h-96 overflow-x-auto">
              <summary className="cursor-pointer py-2 px-4 font-semibold select-none text-cyan-300 hover:text-white transition-colors">
                Sweepable Tokens
              </summary>
              <Table>
                <Table.Header>
                  <Table.HeaderRow>
                    <Table.HeaderCell></Table.HeaderCell>
                    <Table.HeaderCell>Token</Table.HeaderCell>
                    <Table.HeaderCell>Action</Table.HeaderCell>
                  </Table.HeaderRow>
                </Table.Header>
                <Table.Body>
                  {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
                  {toSwap.map(([mint, _info]) => ( // _info for unused info
                    <Table.Row key={mint}>
                      <Table.Cell>
                        <input
                          type="checkbox"
                          className="h-5 w-5 text-nebula-blue focus:ring-2 focus:ring-nebula-blue"
                          checked={keepMints.has(mint)}
                          onChange={() => toggleKeep(mint)}
                          aria-label={`Toggle keep ${nameOf(mint)}`}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          {tokens[mint]?.logoURI ? (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Image
                                src={tokens[mint]?.logoURI as string}
                                alt={nameOf(mint)}
                                width={24}
                                height={24}
                                objectFit="contain"
                              />
                            </div>
                          ) : (
                            <IconWithBackground size="small" icon={<FeatherCodesandbox />} />
                          )}
                          <span className="text-body-bold font-body-bold text-white">{nameOf(mint)}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="brand-tertiary"
                          size="small"
                          onClick={async () => {
                            setLoading(true);
                            await sweepSingle(mint);
                            await fetchBalances();
                            setLoading(false);
                          }}
                          disabled={!publicKey || loading}
                        >
                          Sweep
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}

                  {toSwap.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={3} className="text-center text-neutral-400">
                        No sweepable tokens found
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
            </details>
          </div>

          {/* ── Rent & Redeem Card ── */}
          <div
            className="
              h-full
              w-full
              bg-white/10
              rounded-md
              bg-clip-padding
              backdrop-filter
              backdrop-blur-sm
              border
              border-gray-200/20
              p-6
              hover:scale-105
              transition-transform
              duration-300
            "
          >
            <div className="flex w-full items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <IconWithBackground icon={<FeatherDollarSign />} />
                <div className="flex flex-col">
                  <span className="text-heading-3 font-heading-3 text-white">
                    Rent &amp; Redeem
                  </span>
                  <span className="text-caption font-caption text-neutral-400">
                    Close accounts to reclaim rent
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="brand-tertiary"
                  size="small"
                  onClick={fetchBalances}
                  disabled={!publicKey || loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="brand-tertiary"
                  size="small"
                  onClick={async () => {
                    if (!publicKey) return;
                    setLoading(true);
                    setCloseError(undefined);
                    setTransactionSignatures([]);

                    try {
                      if (rentRedeemAccounts.length === 0) {
                        throw new Error("No closeable accounts.");
                      }

                      // 1) Fetch all closeAccount transactions concurrently
                      const closeAccountRequests = await Promise.all(
                        rentRedeemAccounts.map(async ({ ata }) => {
                          const res = await fetch("/api/closeAccount", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              user: publicKey.toBase58(),
                              tokenAccount: ata,
                            }),
                          });
                          if (!res.ok) throw new Error(await res.text());
                          return res.json() as Promise<{ transaction: string }>;
                        })
                      );

                      // 2) Deserialize all transactions
                      const txs = closeAccountRequests.map(o => VersionedTransaction.deserialize(Buffer.from(o.transaction, "base64")));
                      if (!signAllTransactions) throw new Error("Wallet cannot batch-sign");

                      // 3) Sign all transactions at once
                      const signedTxs = await signAllTransactions(txs);

                      // 4) Broadcast all signed transactions concurrently
                      
                      const broadcastResults = await Promise.allSettled(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        signedTxs.map((tx, _i) => // _i for unused index
                          fetch("/api/broadcast", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              signedTransaction: Buffer.from(tx.serialize()).toString("base64"),
                            }),
                          }).then(r => r.json())
                        )
                      );

                      const newTransactionEntries: Array<{ signature: string; tokens: string[] }> = [];
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const successfullyClosedATAs: string[] = []; // Explicitly ignore for now if not directly used in the main render logic

                      broadcastResults.forEach((result, _index) => {
                        if (result.status === "fulfilled" && result.value?.signature) {
                          const signature = result.value.signature;
                          const ata = rentRedeemAccounts[_index].ata; // Get the ATA from the original list
                          if (ata) {
                            // We don't need to push to successfullyClosedATAs if it's unused
                            // successfullyClosedATAs.push(ata);
                            // Find the mint associated with this ATA in your balances
                            const tokenMint = Object.entries(balances).find(([, _info]) => _info.tokenAccount === ata)?.[0]; // _info for unused info
                            if (tokenMint) {
                              newTransactionEntries.push({ signature, tokens: [nameOf(tokenMint)] });
                            } else {
                              newTransactionEntries.push({ signature, tokens: ['Unknown Token'] }); // Fallback if mint not found
                            }
                          }
                        } else if (result.status === "rejected") {
                          console.error("Close account transaction failed:", result.reason);
                        } else {
                          console.error("Close account transaction failed with no signature:", result.value);
                        }
                      });

                      setTransactionSignatures(prev => [...prev, ...newTransactionEntries]);
                      // Remove successfully closed ATAs from sweptATAs
                      // This line is now effectively unused if successfullyClosedATAs is not populated above
                      // setSweptATAs(prev => prev.filter(a => !successfullyClosedATAs.includes(a))); // Removed

                    } catch (e) {
                      if (e instanceof Error && e.name === 'WalletSignTransactionError') {
                        console.warn("Transaction rejected by wallet.", e);
                        setCloseError("Transaction rejected.");
                      } else {
                        console.error("Error during batch close:", e);
                        setCloseError(e instanceof Error ? e.message : String(e));
                      }
                    } finally {
                      await fetchBalances();
                      setLoading(false);
                    }
                  }}
                  disabled={!publicKey || loading || rentRedeemAccounts.length === 0}
                >
                  Close All
                </Button>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 overflow-auto max-h-96 overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.HeaderRow>
                    <Table.HeaderCell>Token</Table.HeaderCell>
                    <Table.HeaderCell>Action</Table.HeaderCell>
                  </Table.HeaderRow>
                </Table.Header>
                <Table.Body>
                  {rentRedeemAccounts.map(({ ata, mint }) => (
                    <Table.Row key={ata}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          {tokens[mint]?.logoURI ? (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              overflow: 'hidden', background: 'rgba(255,255,255,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Image
                                src={tokens[mint]?.logoURI as string}
                                alt={nameOf(mint)}
                                width={24}
                                height={24}
                                objectFit="contain"
                              />
                            </div>
                          ) : (
                            <IconWithBackground size="small" icon={<FeatherCodesandbox />} />
                          )}
                          <span className="text-body-bold font-body-bold text-white">{nameOf(mint)}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="brand-tertiary"
                          size="small"
                          onClick={async () => {
                            setLoading(true);
                            await handleCloseAccount(ata);
                            setLoading(false);
                          }}
                          disabled={closingMints.has(ata)}
                        >
                          Close Account
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}

                  {rentRedeemAccounts.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={2} className="text-center text-neutral-400">
                        No closeable accounts
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>

              {closeError && (
                <div className="text-red-400 text-sm mt-2">{closeError}</div>
              )}
            </div>
          </div>
        </div>
      </main>

       {/* Built-By badge */}
    {/* pinned badge */}
  <div className="built-by-badge flex items-center gap-2 px-3 py-1
                  bg-black/60 backdrop-blur-sm rounded-lg
                  text-cyan-300 text-sm font-semibold
                  filter drop-shadow-[0_0_6px_rgba(6,230,230,0.9)]">
    <span>Built&nbsp;By</span>
    <Image src="/dev_rel_SVG.svg" alt="DevRel logo" className="h-5 w-5 rounded-full" width={40} height={40} />
  </div>

  {/* GitHub Repo Link */}
  <div className="fixed bottom-4 right-4 z-50 group flex items-center">
    <a href="https://github.com/Jupiter-DevRel/sweeper-ui" target="_blank" rel="noopener noreferrer" className="flex items-center">
      {/* Replace 'github-logo.svg' with your actual GitHub logo image path in the public directory */}
      <Image src="/github-logo.svg" alt="GitHub Repository" className="w-10 h-10 filter drop-shadow-[0_0_6px_rgba(6,230,230,0.9)]" width={40} height={40} />
      <span className="ml-2 text-sm text-cyan-300 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-full whitespace-nowrap">
        Jupiter-DevRel/sweeper-ui
      </span>
    </a>
  </div>
</>
  );
}
