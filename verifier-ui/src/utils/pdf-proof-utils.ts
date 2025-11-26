/**
 * PDF Proof Utilities
 * 
 * パスワード付きPDF（暗号化PDF）と通常PDFの両方に対応した
 * 証明添付・抽出ユーティリティ
 */

// 末尾追記方式のマーカー
const PROOF_MARKER_BEGIN = '\n%TRI-CERT-PROOF-V1-BEGIN\n';
const PROOF_MARKER_END = '\n%TRI-CERT-PROOF-V1-END';

// 証明バンドルの型定義
export interface ProofBundle {
  version: '1.0';
  hash_method: 'raw' | 'normalized';
  proof: unknown;
  vkey: unknown;
  webauthn_sig: unknown;
  webauthn_pub: unknown;
  sig_target: unknown;
}

/**
 * PDFが暗号化されているかどうかを検出
 * pdf-libを使わずにバイト列を直接解析
 */
export function isEncryptedPdf(pdfData: Uint8Array): boolean {
  // PDFのtrailer辞書で /Encrypt キーを検索
  // PDF仕様: 暗号化されたPDFは trailer に /Encrypt エントリを持つ
  
  const text = new TextDecoder('latin1').decode(pdfData);
  
  // trailerセクションを探す（通常はファイル末尾付近）
  const trailerIndex = text.lastIndexOf('trailer');
  if (trailerIndex === -1) {
    // xref stream形式の場合もあるので、/Encryptを直接検索
    return text.includes('/Encrypt');
  }
  
  // trailer以降の部分を取得
  const trailerSection = text.substring(trailerIndex);
  
  // /Encrypt キーが存在するか確認
  return trailerSection.includes('/Encrypt');
}

/**
 * PDFバイト列のSHA3-512ハッシュを計算（正規化なし）
 */
export async function calculateRawPdfHash(pdfData: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = pdfData instanceof ArrayBuffer ? new Uint8Array(pdfData) : pdfData;
  const crypto = await import('crypto-js');
  const wordArray = crypto.lib.WordArray.create(bytes);
  return crypto.SHA3(wordArray, { outputLength: 512 }).toString();
}

/**
 * 証明バンドルをPDFの末尾に追記
 */
export function attachProofToTail(
  pdfData: Uint8Array,
  proofBundle: ProofBundle
): Uint8Array {
  const bundleJson = JSON.stringify(proofBundle);
  const bundleBase64 = btoa(bundleJson);
  
  const tailData = `${PROOF_MARKER_BEGIN}${bundleBase64}${PROOF_MARKER_END}`;
  const tailBytes = new TextEncoder().encode(tailData);
  
  // 元のPDFと末尾データを結合
  const result = new Uint8Array(pdfData.length + tailBytes.length);
  result.set(pdfData, 0);
  result.set(tailBytes, pdfData.length);
  
  return result;
}

/**
 * PDFの末尾から証明バンドルを抽出
 * @returns 抽出結果。証明がない場合はnull
 */
export function extractProofFromTail(
  pdfData: ArrayBuffer
): { originalPdf: ArrayBuffer; proofBundle: ProofBundle } | null {
  const bytes = new Uint8Array(pdfData);
  const text = new TextDecoder('latin1').decode(bytes);
  
  // 末尾マーカーを検索
  const endIndex = text.lastIndexOf(PROOF_MARKER_END);
  if (endIndex === -1) {
    return null;
  }
  
  // 開始マーカーを検索
  const beginIndex = text.lastIndexOf(PROOF_MARKER_BEGIN);
  if (beginIndex === -1 || beginIndex >= endIndex) {
    return null;
  }
  
  // Base64データを抽出
  const base64Start = beginIndex + PROOF_MARKER_BEGIN.length;
  const base64Data = text.substring(base64Start, endIndex);
  
  try {
    const bundleJson = atob(base64Data);
    const proofBundle = JSON.parse(bundleJson) as ProofBundle;
    
    // 元のPDFデータ（マーカー開始位置の改行を除く）
    const originalPdfEnd = beginIndex;
    const originalPdf = pdfData.slice(0, originalPdfEnd);
    
    return { originalPdf, proofBundle };
  } catch {
    return null;
  }
}

/**
 * 証明バンドルのバリデーション
 */
export function isValidProofBundle(bundle: unknown): bundle is ProofBundle {
  if (!bundle || typeof bundle !== 'object') return false;
  const b = bundle as Record<string, unknown>;
  return (
    b.version === '1.0' &&
    (b.hash_method === 'raw' || b.hash_method === 'normalized') &&
    b.proof !== null &&
    b.vkey !== null
  );
}

