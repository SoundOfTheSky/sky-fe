import { ParentComponent, Show } from 'solid-js';
import { mdiFingerprint } from '@mdi/js';
import { A } from '@solidjs/router';

import AuthStore from '@/services/auth.store';
import Icon from '@/components/icon';
import Loading from '@/components/loading/loading';
import { atom, model, persistentAtom, useGlobalEvent } from '@/services/reactive';
import { RequestError, showError } from '@/services/fetch';

import s from './auth.module.scss';

model;

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
          showError(error);
        }
      } else showError(error);
    }
    sendingCredentials(false);
  }

  useGlobalEvent('keypress', (event) => {
    if (AuthStore.user()) return;
    if (event.code === 'Enter') void login(username());
  });

  return (
    <Loading when={!AuthStore.loading()}>
      <Show
        when={AuthStore.user()}
        fallback={
          <div class={s.authComponent}>
            <div class={s.card}>
              <div class={s.webauthn}>
                <div class={s.welcome}>What is your name?</div>
                <div class={s.userLine}>
                  <input
                    type='text'
                    use:model={username}
                    name='username'
                    placeholder='Username'
                    autocomplete='on'
                    autofocus
                  />
                  <button onClick={() => void login(username())} disabled={sendingCredentials()}>
                    <Icon path={mdiFingerprint} size='48' inline />
                  </button>
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
    </Loading>
  );
}) as ParentComponent;
