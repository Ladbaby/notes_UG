/**
 * Runs the VitePress build with a bounded V8 heap.
 *
 * Why: on this content set the build peaks around 3.1GB. Left unbounded, V8
 * happily grows its heap toward whatever the machine has, which on a 16GB
 * laptop with other apps open means swapping or an OOM kill. Capping the old
 * space keeps the build well inside the machine's budget and fails fast with a
 * clear message instead of freezing the desktop.
 *
 * The cap is deliberately above the measured peak so normal builds never hit
 * it. Override with BUILD_HEAP_MB when running somewhere roomier.
 */
import { spawn } from 'node:child_process'

const MB = Number(process.env.BUILD_HEAP_MB) || 3072

const args = ['vitepress', 'build', 'docs']
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const child = spawn(npx, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NODE_OPTIONS: `--max-old-space-size=${MB} ${process.env.NODE_OPTIONS || ''}`.trim(),
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`\nvitepress build killed by ${signal}`)
    process.exit(1)
  }
  if (code !== 0) {
    console.error(
      `\nvitepress build failed (exit ${code}).\n` +
        `If this was an out-of-memory error, raise the cap:\n` +
        `  BUILD_HEAP_MB=4096 npm run build\n`
    )
  }
  process.exit(code ?? 1)
})

child.on('error', (err) => {
  console.error('failed to start vitepress build:', err.message)
  process.exit(1)
})
