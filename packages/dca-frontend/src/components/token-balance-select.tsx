import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Token } from '@/hooks/useTokens';
import { Label } from '@/components/ui/label';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useChain } from '@/hooks/useChain';
import { ChevronDownIcon } from 'lucide-react';

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

export interface TokenBalanceSelectProps {
  label: string;
  value: string;
  onChange: (tokenSymbol: string) => void;
  tokens: Token[];
  disabled?: boolean;
  hideEth?: boolean;
  tokensLoading?: boolean;
}

export const TokenBalanceSelect: React.FC<TokenBalanceSelectProps> = ({
  label,
  value,
  onChange,
  tokens,
  disabled = false,
  hideEth = false,
  tokensLoading = false,
}) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { authInfo } = useJwtContext();
  const { provider } = useChain();

  const selectedToken = tokens.find((t) => t.address === value);

  // Filter tokens based on search query
  const filteredTokens = tokens
    .filter((token) => !hideEth || token.symbol !== 'ETH')
    .filter(
      (token) =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (token.name && token.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        // Return focus to trigger button
        document.getElementById(`token-balance-select-${label}`)?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, label]);

  // Fetch balance for selected token
  useEffect(() => {
    if (!selectedToken || !authInfo?.pkp.ethAddress) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const contract = new ethers.Contract(selectedToken.address, ERC20_ABI, provider);
        const balanceWei = await contract.balanceOf(authInfo.pkp.ethAddress);

        if (!cancelled) {
          const balanceFormatted = ethers.utils.formatUnits(balanceWei, selectedToken.decimals);
          setBalance(balanceFormatted);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Error fetching balance for ${selectedToken.symbol}:`, err);
          setBalance(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
    };
  }, [selectedToken, authInfo, provider]);

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num === 0) return '0';
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  const getDisplayText = () => {
    if (tokensLoading && !selectedToken) return 'Loading Token Pools and Balance...';
    if (!selectedToken) return 'Select token...';
    if (loading) return `${selectedToken.symbol} (Loading...)`;
    if (balance !== null) {
      const formattedBalance = formatBalance(balance);
      if (selectedToken.price) {
        const usdValue = parseFloat(balance) * parseFloat(selectedToken.price);
        const formattedUsdValue = usdValue.toFixed(2);
        return `${selectedToken.symbol} (You have: ${formattedBalance} ≈ $${formattedUsdValue})`;
      }
      return `${selectedToken.symbol} (You have: ${formattedBalance})`;
    }
    return selectedToken.symbol;
  };

  const handleTokenSelect = (tokenAddress: string) => {
    onChange(tokenAddress);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      <Label
        htmlFor={`token-balance-select-${label}`}
        className="text-sm font-medium"
        style={{
          fontFamily: 'Poppins, system-ui, sans-serif',
          color: 'var(--footer-text-color, #121212)',
        }}
      >
        {label}
      </Label>
      <div className="relative">
        <button
          type="button"
          id={`token-balance-select-${label}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`token-list-${label}`}
          className="w-full h-10 px-3 flex items-center justify-between rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
          }}
        >
          <span className="text-sm">{getDisplayText()}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </button>

        {isOpen && (
          <div
            id={`token-list-${label}`}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
          >
            <div className="px-2 py-2 border-b">
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                style={{
                  fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                }}
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => handleTokenSelect(token.address)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    style={{
                      fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                    }}
                  >
                    {token.symbol}
                  </button>
                ))
              ) : (
                <div className="px-2 py-8 text-center text-sm text-gray-500">No tokens found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
