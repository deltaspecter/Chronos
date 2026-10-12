import { describe, expect, it } from 'vitest'
import { normalize, processTerm } from './search.ts'

describe('Normalisierung von Schreibweisen', () => {
  const same = (a: string, b: string) => expect(normalize(a)).toBe(normalize(b))
  it('vereinheitlicht Umlaute und Transliterationen', () => {
    same('Cäsar', 'Caesar')
    same('Pompejus', 'Pompeius')
    same('Ḫammurapi', 'Hammurapi')
    same('Göbekli', 'Goebekli')
    same('Straße', 'Strasse')
    same('Çatalhöyük', 'Catalhoyuk')
  })
  it('entfernt Füllwörter', () => {
    expect(processTerm('der')).toBeNull()
    expect(processTerm('Karthago')).toBe('kartago')
  })
})
