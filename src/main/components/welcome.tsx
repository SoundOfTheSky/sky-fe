/* eslint-disable @typescript-eslint/require-await */
import { Component } from 'solid-js';
import { random } from '@/services/utils';
import { atom, persistentAtom, useInterval } from '@/services/reactive';

import s from './welcome.module.scss';

const A = '__________';
const B = '_____';
const C = B + '@' + location.hostname.toUpperCase();
export default (() => {
  const cmds = [
    async () => `${A}HELLO!${B}^^^^^^WELCUM^^OME TO___.___.___.${C}`,
    async () =>
      `${A}${
        navigator.hardwareConcurrency < 7
          ? `${A}Do you know that${B}@You have ${navigator.hardwareConcurrency} CPU cores?${B}@The more I^you know!${C}`
          : `${A}${navigator.hardwareConcurrency} CORES!?!??!${B}@PC MASTER RACE!${C}`
      }`,
    async () =>
      navigator.userAgent.includes('Firefox')
        ? `${A}Firefox rulez!${C}`
        : `${A}Mate, listen to me...${B}@Switch to Firefox${B}@It's better${C}`,
    async () => {
      const ip = await fetch('/api/ip').then((res) => res.text());
      const data = (await fetch(`/api/address`).then((res) => res.json())) as {
        country: string;
        regionName: string;
        city: string;
        lat: number;
        lon: number;
        proxy: boolean;
      };
      if (data.proxy) return `${A}Why do you${B}@use proxy?${C}`;
      return `${A}${ip}${B}@${data.country}${B}@${data.city}${B}@${data.lat} ${data.lon}${B}@RUN!${C}`;
    },
    async () => `TODO: Welcome msg${B}${'^'.repeat(18)}Hi! ${B}:___)${C}`,
    async () => `${A}I CAN USE EMOJIS!?${B}@🐋___💨${A}@Nice 🗿${C}`,
    async () => `${A}c===3 BENIS XD${C}`,
    async () => `${A}Mining bitcoin.___.___.___${B}@JK${C}`,
    // async () => `${A}Have you tried${B}@konami code?${C}`,
    async () => `${A}Plase be nice${B}@or not${B}@I'm not your dad${C}`,
    async () => `${A}ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ___ඞ${C}`,
    async () => `${A}Do you accept 🍪?${B}@YAS PLEASE!${B}@GIMME COOKIES!${C}`,
  ];

  const text = atom('');
  const seenAnimation = persistentAtom('seenWelcome', false);
  const animationEnded = atom(false);

  void cmds[seenAnimation() ? random(0, cmds.length - 1) : 0]().then((cmd) => {
    let i = 0;
    const interval = useInterval(100, () => {
      const key = cmd[i++];
      switch (key) {
        case undefined:
          clearInterval(interval);
          seenAnimation(true);
          animationEnded(true);
          break;
        case '_':
          break;
        case '^':
          text((x) => x.slice(0, -1));
          break;
        case '@':
          text('');
          break;
        default:
          text((x) => x + key);
      }
    });
  });
  return <div classList={{ card: true, [s.welcome]: true, [s.seen]: animationEnded() }}>{text()}</div>;
}) as Component;
