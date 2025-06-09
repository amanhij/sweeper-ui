# Jupiter Sweeper UI

A simple dApp that let's you sweep all your meme tokens into JUP with one click, using the Jupiter Ultra API.

## Features

- Connect your Solana wallet
- View all SPL token balances
- Sweep all tokens into JUP in one click
- Error/status notifications with Solscan links
- RPC rotation logic for enhanced transaction reliability and throughput

## Installation

Clone the repo:

```bash
git clone https://github.com/Jupiter-DevRel/sweeper-ui.git
```

```bash
cd sweeper-ui
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

## Environment Variables

To run this project, you will need to set the following environment variables. You can create a `.env.local` file in the root directory of the project and add them there:

`SOLANA_RPC_URLS`: A comma-separated list of Solana RPC URLs to be used for RPC rotation.

For Vercel deployments, you can set these variables in the Vercel project settings under "Settings" > "Environment Variables".

## How It Works

**Connect Wallet:** Click the "Connect Wallet" button to connect your Solana wallet.

**View Balances:** The app fetches your token balances and displays them.

**Sweep Tokens:** Click "Sweep" to convert all non-excluded tokens into JUP in a single batch transaction.

**Close Accounts:** Close empty token accounts to reclaim rent.

**Errors & Status:** Any errors show as a notification; successful swaps list transaction signatures with Solscan links.

That's it—simple, quick, and powered by Jupiter Ultra!