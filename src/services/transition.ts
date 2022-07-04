type KeyframesTransitionOption = Record<string, string[] | number[]>;
export function createTransitionOptions(keyframes: KeyframesTransitionOption, duration: number, delay?: number | true) {
  const keyframeEntries = Object.entries(keyframes);
  const initialStyles = delay ? keyframeEntries.map(([k, v]) => `${kebabize(k)}: ${v[0]}`).join('; ') : '';
  const transition: {
    onBeforeEnter?: (element?: Element) => unknown;
    onEnter: (element: Element, done: () => void) => unknown;
    onAfterEnter?: (element: Element) => unknown;
    onExit: (element: Element, done: () => void) => unknown;
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
          Object.fromEntries(keyframeEntries.map(([k, v]) => [k, [...v].reverse()])) as KeyframesTransitionOption,
          {
            duration,
          },
        )
        .finished.then(done),
  };
  if (delay) {
    transition.onBeforeEnter = (element) => {
      element?.setAttribute('style', initialStyles);
    };

    transition.onAfterEnter = (element) => {
      element.removeAttribute('style');
    };
  }

  return transition;
}

const kebabize = (string_: string) =>
  string_.replaceAll(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
export const opacityTransitionImmediate = createTransitionOptions(
  {
    opacity: [0, 1],
  },
  200,
);
export const opacityTransition = createTransitionOptions(
  {
    opacity: [0, 1],
  },
  200,
  true,
);
export const slideInTransition = createTransitionOptions(
  {
    transform: ['translateX(200%)', 'translateX(0)'],
  },
  500,
);
export const slideDownTransition = createTransitionOptions(
  {
    transform: ['translateY(200%)', 'translateX(0)'],
  },
  500,
);

export function changeNumberSmooth(start: number, end: number, time: number, callback: (number: number) => void) {
  const startTime = Date.now();
  const delta = end - start;
  let frame = requestAnimationFrame(tick);
  function tick() {
    const timePassed = Date.now() - startTime;
    if (timePassed >= time) {
      callback(end);
      frame = requestAnimationFrame(tick);
    } else {
      callback((timePassed / time) * delta + start);
    }
  }

  return frame;
}
