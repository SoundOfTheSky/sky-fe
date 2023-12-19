import { Component } from 'solid-js';
import { mdiExitRun } from '@mdi/js';
import { createWritableMemo } from '@solid-primitives/memo';

import AuthStore from '@/services/auth.store';
import Icon from '@/components/icon';
import BasicStore, { NotificationType } from '@/services/basic.store';
import { atomize, persistentAtom } from '@/services/reactive';
import { handleError } from '@/services/fetch';
import Auth from '@/components/auth';
import Input from '@/components/form/input';
import Toggle from '@/components/form/toggle';
import Button from '@/components/form/button';

import s from './profile.module.scss';

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
      handleError(error);
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
            <Input value={username} placeholder='Username' onChange={userDataChange} />
          </div>
          <div class={s.field}>
            <div>Avatar URL:</div>
            <Input value={avatar} placeholder='URL' onChange={userDataChange} />
          </div>
        </div>
        <div class={`card ${s.settings}`}>
          <div class='card-title'>Settings</div>
          <div class={s.field}>
            <Toggle value={fontPixelization} label='Font pixelization' />
          </div>
          <div class={s.field}>
            <Toggle value={JPFontPixelization} label='日本語 font pixelization' />
          </div>
        </div>
        <Button class={`card ${s.logout}`} onClick={() => AuthStore.logout()}>
          <div>Logout</div>
          <Icon path={mdiExitRun} size='48' />
        </Button>
      </div>
    </Auth>
  );
}) as Component;
