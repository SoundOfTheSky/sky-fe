import { mdiExitRun } from '@mdi/js';
import { createWritableMemo } from '@solid-primitives/memo';
import { Component } from 'solid-js';

import Auth from '@/components/auth';
import Button from '@/components/form/button';
import Input from '@/components/form/input';
import Icon from '@/components/icon';
import AuthStore from '@/services/auth.store';
import BasicStore, { NotificationType } from '@/services/basic.store';
import { handleError } from '@/services/fetch';
import { atomize } from '@/services/reactive';

import s from './profile.module.scss';

export default (() => {
  // === State ===
  let avatarElement: HTMLImageElement;
  const avatar = atomize(createWritableMemo(() => AuthStore.me()?.avatar ?? ''));
  const imageURL = atomize(createWritableMemo(() => avatar()));
  const username = atomize(createWritableMemo(() => AuthStore.me()?.username ?? ''));
  // const fontPixelization = persistentAtom('fontPixelization', true);
  // const JPFontPixelization = persistentAtom('JPFontPixelization', true);

  // === Functions ===
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
          <div class='card-title'>Предпросмотр аватара</div>
          <img class={s.avatar} src={imageURL() || '/avatar.webp'} alt='My avatar' ref={avatarElement!} />
        </div>
        <div class={`card ${s.info}`}>
          <div class='card-title'>Редактировать профиль</div>
          <div class={s.field}>
            <div>Имя пользователя:</div>
            <Input value={username} placeholder='Имя пользователя' onChange={userDataChange} />
          </div>
          <div class={s.field}>
            <div>Аватар (URL):</div>
            <Input value={avatar} placeholder='URL' onChange={userDataChange} />
          </div>
        </div>
        <Button class={`card ${s.logout}`} onClick={() => AuthStore.logout()}>
          <div>Выйти</div>
          <Icon path={mdiExitRun} size='48' />
        </Button>
      </div>
    </Auth>
  );
}) as Component;
