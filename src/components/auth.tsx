import { mdiFingerprint } from '@mdi/js';
import { A } from '@solidjs/router';
import { ParentComponent, Show } from 'solid-js';

import Icon from '@/components/icon';
import AuthStore from '@/services/auth.store';
import { RequestError, handleError } from '@/services/fetch';
import { atom, persistentAtom, useGlobalEvent } from '@/services/reactive';

import Button from './form/button';
import Input from './form/input';

import s from './auth.module.scss';

export default ((properties) => {
  // === Hooks ===
  useGlobalEvent('keypress', (event) => {
    if (AuthStore.me() || AuthStore.loading()) return;
    if (event.code === 'Enter') void login(username().trim());
  });
  // onMount(() => {
  //   void browserFigerprint().then((x) => console.log(x));
  // });

  // === State ===
  const sendingCredentials = atom(false);
  const username = persistentAtom('last_user', '');

  // === Functions ===
  async function login(username: string) {
    if (sendingCredentials()) return;
    sendingCredentials(true);
    try {
      await AuthStore.login(username);
    } catch (error) {
      if (error instanceof RequestError && error.body === 'User not found') {
        try {
          await AuthStore.register({ username });
        } catch (error) {
          handleError(error);
        }
      } else handleError(error);
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
            <div class={s.webauthn}>
              <div class={s.welcome}>Login to acess this page</div>
              <div class={s.userLine}>
                <Input value={username} name='username' placeholder='Username' autocomplete='on' autofocus />
                <Button onClick={() => void login(username())} disabled={sendingCredentials()}>
                  <Icon path={mdiFingerprint} size='48' inline />
                </Button>
              </div>
            </div>
            <A class={s.navigate} href='/'>
              Home
            </A>
          </div>
        </div>
      }
    >
      {properties.children}
    </Show>
  );
}) as ParentComponent;
