import React, { FormEvent, useCallback, useState } from 'react';
import { Pencil } from 'lucide-react';

import { InputAmount } from '@/components/input-amount';
import { SelectFrequency } from '@/components/select-frequency';
import { TokenBalanceSelect } from '@/components/token-balance-select';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { DCA, useBackend } from '@/hooks/useBackend';
import { useTokens } from '@/hooks/useTokens';

export interface EditDialogProps {
  dca: DCA;
  onUpdate?: (updatedDCA: DCA) => void;
}

export const DialogueEditDCA: React.FC<EditDialogProps> = ({ dca, onUpdate }) => {
  const { data } = dca;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [purchaseAmount, setPurchaseAmount] = useState<string>(String(data.purchaseAmount));
  const [frequency, setFrequency] = useState<string>(data.purchaseIntervalHuman);
  const [tokenInAddress, setTokenInAddress] = useState<string>(data.tokenIn.address);
  const [tokenOutAddress, setTokenOutAddress] = useState<string>(data.tokenOut.address);

  const { editDCA } = useBackend();
  const { tokens, loading: tokensLoading } = useTokens();

  const handleEditDCA = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!purchaseAmount || Number(purchaseAmount) < 1) {
        alert('Please enter a DCA amount of at least $1.00 USD.');
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

      const tokenIn = tokens.find((t) => t.address === tokenInAddress);
      const tokenOut = tokens.find((t) => t.address === tokenOutAddress);

      if (!tokenIn || !tokenOut) {
        alert('Invalid token selection.');
        return;
      }

      try {
        setLoading(true);
        const updatedDCA = await editDCA(dca._id, {
          name: data.name,
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
        });
        onUpdate?.(updatedDCA);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [
      dca,
      data.name,
      editDCA,
      frequency,
      onUpdate,
      purchaseAmount,
      tokenInAddress,
      tokenOutAddress,
      tokens,
    ]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary-outline" size="sm">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <form onSubmit={handleEditDCA}>
          <DialogHeader>
            <DialogTitle>Edit DCA Schedule</DialogTitle>
            <DialogDescription>
              Make changes to your DCA Schedule here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Box className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <TokenBalanceSelect
                label="From Token (Spend)"
                value={tokenInAddress}
                onChange={setTokenInAddress}
                tokens={tokens}
                disabled={loading || tokensLoading}
                hideEth={true}
              />
              <TokenBalanceSelect
                label="To Token (Receive)"
                value={tokenOutAddress}
                onChange={setTokenOutAddress}
                tokens={tokens}
                disabled={loading || tokensLoading}
                hideEth={true}
              />
            </div>

            <Separator />

            <InputAmount
              required
              value={purchaseAmount}
              onChange={setPurchaseAmount}
              disabled={loading}
            />

            <Separator />

            <SelectFrequency
              required
              value={frequency}
              onChange={setFrequency}
              disabled={loading}
            />
          </Box>
          <DialogFooter className="sm:justify-center">
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
