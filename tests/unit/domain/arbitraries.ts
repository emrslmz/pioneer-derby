import fc from 'fast-check'

/** Any uint32 game seed. */
export const seedArb = fc.nat({ max: 0xffff_ffff })
