import { Connection } from "@solana/web3.js";

const urls = process.env.SOLANA_RPC_URLS?.split(",").map(u => u.trim()).filter(Boolean) || [];
let rpcIndex = 0;

// Helper to pause execution for a given number of milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getCurrentRpcUrl() {
  return urls[rpcIndex % urls.length];
}

export function getNextRpcUrl() {
  rpcIndex = (rpcIndex + 1) % urls.length;
  return urls[rpcIndex];
}

export async function withRpcRotation<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
  let lastError: unknown;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initialRpcIndex = rpcIndex; // Store initial index to detect full cycle
  for (let i = 0; i < urls.length; i++) {
    const url = getCurrentRpcUrl();
    const conn = new Connection(url);
    try {
      const result = await fn(conn);
      // If successful, we can potentially reset the rpcIndex here to prefer the current working RPC
      // you can add: rpcIndex = initialRpcIndex; if you want to prefer the first RPC.
      return result;
    } catch (err: unknown) {
      lastError = err;
      if (err instanceof Error) {
        console.warn(`RPC call failed on ${url}. Switching to next RPC. Error:`, err.message, `(RPC ${i + 1}/${urls.length})`);
      } else {
        console.warn(`RPC call failed on ${url}. Switching to next RPC. Error:`, String(err), `(RPC ${i + 1}/${urls.length})`);
      }
      getNextRpcUrl(); // Always rotate on error
      
      // Add a fixed delay before trying the next RPC URL
      if (i < urls.length - 1) { // Don't delay after the last attempt
        await sleep(500); // 500ms delay before trying the next RPC
      }

      // If we've cycled through all RPCs and haven't succeeded, re-throw
      if (i === urls.length - 1) {
        throw lastError;
      }
      // Otherwise, continue to the next RPC URL
    }
  }
  // Fallback if loop finishes without explicitly throwing (shouldn't happen with the check above)
  throw lastError || new Error("All RPC endpoints failed after multiple retries.");
}
