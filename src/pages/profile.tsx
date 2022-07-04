import { Component } from 'solid-js';
import { mdiExitRun } from '@mdi/js';
import { createWritableMemo } from '@solid-primitives/memo';

import AuthStore from '@/services/auth.store';
import Icon from '@/components/icon';
import BasicStore, { NotificationType } from '@/services/basic.store';
import { atomize, model, modelCheckbox, persistentAtom } from '@/services/reactive';
import { showError } from '@/services/fetch';
import Auth from '@/components/auth';

import s from './profile.module.scss';

model;
modelCheckbox;

export default (() => {
  let avatarElement: HTMLImageElement;
  const avatar = atomize(createWritableMemo(() => AuthStore.user()?.avatar ?? ''));
  const imageURL = atomize(createWritableMemo(() => avatar()));
  const username = atomize(createWritableMemo(() => AuthStore.user()?.username ?? ''));
  const fontPixelization = persistentAtom('fontPixelization', true);
  const JPFontPixelization = persistentAtom('JPFontPixelization', true);

  async function userDataChange() {
    if (!avatarElement.complete || avatarElement.naturalHeight === 0) {
      BasicStore.notify({
        title: 'Can not load avatar URL',
        type: NotificationType.Error,
        timeout: 5000,
      });
      return;
    }
    try {
      await AuthStore.updateData({
        avatar: avatar(),
        username: username(),
      });
    } catch (error) {
      showError(error);
    }
  }

  return (
    <Auth>
      <div class='card-container'>
        <div class='card'>
          <div class='card-title'>Avatar preview</div>
          <img class={s.avatar} src={imageURL() || '/avatar.webp'} alt='My avatar' ref={avatarElement!} />
        </div>
        <div class={`card ${s.info}`}>
          <div class='card-title'>Edit profile</div>
          <div class={s.field}>
            <div>Username:</div>
            <input type='text' use:model={username} placeholder='Username' onChange={userDataChange} />
          </div>
          <div class={s.field}>
            <div>Avatar URL:</div>
            <input type='text' use:model={avatar} placeholder='URL' onChange={userDataChange} />
          </div>
        </div>
        <div class={`card ${s.settings}`}>
          <div class='card-title'>Settings</div>
          <div class={s.field}>
            <div>Font pixelization:</div>
            <input type='checkbox' use:modelCheckbox={fontPixelization} />
          </div>
          <div class={s.field}>
            <div>Japanese font pixelization:</div>
            <input type='checkbox' use:modelCheckbox={JPFontPixelization} />
          </div>
        </div>
        <button class={`card ${s.logout}`} onClick={() => AuthStore.logout()}>
          <div>Logout</div>
          <Icon path={mdiExitRun} size='48' />
        </button>
      </div>
    </Auth>
  );
}) as Component;
