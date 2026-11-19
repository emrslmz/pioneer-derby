import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { scheduleForSeed } from '@/domain/game'
import type { Horse, Round } from '@/domain/types'

/** The race program: 6 rounds with their lane line-ups (R3). */
export const useScheduleStore = defineStore('schedule', () => {
  const rounds = shallowRef<readonly Round[]>([])

  const roundCount = computed(() => rounds.value.length)
  const hasProgram = computed(() => rounds.value.length > 0)

  function generate(horses: readonly Horse[], seed: number): void {
    rounds.value = scheduleForSeed(horses, seed)
  }

  function clear(): void {
    rounds.value = []
  }

  return { rounds, roundCount, hasProgram, generate, clear }
})
