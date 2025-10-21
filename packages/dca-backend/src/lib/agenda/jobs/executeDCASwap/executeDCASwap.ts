import * as Sentry from '@sentry/node';
import { Job } from '@whisthub/agenda';
import consola from 'consola';
import { ethers } from 'ethers';

import { IRelayPKP } from '@lit-protocol/types';
import { AbilityAction } from '@lit-protocol/vincent-ability-aerodrome-swap';

import { type AppData, assertPermittedVersion } from '../jobVersion';
import {
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
  balanceOf,
  getERC20Contract,
  getUserPermittedVersion,
  handleOperationExecution,
} from './utils';
import { getAerodromeAbilityClient } from './vincentAbilities';
import { env } from '../../../env';
import { normalizeError } from '../../../error';
import { PurchasedCoin } from '../../../mongo/models/PurchasedCoin';
import { getTokenByAddress } from '../../../tokens/tokenService';

export type JobType = Job<JobParams>;
export type JobParams = {
  app: AppData;
  name: string;
  pkpInfo: IRelayPKP;
  purchaseAmount: number;
  purchaseIntervalHuman: string;
  tokenIn: {
    address: `0x${string}`;
    decimals: number;
    symbol: string;
  };
  tokenOut: {
    address: `0x${string}`;
    decimals: number;
    symbol: string;
  };
  updatedAt: Date;
};

const { BASE_RPC_URL, VINCENT_APP_ID } = env;

const baseProvider = new ethers.providers.StaticJsonRpcProvider(BASE_RPC_URL);

async function handleSwapExecution({
  delegatorAddress,
  pkpPublicKey,
  tokenInAddress,
  tokenInAmount,
  tokenOutAddress,
}: {
  delegatorAddress: `0x${string}`;
  pkpPublicKey: `0x${string}`;
  tokenInAddress: `0x${string}`;
  tokenInAmount: ethers.BigNumber;
  tokenInDecimals: number;
  tokenOutAddress: `0x${string}`;
}): Promise<`0x${string}`> {
  const aerodromeSwapAbilityClient = getAerodromeAbilityClient();
  const swapContext = {
    delegatorPkpEthAddress: delegatorAddress,
  };

  const approveParams = {
    alchemyGasSponsor,
    alchemyGasSponsorApiKey,
    alchemyGasSponsorPolicyId,
    tokenInAddress,
    tokenOutAddress,
    action: AbilityAction.Approve,
    amountIn: tokenInAmount.toString(),
    rpcUrl: BASE_RPC_URL,
  };

  const approvePrecheckResult = await aerodromeSwapAbilityClient.precheck(
    approveParams,
    swapContext
  );
  consola.trace('Aerodrome Approve Precheck Response:', approvePrecheckResult);
  if (!approvePrecheckResult.success) {
    throw new Error(`Aerodrome approve precheck failed: ${approvePrecheckResult.result?.reason}`);
  }

  const approveExecutionResult = await aerodromeSwapAbilityClient.execute(
    approveParams,
    swapContext
  );
  consola.trace('Aerodrome Approve Vincent Tool Response:', approveExecutionResult);
  if (approveExecutionResult.success === false) {
    throw new Error(`Aerodrome tool approval failed: ${approveExecutionResult.runtimeError}`);
  }

  const approveResult = approveExecutionResult.result!;
  const approveOperationHash = (approveResult.approvalTxUserOperationHash ||
    approveResult.approvalTxHash) as `0x${string}` | undefined;

  if (approveOperationHash) {
    consola.debug('Waiting for approval transaction to be mined...');
    await handleOperationExecution({
      pkpPublicKey,
      isSponsored: alchemyGasSponsor,
      operationHash: approveOperationHash,
      provider: baseProvider,
    });
    consola.debug('Approval transaction mined successfully');
  } else {
    consola.debug('Approval already sufficient, no transaction needed');
  }

  const swapParams = {
    alchemyGasSponsor,
    alchemyGasSponsorApiKey,
    alchemyGasSponsorPolicyId,
    tokenInAddress,
    tokenOutAddress,
    action: AbilityAction.Swap,
    amountIn: tokenInAmount.toString(),
    rpcUrl: BASE_RPC_URL,
  };

  const swapPrecheckResult = await aerodromeSwapAbilityClient.precheck(swapParams, swapContext);
  consola.trace('Aerodrome Swap Precheck Response:', swapPrecheckResult);
  if (!swapPrecheckResult.success) {
    throw new Error(`Aerodrome swap precheck failed: ${swapPrecheckResult.result?.reason}`);
  }

  const swapExecutionResult = await aerodromeSwapAbilityClient.execute(swapParams, swapContext);
  consola.trace('Aerodrome Swap Vincent Tool Response:', swapExecutionResult);
  if (swapExecutionResult.success === false) {
    throw new Error(`Aerodrome tool execution failed: ${swapExecutionResult.runtimeError}`);
  }

  const result = swapExecutionResult.result!;
  const operationHash = (result.swapTxUserOperationHash || result.swapTxHash) as `0x${string}`;

  return operationHash;
}

export async function executeDCASwap(job: JobType, sentryScope: Sentry.Scope): Promise<void> {
  try {
    const {
      _id,
      data: {
        app,
        pkpInfo: { ethAddress, publicKey },
        purchaseAmount,
        tokenIn,
        tokenOut,
      },
    } = job.attrs;

    consola.log('Starting DCA swap job...', {
      _id,
      ethAddress,
      purchaseAmount,
      tokenIn: tokenIn.symbol,
      tokenOut: tokenOut.symbol,
    });

    consola.debug(`Fetching user ${tokenIn.symbol} balance...`);
    const tokenInContract = getERC20Contract(tokenIn.address, baseProvider);
    const [tokenInBalance, userPermittedAppVersion, tokenInInfo] = await Promise.all([
      balanceOf(tokenInContract, ethAddress),
      getUserPermittedVersion({ ethAddress, appId: VINCENT_APP_ID }),
      getTokenByAddress(tokenIn.address),
    ]);

    sentryScope.addBreadcrumb({
      data: {
        tokenInBalance: ethers.utils.formatUnits(tokenInBalance, tokenIn.decimals),
        tokenInSymbol: tokenIn.symbol,
      },
      message: `User ${tokenIn.symbol} balance`,
    });

    // Convert USD purchase amount to token amount using token price
    let _purchaseAmount: ethers.BigNumber;
    if (tokenInInfo?.price) {
      const tokenPrice = parseFloat(tokenInInfo.price);

      // Use BigNumber math to avoid precision issues
      // Formula: tokenAmount = purchaseAmount / tokenPrice
      // Implementation: (purchaseAmount * 10^decimals) / (tokenPrice * 10^6) * 10^6 / 10^decimals
      // Simplified: (purchaseAmount * 10^(decimals+6)) / (tokenPrice * 10^6)

      const purchaseAmountScaled = ethers.utils.parseUnits(purchaseAmount.toString(), 6); // Scale USD to 6 decimals
      const tokenPriceScaled = ethers.utils.parseUnits(tokenPrice.toFixed(6), 6); // Scale price to 6 decimals

      // Calculate: (purchaseAmount / tokenPrice) * 10^decimals
      _purchaseAmount = purchaseAmountScaled
        .mul(ethers.BigNumber.from(10).pow(tokenIn.decimals))
        .div(tokenPriceScaled);

      consola.debug(
        `Converting $${purchaseAmount} USD to ${ethers.utils.formatUnits(_purchaseAmount, tokenIn.decimals)} ${tokenIn.symbol} at price $${tokenPrice}`
      );
    } else {
      // Fallback: treat purchaseAmount as token amount if price unavailable
      consola.warn(
        `Token price not available for ${tokenIn.symbol}, treating purchaseAmount as token amount`
      );
      _purchaseAmount = ethers.utils.parseUnits(
        purchaseAmount.toFixed(tokenIn.decimals),
        tokenIn.decimals
      );
    }

    if (tokenInBalance.lt(_purchaseAmount)) {
      const balanceFormatted = ethers.utils.formatUnits(tokenInBalance, tokenIn.decimals);
      const requiredFormatted = ethers.utils.formatUnits(_purchaseAmount, tokenIn.decimals);
      throw new Error(
        `Not enough balance for account ${ethAddress} - has ${balanceFormatted} ${tokenIn.symbol}, needs ${requiredFormatted} ${tokenIn.symbol} (=$${purchaseAmount} USD) to DCA`
      );
    }
    if (!userPermittedAppVersion) {
      throw new Error(
        `User ${ethAddress} revoked permission to run this app. Used version to generate: ${app.version}`
      );
    }

    // Run the saved version or update to the currently permitted one if version is compatible
    const appVersionToRun = assertPermittedVersion(app.version, userPermittedAppVersion);
    sentryScope.addBreadcrumb({
      data: {
        app,
        appVersionToRun,
        userPermittedAppVersion,
      },
    });
    if (appVersionToRun !== app.version) {
      // User updated the permitted app version after creating the job, so we need to update it
      // eslint-disable-next-line no-param-reassign
      job.attrs.data.app = { ...job.attrs.data.app, version: appVersionToRun };
      await job.save();
    }

    consola.log('Job details', {
      ethAddress,
      purchaseAmount,
      userPermittedAppVersion,
      tokenIn: tokenIn.symbol,
      tokenInBalance: ethers.utils.formatUnits(tokenInBalance, tokenIn.decimals),
      tokenOut: tokenOut.symbol,
    });

    const swapOperationHash = await handleSwapExecution({
      delegatorAddress: ethAddress as `0x${string}`,
      pkpPublicKey: publicKey as `0x${string}`,
      tokenInAddress: tokenIn.address,
      tokenInAmount: _purchaseAmount,
      tokenInDecimals: tokenIn.decimals,
      tokenOutAddress: tokenOut.address,
    });

    const { txHash: swapHash } = await handleOperationExecution({
      isSponsored: alchemyGasSponsor,
      operationHash: swapOperationHash,
      pkpPublicKey: publicKey,
      provider: baseProvider,
    });

    sentryScope.addBreadcrumb({
      data: {
        swapHash,
      },
    });

    // Create a purchase record with all required fields
    const purchase = new PurchasedCoin({
      ethAddress,
      coinAddress: tokenOut.address,
      name: tokenOut.symbol,
      purchaseAmount: purchaseAmount.toFixed(2),
      scheduleId: _id,
      symbol: tokenOut.symbol,
      txHash: swapHash,
    });
    await purchase.save();

    consola.debug(
      `Successfully purchased ${purchaseAmount} ${tokenIn.symbol} of ${tokenOut.symbol} at tx hash ${swapHash}`
    );
  } catch (e) {
    // Catch-and-rethrow is usually an antipattern, but Agenda doesn't log failed job reasons to console
    // so this is our chance to log the job failure details using Consola before we throw the error
    // to Agenda, which will write the failure reason to the Agenda job document in Mongo
    const err = normalizeError(e);
    sentryScope.captureException(err);
    consola.error(err.message, err.stack);
    throw e;
  }
}
