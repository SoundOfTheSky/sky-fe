import { Component, For, Show, batch, onCleanup } from 'solid-js';
import { Transition } from 'solid-transition-group';

import * as webSocket from '@/services/web-socket';
import Loading from '@/components/loading/loading';
import { atom, useGlobalEvent } from '@/services/reactive';
import { opacityTransitionImmediate } from '@/services/transition';
import Input from '@/components/form/input';
import Button from '@/components/form/button';

import s from './chat.module.scss';

type ChatMessage = {
  username?: string;
  avatar?: string;
  time: number;
  text: string;
};
type Credentials = {
  username: string;
  avatar?: string;
};

const Chat: Component = () => {
  // === State ===
  const viewAvatar = atom<string>();
  const sendingMessage = atom(false);
  const message = atom('');
  const messages = atom<ChatMessage[]>([]);
  const credentials = atom<Credentials>();

  // === Functions ===
  function lostConnection() {
    credentials(undefined);
  }
  function addMessages(data?: string) {
    if (!data) return;
    batch(() => {
      const msgs = JSON.parse(data) as ChatMessage[];
      const $credentials = credentials();
      if (msgs.some((msg) => msg.username === $credentials?.username)) {
        sendingMessage(false);
        message('');
      }
      messages((x) => [...x, ...msgs]);
    });
  }
  function subscribe() {
    // Timeout so we can be sure that credentials are synchronized with other tabs
    setTimeout(() => {
      if (credentials()) return;
      messages([]);
      webSocket.send('publicChatSubscribe');
    }, 200);
  }
  function subscribed(data?: string) {
    if (!data) return;
    credentials(JSON.parse(data) as Credentials);
  }
  function sendMessage() {
    if (sendingMessage() || !message() || webSocket.status !== webSocket.WebSocketStatus.connected) return;
    webSocket.send('publicChat', message());
    sendingMessage(true);
  }
  function onWSError(error?: string) {
    if (error?.startsWith('[PublicChat] ')) sendingMessage(false);
  }

  // === Hooks ===
  useGlobalEvent('keypress', (event) => {
    if (event.code === 'Enter') sendMessage();
  });

  if (webSocket.status === webSocket.WebSocketStatus.connected) subscribe();
  webSocket.on('connected', subscribe);
  webSocket.on('close', lostConnection);
  webSocket.on('connecting', lostConnection);
  webSocket.on('publicChatSubscribe', subscribed);
  webSocket.on('publicChat', addMessages);
  webSocket.on('error', onWSError);
  onCleanup(() => {
    if (webSocket.status === webSocket.WebSocketStatus.connected) webSocket.send(`unsubscribePublicChat`);
    webSocket.off('connected', subscribe);
    webSocket.off('close', lostConnection);
    webSocket.off('connecting', lostConnection);
    webSocket.off('subscribePublicChat', subscribed);
    webSocket.off('publicChatMessage', addMessages);
    webSocket.off('error', onWSError);
  });

  return (
    <Loading when={credentials()}>
      <div class={`card ${s.chat}`}>
        <div class='card-title'>CHAT</div>
        <Transition {...opacityTransitionImmediate}>
          <Show when={viewAvatar()}>
            <Button class={s.avatarView} onClick={() => viewAvatar(undefined)}>
              <img alt='Avatar' src={viewAvatar()} />
            </Button>
          </Show>
        </Transition>
        <div class={s.messages}>
          <div>
            <For each={messages()}>
              {(message) => (
                <div class={s.message}>
                  <Button onClick={() => viewAvatar(message.avatar ?? '/avatar.webp')} class={s.avatar}>
                    <img alt={message.username} src={message.avatar ?? '/avatar.webp'} />
                  </Button>
                  <div class={s.line}>
                    <span class={s.username}>{`<${message.username}>`}</span>
                    <span>: </span>
                    <span class={s.text}>{message.text}</span>
                  </div>
                  <span class={s.time}>{new Date(message.time).toLocaleTimeString()}</span>
                </div>
              )}
            </For>
          </div>
        </div>
        <Input value={message} placeholder='Enter your message' disabled={sendingMessage()} />
      </div>
    </Loading>
  );
};

export default Chat;
