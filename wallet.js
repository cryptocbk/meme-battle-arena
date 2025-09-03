// wallet.js
// Uses global solanaWeb3 from CDN (index.iife.js)

const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

const connectBtn = document.getElementById('connectWalletBtn');
const addrSpan   = document.getElementById('walletAddress');
const balSpan    = document.getElementById('walletBalance');

// <-- REPLACE this with the devnet address that will receive bets (treasury) -->
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

// send bet: transfer SOL from player to treasury (returns signature)
async function sendBet(solAmount) {
  if (!window.solana || !window.solana.publicKey) throw new Error('Wallet not connected');
  const fromPubkey = window.solana.publicKey;
  const toPubkey = new solanaWeb3.PublicKey(TREASURY_ADDRESS);
  const lamports = Math.round(solAmount * solanaWeb3.LAMPORTS_PER_SOL);

  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports
    })
  );
  tx.feePayer = fromPubkey;
  const latest = await connection.getLatestBlockhash();
  tx.recentBlockhash = latest.blockhash;

  try {
    if (window.solana.signAndSendTransaction) {
      const signed = await window.solana.signAndSendTransaction(tx);
      // wait for confirmation
      await connection.confirmTransaction(signed.signature, 'confirmed');
      await refreshBalance();
      return signed.signature;
    } else {
      const signedTx = await window.solana.signTransaction(tx);
      const raw = signedTx.serialize();
      const sig = await connection.sendRawTransaction(raw);
      await connection.confirmTransaction(sig, 'confirmed');
      await refreshBalance();
      return sig;
    }
  } catch (err) {
    console.error('sendBet error', err);
    throw err;
  }
}

// Expose global API for script.js
window.myWallet = {
  connectWallet,
  refreshBalance,
  sendBet,
  TREASURY_ADDRESS
};

// auto-bind UI
if (connectBtn) connectBtn.addEventListener('click', connectWallet);
