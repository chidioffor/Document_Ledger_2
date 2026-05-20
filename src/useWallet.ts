// useWallet.ts
import { useCallback, useEffect, useState } from 'react';
import { initProvider, setSigner, clearSigner, getProvider } from './ethereum';
import { WalletConnectEthersSigner } from './walletConnectSigner';
import { DEFAULT_NETWORK } from './constants';
import { disconnectWallet, isWalletConnectSessionActive } from './walletConnect';
import type { WCSessionInfo } from './walletConnect';

const STORAGE_KEY = 'sdl_wallet_session';

const emptyState = {
  address: null as string | null,
  chainId: null as number | null,
  topic: null as string | null,
  isConnected: false,
  isConnecting: false,
  error: null as string | null,
};

export function useWallet() {
  const [state, setState] = useState(emptyState);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      initProvider(DEFAULT_NETWORK);
      clearSigner();

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      try {
        const session = JSON.parse(raw) as WCSessionInfo;
        const active = await isWalletConnectSessionActive(session.topic);

        if (!active) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        initProvider(String(session.chainId || DEFAULT_NETWORK));
        setSigner(new WalletConnectEthersSigner(session, getProvider()));
        if (mounted) {
          setState({
            address: session.address,
            chainId: session.chainId,
            topic: session.topic,
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    restore();
    return () => {
      mounted = false;
    };
  }, []);

  const connectWithWalletConnect = useCallback(async (session: WCSessionInfo) => {
    setState(s => ({ ...s, isConnecting: true, error: null }));
    try {
      const active = await isWalletConnectSessionActive(session.topic);
      if (!active) throw new Error('Wallet approval completed but no active WalletConnect session was created. Please try again.');

      initProvider(String(session.chainId));
      setSigner(new WalletConnectEthersSigner(session, getProvider()));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setState({
        address: session.address,
        chainId: session.chainId,
        topic: session.topic,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (e: any) {
      localStorage.removeItem(STORAGE_KEY);
      clearSigner();
      setState(s => ({ ...s, isConnecting: false, error: e?.message || 'Wallet connection failed' }));
      throw e;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet(state.topic);
    } catch (e) {
      console.warn('Wallet disconnect failed:', e);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      clearSigner();
      setState(emptyState);
    }
  }, [state.topic]);

  return { ...state, connectWithWalletConnect, disconnect };
}
