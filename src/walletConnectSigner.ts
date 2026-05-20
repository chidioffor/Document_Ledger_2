// src/services/walletConnectSigner.ts

import { ethers } from 'ethers';
import { requestWallet } from './walletConnect';
import type { WCSessionInfo } from './walletConnect';

export class WalletConnectEthersSigner extends ethers.Signer {
  readonly session: WCSessionInfo;
  declare readonly provider: ethers.providers.Provider;

  constructor(session: WCSessionInfo, provider: ethers.providers.Provider) {
    super();
    this.session = session;
    this.provider = provider;
  }

  connect(provider: ethers.providers.Provider): WalletConnectEthersSigner {
    return new WalletConnectEthersSigner(this.session, provider);
  }

  async getAddress(): Promise<string> {
    return this.session.address;
  }

  async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
    const address = await this.getAddress();

    const hexMessage =
      typeof message === 'string'
        ? ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
        : ethers.utils.hexlify(message);

    return await requestWallet({
      topic: this.session.topic,
      chainId: this.session.chainId,
      method: 'personal_sign',
      params: [hexMessage, address],
    }) as string;
  }

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    const from = await this.getAddress();
    const tx = await ethers.utils.resolveProperties(transaction);

    return await requestWallet({
      topic: this.session.topic,
      chainId: this.session.chainId,
      method: 'eth_signTransaction',
      params: [{ ...tx, from }],
    }) as string;
  }

  async sendTransaction(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const from = await this.getAddress();
    const tx = await this.populateTransaction(transaction);

    const wcTx: any = {
      from,
      to: tx.to,
      data: tx.data || '0x',
      value: tx.value ? ethers.BigNumber.from(tx.value).toHexString() : '0x0',
    };

    if (tx.gasLimit) wcTx.gas = ethers.BigNumber.from(tx.gasLimit).toHexString();
    if (tx.gasPrice) wcTx.gasPrice = ethers.BigNumber.from(tx.gasPrice).toHexString();
    if (tx.nonce !== undefined) wcTx.nonce = ethers.utils.hexValue(tx.nonce);

    const hash = await requestWallet({
      topic: this.session.topic,
      chainId: this.session.chainId,
      method: 'eth_sendTransaction',
      params: [wcTx],
    }) as string;

    const provider = this.provider;
    const response = await provider.getTransaction(hash);

    if (response) return response;

    return {
      hash,
      confirmations: 0,
      from,
      wait: (confirmations?: number) => provider.waitForTransaction(hash, confirmations),
    } as ethers.providers.TransactionResponse;
  }
}