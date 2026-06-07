class Semaphore {
  constructor(max, maxQueue) {
    this.max = Math.max(1, max);
    this.maxQueue = Math.max(0, maxQueue);
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current += 1;
      return;
    }

    if (this.queue.length >= this.maxQueue) {
      throw busyError();
    }

    await new Promise((resolve) => {
      this.queue.push(resolve);
    });
    this.current += 1;
  }

  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

function busyError() {
  const err = new Error(
    'Servidor ocupado com outras análises. Aguarde e tente novamente em instantes.'
  );
  err.statusCode = 503;
  err.code = 'ANALYSIS_BUSY';
  return err;
}

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_ANALYSES || '2', 10);
const MAX_QUEUE = parseInt(process.env.MAX_ANALYSIS_QUEUE || '3', 10);

const analysisSemaphore = new Semaphore(MAX_CONCURRENT, MAX_QUEUE);

async function withAnalysisSlot(fn) {
  await analysisSemaphore.acquire();
  try {
    return await fn();
  } finally {
    analysisSemaphore.release();
  }
}

module.exports = { withAnalysisSlot, analysisSemaphore };
