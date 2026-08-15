import { describe, expect, it } from 'vitest';
import { isCampusScanPayload, scrapeCampusDocument } from './campusScan';

describe('scrapeCampusDocument', () => {
  it('lee tarjetas data-course sin pedir credenciales', () => {
    document.body.innerHTML = `
      <article data-course-name="Cálculo I" data-course-code="MAT-101"
        data-course-schedule="Lun 8:00" data-course-professor="Dra. V"></article>
    `;
    expect(scrapeCampusDocument(document)).toEqual([
      {
        name: 'Cálculo I',
        subject: 'MAT-101',
        schedule: 'Lun 8:00',
        professor: 'Dra. V',
      },
    ]);
  });

  it('rechaza payloads que no son del protocolo de escaneo', () => {
    expect(isCampusScanPayload({ type: 'other', courses: [] })).toBe(false);
    expect(
      isCampusScanPayload({
        type: 'academic-copilot:campus-scan',
        courses: [{ name: 'A', subject: 'B', schedule: 'C', professor: 'D' }],
        source: 'https://example.test',
      }),
    ).toBe(true);
  });
});
