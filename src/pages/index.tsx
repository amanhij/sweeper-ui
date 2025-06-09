// src/pages/index.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet, UnifiedWalletButton } from "@jup-ag/wallet-adapter";
import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { Button } from "@/ui/components/Button";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { FeatherDroplet, FeatherDollarSign, FeatherCodesandbox } from "@subframe/core";
import { Tooltip } from "@/ui/components/Tooltip";
import { ConfirmationDialog } from "@/ui/components/ConfirmationDialog";
import ThemeToggle from "../ui/components/ThemeToggle";
import SearchInput from "../ui/components/SearchInput";
import LoadingOverlay from "@/ui/components/LoadingOverlay";
import Checkbox from "@/ui/components/Checkbox";
import Badge from "@/ui/components/Badge";

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
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [closeError, setCloseError] = useState<string>();
  const [transactionSignatures, setTransactionSignatures] = useState<Array<{ signature: string; tokens: string[] }>>([]);
  const [isSweepTableOpen, setIsSweepTableOpen] = useState(false);
  const [isRentTableOpen, setIsRentTableOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>();
  const [searchQuery, setSearchQuery] = useState('');
  // Removed unused isSearchFocused state

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
    () => {
      const filtered = displayBalances.filter(
        ([mint, info]) =>
          info.amount > 0 && !EXCLUDE_ALWAYS.has(mint)
      );
      
      // Apply search filter if there's a search query
      if (searchQuery.trim()) {
        return filtered.filter(([mint]) => {
          const tokenName = nameOf(mint).toLowerCase();
          return tokenName.includes(searchQuery.toLowerCase());
        });
      }
      
      return filtered;
    },
    [displayBalances, searchQuery, nameOf]
  );
  
  // Toggle all tokens (keep or sweep)
  const toggleAllTokens = useCallback((keepAll: boolean) => {
    setKeepMints(prev => {
      const next = new Set(prev);
      
      // First, remove all non-excluded tokens from the set
      toSwap.forEach(([mint]) => {
        if (!EXCLUDE_ALWAYS.has(mint)) {
          next.delete(mint);
        }
      });
      
      // If keepAll is true, add all tokens back to the set
      if (keepAll) {
        toSwap.forEach(([mint]) => {
          if (!EXCLUDE_ALWAYS.has(mint)) {
            next.add(mint);
          }
        });
      }
      
      return next;
    });
  }, [toSwap]);

  // ─────────── Which token accounts can be "closed" (amount===0 and not excluded) ──
  const closableAccounts = useMemo(
    () => {
      const result = displayBalances.filter(
        ([mint, info]) => info.amount === 0 && !EXCLUDE_ALWAYS.has(mint)
      );
      
      // Apply search filter if there's a search query
      if (searchQuery.trim()) {
        return result.filter(([mint]) => {
          const tokenName = nameOf(mint).toLowerCase();
          return tokenName.includes(searchQuery.toLowerCase());
        });
      }
      
      return result;
    },
    [displayBalances, searchQuery, nameOf]
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
      <LoadingOverlay isLoading={loading} message={loadingMessage} />
      
      {showConfirmDialog && (
        <ConfirmationDialog
          title="Confirm Action"
          message="Are you sure you want to proceed with this action?"
          onConfirm={async () => {
            setShowConfirmDialog(false);
            if (pendingAction) await pendingAction();
          }}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}
      <main className="relative min-h-screen w-screen bg-[url('/jupiter-bg.png')] bg-cover bg-center text-white overflow-hidden flex items-start justify-center p-4 sm:p-8">
        {/* ── Left Panel: Connect / Sweep All Buttons ── */}
        <aside className="relative max-w-sm w-full mx-auto sm:w-80 sm:fixed sm:top-4 sm:left-4 bg-black/50 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-cyan-400 mb-6 sm:mb-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-cyan-400">
              Sweeper
            </h1>
            <ThemeToggle />
          </div>

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

          {publicKey && (
            <div className="mt-4 p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-cyan-400/20">
              <h3 className="text-cyan-300 font-semibold mb-3">Wallet Summary</h3>
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center p-2 rounded hover:bg-cyan-400/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-sm font-medium text-neutral-300">Sweepable Tokens:</span>
                  </div>
                  <span className="text-lg font-bold text-white">{toSwap.length}</span>
                </div>
                
                <div className="flex justify-between items-center p-2 rounded hover:bg-cyan-400/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm font-medium text-neutral-300">Closeable Accounts:</span>
                  </div>
                  <span className="text-lg font-bold text-white">{rentRedeemAccounts.length}</span>
                </div>
                
                <div className="flex justify-between items-center p-2 rounded hover:bg-cyan-400/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-neutral-300">Rent to Reclaim:</span>
                  </div>
                  <span className="text-lg font-bold text-white">{(rentRedeemAccounts.length * 0.00204).toFixed(4)} SOL</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-black/30 rounded-lg max-h-48 overflow-y-auto font-mono text-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-cyan-300 font-semibold">Recent Transactions</p>
              {transactionSignatures.length > 0 && (
                <button 
                  onClick={() => setTransactionSignatures([])}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Clear
                </button>
              )}
            </div>
            
            {transactionSignatures.length > 0 ? (
              <div className="space-y-2">
                {transactionSignatures.map(({ signature, tokens }) => (
                  <div key={signature} className="p-2 bg-black/20 rounded hover:bg-black/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <a
                        href={`https://solscan.io/tx/${signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <span className="truncate max-w-[150px]">{signature}</span>
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <span className="text-xs px-2 py-1 bg-cyan-400/10 rounded-full text-cyan-300">
                        {tokens.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No recent transactions</p>
            )}
          </div>
        </aside>

        {/* ── Main Content Area (Right) ── */}
        <div className="flex flex-col w-full max-w-3xl mx-auto sm:ml-80 px-4 sm:px-0">
          
          {/* ── Sweep Tokens Card ── */}
          <div
            className="
              h-full
              w-full
              max-w-xl
              mx-auto
              bg-gradient-to-br from-white/15 to-white/5
              rounded-xl
              bg-clip-padding
              backdrop-filter
              backdrop-blur-md
              border
              border-cyan-400/20
              p-6
              hover:scale-102
              transition-all
              duration-300
              shadow-[0_8px_32px_rgba(0,0,0,0.2)]
              hover:shadow-[0_8px_32px_rgba(6,230,230,0.15)]
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
              <Tooltip text="Sweep all eligible tokens into JUP">
                <Button
                  variant="brand-tertiary"
                  size="small"
                  onClick={() => {
                    if (!publicKey) return;
                    
                    // Define the action to perform when confirmed
                    setPendingAction(() => async () => {
                      setLoadingMessage("Sweeping all tokens...");
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
                    });
                    
                    // Show confirmation dialog
                    setShowConfirmDialog(true);
                  }}
                  disabled={!publicKey || loading}
                >
                  Sweep All
                </Button>
              </Tooltip>
            </div>

            <details open={isSweepTableOpen} onToggle={(e) => setIsSweepTableOpen(e.currentTarget.open)} className="flex w-full max-w-xl mx-auto flex-col gap-4 overflow-y-auto overflow-x-hidden max-h-96">
              <summary className="cursor-pointer py-2 px-4 font-semibold select-none text-cyan-300 hover:text-white transition-colors">
                Sweepable Tokens
              </summary>
              <div className="px-4 mb-4">
                <div className="flex flex-col space-y-3">
                  <SearchInput 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    // Removed unused onFocus and onBlur handlers
                    placeholder="Search tokens..."
                    className="w-full"
                  />
                  <div className="flex justify-end">
                    <Button 
                      variant="default" 
                      size="small" 
                      onClick={() => toggleAllTokens(true)}
                      className="text-xs"
                    >
                      Keep All
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pb-2 flex justify-center">
                <Table className="w-full">
                  <Table.Header>
                    <Table.HeaderRow>
                      <Table.HeaderCell>
                        <Tooltip position="bottom" text="Check to keep tokens (prevent them from being swept)">
                          <span>Keep</span>
                        </Tooltip>
                      </Table.HeaderCell>
                      <Table.HeaderCell>Token</Table.HeaderCell>
                      <Table.HeaderCell>Action</Table.HeaderCell>
                    </Table.HeaderRow>
                  </Table.Header>
                  <Table.Body>
                    {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
                    {toSwap.map(([mint, _info]) => ( // _info for unused info
                      <Table.Row key={mint}>
                        <Table.Cell>
                          <Tooltip position="right" text={keepMints.has(mint) ? "Keep this token (won't be swept)" : "Token will be swept"}>
                            <Checkbox
                              checked={keepMints.has(mint)}
                              onChange={() => toggleKeep(mint)}
                              aria-label={`Toggle keep ${nameOf(mint)}`}
                            />
                          </Tooltip>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {tokens[mint]?.logoURI ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-glow-sm">
                                  <Image
                                    src={tokens[mint]?.logoURI as string}
                                    alt={nameOf(mint)}
                                    width={32}
                                    height={32}
                                    objectFit="contain"
                                  />
                                </div>
                              ) : (
                                <IconWithBackground size="small" icon={<FeatherCodesandbox />} />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-body-bold font-body-bold text-white">{nameOf(mint)}</span>
                                  <Badge variant="info">
                                    {balances[mint].amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                  </Badge>
                                </div>
                                {tokens[mint]?.price && (
                                  <div className="text-xs text-cyan-300">
                                    ~${(tokens[mint].price * balances[mint].amount).toFixed(2)} USD
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Tooltip position="left" text={`Sweep ${nameOf(mint)} into JUP`}>
                            <Button
                              variant="brand-tertiary"
                              size="small"
                              onClick={async () => {
                                setLoadingMessage(`Sweeping ${nameOf(mint)}...`);
                                setLoading(true);
                                await sweepSingle(mint);
                                await fetchBalances();
                                setLoading(false);
                              }}
                              disabled={!publicKey || loading}
                              loading={loading}
                            >
                              Sweep
                            </Button>
                          </Tooltip>
                        </Table.Cell>
                      </Table.Row>
                    ))}

                  {toSwap.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={3}>
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-16 h-16 mb-4 text-cyan-400 opacity-50">
                            {searchQuery ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            )}
                          </div>
                          <p className="text-neutral-400 mb-2">
                            {searchQuery ? `No results for "${searchQuery}"` : "No sweepable tokens found"}
                          </p>
                          <p className="text-xs text-neutral-500 max-w-xs">
                            {searchQuery ? 
                              "Try a different search term or clear the search" : 
                              "Connect your wallet or add tokens to your account to see them here."}
                          </p>
                          {searchQuery && (
                            <Button 
                              variant="default" 
                              size="small" 
                              className="mt-4"
                              onClick={() => setSearchQuery('')}
                            >
                              Clear Search
                            </Button>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
              </div>
            </details>
          </div>

          {/* ── Rent & Redeem Card ── */}
          <div
            className="
              h-full
              w-full
              max-w-xl
              mx-auto
              bg-gradient-to-br from-white/15 to-white/5
              rounded-xl
              bg-clip-padding
              backdrop-filter
              backdrop-blur-md
              border
              border-cyan-400/20
              p-6
              hover:scale-102
              transition-all
              duration-300
              shadow-[0_8px_32px_rgba(0,0,0,0.2)]
              hover:shadow-[0_8px_32px_rgba(6,230,230,0.15)]
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
                <Tooltip text="Close all empty token accounts to reclaim rent">
                  <Button
                    variant="brand-tertiary"
                    size="small"
                    onClick={() => {
                      if (!publicKey) return;
                      
                      // Define the action to perform when confirmed
                      setPendingAction(() => async () => {
                        setLoadingMessage("Closing all empty accounts...");
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
                  });
                      
                  // Show confirmation dialog
                  setShowConfirmDialog(true);
                }}
                disabled={!publicKey || loading || rentRedeemAccounts.length === 0}
              >
                Close All
              </Button>
            </Tooltip>
              </div>
            </div>

            <details open={isRentTableOpen} onToggle={(e) => setIsRentTableOpen(e.currentTarget.open)} className="flex w-full max-w-xl mx-auto flex-col gap-4 overflow-y-auto overflow-x-hidden max-h-96">
              <summary className="cursor-pointer py-2 px-4 font-semibold select-none text-cyan-300 hover:text-white transition-colors">
                Closeable Accounts
              </summary>
              <div className="px-4 mb-4">
                <SearchInput 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search accounts..."
                  className="w-full"
                />
              </div>
              <div className="pb-2 flex justify-center">
                <Table className="w-full">
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
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {tokens[mint]?.logoURI ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-glow-sm">
                                  <Image
                                    src={tokens[mint]?.logoURI as string}
                                    alt={nameOf(mint)}
                                    width={32}
                                    height={32}
                                    objectFit="contain"
                                  />
                                </div>
                              ) : (
                                <IconWithBackground size="small" icon={<FeatherCodesandbox />} />
                              )}
                              <div>
                                <span className="text-body-bold font-body-bold text-white">{nameOf(mint)}</span>
                                <div className="text-xs text-cyan-300">
                                  Reclaim ~0.00204 SOL
                                </div>
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Tooltip position="left" text={`Close ${nameOf(mint)} account and reclaim rent`}>
                            <Button
                              variant="brand-tertiary"
                              size="small"
                              onClick={async () => {
                                setLoadingMessage(`Closing ${nameOf(mint)} account...`);
                                setLoading(true);
                                await handleCloseAccount(ata);
                                setLoading(false);
                              }}
                              disabled={closingMints.has(ata)}
                              loading={closingMints.has(ata)}
                            >
                              Close Account
                            </Button>
                          </Tooltip>
                        </Table.Cell>
                      </Table.Row>
                    ))}

                    {rentRedeemAccounts.length === 0 && (
                      <Table.Row>
                        <Table.Cell colSpan={2}>
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 mb-4 text-cyan-400 opacity-50">
                              {searchQuery ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              )}
                            </div>
                            <p className="text-neutral-400 mb-2">
                              {searchQuery ? `No results for "${searchQuery}"` : "No closeable accounts"}
                            </p>
                            <p className="text-xs text-neutral-500 max-w-xs">
                              {searchQuery ? 
                                "Try a different search term or clear the search" : 
                                "Empty token accounts will appear here for you to close and reclaim rent."}
                            </p>
                            {searchQuery && (
                              <Button 
                                variant="default" 
                                size="small" 
                                className="mt-4"
                                onClick={() => setSearchQuery('')}
                              >
                                Clear Search
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                </Table.Body>
              </Table>
              </div>
              
              {closeError && (
                <div className="text-red-400 text-sm mt-2">{closeError}</div>
              )}
            </details>
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
