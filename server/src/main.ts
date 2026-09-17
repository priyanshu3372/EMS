import { createApp } from './app'
import { env } from './config/env'

const server = createApp().listen(env.PORT, () => {
  console.log(`  EMS server  http://localhost:${env.PORT}  [${env.NODE_ENV}]`)
})

/**
 * Close the listener before exiting so in-flight requests finish. Day 2 adds
 * prisma.$disconnect() here.
 */
function shutdown(signal: string) {
  console.log(`\n  ${signal} received — shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
