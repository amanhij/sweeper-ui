# Jupiter Sweeper UI

A simple app that lets you sweep all your meme tokens into JUP with one click, using the Jupiter Ultra API.

## Features

- Connect your Solana wallet
- View all SPL token balances
- Sweep all tokens into JUP in one click
- Error/status notifications with Solscan links

## Installation

Clone the repo:

git clone https://github.com/Jupiter-DevRel/sweeper-ui.git

cd sweeper-ui

Install dependencies:

npm install

npm run dev

## How It Works

Connect Wallet: Click the "Connect Wallet" button to connect your Solana wallet.

View Balances: The app fetches your token balances and displays them.

Sweep Tokens: Click "Sweep" to convert all non-excluded tokens into JUP in a single batch transaction.

Errors & Status: Any errors show as a notification; successful swaps list transaction signatures with Solscan links.

That's it—simple, quick, and powered by Jupiter Ultra!