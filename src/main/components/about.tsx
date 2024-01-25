import { For, Component } from 'solid-js';

import Tooltip from '@/components/tooltip';

import s from './about.module.scss';

export default (() => {
  let stupido: HTMLImageElement;
  const TECH_ICONS = [
    ['JavaScript', 'js'],
    ['TypeScript', 'ts'],
    ['NodeJS', 'nodejs'],
    ['BunJS', 'bun'],
    ['ReactJS', 'reactjs'],
    ['VueJS', 'vuejs'],
    ['AngularJS', 'angularjs'],
    ['SolidJS', 'solidjs'],
    ['SQL', 'sql'],
    ['MongoDB', 'mongo'],
  ];
  return (
    <div class={`card ${s.about}`}>
      <div class='card-title'>About me</div>
      <div class={s.me}>
        <table class={s.stats}>
          <tbody>
            <tr>
              <td>
                <b>Name:</b>
              </td>
              <td>Nikita Tkachev (a.k.a SoundOfTheSky)</td>
            </tr>
            <tr>
              <td>
                <b>Class:</b>
              </td>
              <td>Fullstack JavaScript Developer</td>
            </tr>
            <tr>
              <td>
                <b>Age:</b>
              </td>
              <td>{Math.floor((Date.now() - new Date('2000-12-21').getTime()) / 31_536_000_000)}</td>
            </tr>
            <tr>
              <td>
                <b>Experience:</b>
              </td>
              <td>
                {`${Math.floor(((Date.now() - new Date('2018-12-01').getTime()) / 31_536_000_000) * 10) / 10} years`}
              </td>
            </tr>
            <tr>
              <td>
                <b>Tech:</b>
              </td>
              <td>
                <div class={s.icons}>
                  <For each={TECH_ICONS}>
                    {([name, path]) => (
                      <Tooltip content={name}>
                        <img alt={name} title={name} src={`/tech-icons/${path}.webp`} />
                      </Tooltip>
                    )}
                  </For>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <b>Contact me:</b>
              </td>
              <td>
                <div class={s.icons}>
                  <Tooltip content='LinkedIn'>
                    <a href='https://www.linkedin.com/in/SoundOfTheSky/' target='_blank'>
                      <img alt='LinkedIn' title='LinkedIn' src='/tech-icons/linkedin.webp' />
                    </a>
                  </Tooltip>
                  <Tooltip content='Telegram'>
                    <a href='https://t.me/RocketPharah' target='_blank'>
                      <img alt='Telegram' title='Telegram' src='/tech-icons/telegram.webp' />
                    </a>
                  </Tooltip>
                  <Tooltip content='Email'>
                    <a
                      href="mailto:tkachiov.2000@gmail.com?subject=Website&body=Hi! I've seen your website and..."
                      target='_blank'
                    >
                      <img alt='Email' title='Email' src='/tech-icons/email.webp' />
                    </a>
                  </Tooltip>
                  <Tooltip content='Phone'>
                    <a href='tel:89887083181' target='_blank'>
                      <img alt='Telehone number' title='Telehone number' src='/tech-icons/telephone.webp' />
                    </a>
                  </Tooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <img
          alt='stupido'
          ref={stupido!}
          class={s.stupido}
          src='https://sun2-4.userapi.com/s/v1/ig2/-g71IWaRAmuRgSuR-X2NBVTHZIBte5kRhY4AzldwwZeg9qywOmMVGwhuPJPkrd6sB2n_JmwtqpTPEzU_ZJ4ne1cp.jpg?size=244x244&quality=95&crop=12,9,244,244&ava=1'
        />
      </div>
    </div>
  );
}) as Component;
