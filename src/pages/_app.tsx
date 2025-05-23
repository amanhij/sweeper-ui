
import '@/styles/globals.css'
import type { AppProps } from 'next/app'

import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UnifiedWalletProvider
      wallets={[
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({
          network: WalletAdapterNetwork.Mainnet,
        }),
      ]}
      config={{
        env:         WalletAdapterNetwork.Mainnet,
        autoConnect: true,
        metadata: {
          name:        'Swap UI',
          description: 'Sell all tokens → JUP',
          url:         typeof window !== 'undefined' ? window.location.origin : '',
          iconUrls:    ['https://jup.ag/favicon.ico'],
        },
      }}
    >
      <Component {...pageProps} />
    </UnifiedWalletProvider>
  )
}
