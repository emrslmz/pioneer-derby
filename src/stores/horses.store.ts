import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { horsesForSeed } from '@/domain/game'
import type { Horse, HorseId } from '@/domain/types'

/** The 20 horses of the current game (R2). Horses are immutable, so a shallow ref is enough. */
export const useHorsesStore = defineStore('horses', () => {
  const horses = shallowRef<readonly Horse[]>([])

  const horsesById = computed(() => new Map(horses.value.map((horse) => [horse.id, horse])))

  function generate(seed: number): void {
    horses.value = horsesForSeed(seed)
  }

  function getHorse(id: HorseId): Horse | undefined {
    return horsesById.value.get(id)
  }

  return { horses, horsesById, generate, getHorse }
})
