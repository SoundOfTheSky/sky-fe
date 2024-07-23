import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { batch, createRoot } from 'solid-js';

import basicStore from './basic.store';
import { RequestError, request } from './fetch';
import { atom, persistentAtom, useInterval } from './reactive';
import { HOUR_MS, noop } from './utils';

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

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
  const me = persistentAtom<User | undefined>('me', undefined);
  const ready = atom(false);
  const loading = atom(true);

  // === Effects ===
  // Then offline retry connection
  useInterval(() => {
    if (basicStore.online()) return;
    void updateCurrentUser().catch(noop);
  }, 10000);
  useInterval(updateCurrentUser, HOUR_MS);

  // === Functions ===
  async function updateCurrentUser() {
    loading(true);
    try {
      const userData = await request<User>('/api/auth/me');
      batch(() => {
        me(userData);
        basicStore.online(true);
        loading(false);
      });
      return userData;
    } catch (error) {
      loading(false);
      if (error instanceof RequestError) {
        if (error.code === 401) me(undefined);
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
    me(
      await request<User>('/api/auth/me', {
        method: 'POST',
        body: data,
      }),
    );
  }
  async function getRegLink() {
    return request<string>('/api/auth/reg-link');
  }
  void updateCurrentUser()
    .catch(noop)
    .finally(() => ready(true));

  return {
    me,
    register,
    login,
    updateCurrentUser,
    logout,
    loading,
    ready,
    updateData,
    getRegLink,
  };
});
