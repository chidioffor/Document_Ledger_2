// src/pdfCertificate.ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import logoAssetUrl from './assets/sayari-logo.jpg';
import sealAssetUrl from './assets/seal.png';
import { CONTRACT_ADDRESS, DEFAULT_NETWORK, NETWORKS } from './constants';

const brandGold = '#C9A24A';
const brandGoldLight = '#E5C97A';
const brandNavy = '#08111F';
const brandNavy2 = '#132F4C';

const empty = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

const escapeHtml = (value: any) =>
  empty(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDate = (d: any) => {
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime())
    ? String(d || '—')
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
};

const formatUTC = (d: any) => {
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? String(d || '—') : date.toUTCString();
};

const normaliseSvg = (svg: string) => {
  if (svg.includes('xmlns=')) return svg;
  return svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
};

const svgToPngDataUrl = async (svgInput: string, width = 220, height = 220) => {
  const svg = normaliseSvg(svgInput);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not create QR canvas context.'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Could not render QR code image.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

const getQrPngDataUrl = async (value: string) => {
  const svg = renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value,
      size: 220,
      marginSize: 1,
      level: 'M',
      fgColor: '#08111F',
      bgColor: '#FFFFFF',
    })
  );

  return svgToPngDataUrl(svg, 220, 220);
};

const makeVerificationUrl = (_hash?: string, txHash?: string) => {
  const explorer = NETWORKS[DEFAULT_NETWORK]?.explorer || 'https://etherscan.io';

  if (txHash) return `${explorer}/tx/${txHash}`;

  // Fallback only. If the verification screen cannot recover the original
  // certification transaction hash from the contract event logs, send the user
  // to the registry contract instead of searching Etherscan for the document hash.
  return `${explorer}/address/${CONTRACT_ADDRESS}`;
};

const getPdfAssetDataUrl = async (assetUrl: string) => {
  const res = await fetch(assetUrl);
  if (!res.ok) throw new Error(`Could not load PDF asset: ${assetUrl}`);

  const blob = await res.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const certificateHtml = ({
  reportTitle,
  status,
  rows,
  logoDataUrl,
  sealDataUrl,
  qrDataUrl,
}: {
  reportTitle: string;
  status: string;
  rows: [string, string][];
  logoDataUrl: string;
  sealDataUrl: string;
  qrDataUrl: string;
}) => `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; size: A4; }
  html, body {
    margin: 0;
    padding: 0;
    width: 794px;
    height: 1123px;
    overflow: hidden;
    background: #eef0f2;
    font-family: Arial, Helvetica, sans-serif;
    color: #101728;
  }

  .page {
    width: 794px;
    height: 1123px;
    box-sizing: border-box;
    padding: 42px 46px 34px;
    border: 16px solid ${brandNavy};
    position: relative;
    background-color: #fbfaf5;
    overflow: hidden;
  }

  .page::before {
    content: "";
    position: absolute;
    inset: 16px;
    background:
      radial-gradient(
        circle at top right,
        rgba(201, 162, 74, 0.025),
        transparent 30%
      ),
      radial-gradient(
        circle at bottom left,
        rgba(19, 47, 76, 0.02),
        transparent 34%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.985) 0%,
        rgba(248, 246, 239, 0.96) 100%
      );
    z-index: 0;
  }

  .inner-border { position: absolute; inset: 24px; border: 2px solid ${brandGold}; z-index: 1; }
  .watermark {
    position: absolute;
    top: 43%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 92px;
    color: rgba(201, 162, 74, 0.02);
    font-weight: 900;
    letter-spacing: 12px;
    z-index: 1;
  }

  .header { text-align: center; border-bottom: 3px solid ${brandGold}; padding-bottom: 18px; position: relative; z-index: 2; }
  .logo {
    width: 220px;
    height: 130px;
    margin: 0 auto 14px;
    border-radius: 18px;
    overflow: hidden;
    border: 2px solid #C9A24A;
    background: #08111F;
    box-shadow: 0 12px 28px rgba(201,162,74,0.30);
    text-align: center;
  }

  .logo img {
    width: 220px;
    height: 130px;
    display: block;
  }
  .company { font-size: 23px; font-weight: 900; letter-spacing: 2.4px; color: ${brandNavy}; }
  .subtitle { margin-top: 6px; font-size: 11px; color: #5b6472; letter-spacing: 1px; text-transform: uppercase; }

  .title-row {
    margin-top: 24px; display: flex; justify-content: space-between; align-items: center;
    position: relative; z-index: 2;
  }
  .report-title { font-size: 21px; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: ${brandNavy}; }
  .status {
    background: ${brandNavy};
    color: ${brandGoldLight}; padding: 10px 16px; border-radius: 999px;
    font-size: 12px; font-weight: 900; border: 1px solid ${brandGold}; letter-spacing: 1px;
  }

  .main { display: flex; gap: 22px; margin-top: 22px; position: relative; z-index: 2; }
  .fields { flex: 1; }
  .side { width: 170px; }

  .field { margin-bottom: 10px; border-bottom: 1px solid #ddd6c8; padding-bottom: 8px; }
  .label { font-size: 9.8px; color: #6b7280; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase; margin-bottom: 4px; }
  .value { font-size: 12.7px; line-height: 1.35; word-break: break-all; color: #111827; }
  .mono { font-family: "Courier New", monospace; font-size: 11.4px; }

  .seal {
    width: 150px;
    height: 150px;
    margin: 0 auto 18px;
    position: relative;
    text-align: center;
  }

  .seal img {
    width: 150px;
    height: 150px;
    display: block;
  }

  .sealText {
    position: absolute;
    top: 58px;
    left: 0;
    right: 0;
    text-align: center;
    color: #08111F;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    line-height: 1.2;
  }

  .qrbox {
    border: 1px solid #d8c896;
    background: #ffffff;
    padding: 10px;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 18px;
  }

  .qrbox img {
    width: 128px;
    height: 128px;
    display: block;
    margin: 0 auto;
  }

  .qrlabel {
    margin-top: 7px;
    font-size: 9px;
    color: #6b7280;
    font-weight: 900;
    letter-spacing: 0.8px;
  }
  .signature { margin-top: 18px; text-align: center; }
  .sigline { border-top: 2px solid ${brandNavy}; margin: 36px 8px 6px; }
  .sigtitle { font-size: 10px; color: ${brandNavy}; font-weight: 900; letter-spacing: 1px; }
  .sigsub { font-size: 9px; color: #6b7280; margin-top: 3px; }

  .instructions {
    margin-top: 16px;
    padding: 14px 16px;
    background: #f8f7f2;
    border-left: 5px solid #C9A24A;
    border-radius: 10px;
    position: relative;
    z-index: 2;
  }
  .instructions-title { font-size: 10px; font-weight: 900; color: ${brandNavy}; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 7px; }
  .instructions p { margin: 4px 0; font-size: 11.6px; color: #303846; line-height: 1.35; }

  .footer {
    position: absolute; left: 46px; right: 46px; bottom: 28px;
    border-top: 1px solid #ddd6c8; padding-top: 10px;
    display: flex; justify-content: space-between; color: #6b7280; font-size: 9.6px; z-index: 2;
  }
</style>
</head>
<body>
<div class="page">
  <div class="inner-border"></div>
  <div class="watermark">SAYARI</div>

  <div class="header">
    <div class="logo">
      <img src="${logoDataUrl}" />
    </div>
    <div class="company">SAYARI GLOBAL HOLDING</div>
    <div class="subtitle">Document Ledger · Institutional Tokenization Certificate</div>
  </div>

  <div class="title-row">
    <div class="report-title">${escapeHtml(reportTitle)}</div>
    <div class="status">${escapeHtml(status)}</div>
  </div>

  <div class="main">
    <div class="fields">
      ${rows.map(([label, value]) => `
        <div class="field">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value ${
            label.includes('HASH') || label.includes('WALLET') || label.includes('TRANSACTION') || label.includes('IPFS')
              ? 'mono'
              : ''
          }">${escapeHtml(value)}</div>
        </div>
      `).join('')}
    </div>

    <div class="side">
      <div class="seal">
        <img src="${sealDataUrl}" />
        <div class="sealText">VERIFIED<br/>ON-CHAIN</div>
      </div>
      <div class="qrbox">
        <img src="${qrDataUrl}" />
        <div class="qrlabel">SCAN TO VERIFY</div>
      </div>
      <div class="signature">
        <div class="sigline"></div>
        <div class="sigtitle">AUTHORISED LEDGER SEAL</div>
        <div class="sigsub">Sayari Global Holding</div>
      </div>
    </div>
  </div>

  <div class="instructions">
    <div class="instructions-title">Verification instructions</div>
    <p>1. Scan the QR code or visit the Sayari Document Ledger verification screen.</p>
    <p>2. Upload the original document; the SHA-256 hash is recomputed locally.</p>
    <p>3. The smart contract registry confirms whether the document hash matches the on-chain record.</p>
  </div>

  <div class="footer">
    <div>© Sayari Global Holding · Document Ledger</div>
    <div>Generated: ${new Date().toUTCString()}</div>
  </div>
</div>
</body>
</html>
`;

const waitForImages = async (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('PDF image failed to load.'));
      });
    })
  );
};

async function createPdfFromHtml(html: string, fileName: string) {
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.width = '794px';
  holder.style.height = '1123px';
  holder.style.overflow = 'hidden';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  try {
    const page = holder.querySelector('.page') as HTMLElement;
    if (!page) throw new Error('Certificate page could not be prepared.');

    await waitForImages(page);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123],
      compress: true,
    });

    await new Promise<void>((resolve, reject) => {
      try {
        pdf.html(page, {
          x: 0,
          y: 0,
          width: 794,
          windowWidth: 794,
          autoPaging: false,
          html2canvas: {
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#fbfaf5',
            logging: false,
          },
          callback: () => resolve(),
        });
      } catch (error) {
        reject(error);
      }
    });

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } finally {
    holder.remove();
  }
}

export async function createVerificationPDF(record: any) {
  const status = record.revoked ? 'REVOKED' : 'VERIFIED';
  const fileName = `Sayari-Verification-${Date.now()}.pdf`;
  const verificationUrl = makeVerificationUrl(record.docHash, record.txHash);
  const qrDataUrl = await getQrPngDataUrl(verificationUrl);
  const logoDataUrl = await getPdfAssetDataUrl(logoAssetUrl);
  const sealDataUrl = await getPdfAssetDataUrl(sealAssetUrl);

  await createPdfFromHtml(
    certificateHtml({
      reportTitle: 'Verification Report',
      status,
      logoDataUrl,
      sealDataUrl,
      qrDataUrl,
      rows: [
        ['DOCUMENT HASH (SHA-256)', record.docHash],
        ['VERIFICATION STATUS', record.revoked ? 'REVOKED' : 'ACTIVE'],
        ['CERTIFIER WALLET ADDRESS', record.certifier],
        ['CERTIFICATION DATE', formatDate(record.timestamp)],
        ['CERTIFICATION TIME (UTC)', formatUTC(record.timestamp)],
        ['DOCUMENT TITLE', record.title || '—'],
        ['VERSION', record.version || '—'],
        ['IPFS CID', record.ipfsCID || '—'],
        ['EXPIRY', Number(record.expiry || 0) > 0 ? formatUTC(Number(record.expiry) * 1000) : 'None'],
      ],
    }),
    fileName
  );
}

export async function createTokenizationPDF(result: any) {
  const fileName = `Sayari-Certification-${result.blockNumber || Date.now()}.pdf`;
  const verificationUrl = makeVerificationUrl(result.hash, result.txHash);
  const qrDataUrl = await getQrPngDataUrl(verificationUrl);
  const logoDataUrl = await getPdfAssetDataUrl(logoAssetUrl);
  const sealDataUrl = await getPdfAssetDataUrl(sealAssetUrl);

  await createPdfFromHtml(
    certificateHtml({
      reportTitle: 'Certification Certificate',
      status: 'CERTIFIED',
      logoDataUrl,
      sealDataUrl,
      qrDataUrl,
      rows: [
        ['DOCUMENT HASH (SHA-256)', result.hash],
        ['TRANSACTION ID', result.txHash],
        ['ETH BLOCK NUMBER', `#${Number(result.blockNumber).toLocaleString()}`],
        ['CERTIFICATION DATE', formatDate(result.timestamp)],
        ['CERTIFICATION TIME (UTC)', formatUTC(result.timestamp)],
        ['CERTIFIER WALLET ADDRESS', result.certifier],
        ['DOCUMENT TITLE', result.title || '—'],
        ['VERSION', result.version || '—'],
        ['IPFS CID', result.ipfsCID || '—'],
        ['EXPIRY', Number(result.expiry || 0) > 0 ? formatUTC(Number(result.expiry) * 1000) : 'None'],
        ['NETWORK', result.network || 'Ethereum Mainnet'],
      ],
    }),
    fileName
  );
}
