import { describe, expect, it } from 'vitest';
import {
  checkMedicineAgainstPatient,
  checkPrescriptionAllergies,
  normalizeText,
  termsMatch
} from '../src/utils/allergy';

const amoxicillin = {
  id: 'med-amox',
  name: 'Amoxicillin 500mg',
  genericName: 'Amoxicillin',
  contraindications: {
    allergens: ['Penicillin', 'Amoxicillin', 'Beta-lactam'],
    conditions: [],
    warningText: 'Chống chỉ định cho bệnh nhân dị ứng nhóm Penicillin/Beta-lactam'
  }
};
const ibuprofen = {
  id: 'med-ibu',
  name: 'Ibuprofen 400mg',
  genericName: 'Ibuprofen',
  contraindications: {
    allergens: ['Ibuprofen', 'NSAID', 'Aspirin'],
    conditions: ['Loét dạ dày', 'Tăng huyết áp']
  }
};
const loratadine = {
  id: 'med-lora',
  name: 'Loratadine 10mg',
  genericName: 'Loratadine',
  contraindications: { allergens: ['Loratadine'], conditions: [] }
};

describe('utils/allergy', () => {
  it('normalizes Vietnamese diacritics and case', () => {
    expect(normalizeText('  Tăng Huyết Áp ')).toBe('tang huyet ap');
    expect(normalizeText('Đái tháo đường')).toBe('dai thao duong');
  });

  it('matches equal or containing terms but not very short fragments', () => {
    expect(termsMatch('penicillin', 'Penicillin G')).toBe(true);
    expect(termsMatch('Tăng huyết áp', 'tang huyet ap')).toBe(true);
    expect(termsMatch('ab', 'abc')).toBe(false);
  });

  it('flags HIGH when patient allergy matches medicine allergen group', () => {
    const patient = {
      allergies: [{ name: 'Penicillin', severity: 'SEVERE' }],
      chronicConditions: []
    };
    const w = checkMedicineAgainstPatient(patient, amoxicillin);
    expect(w).not.toBeNull();
    expect(w!.severity).toBe('HIGH');
    expect(w!.matchedAllergens).toEqual(['Penicillin']);
  });

  it('flags MODERATE when only chronic condition matches', () => {
    const patient = { allergies: [], chronicConditions: [{ name: 'Tăng huyết áp' }] };
    const w = checkMedicineAgainstPatient(patient, ibuprofen);
    expect(w!.severity).toBe('MODERATE');
    expect(w!.matchedConditions).toEqual(['Tăng huyết áp']);
  });

  it('returns no warning for safe medicines and tolerates malformed JSON', () => {
    const patient = { allergies: 'not-an-array', chronicConditions: null };
    expect(checkMedicineAgainstPatient(patient, loratadine)).toBeNull();
  });

  it('checks a whole prescription and sorts HIGH warnings first', () => {
    const patient = {
      allergies: [{ name: 'Penicillin' }],
      chronicConditions: [{ name: 'Loét dạ dày' }]
    };
    const warnings = checkPrescriptionAllergies(patient, [ibuprofen, loratadine, amoxicillin]);
    expect(warnings.map((w) => w.medicineId)).toEqual(['med-amox', 'med-ibu']);
  });
});
