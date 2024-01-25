import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import { createRoot } from 'solid-js';

import { atom, useInterval } from './reactive';
import { RequestError, request } from './fetch';
import basicStore from './basic.store';

export type User = {
  id: number;
  created: number;
  username: string;
  status: number;
  permissions: string[];
  avatar?: string;
};

export default createRoot(() => {
  // === State ===
  const user = atom<User>();
  const authToken = atom<string | undefined>();
  const loading = atom(true);
  // === Effects ===
  // Then offline retry connection
  useInterval(10000, () => {
    if (basicStore.online()) return;
    void updateCurrentUser().then(() => {
      basicStore.online(true);
    });
  });
  useInterval(3600000, updateCurrentUser);
  // === Functions ===
  async function updateCurrentUser() {
    loading(true);
    try {
      const userData = await request<User>('/api/auth/me');
      user(userData);
      loading(false);
      return userData;
    } catch (error) {
      loading(false);
      if (error instanceof RequestError) {
        if (error.code === 401) user(undefined);
        else {
          basicStore.online(false);
          throw error;
        }
      }
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
  async function getRegLink() {
    return request<string>('/api/auth/reg-link');
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
    getRegLink,
  };
});
