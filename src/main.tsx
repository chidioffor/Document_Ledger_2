// src/main.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';
import logo from './assets/sayari-logo.jpg';
import paymentProcess from './assets/payment-process.png';
import { approveSession, createFreshWalletConnectSession } from './walletConnect';
import { useWallet } from './useWallet';
import {
  certifyDocument,
  fetchEthPrice,
  getFeeInEth,
  hashFileBuffer,
  listDocuments,
  revokeDocument,
  shortAddr,
  shortHash,
  totalDocuments,
  verifyDocument,
  type DocRecord,
} from './ethereum';
import { CONTRACT_ADDRESS, DEFAULT_NETWORK, NETWORKS } from './constants';
import { createTokenizationPDF, createVerificationPDF } from './pdfCertificate';
import TermsPage from './TermsPage';

type Page =
  | 'dashboard'
  | 'wallet'
  | 'tokenize'
  | 'verify'
  | 'registry'
  | 'settings'
  | 'terms'
  | 'contact';

const pageLabels: Record<Page, string> = {
  dashboard: 'Dashboard',
  wallet: 'Wallet Manager',
  tokenize: 'Tokenize Document',
  verify: 'Verify Document',
  registry: 'Registry',
  settings: 'Configuration',
  terms: 'Terms & Conditions',
  contact: 'Contact Us',
};

function Toast({ msg, type = 'info' }: { msg: string; type?: string }) {
  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {msg}
    </div>
  );
}

function Card({ children, className = '' }: any) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Badge({ children, tone = 'gold' }: any) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Field({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="data-field">
      <small>{label}</small>
      <div className={mono ? 'mono' : ''}>{value || '—'}</div>
    </div>
  );
}

function niceError(e: any) {
  const m = String(e?.reason || e?.error?.message || e?.message || e || '');
  if (m.includes('CALL_EXCEPTION') || m.toLowerCase().includes('revert')) {
    return 'This document was not found on-chain, or the registry rejected the lookup. Please check the file/hash and selected network.';
  }
  if (m.toLowerCase().includes('user rejected')) {
    return 'The wallet request was rejected. Please approve it in your wallet to continue.';
  }
  return m || 'Something went wrong.';
}

function Dashboard({ setPage, wallet }: any) {
  const [stats, setStats] = useState({ total: '—', mine: '—' });

  useEffect(() => {
    (async () => {
      try {
        const total = await totalDocuments();
        let mine = '—';
        if (wallet.address) {
          mine = String(
            (await import('./ethereum')).listByCertifier
              ? (await (await import('./ethereum')).listByCertifier(wallet.address)).length
              : 0
          );
        }
        setStats({ total: String(total), mine });
      } catch {}
    })();
  }, [wallet.address]);

  return (
    <div className="stack">
      <div className="hero">
        <img src={logo} />
        <p className="kicker">Sayari Global Holding</p>
        <h1>
          Document <span>Ledger</span>
        </h1>
        <p>
          Institutional grade on-chain document certification Ledger. 
          Built for Institutions, Priced for everyone.
          COST: $5 USDT + gas per certification.
        </p>
      </div>

      <Card>
        <div className="wallet-row">
          <div className={`dot ${wallet.address ? 'ok' : ''}`} />
          <div>
            <b>{wallet.address ? 'Connected Wallet' : 'No Wallet Connected'}</b>
            <p>{wallet.address || 'Connect via WalletConnect to certify documents.'}</p>
          </div>
          {wallet.chainId && (
            <Badge>{NETWORKS[String(wallet.chainId)]?.name || `#${wallet.chainId}`}</Badge>
          )}
        </div>
      </Card>

      <div className="stats">
        <Card>
          <div className="stat">
            📋<strong>{stats.total}</strong>
            <span>Total Certified</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            🔐<strong>{stats.mine}</strong>
            <span>My Documents</span>
          </div>
        </Card>
      </div>

      <h3>Quick Actions</h3>
      <div className="actions">
        {(['wallet', 'tokenize', 'verify', 'registry'] as Page[]).map((p) => (
          <button
            key={p}
            className={p === 'tokenize' ? 'gold' : ''}
            onClick={() => setPage(p)}
          >
            {p === 'wallet' ? '🔗' : p === 'tokenize' ? '🔐' : p === 'verify' ? '🔍' : '📋'}
            <b>{pageLabels[p]}</b>
            <span>
              {p === 'tokenize'
                ? 'Certify a document on-chain'
                : p === 'verify'
                ? 'Check authenticity'
                : p === 'registry'
                ? 'Browse certified documents'
                : 'Connect with WalletConnect'}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <h3>Payment Overview</h3>
        <p className="muted">Service Fee: $5 USDT or equivalent ETH, plus blockchain gas approval.</p>
        <div className="image-frame">
          <img src={paymentProcess} />
        </div>
      </Card>
    </div>
  );
}

function WalletPage({ wallet, toast }: any) {
  const [uri, setUri] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setUri('');
    try {
      const chainId = Number(DEFAULT_NETWORK);
      const r = await createFreshWalletConnectSession(chainId);
      setUri(r.uri || '');
      toast('Scan the QR code and approve the connection in your wallet.', 'info');
      const session = await approveSession(r.approval);
      await wallet.connectWithWalletConnect(session);
      setUri('');
      toast('Wallet connected successfully.', 'success');
    } catch (e: any) {
      toast(niceError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2>Wallet Manager</h2>
      <p className="muted">
        WalletConnect only. Use MetaMask Mobile, Trust Wallet, Rainbow or another
        WalletConnect-compatible wallet.
      </p>
      {wallet.address ? (
        <>
          <Field label="Connected address" value={wallet.address} mono />
          <Field
            label="Network"
            value={NETWORKS[String(wallet.chainId)]?.name || wallet.chainId}
          />
          <button onClick={wallet.disconnect}>Disconnect Wallet</button>
        </>
      ) : (
        <>
          <button className="primary" onClick={start} disabled={busy}>
            {busy ? 'Waiting for wallet approval…' : 'Connect with WalletConnect'}
          </button>
          {uri && (
            <div className="qr">
              <QRCodeSVG value={uri} size={230} />
              <p>
                Scan this QR code and approve in your wallet. The desktop app will connect
                automatically after approval.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function TokenizePage({ wallet, toast }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('1.0');
  const [ipfs, setIpfs] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [fee, setFee] = useState('—');

  useEffect(() => {
    getFeeInEth()
      .then((f) => setFee(`$${f.usd} ≈ ${f.eth} ETH`))
      .catch(() => {});
  }, []);

  async function pick(f: File) {
    setFile(f);
    setHash(await hashFileBuffer(await f.arrayBuffer()));
  }

  async function certify() {
    if (!wallet.address) {
      toast('Please connect your wallet first.', 'error');
      return;
    }
    if (!hash) {
      toast('Upload a file first.', 'error');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const expiryTs = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;
      const r = await certifyDocument(
        {
          docHash: hash,
          title: title || file?.name || 'Untitled',
          ipfsCID: ipfs,
          version: version || '1.0',
          expiry: expiryTs,
        },
        setProgress
      );
      setResult(r);
      toast('Document certified successfully.', 'success');
    } catch (e: any) {
      toast(niceError(e), 'error');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <div className="stack">
      <Card>
        <h2>Tokenize Document</h2>
        <p className="muted">
          The SHA-256 hash is computed locally in the browser. The document itself is not uploaded
          to the blockchain.
        </p>
        <label className="drop">
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          />
          <span>📄 {file ? file.name : 'Drop or select a file'}</span>
        </label>
        {hash && <Field label="SHA-256 document hash" value={hash} mono />}
        <div className="form-grid">
          <input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <input
            placeholder="IPFS CID optional"
            value={ipfs}
            onChange={(e) => setIpfs(e.target.value)}
          />
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <p className="fee">Service fee: {fee} + gas</p>
        <button className="primary" disabled={busy || !hash} onClick={certify}>
          {busy ? 'Processing…' : 'Pay Fee + Certify On-Chain'}
        </button>
        {progress && <p className="progress">{progress}</p>}
      </Card>
      {result && (
        <Card className="success-card">
          <h3>Certification Complete</h3>
          <Field label="Transaction ID" value={result.txHash} mono />
          <Field label="Block Number" value={result.blockNumber} />
          <Field label="Fee transaction" value={result.feeTxHash} mono />
          <button
            onClick={() =>
              createTokenizationPDF({
                ...result,
                hash,
                certifier: wallet.address,
                title: title || file?.name || 'Untitled',
                version,
                ipfsCID: ipfs,
                expiry: expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0,
                network: NETWORKS[String(wallet.chainId)]?.name,
              })
            }
          >
            Download PDF Certificate
          </button>
        </Card>
      )}
    </div>
  );
}

function VerifyPage({ toast }: any) {
  const [hash, setHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<DocRecord | null | undefined>(undefined);

  async function pick(f: File) {
    setFile(f);
    setHash(await hashFileBuffer(await f.arrayBuffer()));
    setDoc(undefined);
  }

  async function verify() {
    if (!hash) {
      toast('Upload a file or paste a hash first.', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await verifyDocument(hash);
      setDoc(r);
      toast(r ? 'Document record found.' : 'No on-chain record found for this document.', 'info');
    } catch (e: any) {
      toast(niceError(e), 'error');
      setDoc(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <Card>
        <h2>Verify Document</h2>
        <label className="drop">
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
          />
          <span>🔍 {file ? file.name : 'Upload original document to compute hash'}</span>
        </label>
        <input
          placeholder="Or paste document hash 0x...."
          value={hash}
          onChange={(e) => setHash(e.target.value)}
        />
        <button className="primary" onClick={verify} disabled={busy}>
          {busy ? 'Checking…' : 'Verify On-Chain'}
        </button>
      </Card>
      {doc !== undefined && (
        <Card className={doc ? 'success-card' : 'danger-card'}>
          {doc ? (
            <>
              <h3>Verified: On-chain record found</h3>
              <Badge tone={doc.revoked ? 'danger' : 'success'}>
                {doc.revoked ? 'Revoked' : 'Active'}
              </Badge>
              <Field label="Hash" value={doc.docHash} mono />
              <Field label="Certifier" value={doc.certifier} mono />
              <Field label="Timestamp" value={doc.timestamp.toUTCString()} />
              <Field label="Title" value={doc.title} />
              <Field label="Version" value={doc.version} />
              <button onClick={() => createVerificationPDF(doc)}>
                Download Verification PDF
              </button>
            </>
          ) : (
            <>
              <h3>Not verified</h3>
              <p>
                This document hash was not found in the selected on-chain registry. Please check
                that you uploaded the original file and that the configured network/contract are
                correct.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function RegistryPage({ wallet, toast }: any) {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [revokingHash, setRevokingHash] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    try {
      setDocs(await listDocuments(0, 50));
    } catch (e: any) {
      toast(niceError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const shown = docs.filter((d) =>
    JSON.stringify(d).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card>
      <div className="toolbar">
        <h2>Registry</h2>
        <button onClick={load}>{busy ? 'Loading…' : 'Refresh'}</button>
      </div>
      <input
        placeholder="Search hash, title, certifier..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {revokingHash && (
        <div className="progress-alert">
          <div className="progress-alert-header">
            <strong>Preparing revoke transaction</strong>
            <span>Please confirm in your wallet</span>
          </div>

          <p>
            Do not refresh the page. The revoke transaction is still in progress and
            will complete after blockchain confirmation.
          </p>

          <div className="progress-bar">
            <div className="progress-bar-fill" />
          </div>
        </div>
      )}
      <div className="table">
        {shown.map((d) => (
          <div className="row registry-row" key={d.docHash}>
            <div className="registry-row-header">
              <b>{d.title || 'Untitled'}</b>
              <p className="mono">{shortHash(d.docHash)}</p>
            </div>

            <div className="registry-row-certifier">
              {shortAddr(d.certifier)}
            </div>

            <div className="registry-row-status">
              <Badge tone={d.revoked ? 'danger' : 'success'}>
                {d.revoked ? 'Revoked' : 'Active'}
              </Badge>
            </div>

            {wallet.address?.toLowerCase() === d.certifier.toLowerCase() &&
              !d.revoked && (
                <div className="registry-row-actions">
                  <button
                    disabled={revokingHash === d.docHash}
                    onClick={async () => {
                      try {
                        setRevokingHash(d.docHash);

                        await revokeDocument(d.docHash);

                        toast('Document revoked successfully.', 'success');
                        await load();
                      } catch (e: any) {
                        toast(niceError(e), 'error');
                      } finally {
                        setRevokingHash(null);
                      }
                    }}
                  >
                    {revokingHash === d.docHash ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Settings() {
  return (
    <Card>
      <h2>Configuration</h2>
      <Field label="Contract address" value={CONTRACT_ADDRESS} mono />
      <Field label="Default network" value={NETWORKS[DEFAULT_NETWORK].name} />
      <p className="muted">
        This is the network and SmartContract address where the Document Ledger
        is located.
      </p>
    </Card>
  );
}

// function TermsPage() is supposwed to be here, but its now called imported from 
// src/TermsPage.tsx


function ContactPage() {
  return (
    <Card>
      <h2>Contact Us</h2>

      <div className="contact-grid">
        <a
          className="contact-card"
          href="mailto:info@sayariglobalholding.site"
        >
          <h3>Email Support</h3>
          <p>info@sayariglobalholding.site</p>
        </a>

        <a
          className="contact-card"
          href="https://wa.me/447000000000"
          target="_blank"
          rel="noreferrer"
        >
          <h3>WhatsApp</h3>
          <p>Message us directly on WhatsApp</p>
        </a>

        <a
          className="contact-card"
          href="https://t.me/sayariglobalholding"
          target="_blank"
          rel="noreferrer"
        >
          <h3>Telegram</h3>
          <p>@sayariglobalholding</p>
        </a>
      </div>

      <form
        className="contact-form"
        action="mailto:info@sayariglobalholding.site"
        method="post"
        encType="text/plain"
      >
        <input type="text" placeholder="Your Name" required />

        <input type="email" placeholder="Your Email" required />

        <textarea
          placeholder="Your Message"
          rows={6}
          required
        />

        <button type="submit" className="primary">
          Send Message
        </button>
      </form>
    </Card>
  );
}

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const wallet = useWallet();
  const [toasts, setToasts] = useState<any[]>([]);

  const toast = (msg: string, type = 'info') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  const goToPage = (nextPage: Page) => {
    // If user tries to open Tokenize Document without a connected wallet
    if (nextPage === 'tokenize' && !wallet.address) {
      window.alert(
        'Please connect your wallet before tokenising a document.'
      );

      // After the user closes the alert, redirect to Wallet Manager
      setPage('wallet');
      return;
    }

    // Normal navigation
    setPage(nextPage);
  };

  useEffect(() => {
    fetchEthPrice().catch(() => {});
  }, []);

  const current = useMemo(
    () =>
      page === 'dashboard' ? (
        <Dashboard setPage={goToPage} wallet={wallet} />
      ) : page === 'wallet' ? (
        <WalletPage wallet={wallet} toast={toast} />
      ) : page === 'tokenize' ? (
        <TokenizePage wallet={wallet} toast={toast} />
      ) : page === 'verify' ? (
        <VerifyPage toast={toast} />
      ) : page === 'registry' ? (
        <RegistryPage wallet={wallet} toast={toast} />
      ) : page === 'terms' ? (
        <TermsPage />
      ) : page === 'contact' ? (
        <ContactPage />
      ) : (
        <Settings />
      ),
    [page, wallet.address, wallet.chainId]
  );

  return (
    <>
      <aside>
        <img src={logo} />
        <h2>Sayari Ledger</h2>
        <p>Document Tokenization</p>
        {(Object.keys(pageLabels) as Page[]).map((p) => (
          <button
            key={p}
            className={page === p ? 'active' : ''}
            onClick={() => goToPage(p)}
          >
            {pageLabels[p]}
          </button>
        ))}
      </aside>
      <main>
        <header>
          <div>
            <p className="kicker">Desktop Document Ledger</p>
            <h1>{pageLabels[page]}</h1>
          </div>
          <Badge tone={wallet.address ? 'success' : 'gold'}>
            {wallet.address ? shortAddr(wallet.address) : 'Wallet disconnected'}
          </Badge>
        </header>
        {current}

        <footer className="footer">
          <div className="footer-brand">
            <h2>
              SAYARI <span>Global Holdings</span>
            </h2>

            <p>Planet Sayari LLC</p>

            <p>A Delaware registered holding company</p>

            <div className="footer-regions">
              USA | UK | KENYA | ROMANIA
            </div>
          </div>

          <div className="footer-links">
          <button onClick={() => goToPage('terms')}>
            Terms & Conditions
          </button>

          <button onClick={() => goToPage('contact')}>
            Contact Us
          </button>
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} Sayari Global Holdings.
            All rights reserved.
          </div>
        </footer>
      </main>
      <div className="toasts">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
