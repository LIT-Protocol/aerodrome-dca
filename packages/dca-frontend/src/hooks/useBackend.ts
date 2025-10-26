import { useCallback } from 'react';

import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';

const { VITE_APP_ID, VITE_BACKEND_URL, VITE_REDIRECT_URI } = env;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type DCA = {
  lastRunAt: string;
  nextRunAt: string;
  lastFinishedAt: string;
  failedAt: string;
  _id: string;
  disabled: boolean;
  failReason: string;
  data: {
    name: string;
    purchaseAmount: number;
    purchaseIntervalHuman: string;
    vincentAppVersion: number;
    pkpInfo: {
      ethAddress: string;
      publicKey: string;
      tokenId: string;
    };
    updatedAt: string;
    tokenIn: {
      address: `0x${string}`;
      symbol: string;
      decimals: number;
    };
    tokenOut: {
      address: `0x${string}`;
      symbol: string;
      decimals: number;
    };
  };
};

export interface CreateDCARequest {
  name: string;
  purchaseAmount: string;
  purchaseIntervalHuman: string;
  tokenIn: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  tokenOut: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
}

export const useBackend = () => {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(VITE_APP_ID);

  const getJwt = useCallback(() => {
    // Redirect to Vincent Auth consent page with appId and version
    vincentWebAuthClient.redirectToConnectPage({
      // consentPageUrl: `http://localhost:3000/`,
      redirectUri: VITE_REDIRECT_URI,
    });
  }, [vincentWebAuthClient]);

  const sendRequest = useCallback(
    async <T>(endpoint: string, method: HTTPMethod, body?: unknown): Promise<T> => {
      if (!authInfo?.jwt) {
        throw new Error('No JWT to query backend');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${authInfo.jwt}`,
      };
      if (body != null) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${VITE_BACKEND_URL}${endpoint}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as { data: T; success: boolean };

      if (!json.success) {
        throw new Error(`Backend error: ${json.data}`);
      }

      return json.data;
    },
    [authInfo]
  );

  const createDCA = useCallback(
    async (dca: CreateDCARequest) => {
      return sendRequest<DCA>('/schedule', 'POST', dca);
    },
    [sendRequest]
  );

  const getDCAs = useCallback(async () => {
    return sendRequest<DCA[]>('/schedules', 'GET');
  }, [sendRequest]);

  const disableDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}/disable`, 'PUT');
    },
    [sendRequest]
  );

  const enableDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}/enable`, 'PUT');
    },
    [sendRequest]
  );

  const editDCA = useCallback(
    async (scheduleId: string, dca: CreateDCARequest) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}`, 'PUT', dca);
    },
    [sendRequest]
  );

  const deleteDCA = useCallback(
    async (scheduleId: string) => {
      return sendRequest<DCA>(`/schedules/${scheduleId}`, 'DELETE');
    },
    [sendRequest]
  );

  const getTokens = useCallback(async () => {
    return sendRequest<
      Array<{
        address: `0x${string}`;
        symbol: string;
        name?: string;
        decimals: number;
        listed: boolean;
      }>
    >('/tokens', 'GET');
  }, [sendRequest]);

  return {
    createDCA,
    deleteDCA,
    disableDCA,
    editDCA,
    enableDCA,
    getDCAs,
    getJwt,
    getTokens,
  };
};
