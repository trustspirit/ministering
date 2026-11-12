import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serialQueue';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createSerialQueue', () => {
  it('runs jobs in submission order without overlap', async () => {
    const run = createSerialQueue();
    const log: string[] = [];
    let active = 0;
    let maxActive = 0;
    const job = (name: string, ms: number) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      log.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`end ${name}`);
      active--;
      return name;
    };
    const results = await Promise.all([run(job('a', 20)), run(job('b', 1)), run(job('c', 5))]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
    expect(maxActive).toBe(1);
  });

  it('does not let a rejected job block later jobs, and each caller gets its own outcome', async () => {
    const run = createSerialQueue();
    const err = new Error('boom');
    const p1 = run(async () => {
      await tick();
      throw err;
    });
    const p2 = run(async () => 'ok');
    await expect(p1).rejects.toBe(err);
    await expect(p2).resolves.toBe('ok');
  });
});
