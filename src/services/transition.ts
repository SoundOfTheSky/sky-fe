type KeyframesTransitionOption = Record<string, string[] | number[]>
/**
 * Simpler transition options generator.
 * Delay is the delay before animation.
 * Can be set to true to automatically generate delay to hide one object and only then show another.
 */
export function createTransitionOptions(
  keyframes: KeyframesTransitionOption,
  duration: number,
  delay?: number | true,
) {
  const keyframeEntries = Object.entries(keyframes)
  const transition: {
    onBeforeEnter?: (element?: Element) => unknown
    onEnter: (element: Element, done: () => void) => unknown
    onAfterEnter?: (element: Element) => unknown
    onExit: (element: Element, done: () => void) => unknown
  } = {
    onEnter: async (element, done) =>
      element
        .animate(keyframes, {
          duration,
          delay: delay === true ? duration + 100 : delay,
        })
        .finished.then(done),
    onExit: async (element, done) =>
      element
        .animate(
          Object.fromEntries(
            keyframeEntries.map(([k, v]) => [k, [...v].reverse()]),
          ) as KeyframesTransitionOption,
          {
            duration,
          },
        )
        .finished.then(done),
  }
  if (delay) {
    let origStyles = ''
    transition.onBeforeEnter = (element) => {
      origStyles = element?.getAttribute('style') ?? ''
      element?.setAttribute(
        'style',
        origStyles
        + '; '
        + keyframeEntries.map(([k, v]) => `${kebabize(k)}: ${v[0]}`).join('; '),
      )
    }
    transition.onAfterEnter = (element) => {
      element.setAttribute('style', origStyles)
    }
  }

  return transition
}

const kebabize = (string_: string) =>
  string_.replaceAll(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? '-' : '') + $.toLowerCase(),
  )
export const opacityTransitionImmediate = createTransitionOptions(
  {
    opacity: [0, 1],
  },
  200,
)
export const opacityTransition = createTransitionOptions(
  {
    opacity: [0, 1],
  },
  200,
  true,
)
export const slideInTransition = createTransitionOptions(
  {
    transform: ['translateX(200%)', 'translateX(0)'],
  },
  500,
)
export const slideDownTransition = createTransitionOptions(
  {
    transform: ['translateY(200%)', 'translateY(0)'],
  },
  500,
)

export function changeNumberSmooth(
  start: number,
  end: number,
  time: number,
  callback: (number: number) => void,
) {
  const startTime = performance.now()
  const delta = end - start
  let frame = requestAnimationFrame(tick)
  function tick() {
    const timePassed = performance.now() - startTime
    if (timePassed >= time) {
      callback(end)
    }
    else {
      callback((timePassed / time) * delta + start)
      frame = requestAnimationFrame(tick)
    }
  }

  return frame
}
