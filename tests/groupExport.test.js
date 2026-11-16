import { describe, expect, it } from 'vitest';
import {
  buildExportFilename,
  buildGroupCsvContent,
  buildGroupJsonContent,
  escapeCsvCell
} from '../src/utils/groupExport.js';

describe('groupExport - respaldo CSV y JSON seguro', () => {
  it('neutraliza inyeccion de formulas en celdas CSV y aplica comillas RFC 4180', () => {
    expect(escapeCsvCell('=CMD|"/C calc"!A0')).toBe('"\'=CMD|""/C calc""!A0"');
    expect(escapeCsvCell('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(escapeCsvCell('-10+2')).toBe("'-10+2");
    expect(escapeCsvCell('@IMPORTXML()')).toBe("'@IMPORTXML()");
    expect(escapeCsvCell('Juan, Perez')).toBe('"Juan, Perez"');
    expect(escapeCsvCell('Nombre normal')).toBe('Nombre normal');
  });

  it('genera CSV con BOM UTF-8 incluyendo grupo, equipo, padron, salidas y tareas', () => {
    const csv = buildGroupCsvContent({
      exportedAt: '2026-11-16T12:00:00.000Z',
      group: {
        id: 'g-1',
        number: 412,
        name: 'Grupo Scout San Martin',
        district: 'Distrito 2',
        zone: 'Zona 14',
        org_model: 'tradicional'
      },
      team: [
        {
          role: 'jefe_grupo',
          branch: 'jefatura',
          display_name: 'Ana Jefe',
          member_email: 'ana@scout.org',
          is_active: true
        }
      ],
      members: [
        {
          member_type: 'beneficiario',
          branch: 'manada',
          full_name: '=HACK()',
          document_number: '45123456',
          cruz_del_sur_status: 'afiliado',
          safe_from_harm_status: 'no_aplica',
          medical_form_expires_at: '2027-03-01'
        }
      ],
      camps: [
        {
          camp_type: 'campamento_corto',
          branch_scope: 'manada',
          title: 'Acantonamiento Otoño',
          location: 'Chascomus',
          approval_status: 'borrador',
          start_date: '2026-12-01',
          end_date: '2026-12-02',
          youth_count: 18,
          adult_count: 3,
          required_adults: 3
        }
      ],
      tasks: [
        {
          assigned_role: 'jefe_rama',
          title: 'Revisar autorizaciones',
          status: 'pendiente',
          due_date: '2026-11-25'
        }
      ]
    });

    expect(csv.startsWith('\uFEFFSeccion,')).toBe(true);
    expect(csv).toContain('Grupo Scout San Martin');
    expect(csv).toContain('Ana Jefe');
    expect(csv).toContain("'=HACK()");
    expect(csv).toContain('Acantonamiento');
    expect(csv).toContain('Revisar autorizaciones');
  });

  it('genera JSON estructurado sin campos sensibles de autenticacion y nombres de archivo seguros', () => {
    const jsonRaw = buildGroupJsonContent({
      exportedAt: '2026-11-16T12:00:00.000Z',
      group: {
        id: 'g-1',
        number: 412,
        name: 'San Martin / Norte',
        district: 'Distrito 2',
        zone: 'Zona 14'
      },
      team: [
        {
          role: 'educador',
          branch: 'unidad',
          display_name: 'Carlos',
          member_email: 'carlos@scout.org',
          passwordHash: 'secret-should-not-leak'
        }
      ],
      members: [],
      camps: [],
      tasks: []
    });

    const parsed = JSON.parse(jsonRaw);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.group.number).toBe(412);
    expect(parsed.summary.teamCount).toBe(1);
    expect(parsed.team[0].passwordHash).toBeUndefined();

    const filename = buildExportFilename(parsed.group, 'csv');
    expect(filename).toMatch(/^grupo-scout-412-san-martin-norte-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
