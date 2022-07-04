import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/typescript-types';
import { createRoot } from 'solid-js';

import { atom } from './reactive';
import { RequestError, request } from './fetch';

export type User = {
  id: number;
  created: number;
  username: string;
  status: number;
  permissions: string[];
  avatar?: string;
};

export default createRoot(() => {
  // State
  const user = atom<User>();
  const authToken = atom<string | undefined>();
  const loading = atom(true);
  async function updateCurrentUser() {
    loading(true);
    try {
      const userData = await request<User>('/api/auth/me');
      user(userData);
      loading(false);
      return userData;
    } catch (error) {
      loading(false);
      if (error instanceof RequestError && error.code === 401) user(undefined);
      else throw error;
    }
  }
  async function register(username: string) {
    const resp = await request<PublicKeyCredentialCreationOptionsJSON>('/api/auth/register', {
      query: {
        username,
      },
    });
    const fingerprint = await startRegistration(resp);
    await request('/api/auth/register', {
      method: 'POST',
      body: fingerprint,
      query: {
        username,
      },
    });
    await updateCurrentUser();
  }

  async function login(username: string) {
    const resp = await request<PublicKeyCredentialRequestOptionsJSON>('/api/auth/login', {
      query: {
        username,
      },
    });
    const fingerprint = await startAuthentication(resp);
    await request('/api/auth/login', {
      method: 'POST',
      body: fingerprint,
      query: {
        username,
      },
    });
    await updateCurrentUser();
  }

  async function logout() {
    await request('/api/auth/logout');
    await updateCurrentUser();
  }

  async function updateData(data: { avatar?: string; username?: string }) {
    user(
      await request<User>('/api/auth/me', {
        method: 'POST',
        body: data,
      }),
    );
  }

  void updateCurrentUser();
  return {
    user,
    authToken,
    register,
    login,
    updateCurrentUser,
    logout,
    loading,
    updateData,
  };
});
