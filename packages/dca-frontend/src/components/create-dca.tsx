import React, { useState, useEffect, FormEvent } from 'react';
import { ArrowDownToLine, Info } from 'lucide-react';

import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';
import { useBackend } from '@/hooks/useBackend';
import { useTokens } from '@/hooks/useTokens';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_VALUE, InputAmount } from '@/components/input-amount';
import { FREQUENCIES, SelectFrequency } from '@/components/select-frequency';
import { TokenBalanceSelect } from '@/components/token-balance-select';
import { WalletModal } from '@/components/wallet-modal';

export interface CreateDCAProps {
  onCreate?: () => void;
}

export const CreateDCA: React.FC<CreateDCAProps> = ({ onCreate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [name] = useState<string>('name');
  const [purchaseAmount, setPurchaseAmount] = useState<string>(DEFAULT_VALUE);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[0].value);
  const [tokenInAddress, setTokenInAddress] = useState<string>('');
  const [tokenOutAddress, setTokenOutAddress] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { createDCA } = useBackend();
  const { tokens, loading: tokensLoading } = useTokens();
  const { authInfo } = useJwtContext();

  useEffect(() => {
    if (tokens.length > 0) {
      if (!tokenInAddress) {
        const usdc = tokens.find((t) => t.symbol === 'USDC');
        if (usdc) setTokenInAddress(usdc.address);
      }
      if (!tokenOutAddress) {
        const weth = tokens.find((t) => t.symbol === 'WETH');
        if (weth) setTokenOutAddress(weth.address);
      }
    }
  }, [tokens, tokenInAddress, tokenOutAddress]);

  const handleCreateDCA = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!purchaseAmount || Number(purchaseAmount) < env.VITE_MIN_PURCHASE_AMOUNT) {
      alert(`Please enter a DCA amount of at least $${env.VITE_MIN_PURCHASE_AMOUNT} USD.`);
      return;
    }
    if (!frequency) {
      alert('Please select a frequency.');
      return;
    }
    if (!tokenInAddress || !tokenOutAddress) {
      alert('Please select both tokens.');
      return;
    }
    if (tokenInAddress === tokenOutAddress) {
      alert('From Token and To Token must be different.');
      return;
    }

    const tokenIn = tokens.find((t) => t.address === tokenInAddress);
    const tokenOut = tokens.find((t) => t.address === tokenOutAddress);

    if (!tokenIn || !tokenOut) {
      alert('Invalid token selection.');
      return;
    }

    try {
      setLoading(true);

      const dcaParams = {
        name,
        purchaseAmount,
        purchaseIntervalHuman: frequency,
        tokenIn: {
          address: tokenIn.address,
          symbol: tokenIn.symbol,
          decimals: tokenIn.decimals,
        },
        tokenOut: {
          address: tokenOut.address,
          symbol: tokenOut.symbol,
          decimals: tokenOut.decimals,
        },
      };

      await createDCA(dcaParams);
      onCreate?.();
    } catch (error) {
      console.error('Error creating DCA:', error);
      alert('Error creating DCA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between">
      <form onSubmit={handleCreateDCA}>
        <div className="text-center space-y-6">
          <div className="space-y-4 text-left bg-orange-50/60 p-4 rounded-lg border border-orange-100">
            <h3
              className="text-sm font-semibold"
              style={{
                fontFamily: 'Poppins, system-ui, sans-serif',
                color: '#FF4205',
              }}
            >
              How It Works (Powered by Vincent)
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              This DCA agent automatically purchases your chosen token with a specific amount on
              your predefined schedule using Aerodrome DEX.
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              Typically, building automated crypto spending agents involves trusting agent
              developers or wallet SaaS companies for <strong>key management</strong>. Vincent
              enables a more secure and simpler process.
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              The agent operates using permissions securely delegated by you, following strict rules
              you establish during setup—such as authorized abilities. These onchain rules are
              cryptographically enforced by{' '}
              <a
                href="https://litprotocol.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                style={{ color: '#FF4205' }}
              >
                Lit Protocol
              </a>
              , ensuring every action stays within your guardrails. With Vincent, you achieve
              powerful automation combined with secure, permissioned execution.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 rounded-lg border border-blue-200 shadow-sm text-left">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 space-y-2">
                <h3
                  className="text-sm font-semibold text-blue-700"
                  style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                >
                  Important Information
                </h3>
                <div
                  className="space-y-1.5 text-sm leading-relaxed"
                  style={{
                    fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                    color: 'var(--footer-text-color, #121212)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Minimum DCA purchase amount is ${env.VITE_MIN_PURCHASE_AMOUNT} USD.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>Transactions are sponsored on Base Mainnet.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="md"
            variant="primary"
            className="w-full py-4 text-base font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            <ArrowDownToLine className="flex-shrink-0 h-5 w-5" />{' '}
            <span className="truncate">Deposit Tokens</span>
          </Button>
        </div>

        <Separator className="my-8" />

        <div className="my-8 space-y-6">
          {/* Token Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TokenBalanceSelect
              label="From Token (Spend)"
              value={tokenInAddress}
              onChange={setTokenInAddress}
              tokens={tokens}
              disabled={loading || tokensLoading}
              hideEth={true}
              tokensLoading={tokensLoading}
            />
            <TokenBalanceSelect
              label="To Token (Receive)"
              value={tokenOutAddress}
              onChange={setTokenOutAddress}
              tokens={tokens}
              disabled={loading || tokensLoading}
              hideEth={true}
              tokensLoading={tokensLoading}
            />
          </div>

          {/* Amount and Frequency */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-0">
              <InputAmount
                required
                value={purchaseAmount}
                onChange={setPurchaseAmount}
                disabled={loading}
              />
            </div>

            <div className="flex-1 min-w-0">
              <SelectFrequency
                required
                value={frequency}
                onChange={setFrequency}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || tokensLoading}
              className="sm:flex-shrink-0 whitespace-nowrap"
            >
              Create DCA →
            </Button>
          </div>
        </div>
      </form>

      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        walletAddress={authInfo?.pkp.ethAddress}
      />
    </div>
  );
};
