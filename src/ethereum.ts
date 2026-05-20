// src/services/ethereum.ts
import { ethers } from 'ethers';
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  MASTER_WALLET,
  FEE_USDT,
  NETWORKS,
  DEFAULT_NETWORK,
  USDT_ADDRESS,
  USDT_DECIMALS,
} from './constants';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

let _provider: ethers.providers.StaticJsonRpcProvider | null = null;
let _signer: ethers.Signer | null = null;
let _contract: ethers.Contract | null = null;

function isTokenBlockedOrPausedError(e: any) {
  const msg = String(
    e?.reason ||
    e?.error?.message ||
    e?.data?.message ||
    e?.message ||
    ''
  ).toLowerCase();

  return (
    msg.includes('blacklist') ||
    msg.includes('blacklisted') ||
    msg.includes('paused') ||
    msg.includes('revert') ||
    msg.includes('cannot estimate gas') ||
    msg.includes('execution reverted')
  );
}

async function rawEthCall(data: string): Promise<string> {
  const net = NETWORKS[DEFAULT_NETWORK];

  const res = await fetch(net.rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_call',
      params: [
        {
          to: CONTRACT_ADDRESS,
          data,
        },
        'latest',
      ],
    }),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.message || 'eth_call failed');
  }

  return json.result;
}

// ── Provider / Signer ─────────────────────────────────────────────────────────
export function initProvider(networkId: string = DEFAULT_NETWORK) {
  const net = NETWORKS[networkId] || NETWORKS[DEFAULT_NETWORK];

  _provider = new ethers.providers.StaticJsonRpcProvider(
    net.rpc,
    {
      chainId: net.chainId,
      name: net.name,
    }
  );

  return _provider;
}

export function getProvider() {
  if (!_provider) initProvider();
  return _provider!;
}

export function setSigner(signer: ethers.Signer) {
  _signer = signer;
  _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);
}

export function getSigner() { return _signer; }
export function getContract() { return _contract; }
export function clearSigner() {
  _signer = null;
  _contract = null;
}

export function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

// ── ETH Price ─────────────────────────────────────────────────────────────────

let _cachedEthPrice: number | null = null;
let _priceFetchedAt = 0;

export async function fetchEthPrice(): Promise<number> {
  const now = Date.now();
  // Cache for 60 seconds
  if (_cachedEthPrice && now - _priceFetchedAt < 60_000) return _cachedEthPrice;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const json = await res.json();
    _cachedEthPrice = json.ethereum.usd;
    _priceFetchedAt = now;
    return _cachedEthPrice!;
  } catch {
    return _cachedEthPrice || 3000; // safe fallback
  }
}

export async function getFeeInEth(): Promise<{ eth: string; wei: ethers.BigNumber; usd: number; ethPrice: number }> {
  const ethPrice = await fetchEthPrice();
  const ethAmount = FEE_USDT / ethPrice;
  const wei = ethers.utils.parseEther(ethAmount.toFixed(8));
  return {
    eth: ethAmount.toFixed(6),
    wei,
    usd: FEE_USDT,
    ethPrice,
  };
}

// ── Service Fee Payment ────────────────────────────────────────────────────────

export async function chargeServiceFee(certifyGasCost: ethers.BigNumber): Promise<{
  txHash: string;
  feeEth: string;
  feeUsd: number;
  ethPrice: number;
  paidWith: 'USDT' | 'ETH';
}> {
  console.log('FEE DEBUG signer exists:', !!_signer);
  if (!_signer) throw new Error('Wallet connection was lost. Please reconnect your wallet and try again.');

  const signerAddress = await _signer.getAddress();
  const provider = getProvider();
  const ethBalance = await provider.getBalance(signerAddress);

  const fee = await getFeeInEth();

  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, _signer);
  const usdtAmount = ethers.utils.parseUnits(String(FEE_USDT), USDT_DECIMALS);

  let usdtFailureReason: string | null = null;

  try {
    const usdtBalance: ethers.BigNumber = await usdt.balanceOf(signerAddress);

    if (usdtBalance.gte(usdtAmount)) {
      try {
        const gasEstimate: ethers.BigNumber = await usdt.estimateGas.transfer(
          MASTER_WALLET,
          usdtAmount
        );

        const gasPrice = await provider.getGasPrice();
        const feeTransferGasLimit = gasEstimate.mul(120).div(100);
        const feeTransferGasCost = feeTransferGasLimit.mul(gasPrice);

        // USDT path needs ETH for BOTH:
        // 1. USDT transfer gas
        // 2. document certification gas
        if (ethBalance.gte(feeTransferGasCost.add(certifyGasCost))) {
          const tx = await usdt.transfer(MASTER_WALLET, usdtAmount, {
            gasLimit: feeTransferGasLimit,
          });
          const receipt = await (tx as any).wait(1);

          return {
            txHash: receipt.transactionHash,
            feeEth: '0',
            feeUsd: FEE_USDT,
            ethPrice: fee.ethPrice,
            paidWith: 'USDT',
          };
        }

        usdtFailureReason = 'USDT balance is sufficient, but ETH is insufficient for gas.';
      } catch (e: any) {
        if (isTokenBlockedOrPausedError(e)) {
          usdtFailureReason = 'USDT transfer is currently unavailable for this wallet or token contract.';
        } else {
          usdtFailureReason = 'USDT transfer could not be prepared.';
        }
      }
    }
  } catch {
    usdtFailureReason = 'USDT balance could not be checked.';
  }

  // continue with ETH fall back.
  const ethTxGasLimit = ethers.BigNumber.from(21000);
  const gasPrice = await provider.getGasPrice();
  const ethFeeTransferGasCost = ethTxGasLimit.mul(gasPrice);

  // ETH path needs ETH for:
  // 1. $5 equivalent ETH fee
  // 2. ETH transfer gas
  // 3. document certification gas
  const requiredEthTotal = fee.wei
    .add(ethFeeTransferGasCost)
    .add(certifyGasCost);

  if (ethBalance.gte(requiredEthTotal)) {
    const tx = await _signer.sendTransaction({
      to: MASTER_WALLET,
      value: fee.wei,
      gasLimit: ethTxGasLimit,
    });

    const receipt = await (tx as any).wait(1);

    return {
      txHash: receipt.transactionHash,
      feeEth: fee.eth,
      feeUsd: fee.usd,
      ethPrice: fee.ethPrice,
      paidWith: 'ETH',
    };
  }

  throw new Error(
    usdtFailureReason
      ? `${usdtFailureReason} Insufficient funds in connected wallet. Please add USDT with ETH for gas, or add ETH worth at least $5 plus gas, then try again.`
      : 'Insufficient funds in connected wallet. Please add USDT or ETH and try again.'
  );
}

// ── Document Hashing ──────────────────────────────────────────────────────────

export async function hashFileBuffer(buffer: ArrayBuffer): Promise<string> {
  // React Native crypto — use ethers keccak or SHA256 via js-sha256
  // We use ethers.utils which is available without native modules
  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  // Use SubtleCrypto if available (hermes supports it in RN 0.71+)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return '0x' + hashHex;
  }
  // Fallback: SHA256 via ethers internal utils
  return ethers.utils.sha256(ethers.utils.hexlify(bytes));
}

// ── Certify ───────────────────────────────────────────────────────────────────

export interface CertifyParams {
  docHash: string;
  title: string;
  ipfsCID: string;
  version: string;
  expiry: number; // unix timestamp, 0 = none
}

export interface CertifyResult {
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  feeTxHash: string;
  feeEth: string;
  feeUsd: number;
  paidWith: 'USDT' | 'ETH';
}

export type CertifyProgress = (message: string) => void;

// ── Certify ────────────────────────────────────────────────────────────────────
async function retryStep<T>(
  label: string,
  fn: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;

      const msg = String(e?.message || e?.reason || '').toLowerCase();

      // Do not retry if user rejected/cancelled in wallet
      if (
        msg.includes('user rejected') ||
        msg.includes('user denied') ||
        msg.includes('rejected') ||
        msg.includes('cancelled') ||
        msg.includes('canceled')
      ) {
        throw e;
      }

      if (attempt === retries) break;

      console.warn(`${label} failed. Retrying attempt ${attempt + 1}/${retries}`, e);
    }
  }

  throw lastError;
}

export async function certifyDocument(
  params: CertifyParams,
  onProgress?: CertifyProgress
): Promise<CertifyResult> {
  console.log('CERTIFY DEBUG signer exists:', !!_signer);
  console.log('CERTIFY DEBUG contract exists:', !!_contract);

  if (!_signer) {
    throw new Error('Wallet connection was lost. Please reconnect your wallet and try again.');
  }

  _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);

  const signerAddress = await _signer.getAddress();
  const provider = getProvider();
  const ethBalance = await provider.getBalance(signerAddress);

  onProgress?.('Preparing blockchain registration and estimating gas...');

  const certifyGasEstimate = await _contract.estimateGas.certify(
    params.docHash,
    params.title,
    params.ipfsCID,
    params.version,
    params.expiry
  );

  const gasPrice = await provider.getGasPrice();
  const certifyGasLimit = certifyGasEstimate.mul(120).div(100);
  const certifyGasCost = certifyGasLimit.mul(gasPrice);

  if (ethBalance.lt(certifyGasCost)) {
    throw new Error(
      'Insufficient ETH for blockchain gas. Please add ETH to cover gas, then try again.'
    );
  }

  onProgress?.(
    'Collecting and sending service fee. Keep your connected wallet open and confirm the prompt.'
  );

  // IMPORTANT:
  // Do not retry the fee payment automatically.
  // Retrying a fee payment can create duplicate service-fee transactions.
  const feeResult = await retryStep(
    'Service fee payment',
    () => chargeServiceFee(certifyGasCost),
    1
  );

  onProgress?.(
    `Service fee paid successfully with ${feeResult.paidWith}. Preparing document registration...`
  );

  // Give WalletConnect/mobile wallet a short pause after the first transaction.
  // This prevents the second transaction request from being fired while the wallet
  // is still closing the first approval flow.
  await new Promise((resolve) => setTimeout(resolve, 1800));

  if (!_signer) {
    throw new Error('Wallet connection was lost after fee payment. Please reconnect your wallet.');
  }

  _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);

  onProgress?.(
    'Now registering the document on-chain. Please confirm the second wallet prompt.'
  );

  const tx = await retryStep(
    'Document certification',
    () =>
      _contract!.certify(
        params.docHash,
        params.title,
        params.ipfsCID,
        params.version,
        params.expiry,
        {
          gasLimit: certifyGasLimit,
        }
      ),
    1
  );

  onProgress?.(
    'Document registration transaction submitted. Waiting for blockchain confirmation...'
  );

  const receipt = await (tx as any).wait(1);
  const block = await provider.getBlock(receipt.blockNumber);

  onProgress?.('Document certified successfully on-chain.');

  return {
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date(block.timestamp * 1000),
    feeTxHash: feeResult.txHash,
    feeEth: feeResult.feeEth,
    feeUsd: feeResult.feeUsd,
    paidWith: feeResult.paidWith,
  };
}

// ── Verify ────────────────────────────────────────────────────────────────────

export interface DocRecord {
  docHash: string;
  certifier: string;
  timestamp: Date;
  title: string;
  ipfsCID: string;
  version: string;
  expiry: number;
  revoked: boolean;
  txHash?: string;
}

export async function verifyDocument(docHash: string): Promise<DocRecord | null> {
  const iface = new ethers.utils.Interface(CONTRACT_ABI);

  try {
    const data = iface.encodeFunctionData('verify', [docHash]);
    const result = await rawEthCall(data);
    const decoded = iface.decodeFunctionResult('verify', result);
    const doc = decoded[0];

    return await enrichDocWithCertificationTxHash(mapDoc(doc));
  } catch (e: any) {
    if (
      e?.message?.includes('NotFound') ||
      e?.message?.includes('execution reverted') ||
      e?.message?.includes('revert')
    ) {
      return null;
    }

    throw e;
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────
export async function listDocuments(offset = 0, limit = 50): Promise<DocRecord[]> {
  const iface = new ethers.utils.Interface(CONTRACT_ABI);
  const data = iface.encodeFunctionData('listDocuments', [offset, limit]);
  const result = await rawEthCall(data);
  const decoded = iface.decodeFunctionResult('listDocuments', result);

  return decoded[0].map(mapDoc);
}

export async function listByCertifier(address: string, offset = 0, limit = 200): Promise<DocRecord[]> {
  const iface = new ethers.utils.Interface(CONTRACT_ABI);
  const data = iface.encodeFunctionData('listByCertifier', [address, offset, limit]);
  const result = await rawEthCall(data);
  const decoded = iface.decodeFunctionResult('listByCertifier', result);
  return decoded[0].map(mapDoc);
}

export async function totalDocuments(): Promise<number> {
  const iface = new ethers.utils.Interface(CONTRACT_ABI);
  const data = iface.encodeFunctionData('totalDocuments', []);
  const result = await rawEthCall(data);
  const decoded = iface.decodeFunctionResult('totalDocuments', result);
  return decoded[0].toNumber();
}

async function findCertificationTxHash(docHash: string): Promise<string | undefined> {
  try {
    const provider = getProvider();
    const hashTopic = ethers.utils.hexZeroPad(docHash, 32);

    // Most registry contracts emit docHash as an indexed event topic.
    // We try the common indexed positions so the verification certificate QR can
    // point directly to the original certification transaction on Etherscan.
    const topicShapes = [
      [null, hashTopic],
      [null, null, hashTopic],
      [null, null, null, hashTopic],
    ];

    for (const topics of topicShapes) {
      const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0,
        toBlock: 'latest',
        topics,
      });

      if (logs.length > 0) {
        logs.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
          return a.logIndex - b.logIndex;
        });

        return logs[0].transactionHash;
      }
    }
  } catch (e) {
    console.warn('Could not find certification transaction hash for document:', e);
  }

  return undefined;
}

async function enrichDocWithCertificationTxHash(doc: DocRecord): Promise<DocRecord> {
  const txHash = await findCertificationTxHash(doc.docHash);
  return txHash ? { ...doc, txHash } : doc;
}

function mapDoc(d: any): DocRecord {
  return {
    docHash: d.docHash,
    certifier: d.certifier,
    timestamp: new Date(d.timestamp.toNumber() * 1000),
    title: d.title,
    ipfsCID: d.ipfsCID,
    version: d.version,
    expiry: d.expiry.toNumber(),
    revoked: d.revoked,
  };
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeDocument(docHash: string): Promise<string> {
  if (!_signer) {
    throw new Error('Wallet connection was lost. Please reconnect your wallet and try again.');
  }

  if (!_contract) {
    _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);
  }

  const tx = await _contract.revoke(docHash);
  const receipt = await (tx as any).wait(1);

  return receipt.transactionHash;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function shortAddr(addr: string) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : '—';
}

export function shortHash(hash: string) {
  return hash ? hash.slice(0, 10) + '…' + hash.slice(-6) : '—';
}
