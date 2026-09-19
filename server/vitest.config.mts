import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Neon's free tier suspends its compute when idle, so the first query after
    // a pause has to wait for it to wake — routinely 5-10 seconds. The defaults
    // (5s test, 10s hook) fail on that alone, which looks like a broken test
    // rather than a sleeping database.
    testTimeout: 30_000,
    hookTimeout: 60_000,

    // Integration tests share one database. Running files in parallel would let
    // one file's cleanup delete another's fixtures mid-run.
    fileParallelism: false,
  },
})
