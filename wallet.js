// wallet.js
// Requires solanaWeb3 (index.iife.js) included in index.html head

const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

const connectBtn = document.getElementById('connectWalletBtn');
const addrSpan   = document.getElementById('walletAddress');
const balSpan    = document.getElementById('walletBalance');
const testBtn    = document.getElementById('testSendBtn');

// <-- Replace with the devnet address that will receive bets (treasury) -->
const TREASURY_ADDRESS = "KUri8T4UV7J5AtXg9hLnyiBPm4zFm44Zk5usdDfCrXU";

async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert('Phantom wallet not found. Install Phantom or use a compatible wallet.');
    return;
  }
  try {
    const resp = await window.solana.connect();
    addrSpan.innerText = shortenAddress(resp.publicKey.toString());
    await refreshBalance();
    connectBtn.innerText = 'Connected';
  } catch (e) {
    console.error('connect error', e);
  }
}

function shortenAddress(a){
  if (!a) return '';
  return a.slice(0,4) + '...' + a.slice(-4);
}

async function refreshBalance() {
  try {
    if (!window.solana || !window.solana.publicKey) {
      balSpan.innerText = '';
      return;
    }
    const lamports = await connection.getBalance(window.solana.publicKey);
    balSpan.innerText = (lamports / solanaWeb3.LAMPORTS_PER_SOL).toFixed(6) + ' SOL (devnet)';
  } catch (e) {
    console.error('refreshBalance', e);
  }
}

/**
 * sendBet(solAmount)
 * - attempts to send SOL from connected wallet to TREASURY_ADDRESS
 * - returns an object:
 *    { ok: true, signature: "..." } on success
 *    { ok: false, code: "...", error: "..." } on failure
 */
async function sendBet(solAmount) {
  if (!window.solana || !window.solana.publicKey) {
    const errMsg = 'Wallet not connected';
    console.error(errMsg);
    return { ok: false, error: errMsg, code: 'WALLET_NOT_CONNECTED' };
  }

  // validate treasury
  let toPubkey;
  try {
    toPubkey = new solanaWeb3.PublicKey(TREASURY_ADDRESS);
  } catch (e) {
    console.error('Invalid TREASURY_ADDRESS', e);
    return { ok: false, error: 'Invalid treasury address', code: 'INVALID_TREASURY' };
  }

  // check player's on-chain balance first
  try {
    const lamports = await connection.getBalance(window.solana.publicKey);
    const solBal = lamports / solanaWeb3.LAMPORTS_PER_SOL;
    if (solBal < solAmount + 0.0001) { // margin for fee
      const errMsg = `Insufficient on-chain balance: have ${solBal.toFixed(6)} SOL, need ${solAmount.toFixed(6)} SOL`;
      console.error(errMsg);
      return { ok: false, error: errMsg, code: 'INSUFFICIENT_FUNDS' };
    }
  } catch (e) {
    console.warn('Could not read on-chain balance', e);
    // continue — not fatal
  }

  const fromPubkey = window.solana.publicKey;
  const lamports = Math.round(solAmount * solanaWeb3.LAMPORTS_PER_SOL);

  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports
    })
  );
  tx.feePayer = fromPubkey;
  try {
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
  } catch (e) {
    console.error('Failed to fetch recent blockhash', e);
    return { ok: false, error: 'Network error fetching blockhash', code: 'BLOCKHASH_ERROR' };
  }

  try {
    // modern Phantom API
    if (window.solana.signAndSendTransaction) {
      const signed = await window.solana.signAndSendTransaction(tx);
      await connection.confirmTransaction(signed.signature, 'confirmed');
      console.log('Transaction confirmed:', signed.signature);
      await refreshBalance();
      return { ok: true, signature: signed.signature };
    } else {
      // fallback flow
      const signedTx = await window.solana.signTransaction(tx);
      const raw = signedTx.serialize();
      const sig = await connection.sendRawTransaction(raw);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log('Transaction confirmed (raw):', sig);
      await refreshBalance();
      return { ok: true, signature: sig };
    }
  } catch (err) {
    console.error('sendBet failed:', err);
    const message = (err && err.message) ? err.message : String(err);
    const code = (err && err.code) ? err.code : 'TX_FAILED';
    if (message.toLowerCase().includes('user rejected') || code === 4001 || message.toLowerCase().includes('cancel')) {
      return { ok: false, error: 'User rejected the transaction', code: 'USER_REJECTED' };
    }
    return { ok: false, error: message, code };
  }
}

// expose API
window.myWallet = {
  connectWallet,
  refreshBalance,
  sendBet,
  TREASURY_ADDRESS
};

// bind UI
if (connectBtn) connectBtn.addEventListener('click', connectWallet);
if (testBtn) {
  testBtn.addEventListener('click', async () => {
    try {
      if (!window.solana || !window.solana.publicKey) {
        await connectWallet();
        if (!window.solana || !window.solana.publicKey) return;
      }
      const res = await sendBet(0.01);
      console.log('test sendBet result', res);
      alert('test send result: ' + JSON.stringify(res));
    } catch (e) {
      console.error('test send threw', e);
      alert('test send threw: ' + (e && e.message ? e.message : e));
    }
  });
}
