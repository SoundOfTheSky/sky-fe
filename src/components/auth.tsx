import { ParentComponent, Show } from 'solid-js';

import AuthStore from '@/services/auth.store';
import { handleError } from '@/services/fetch';
import { atom, useGlobalEvent } from '@/services/reactive';

import Input from './form/input';

import s from './auth.module.scss';

export default ((properties) => {
  // === Hooks ===
  useGlobalEvent('keypress', (event) => {
    if (AuthStore.me() || AuthStore.loading()) return;
    if (event.code === 'Enter') void login();
  });

  // === State ===
  const sendingCredentials = atom(false);
  const username = atom('');
  const password = atom('');

  // === Functions ===
  async function login() {
    if (sendingCredentials()) return;
    sendingCredentials(true);
    try {
      await AuthStore.login({
        username: username().trim(),
        password: password().trim(),
      });
    } catch (error) {
      handleError(error);
    }
    sendingCredentials(false);
  }
  async function register() {
    if (sendingCredentials()) return;
    sendingCredentials(true);
    try {
      await AuthStore.register({
        username: username().trim(),
        password: password().trim(),
      });
    } catch (error) {
      handleError(error);
    }
    sendingCredentials(false);
  }
  // async function browserFigerprint() {
  //   const tests = [canvasFigreprint, screenFingerprint];
  //   const results = await Promise.all(tests.map((x) => x()));
  //   await wait(1000);
  //   const results2 = await Promise.all(tests.map((x) => x()));
  //   await wait(2000);
  //   const results3 = await Promise.all(tests.map((x) => x()));
  //   return results.map((x, i) => (x !== undefined && x === results2[i] && x === results3[i] ? x : '')).join('|');
  // }
  // function canvasFigreprint() {
  //   const text = 'abcdefghijklmnopqrstuvwxyz, .!@#$%^&*()-=|😃';
  //   const canvas = document.createElement('canvas');
  //   canvas.height = 24;
  //   canvas.width = 380;
  //   const ctx = canvas.getContext('2d')!;
  //   ctx.textBaseline = 'alphabetic';
  //   ctx.fillStyle = '#f60';
  //   ctx.fillRect(125, 1, 62, 20);
  //   ctx.fillStyle = '#069';
  //   ctx.font = '7pt no-real-font-123';
  //   ctx.fillText(text, 2, 15);
  //   ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  //   ctx.font = '13pt Arial';
  //   ctx.fillText(text, 4, 17);
  //   document.body.appendChild(canvas);
  //   return canvas.toDataURL();
  // }
  // function screenFingerprint() {
  //   const w = window;
  //   const s = w.screen as unknown as Record<string, number>;
  //   return [
  //     s.width,
  //     s.height,
  //     s.colorDepth,
  //     s.availTop,
  //     s.availLeft,
  //     s.availHeight,
  //     s.availWidth,
  //     s.left,
  //     s.top,
  //     w.innerHeight,
  //     w.outerHeight,
  //     w.outerWidth,
  //     w.innerWidth,
  //     w.screenX,
  //     w.pageXOffset,
  //     w.pageYOffset,
  //     document.body.clientWidth,
  //     document.body.clientHeight,
  //     screen.pixelDepth,
  //     w.devicePixelRatio,
  //   ]
  //     .map((x) => (x === undefined ? 0 : x))
  //     .join(',');
  // }
  // async function permissionsFingerprint() {
  //   return (
  //     await Promise.all(
  //       (
  //         [
  //           'accelerometer',
  //           'accessibility',
  //           'ambient-light-sensor',
  //           'camera',
  //           'clipboard-read',
  //           'clipboard-write',
  //           'geolocation',
  //           'background-sync',
  //           'magnetometer',
  //           'microphone',
  //           'midi',
  //           'notifications',
  //           'payment-handler',
  //           'persistent-storage',
  //           'push',
  //         ] as PermissionName[]
  //       ).map(async (name) => {
  //         try {
  //           const r = await navigator.permissions.query({
  //             name,
  //           });
  //           return r.state;
  //         } catch {
  //           return 'e';
  //         }
  //       }),
  //     )
  //   ).join(',');

  //   const t = {};
  //   for (const r in e) {
  //     const o = e[r];
  //     try {
  //       const { state: e } = await navigator.permissions.query({
  //         name: o,
  //       });
  //       t[o] = e;
  //     } catch (e) {
  //       t[o] = i(8156).O2;
  //     }
  //   }
  // }

  return (
    <Show
      when={AuthStore.me()}
      fallback={
        <div class={s.authComponent}>
          <div class={s.card}>
            <div class={s.content}>
              <div class={s.welcome}>Authentication</div>
              <Input
                value={username}
                name='username'
                placeholder='Имя пользователя'
                autocomplete='on'
                autofocus
              />
              <Input
                value={password}
                name='password'
                placeholder='Пароль'
                type='password'
              />
            </div>
            <div class={s.buttons}>
              <button onClick={login}>Login</button>
              <button onClick={register}>Register</button>
            </div>
          </div>
        </div>
      }
    >
      {properties.children}
    </Show>
  );
}) as ParentComponent;
