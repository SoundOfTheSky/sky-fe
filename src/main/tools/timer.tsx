/* eslint-disable jsx-a11y/control-has-associated-label */
import {
  mdiCheckCircle,
  mdiCheckCircleOutline,
  mdiDelete,
  mdiDrag,
  mdiPause,
  mdiPlay,
  mdiPlus,
  mdiRestore,
  mdiSkipNext,
  mdiSkipPrevious,
} from '@mdi/js'
import { For, Show } from 'solid-js'

import Input from '@/components/form/input'
import Icon from '@/components/icon'
import Tooltip from '@/components/tooltip'
import timerStore from '@/main/tools/timer.store'
import basicStore from '@/services/basic.store'
import { atom, useGlobalEvent } from '@/services/reactive'

import s from './timer.module.scss'

const { t } = basicStore
const {
  started,
  stageIndex,
  stage,
  timeLeft,
  stages,
  setStages,
  timerText,
  setDefaultSettings,
} = timerStore

export default function StudyTab() {
  // === Hooks ===
  useGlobalEvent('mousemove', moveDrag)
  useGlobalEvent('touchmove', moveDrag)
  useGlobalEvent('mouseup', stopDrag)
  useGlobalEvent('touchend', stopDrag)

  // === State ===
  const drag = atom<{
    y: number
    cy: number
    index: number
    cIndex: number
  }>()

  // === Functions ===
  function startDrag(event: MouseEvent | TouchEvent, index: number) {
    const y = 'touches' in event ? event.touches[0]!.clientY : event.clientY
    drag({
      y,
      cy: y,
      index,
      cIndex: index,
    })
    document.body.classList.add('dragging')
  }

  function moveDrag(event: MouseEvent | TouchEvent) {
    const $drag = drag()
    if (!$drag) return
    const cy = 'touches' in event ? event.touches[0]!.clientY : event.clientY
    const delta = cy - $drag.y
    drag({
      ...$drag,
      cy,
      cIndex: $drag.index + (((delta > 0 ? delta + 20 : delta - 20) / 40) | 0),
    })
  }

  function stopDrag() {
    const $drag = drag()
    if (!$drag) return
    const $stages = [...stages]
    $stages.splice($drag.cIndex, 0, $stages.splice($drag.index, 1)[0]!)
    if ($drag.index === stageIndex()) stageIndex($drag.cIndex)
    setStages($stages)
    drag(undefined)
    document.body.classList.remove('dragging')
  }

  function calculateOtherOffsetOnDrag(index: number) {
    const $drag = drag()
    if ($drag) {
      if ($drag.index < index && $drag.cIndex >= index) return -40
      if ($drag.index > index && $drag.cIndex <= index) return 40
    }
    return 0
  }

  return (
    <div class={'card-container ' + s.timer}>
      <div class={'card ' + s.timerCard}>
        <div
          class={s.line}
          style={{
            transform: `translateX(-${(timeLeft() / (stage().time * 60)) * 100}%)`,
            'background-color': stage().color,
            transition: started()
              ? 'transform 1.1s linear'
              : 'transform 0.1s linear',
          }}
        />
        <div class={s.title} style={{ color: stage().color }}>
          {stage().title}
        </div>
        <div class={s.timer}>{timerText()}</div>
        <div class={s.controls}>
          <Tooltip content={t('TIMER.PREVIOUS')}>
            <button
              onClick={() =>
                stageIndex((x) => (x === 0 ? stages.length - 1 : x - 1))
              }
            >
              <Icon path={mdiSkipPrevious} size='64' />
            </button>
          </Tooltip>
          <Tooltip content={t(started() ? 'TIMER.PAUSE' : 'TIMER.START')}>
            <button onClick={() => started((x) => !x)}>
              <Icon path={started() ? mdiPause : mdiPlay} size='64' />
            </button>
          </Tooltip>
          <Tooltip content={t('TIMER.NEXT')}>
            <button
              onClick={() =>
                stageIndex((x) => (x === stages.length - 1 ? 0 : x + 1))
              }
            >
              <Icon path={mdiSkipNext} size='64' />
            </button>
          </Tooltip>
        </div>
        <div class={s.road}>
          <For each={stages}>
            {(stage, index) => (
              <Tooltip content={`${stage.title} ${stage.time} min`}>
                <button
                  onClick={() => stageIndex(index())}
                  style={{
                    'background-color': stage.color,
                  }}
                  classList={{
                    [s.active!]: index() === stageIndex(),
                  }}
                />
              </Tooltip>
            )}
          </For>
        </div>
      </div>
      <div class={'card ' + s.settings}>
        <table
          class={s.tasks}
          classList={{
            [s.dragging!]: !!drag(),
          }}
        >
          <tbody>
            <For each={stages}>
              {(stage, index) => (
                <tr
                  style={
                    drag()
                      ? drag()!.index === index()
                        ? {
                            transform: `translateY(${drag()!.cy - drag()!.y}px)`,
                          }
                        : {
                            transform: `translateY(${calculateOtherOffsetOnDrag(index())}px)`,
                          }
                      : undefined
                  }
                  classList={{
                    [s.dragging!]: drag()?.index === index(),
                  }}
                >
                  <td class={s.icon} onClick={() => stageIndex(index())}>
                    <Icon
                      path={
                        index() === stageIndex()
                          ? mdiCheckCircle
                          : mdiCheckCircleOutline
                      }
                      size='32'
                    />
                  </td>
                  <td class={s.title}>
                    <Input
                      value={stage.title}
                      placeholder={t('COMMON.TITLE')}
                      onInput={(value) => {
                        setStages(index(), 'title', value)
                      }}
                    />
                  </td>
                  <td class={s.time}>
                    <Show
                      when={stage.time < 120}
                      fallback={
                        <Input
                          type='number'
                          value={stage.time.toString()}
                          onChange={(event) => {
                            const value = Number.parseInt(event.target.value)
                            setStages(index(), 'time', value > 0 ? value : 1)
                          }}
                        />
                      }
                    >
                      <Input
                        type='range'
                        min={1}
                        max={120}
                        value={stage.time.toString()}
                        onInput={(value) => {
                          setStages(index(), 'time', Number.parseInt(value))
                        }}
                        badgeCustomText={(value) =>
                          `${value} ${t('TIMER.MINUTES')!}`
                        }
                      />
                    </Show>
                  </td>
                  <td class={s.color}>
                    <Input
                      type='color'
                      value={stage.color}
                      onInput={(value) => {
                        setStages(index(), 'color', value)
                      }}
                    />
                  </td>
                  <td
                    class={s.drag}
                    onMouseDown={(event) => {
                      startDrag(event, index())
                    }}
                    onTouchStart={(event) => {
                      startDrag(event, index())
                    }}
                  >
                    <Icon path={mdiDrag} size='32' />
                  </td>
                  <td class={s.icon}>
                    <Tooltip content={t('TIMER.REMOVE_TASK')}>
                      <button
                        disabled={stages.length === 1}
                        class={s.add}
                        onClick={() => {
                          setStages(
                            stages.filter((_, index2) => index2 !== index()),
                          )
                        }}
                      >
                        <Icon path={mdiDelete} size='32' />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )}
            </For>
            <tr>
              <td colSpan='3'>
                <Tooltip content={t('TIMER.ADD_TASK')}>
                  <button
                    class={s.add}
                    onClick={() => {
                      setStages(stages.length, {
                        color:
                          '#' +
                          (((1 << 24) * Math.random()) | 0)
                            .toString(16)
                            .padStart(6, '0'),
                        time: 10,
                        title: '',
                      })
                    }}
                  >
                    <Icon path={mdiPlus} size='32' />
                  </button>
                </Tooltip>
              </td>
              <td colSpan='3'>
                <Tooltip content={t('TIMER.RESTORE_DEFAULTS')}>
                  <button class={s.add} onClick={setDefaultSettings}>
                    <Icon path={mdiRestore} size='32' />
                  </button>
                </Tooltip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
