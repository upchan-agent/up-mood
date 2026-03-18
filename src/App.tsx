import { useState, useEffect } from 'react';
import { createClientUPProvider } from '@lukso/up-provider';
import { request } from 'graphql-request';
import { getTransactions } from './lib/blockscout';
import { calculateEcoAttributes, getSpecies, getSpeciesDescription, normalizeAttribute } from './lib/eco-score';
import type { EcoAttributes, Species } from './types/transaction';

const GRAPHQL_ENDPOINT = 'https://envio.lukso-mainnet.universal.tech/v1/graphql';

const GET_PROFILE_QUERY = `
  query GetProfile($address: String!) {
    Profile(where: { id: { _eq: $address } }) {
      id
      name
      fullName
      profileImages(where: { error: { _is_null: true } }) {
        width
        height
        url
      }
    }
  }
`;

interface ProfileData {
  name: string;
  avatarUrl?: string;
}

interface AgeData {
  years: number;
  months: number;
  days: number;
  createdAt: string;
}

const SPECIES_EMOJIS: Record<Species, string> = {
  Baby: '🐣',
  Merchant: '🦊',
  Warrior: '🦁',
  Scholar: '🦉',
  Artist: '🦋',
  Diplomat: '🕊️',
  Explorer: '🦄',
};

const ATTRIBUTE_DESCRIPTIONS: Record<string, string> = {
  wealth: 'Transactions involving LYX or token transfers',
  vitality: 'General execute operations and contract interactions',
  intelligence: 'Complex contract executions and advanced operations',
  creativity: 'Profile metadata updates and claims (LSP-3, LSP-12)',
  sociability: 'Follow actions and permission management (LSP-6, LSP-26)',
};

const ATTRIBUTE_ICONS: Record<string, string> = {
  wealth: '💰',
  vitality: '⚡',
  intelligence: '🧠',
  creativity: '🎨',
  sociability: '🤝',
};

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [inputAddress, setInputAddress] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [age, setAge] = useState<AgeData | null>(null);
  const [ecoAttributes, setEcoAttributes] = useState<EcoAttributes | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addrParam = params.get('address');
    if (addrParam && addrParam.startsWith('0x')) {
      setInputAddress(addrParam);
      setAddress(addrParam.toLowerCase() as `0x${string}`);
      fetchProfile(addrParam);
      fetchAge(addrParam);
      fetchEcoData(addrParam);
    }
  }, []);

  useEffect(() => {
    const provider = createClientUPProvider();
    const accounts = provider.accounts as string[];
    const contextAccounts = provider.contextAccounts as string[];
    const upAddress = contextAccounts.length > 0 ? contextAccounts[0] : accounts[0];

    if (upAddress && !address) {
      setInputAddress(upAddress);
      setAddress(upAddress);
      fetchProfile(upAddress);
      fetchAge(upAddress);
      fetchEcoData(upAddress);
    }

    const handleAccountsChanged = (newAccounts: string[]) => {
      if (newAccounts.length > 0 && !address) {
        setInputAddress(newAccounts[0]);
        setAddress(newAccounts[0]);
        fetchProfile(newAccounts[0]);
        fetchAge(newAccounts[0]);
        fetchEcoData(newAccounts[0]);
      }
    };

    const handleContextAccountsChanged = (newContextAccounts: string[]) => {
      if (newContextAccounts.length > 0 && !address) {
        setInputAddress(newContextAccounts[0]);
        setAddress(newContextAccounts[0]);
        fetchProfile(newContextAccounts[0]);
        fetchAge(newContextAccounts[0]);
        fetchEcoData(newContextAccounts[0]);
      }
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('contextAccountsChanged', handleContextAccountsChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('contextAccountsChanged', handleContextAccountsChanged);
    };
  }, [address]);

  const fetchProfile = async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await request(GRAPHQL_ENDPOINT, GET_PROFILE_QUERY, { address: addr.toLowerCase() });
      const profileData = data.Profile?.[0];

      if (!profileData) {
        setProfile({ name: 'Unknown' });
        return;
      }

      const images = profileData.profileImages || [];
      let avatarUrl: string | undefined;
      
      if (images.length > 0) {
        const sorted = [...images].sort((a, b) => (a.width || 0) - (b.width || 0));
        const rawUrl = sorted[0].url;
        
        if (rawUrl?.startsWith('ipfs://')) {
          avatarUrl = 'https://api.universalprofile.cloud/ipfs/' + rawUrl.replace('ipfs://', '');
        } else if (rawUrl?.startsWith('https://') || rawUrl?.startsWith('http://')) {
          avatarUrl = rawUrl;
        } else {
          avatarUrl = rawUrl;
        }
      }

      setProfile({
        name: profileData.fullName || profileData.name || 'Unknown',
        avatarUrl,
      });
    } catch (e: any) {
      console.error('Profile fetch error:', e);
      setProfile({ name: 'Unknown' });
    } finally {
      setLoading(false);
    }
  };

  function calculateAge(birthDate: Date) {
    const now = new Date();
    const birth = birthDate;
    
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    
    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { 
      years, 
      months, 
      days,
      createdAt: birth.toUTCString().split(' ').slice(0, 4).join(' '),
    };
  }

  const fetchAge = async (addr: string) => {
    try {
      const addrRes = await fetch(
        `https://explorer.execution.mainnet.lukso.network/api/v2/addresses/${addr}`
      );
      const addrData = await addrRes.json();

      const txHash = addrData.creation_transaction_hash;
      if (!txHash) {
        throw new Error('Not found the creation transaction');
      }

      const txRes = await fetch(
        `https://explorer.execution.mainnet.lukso.network/api/v2/transactions/${txHash}`
      );
      const txData = await txRes.json();

      const createdAt = new Date(txData.timestamp);
      const ageData = calculateAge(createdAt);

      setAge(ageData);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    }
  };

  const fetchEcoData = async (addr: string) => {
    try {
      const txs = await getTransactions(addr);
      
      const transactions = txs.map(tx => ({
        hash: tx.hash,
        timestamp: tx.timestamp,
        from: tx.from.hash,
        to: tx.to?.hash || null,
        value: tx.value,
        input: tx.raw_input,
        method: tx.method,
        block_number: tx.block_number,
        decoded_input: tx.decoded_input,
      }));
      
      const attrs = calculateEcoAttributes(transactions);
      const sp = getSpecies(attrs);
      
      setEcoAttributes(attrs);
      setSpecies(sp);
    } catch (e: any) {
      console.error('[Eco] Error:', e);
    }
  };

  const handleCheck = () => {
    if (!inputAddress.startsWith('0x')) {
      setError('Please enter a valid LUKSO address (0x...)');
      return;
    }
    const addr = inputAddress.toLowerCase();
    setAddress(addr);
    fetchProfile(addr);
    fetchAge(addr);
    fetchEcoData(addr);
  };

  const handleReset = () => {
    setAddress(null);
    setInputAddress('');
    setProfile(null);
    setAge(null);
    setEcoAttributes(null);
    setSpecies(null);
    setError(null);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?address=${address}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titleEmoji}>🆙</span>
          <span style={styles.titleText}>MOOD</span>
          <span style={styles.titleEmoji}>🌱</span>
        </h1>
        <p style={styles.subtitle}>Universal Profile Ecosystem Attributes</p>
      </header>

      {/* Input Card */}
      <div style={styles.inputCard}>
        <label style={styles.inputLabel}>Enter UP Address</label>
        <div style={styles.inputGroup}>
          <input
            type="text"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="0xbcA4eEBea76926c49C64AB86A527CC833eFa3B2D"
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          />
          <button onClick={handleCheck} style={styles.button}>
            Analyze
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner}>⌛</div>
          <p style={styles.loadingText}>Analyzing...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.errorCard}>
          <span style={styles.errorIcon}>⚠️</span>
          <p style={styles.errorText}>{error}</p>
          <button onClick={handleReset} style={styles.resetButton}>Reset</button>
        </div>
      )}

      {/* Results */}
      {profile && age && ecoAttributes && species && (
        <div style={styles.resultContainer}>
          {/* Profile Card */}
          <div style={styles.profileCard}>
            <div style={styles.profileContent}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={styles.profileText}>
                <h2 style={styles.profileName}>{profile.name}</h2>
                <p style={styles.profileAddress}>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <div style={styles.ageInfo}>
                  <span style={styles.ageItem}>
                    <span style={styles.ageLabel}>Age:</span>
                    <span style={styles.ageValue}>{age.years}Y {age.months}M {age.days}D</span>
                  </span>
                  <span style={styles.ageSeparator}>•</span>
                  <span style={styles.ageItem}>
                    <span style={styles.ageLabel}>Created:</span>
                    <span style={styles.ageValue}>{age.createdAt}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Species Card - Between Profile and Attributes */}
          <div style={styles.speciesCard}>
            <div style={styles.speciesBadge}>
              <span style={styles.speciesAnimal}>{SPECIES_EMOJIS[species]}</span>
              <div>
                <div style={styles.speciesName}>{species}</div>
                <p style={styles.speciesDesc}>{getSpeciesDescription(species)}</p>
              </div>
            </div>
          </div>

          {/* Ecosystem Attributes Card */}
          <div style={styles.ecoCard}>
            <h3 style={styles.cardTitle}>🌱 Ecosystem Attributes</h3>
            
            <div style={styles.attributesGrid}>
              {(['wealth', 'vitality', 'intelligence', 'creativity', 'sociability'] as const).map((key) => (
                <div key={key} style={styles.attrItem}>
                  <div style={styles.attrIconColumn}>
                    <span style={styles.attrIcon}>{ATTRIBUTE_ICONS[key]}</span>
                  </div>
                  <div style={styles.attrContent}>
                    <div style={styles.attrTop}>
                      <span style={styles.attrName}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span style={styles.attrValue}>{ecoAttributes[key as keyof EcoAttributes]}</span>
                    </div>
                    <div style={styles.attrBarBg}>
                      <div style={{
                        ...styles.attrBarFill,
                        ...(key === 'wealth' ? styles.barWealth : key === 'vitality' ? styles.barVitality : key === 'intelligence' ? styles.barIntelligence : key === 'creativity' ? styles.barCreativity : styles.barSociability),
                        width: `${normalizeAttribute(ecoAttributes[key as keyof EcoAttributes], Math.max(...Object.values(ecoAttributes) as number[]))}%`
                      }} />
                    </div>
                    <p style={styles.attrDesc}>{ATTRIBUTE_DESCRIPTIONS[key]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.totalScore}>
              Total: <strong>{ecoAttributes.wealth + ecoAttributes.vitality + ecoAttributes.intelligence + ecoAttributes.creativity + ecoAttributes.sociability}</strong> points
            </div>
          </div>

          {/* Share Button */}
          <button onClick={handleShare} style={styles.shareButton}>
            🔗 Share Profile
          </button>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span style={styles.footerText}>Made with </span>
          <span style={styles.footerHeart}>❤️</span>
          <span style={styles.footerText}> by </span>
          <a href="https://profile.link/🆙chan@bcA4" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
            <span style={styles.footerEmoji}>🆙</span>chan
          </a>
          <span style={styles.footerSeparator}>|</span>
          <a href="https://x.com/UPchan_lyx" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
            <span style={styles.footerX}>𝕏</span>
          </a>
        </div>
      </footer>

      {/* Toast */}
      {copied && (
        <div style={styles.toast}>
          <span>✅ Link copied!</span>
        </div>
      )}
    </div>
  );
}

// 🎨 Modern purple gradient theme
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    width: '100%',
    padding: '24px 16px',
    fontFamily: '"Quicksand", "Nunito", system-ui, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#1a202c',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(2rem, 5vw, 2.5rem)',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    display: 'inline-block',
  },
  titleEmoji: {
    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    fontVariantEmoji: 'emoji',
    margin: '0 10px',
  },
  titleText: {
    background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '0.1em',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  inputCard: {
    maxWidth: '560px',
    margin: '0 auto 24px',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputLabel: {
    display: 'block',
    margin: '0 0 12px 0',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inputGroup: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    background: '#f7fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    color: '#2d3748',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 28px',
    fontSize: '0.95rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    whiteSpace: 'nowrap',
  },
  loadingCard: {
    maxWidth: '400px',
    margin: '0 auto 24px',
    padding: '40px 24px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    textAlign: 'center',
  },
  loadingSpinner: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  loadingText: {
    margin: 0,
    color: '#4a5568',
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  errorCard: {
    maxWidth: '500px',
    margin: '0 auto 24px',
    padding: '20px 24px',
    background: '#fff5f5',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  errorIcon: {
    fontSize: '1.5rem',
  },
  errorText: {
    margin: 0,
    flex: '1 1 auto',
    color: '#e53e3e',
    fontSize: '0.95rem',
  },
  resultContainer: {
    maxWidth: '560px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  profileCard: {
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
  },
  profileContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    justifyContent: 'center',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 0,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  profileName: {
    margin: '0 0 6px 0',
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#2d3748',
  },
  profileAddress: {
    margin: '0 0 10px 0',
    fontSize: '0.85rem',
    color: '#718096',
    fontFamily: 'monospace',
  },
  ageInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    fontSize: '0.85rem',
    justifyContent: 'center',
  },
  ageItem: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  ageLabel: {
    color: '#718096',
    fontWeight: '600',
  },
  ageValue: {
    color: '#2d3748',
    fontWeight: '600',
  },
  ageSeparator: {
    color: '#cbd5e0',
  },
  speciesCard: {
    padding: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  speciesBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    justifyContent: 'center',
  },
  speciesAnimal: {
    fontSize: '3rem',
    animation: 'bounce 1s ease-in-out infinite',
  },
  speciesName: {
    margin: '0 0 4px 0',
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: '0.05em',
  },
  speciesDesc: {
    margin: 0,
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: '1.5',
  },
  ecoCard: {
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
  },
  attributesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  attrItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  attrIconColumn: {
    width: '40px',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attrIcon: {
    fontSize: '1.5rem',
  },
  attrContent: {
    flex: 1,
    minWidth: 0,
  },
  attrTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  attrName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#2d3748',
  },
  attrValue: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#667eea',
  },
  attrBarBg: {
    height: '12px',
    background: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  attrBarFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease-out',
  },
  barWealth: {
    background: 'linear-gradient(90deg, #f6ad55 0%, #ed8936 100%)',
  },
  barVitality: {
    background: 'linear-gradient(90deg, #fc8181 0%, #f56565 100%)',
  },
  barIntelligence: {
    background: 'linear-gradient(90deg, #63b3ed 0%, #4299e1 100%)',
  },
  barCreativity: {
    background: 'linear-gradient(90deg, #f687b3 0%, #ed64a6 100%)',
  },
  barSociability: {
    background: 'linear-gradient(90deg, #68d391 0%, #48bb78 100%)',
  },
  attrDesc: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#718096',
    lineHeight: '1.4',
  },
  totalScore: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '2px dashed #e2e8f0',
    textAlign: 'center',
    fontSize: '1rem',
    color: '#4a5568',
  },
  shareButton: {
    padding: '16px 24px',
    fontSize: '1rem',
    fontWeight: '700',
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    borderRadius: '12px',
    color: '#667eea',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  footer: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
  },
  footerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  footerHeart: {
    fontSize: '0.85rem',
  },
  footerEmoji: {
    fontSize: '1rem',
    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    fontVariantEmoji: 'emoji',
  },
  footerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: 'rgba(255, 255, 255, 0.85)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'opacity 0.2s',
  },
  footerSeparator: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.85rem',
  },
  footerX: {
    fontSize: '0.85rem',
    fontFamily: 'inherit',
  },
  toast: {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 28px',
    background: '#ffffff',
    borderRadius: '12px',
    fontSize: '0.95rem',
    color: '#2d3748',
    fontWeight: '600',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
  },
  resetButton: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    background: '#f56565',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

export default App;
