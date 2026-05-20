// src/walletConnect.ts
import SignClient from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import { WALLETCONNECT_PROJECT_ID } from './constants';

let signClient: SignClient | null = null;
let initPromise: Promise<SignClient> | null = null;
let walletRequestQueue: Promise<any> = Promise.resolve();
let globalErrorPatchInstalled = false;

export type WCSessionInfo = {
  topic: string;
  address: string;
  chainId: number;
};

const WC_INDEXED_DB = 'WALLET_CONNECT_V2_INDEXED_DB';
const WC_LOCAL_KEYS = ['wc@', 'walletconnect', 'wallet_connect', 'wc_'];

function isWalletConnectKey(key: string) {
  const k = key.toLowerCase();
  return WC_LOCAL_KEYS.some((part) => k.includes(part));
}

function isWalletConnectStaleKeyError(error: any) {
  const msg = String(error?.message || error?.reason || error || '').toLowerCase();

  return (
    msg.includes('no matching key') ||
    msg.includes('session topic doesn') ||
    msg.includes('session topic does not exist') ||
    msg.includes('pending session not found') ||
    msg.includes('proposal')
  );
}

function installWalletConnectGlobalErrorPatch() {
  if (globalErrorPatchInstalled) return;
  globalErrorPatchInstalled = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (isWalletConnectStaleKeyError(event.reason)) {
      console.warn('Suppressed stale WalletConnect relay message:', event.reason);
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWalletConnectStaleKeyError(event.error || event.message)) {
      console.warn('Suppressed stale WalletConnect error:', event.error || event.message);
      event.preventDefault();
    }
  });
}

async function deleteDatabase(name: string) {
  if (!('indexedDB' in window)) return;

  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

export async function resetWalletConnectStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (isWalletConnectKey(key)) localStorage.removeItem(key);
    });
  } catch {}

  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (isWalletConnectKey(key)) sessionStorage.removeItem(key);
    });
  } catch {}

  await deleteDatabase(WC_INDEXED_DB);

  signClient = null;
  initPromise = null;
  walletRequestQueue = Promise.resolve();
}

export async function getSignClient() {
  installWalletConnectGlobalErrorPatch();

  if (signClient) return signClient;
  if (initPromise) return initPromise;

  initPromise = SignClient.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'Sayari Document Ledger',
      description: 'Blockchain document certification',
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
  })
    .then((client) => {
      signClient = client;
      return client;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export async function createWalletConnectSession(chainId = 1) {
  const client = await getSignClient();

  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      eip155: {
        methods: ['eth_sendTransaction', 'personal_sign'],
        chains: [`eip155:${chainId}`],
        events: ['accountsChanged', 'chainChanged'],
      },
    },
  });

  return { uri, approval };
}

export async function createFreshWalletConnectSession(chainId = 1) {
  await resetWalletConnectStorage();
  return createWalletConnectSession(chainId);
}

export async function approveSession(
  approval: () => Promise<any>
): Promise<WCSessionInfo> {
  const session = await approval();
  const account = session?.namespaces?.eip155?.accounts?.[0];

  if (!account) {
    throw new Error(
      'Wallet approval succeeded, but no account was returned. Please try again.'
    );
  }

  const [, chain, address] = account.split(':');

  return {
    topic: session.topic,
    chainId: Number(chain),
    address,
  };
}

export async function isWalletConnectSessionActive(topic?: string | null) {
  if (!topic) return false;

  try {
    const client = await getSignClient();
    return client.session.getAll().some((s: any) => s.topic === topic);
  } catch {
    return false;
  }
}

export async function disconnectWallet(topic?: string | null) {
  try {
    const client = await getSignClient();
    const sessions = client.session.getAll();

    const sessionsToDisconnect = topic
      ? sessions.filter((s: any) => s.topic === topic)
      : sessions;

    for (const session of sessionsToDisconnect) {
      try {
        await client.disconnect({
          topic: session.topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
      } catch (e) {
        console.warn('WalletConnect disconnect failed:', session.topic, e);
      }
    }
  } catch (e) {
    console.warn('WalletConnect disconnect skipped:', e);
  }

  await resetWalletConnectStorage();
}

async function executeWalletRequest(args: {
  topic: string;
  chainId: number;
  method: string;
  params: any[];
}) {
  const client = await getSignClient();

  const activeSession = client.session
    .getAll()
    .find((s: any) => s.topic === args.topic);

  if (!activeSession) {
    throw new Error(
      'WalletConnect session expired. Please disconnect and reconnect your wallet.'
    );
  }

  try {
    return await client.request({
      topic: activeSession.topic,
      chainId: `eip155:${args.chainId}`,
      request: {
        method: args.method,
        params: args.params,
      },
    });
  } catch (e: any) {
    if (isWalletConnectStaleKeyError(e)) {
      throw new Error(
        'WalletConnect lost the active session. Please disconnect, reconnect your wallet, and try again.'
      );
    }

    throw e;
  }
}

export async function requestWallet(args: {
  topic: string;
  chainId: number;
  method: string;
  params: any[];
}) {
  walletRequestQueue = walletRequestQueue
    .catch(() => {})
    .then(() => executeWalletRequest(args));

  return walletRequestQueue;
}