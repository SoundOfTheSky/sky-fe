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
  const sendingCredentials = atom(false);
  const username = persistentAtom('last_user', '');

  async function login(username: string) {
    if (sendingCredentials()) return;
    sendingCredentials(true);
    try {
      await AuthStore.login(username);
    } catch (error) {
      if (error instanceof RequestError && error.body === 'User not found') {
        try {
          await AuthStore.register(username);
        } catch (error) {
          handleError(error);
        }
      } else handleError(error);
    }
    sendingCredentials(false);
  }

  useGlobalEvent('keypress', (event) => {
    if (AuthStore.me() || AuthStore.loading()) return;
    if (event.code === 'Enter') void login(username().trim());
  });

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
