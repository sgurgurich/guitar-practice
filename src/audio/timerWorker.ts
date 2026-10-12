// Workers aren't throttled like main-thread timers in background tabs,
// so the metronome keeps scheduling reliably when you switch away.
let id: ReturnType<typeof setInterval> | undefined;

self.onmessage = (e: MessageEvent<'start' | 'stop'>) => {
  if (e.data === 'start') {
    clearInterval(id);
    id = setInterval(() => postMessage('tick'), 25);
  } else {
    clearInterval(id);
    id = undefined;
  }
};
