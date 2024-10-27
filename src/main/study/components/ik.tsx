import { mdiVolumeHigh } from '@mdi/js';
import { For, ParentComponent, createResource } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import { onMounted } from '@/services/reactive';

import { useStudy } from '../services/study.context';

import s from './ik.module.scss';

onMounted;

const IK: ParentComponent = (properties) => {
  const { getImmersionKitExamples } = useStudy()!;

  const [examples] = createResource(
    () => [properties.children as string] as const,
    ([query]) => getImmersionKitExamples(query),
  );

  return (
    <div class={s.immersionKitComponent}>
      <Skeleton loading={!examples()}>
        <For each={examples()!.data}>
          {(d) => (
            <For each={d.examples}>
              {(example) => (
                <div class={s.example}>
                  <Button
                    onClick={() => void new Audio(example.sound_url).play()}
                    style={{
                      'background-image': `url(${example.image_url})`,
                    }}
                  >
                    <div class={s.overlay}>
                      <Icon path={mdiVolumeHigh} size='64' />
                    </div>
                    <div class={s.name}>{example.deck_name}</div>
                  </Button>
                  <div class={s.text}>
                    <div class={s.ja}>
                      <For
                        each={[
                          ...example.sentence_with_furigana.matchAll(/([\u4E00-\u9FAF]+?)\[([\u3040-\u309F]+?)\]/gsu),
                        ]}
                      >
                        {([, a, b]) => (
                          <ruby>
                            {a}
                            <rp>(</rp>
                            <rt>{b}</rt>
                            <rp>)</rp>
                          </ruby>
                        )}
                      </For>
                    </div>
                    <div class={s.en}>{example.translation}</div>
                  </div>
                </div>
              )}
            </For>
          )}
        </For>
      </Skeleton>
    </div>
  );
};
export default IK;
