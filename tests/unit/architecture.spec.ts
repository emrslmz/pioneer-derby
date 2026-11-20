// @vitest-environment node
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * X7 — proves the architecture rules are enforced, not just documented: code that breaks a
 * boundary is linted with the project's real ESLint config and must be rejected.
 */
let eslint: ESLint

async function ruleIdsFor(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message)
}

describe('architecture boundaries', () => {
  beforeAll(() => {
    eslint = new ESLint({ cwd: process.cwd() })
  }, 30_000)

  it('[X7] the domain cannot import Vue, Pinia or the app', async () => {
    expect(
      await ruleIdsFor("import { ref } from 'vue'\nexport const r = ref\n", 'src/domain/probe.ts'),
    ).toContain('no-restricted-imports')
    expect(
      await ruleIdsFor(
        "import { useRaceStore } from '../stores/race.store'\nexport const s = useRaceStore\n",
        'src/domain/probe.ts',
      ),
    ).toContain('boundaries/dependencies')
  }, 30_000)

  it('[X7] a feature cannot import another feature', async () => {
    const ids = await ruleIdsFor(
      "import HorseList from '@/features/horses/components/HorseList.vue'\nexport default HorseList\n",
      'src/features/track/probe.ts',
    )
    expect(ids).toContain('boundaries/dependencies')
  }, 30_000)

  it('[X7] stores cannot import features', async () => {
    const ids = await ruleIdsFor(
      "import { useRaceControls } from '@/features/race/composables/useRaceControls'\nexport const c = useRaceControls\n",
      'src/stores/probe.ts',
    )
    expect(ids).toContain('boundaries/dependencies')
  }, 30_000)

  it('[X7] randomness must go through the seeded RNG', async () => {
    expect(await ruleIdsFor('export const n = Math.random()\n', 'src/stores/probe.ts')).toContain(
      'no-restricted-syntax',
    )
  }, 30_000)

  it('[R7] allowed directions pass: a feature may use stores, domain and shared', async () => {
    const ids = await ruleIdsFor(
      [
        "import { HORSE_COUNT } from '@/domain/constants'",
        "import { useRaceStore } from '@/stores/race.store'",
        "import BaseButton from '@/shared/ui/BaseButton.vue'",
        'export default [HORSE_COUNT, useRaceStore, BaseButton]',
        '',
      ].join('\n'),
      'src/features/track/probe.ts',
    )
    expect(
      ids.filter((id) => id.startsWith('boundaries/') || id === 'no-restricted-imports'),
    ).toEqual([])
  }, 30_000)
})
