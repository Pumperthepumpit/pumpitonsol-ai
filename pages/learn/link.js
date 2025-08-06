import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function LinkAccount() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if wallet is connected
    const checkWallet = async () => {
      if (typeof window !== 'undefined' && window.solana) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setWalletAddress(response.publicKey.toString());
        } catch (err) {
          // User hasn't connected wallet yet
        }
      }
    };
    checkWallet();
  }, []);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.solana) {
      try {
        const response = await window.solana.connect();
        setWalletAddress(response.publicKey.toString());
      } catch (err) {
        setError('Failed to connect wallet');
      }
    } else {
      setError('Please install Phantom wallet');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (code.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          walletAddress
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/learn/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Failed to link account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render wallet-specific content until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Head>
          <title>Link Telegram Account - PUMPIT Learn</title>
        </Head>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
              <h1 className="text-3xl font-bold mb-2">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Link Telegram Account - PUMPIT Learn</title>
      </Head>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Link href="/learn">
            <a className="text-yellow-400 hover:text-yellow-300 mb-8 inline-block">
              ← Back to Learn
            </a>
          </Link>

          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h1 className="text-3xl font-bold mb-2">Link Your Account</h1>
            <p className="text-gray-400 mb-8">
              Connect your Telegram learning progress to this website
            </p>

            {success ? (
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-400">Account linked successfully!</p>
                <p className="text-sm text-gray-400 mt-2">Redirecting to dashboard...</p>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {/* Step 1: Wallet */}
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center mr-3">
                        1
                      </div>
                      <h3 className="font-semibold">Connect Wallet</h3>
                    </div>
                    
                    {walletAddress ? (
                      <div className="ml-11 bg-gray-800 rounded-lg p-3">
                        <p className="text-sm text-green-400">✓ Wallet Connected</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={connectWallet}
                        className="ml-11 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                      >
                        Connect Phantom Wallet
                      </button>
                    )}
                  </div>

                  {/* Step 2: Get Code */}
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center mr-3">
                        2
                      </div>
                      <h3 className="font-semibold">Get Code from Telegram</h3>
                    </div>
                    <div className="ml-11 text-sm text-gray-400">
                      <p>1. Open @pumperpolyglotbot on Telegram</p>
                      <p>2. Send the command: <code className="bg-gray-800 px-2 py-1 rounded">/link</code></p>
                      <p>3. Copy the 6-digit code</p>
                    </div>
                  </div>

                  {/* Step 3: Enter Code */}
                  <div>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center mr-3">
                        3
                      </div>
                      <h3 className="font-semibold">Enter Code</h3>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="ml-11">
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:border-yellow-400"
                        maxLength="6"
                        disabled={!walletAddress}
                      />
                      
                      {error && (
                        <p className="text-red-400 text-sm mt-2">{error}</p>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !walletAddress || code.length !== 6}
                        className={`w-full mt-4 py-3 rounded-lg font-semibold transition-colors ${
                          loading || !walletAddress || code.length !== 6
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-400 text-black hover:bg-yellow-300'
                        }`}
                      >
                        {loading ? 'Linking...' : 'Link Account'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-400">
                    💡 Tip: Your Telegram progress will be available on the website after linking!
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}