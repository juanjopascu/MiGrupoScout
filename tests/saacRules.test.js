import { describe, expect, it } from 'vitest';
import {
  BRANCH_RATIO_RULES,
  CAMP_DEADLINE_DAYS,
  CAMP_DOCUMENTATION_KEYS,
  MIN_REQUIRED_ADULTS,
  calculateDistrictDeadline,
  calculateGroupTrafficLight,
  calculateMedicalStatus,
  calculateRequiredAdults,
  evaluateCampCompliance
} from '../src/domain/saacRules.js';

function buildFullDocs(overrides = {}) {
  const docs = {};
  for (const key of CAMP_DOCUMENTATION_KEYS) {
    docs[key] = true;
  }
  return { ...docs, ...overrides };
}

describe('saacRules - calculateRequiredAdults', () => {
  it('aplica el minimo obligatorio de 2 adultos con 0, 1 o 3 jovenes en cualquier rama', () => {
    for (const branch of ['manada', 'unidad', 'caminantes', 'rovers']) {
      for (const youthCount of [0, 1, 3]) {
        const res = calculateRequiredAdults({ branch, youthCount });
        expect(res.requiredAdults).toBe(MIN_REQUIRED_ADULTS);
        expect(res.totalYouth).toBe(youthCount);
        expect(res.minAdultsApplied).toBe(true);
      }
    }
  });

  it('calcula correctamente el ratio 1:6 para Manada', () => {
    expect(BRANCH_RATIO_RULES.manada.youthPerAdult).toBe(6);

    const six = calculateRequiredAdults({ branch: 'manada', youthCount: 6 });
    expect(six.requiredAdults).toBe(2);
    expect(six.minAdultsApplied).toBe(true);
    expect(six.breakdown[0].proportionalAdults).toBe(1);

    const seven = calculateRequiredAdults({ branch: 'manada', youthCount: 7 });
    expect(seven.requiredAdults).toBe(2);
    expect(seven.minAdultsApplied).toBe(false);
    expect(seven.breakdown[0].proportionalAdults).toBe(2);

    const thirteen = calculateRequiredAdults({ branch: 'manada', youthCount: 13 });
    expect(thirteen.requiredAdults).toBe(3);
    expect(thirteen.minAdultsApplied).toBe(false);
  });

  it('calcula correctamente el ratio 1:8 para Unidad Scout', () => {
    expect(BRANCH_RATIO_RULES.unidad.youthPerAdult).toBe(8);

    const eight = calculateRequiredAdults({ branch: 'unidad', youthCount: 8 });
    expect(eight.requiredAdults).toBe(2);
    expect(eight.minAdultsApplied).toBe(true);

    const sixteen = calculateRequiredAdults({ branch: 'unidad', youthCount: 16 });
    expect(sixteen.requiredAdults).toBe(2);
    expect(sixteen.minAdultsApplied).toBe(false);

    const seventeen = calculateRequiredAdults({ branch: 'unidad', youthCount: 17 });
    expect(seventeen.requiredAdults).toBe(3);
  });

  it('calcula correctamente el ratio 1:10 para Caminantes', () => {
    expect(BRANCH_RATIO_RULES.caminantes.youthPerAdult).toBe(10);

    const ten = calculateRequiredAdults({ branch: 'caminantes', youthCount: 10 });
    expect(ten.requiredAdults).toBe(2);
    expect(ten.minAdultsApplied).toBe(true);

    const twenty = calculateRequiredAdults({ branch: 'caminantes', youthCount: 20 });
    expect(twenty.requiredAdults).toBe(2);
    expect(twenty.minAdultsApplied).toBe(false);

    const twentyOne = calculateRequiredAdults({ branch: 'caminantes', youthCount: 21 });
    expect(twentyOne.requiredAdults).toBe(3);
  });

  it('calcula correctamente el ratio 1:12 para Rovers', () => {
    expect(BRANCH_RATIO_RULES.rovers.youthPerAdult).toBe(12);

    const twelve = calculateRequiredAdults({ branch: 'rovers', youthCount: 12 });
    expect(twelve.requiredAdults).toBe(2);
    expect(twelve.minAdultsApplied).toBe(true);

    const twentyFour = calculateRequiredAdults({ branch: 'rovers', youthCount: 24 });
    expect(twentyFour.requiredAdults).toBe(2);
    expect(twentyFour.minAdultsApplied).toBe(false);

    const twentyFive = calculateRequiredAdults({ branch: 'rovers', youthCount: 25 });
    expect(twentyFive.requiredAdults).toBe(3);
  });

  it('aplica criterio estricto 1:6 cuando branch es grupal sin desglose', () => {
    const res = calculateRequiredAdults({ branch: 'grupal', youthCount: 13 });
    expect(res.requiredAdults).toBe(3);
    expect(res.breakdown[0].branch).toBe('grupal');
    expect(res.breakdown[0].youthPerAdult).toBe(6);
  });

  it('calcula correctamente salidas multi-rama con branchCounts y maneja 0 participantes o negativos', () => {
    const multi = calculateRequiredAdults({
      branchCounts: {
        manada: 7, // 2
        unidad: 9, // 2
        caminantes: 11, // 2
        rovers: 13 // 2
      }
    });
    expect(multi.requiredAdults).toBe(8);
    expect(multi.totalYouth).toBe(40);
    expect(multi.minAdultsApplied).toBe(false);
    expect(multi.breakdown).toHaveLength(4);

    const singleSmallBranch = calculateRequiredAdults({
      branchCounts: {
        manada: 2,
        unidad: 0,
        caminantes: 0,
        rovers: 0
      }
    });
    expect(singleSmallBranch.requiredAdults).toBe(2);
    expect(singleSmallBranch.totalYouth).toBe(2);
    expect(singleSmallBranch.minAdultsApplied).toBe(true);
    expect(singleSmallBranch.breakdown).toHaveLength(1);

    const allZero = calculateRequiredAdults({
      branchCounts: {
        manada: 0,
        unidad: -4,
        caminantes: 0,
        rovers: null
      }
    });
    expect(allZero.requiredAdults).toBe(2);
    expect(allZero.totalYouth).toBe(0);
    expect(allZero.minAdultsApplied).toBe(true);
    expect(allZero.breakdown).toEqual([]);

    const defaultCall = calculateRequiredAdults();
    expect(defaultCall.requiredAdults).toBe(2);
    expect(defaultCall.totalYouth).toBe(0);
  });
});

describe('saacRules - calculateDistrictDeadline', () => {
  it('aplica exactamente 7, 15, 30 y 45 dias segun campType', () => {
    expect(CAMP_DEADLINE_DAYS.salida_dia).toBe(7);
    expect(CAMP_DEADLINE_DAYS.acantonamiento).toBe(15);
    expect(CAMP_DEADLINE_DAYS.campamento_corto).toBe(15);
    expect(CAMP_DEADLINE_DAYS.campamento_largo).toBe(30);
    expect(CAMP_DEADLINE_DAYS.fuera_distrito).toBe(45);

    const salida = calculateDistrictDeadline({
      startDate: '2026-06-20',
      campType: 'salida_dia',
      referenceDate: '2026-06-01'
    });
    expect(salida.daysBeforeStart).toBe(7);
    expect(salida.districtDeadline).toBe('2026-06-13');
    expect(salida.daysUntilDeadline).toBe(12);
    expect(salida.deadlineStatus).toBe('verde');

    const acantonamiento = calculateDistrictDeadline({
      startDate: '2026-06-20',
      campType: 'acantonamiento',
      referenceDate: '2026-06-01'
    });
    expect(acantonamiento.daysBeforeStart).toBe(15);
    expect(acantonamiento.districtDeadline).toBe('2026-06-05');
    expect(acantonamiento.daysUntilDeadline).toBe(4);
    expect(acantonamiento.deadlineStatus).toBe('amarillo');

    const corto = calculateDistrictDeadline({
      startDate: '2026-06-20',
      campType: 'campamento_corto',
      referenceDate: '2026-06-01'
    });
    expect(corto.daysBeforeStart).toBe(15);
    expect(corto.districtDeadline).toBe('2026-06-05');

    const largo = calculateDistrictDeadline({
      startDate: '2026-06-30',
      campType: 'campamento_largo',
      referenceDate: '2026-06-01'
    });
    expect(largo.daysBeforeStart).toBe(30);
    expect(largo.districtDeadline).toBe('2026-05-31');
    expect(largo.daysUntilDeadline).toBe(-1);
    expect(largo.deadlineStatus).toBe('rojo');

    const fuera = calculateDistrictDeadline({
      startDate: '2026-08-15',
      campType: 'fuera_distrito',
      referenceDate: '2026-06-01'
    });
    expect(fuera.daysBeforeStart).toBe(45);
    expect(fuera.districtDeadline).toBe('2026-07-01');
    expect(fuera.deadlineStatus).toBe('verde');
  });

  it('respeta los limites exactos de semaforo verde, amarillo y rojo', () => {
    // startDate 2026-06-22, campamento_corto (15d) -> deadline 2026-06-07
    const verde = calculateDistrictDeadline({
      startDate: '2026-06-22',
      campType: 'campamento_corto',
      referenceDate: '2026-05-30' // 8 dias antes
    });
    expect(verde.daysUntilDeadline).toBe(8);
    expect(verde.deadlineStatus).toBe('verde');

    const amarilloLimite = calculateDistrictDeadline({
      startDate: '2026-06-22',
      campType: 'campamento_corto',
      referenceDate: '2026-05-31' // 7 dias antes
    });
    expect(amarilloLimite.daysUntilDeadline).toBe(7);
    expect(amarilloLimite.deadlineStatus).toBe('amarillo');

    const amarilloUno = calculateDistrictDeadline({
      startDate: '2026-06-22',
      campType: 'campamento_corto',
      referenceDate: '2026-06-06' // 1 dia antes
    });
    expect(amarilloUno.daysUntilDeadline).toBe(1);
    expect(amarilloUno.deadlineStatus).toBe('amarillo');

    const rojoCero = calculateDistrictDeadline({
      startDate: '2026-06-22',
      campType: 'campamento_corto',
      referenceDate: '2026-06-07' // 0 dias
    });
    expect(rojoCero.daysUntilDeadline).toBe(0);
    expect(rojoCero.deadlineStatus).toBe('rojo');
  });

  it('retorna estado rojo cuando startDate es invalido o nulo', () => {
    for (const badDate of [null, undefined, '', '2026-02-30', 'fecha-invalida']) {
      const res = calculateDistrictDeadline({
        startDate: badDate,
        campType: 'salida_dia',
        referenceDate: '2026-06-01'
      });
      expect(res.districtDeadline).toBeNull();
      expect(res.daysUntilDeadline).toBeNull();
      expect(res.deadlineStatus).toBe('rojo');
    }
  });
});

describe('saacRules - evaluateCampCompliance', () => {
  it('aprueba escenario 100% conforme', () => {
    const res = evaluateCampCompliance({
      branchCounts: { manada: 12, unidad: 8 }, // 2 + 1 = 3 adultos
      adultCount: 3,
      safeFromHarmCount: 3,
      campType: 'campamento_corto',
      startDate: '2026-07-15',
      referenceDate: '2026-06-01',
      documentationStatus: buildFullDocs()
    });

    expect(res.requiredAdults).toBe(3);
    expect(res.ratioCompliant).toBe(true);
    expect(res.safeFromHarmCompliant).toBe(true);
    expect(res.safeFromHarmPercentage).toBe(100);
    expect(res.documentationComplete).toBe(true);
    expect(res.completionPercentage).toBe(100);
    expect(res.missingDocs).toEqual([]);
    expect(res.deadlineStatus).toBe('verde');
    expect(res.isCompliant).toBe(true);
    expect(res.overallStatus).toBe('verde');
    expect(res.issues).toEqual([]);
  });

  it('marca rojo cuando el ratio de adultos es insuficiente', () => {
    const res = evaluateCampCompliance({
      branch: 'manada',
      youthCount: 15, // requiere 3 adultos
      adultCount: 2,
      safeFromHarmCount: 2,
      campType: 'salida_dia',
      startDate: '2026-07-15',
      referenceDate: '2026-06-01',
      documentationStatus: buildFullDocs()
    });

    expect(res.requiredAdults).toBe(3);
    expect(res.ratioCompliant).toBe(false);
    expect(res.isCompliant).toBe(false);
    expect(res.overallStatus).toBe('rojo');
    expect(res.issues.some((i) => i.includes('Cantidad insuficiente de adultos'))).toBe(true);
  });

  it('exige 100% de adultos con A Salvo del Peligro vigente', () => {
    const partialSfh = evaluateCampCompliance({
      branch: 'unidad',
      youthCount: 8,
      adultCount: 2,
      safeFromHarmCount: 1,
      campType: 'salida_dia',
      startDate: '2026-07-15',
      referenceDate: '2026-06-01',
      documentationStatus: buildFullDocs()
    });

    expect(partialSfh.ratioCompliant).toBe(true);
    expect(partialSfh.safeFromHarmCompliant).toBe(false);
    expect(partialSfh.safeFromHarmPercentage).toBe(50);
    expect(partialSfh.isCompliant).toBe(false);
    expect(partialSfh.overallStatus).toBe('rojo');
    expect(partialSfh.issues.some((i) => i.includes('A Salvo del Peligro'))).toBe(true);

    const zeroAdults = evaluateCampCompliance({
      branch: 'unidad',
      youthCount: 4,
      adultCount: 0,
      safeFromHarmCount: 0,
      campType: 'salida_dia',
      startDate: '2026-07-15',
      referenceDate: '2026-06-01',
      documentationStatus: buildFullDocs()
    });
    expect(zeroAdults.safeFromHarmCompliant).toBe(false);
    expect(zeroAdults.safeFromHarmPercentage).toBe(0);
    expect(zeroAdults.isCompliant).toBe(false);
    expect(zeroAdults.overallStatus).toBe('rojo');
  });

  it('detecta documentacion incompleta aunque ratio, certificacion y plazo esten ok', () => {
    const res = evaluateCampCompliance({
      branch: 'caminantes',
      youthCount: 10,
      adultCount: 2,
      safeFromHarmCount: 2,
      campType: 'campamento_corto',
      startDate: '2026-07-15',
      referenceDate: '2026-06-01',
      documentationStatus: buildFullDocs({
        seguro_cruz_del_sur: false,
        proyecto_educativo: false
      })
    });

    expect(res.ratioCompliant).toBe(true);
    expect(res.safeFromHarmCompliant).toBe(true);
    expect(res.documentationComplete).toBe(false);
    expect(res.completedDocs).toBe(3);
    expect(res.totalDocs).toBe(5);
    expect(res.completionPercentage).toBe(60);
    expect(res.missingDocs).toEqual(['seguro_cruz_del_sur', 'proyecto_educativo']);
    expect(res.isCompliant).toBe(false);
    expect(res.overallStatus).toBe('amarillo');
  });

  it('marca rojo cuando el plazo distrital esta vencido', () => {
    const res = evaluateCampCompliance({
      branch: 'rovers',
      youthCount: 12,
      adultCount: 2,
      safeFromHarmCount: 2,
      campType: 'fuera_distrito',
      startDate: '2026-07-01',
      referenceDate: '2026-06-15', // deadline era 2026-05-17
      documentationStatus: buildFullDocs()
    });

    expect(res.deadlineStatus).toBe('rojo');
    expect(res.isCompliant).toBe(false);
    expect(res.overallStatus).toBe('rojo');
  });
});

describe('saacRules - calculateMedicalStatus', () => {
  it('retorna sin_datos y rojo para valores nulos, vacios o fechas invalidas', () => {
    for (const val of [null, undefined, '', '2025-02-29', 'invalid']) {
      const res = calculateMedicalStatus(val, '2026-06-01');
      expect(res.status).toBe('sin_datos');
      expect(res.trafficLight).toBe('rojo');
      expect(res.daysRemaining).toBeNull();
      expect(res.expiresAt).toBeNull();
    }
  });

  it('clasifica correctamente vencida, por_vencer y vigente segun ventana de 15 dias', () => {
    const expired = calculateMedicalStatus('2026-05-31', '2026-06-01');
    expect(expired.status).toBe('vencida');
    expect(expired.trafficLight).toBe('rojo');
    expect(expired.daysRemaining).toBe(-1);
    expect(expired.expiresAt).toBe('2026-05-31');

    const expiresToday = calculateMedicalStatus('2026-06-01', '2026-06-01');
    expect(expiresToday.status).toBe('por_vencer');
    expect(expiresToday.trafficLight).toBe('amarillo');
    expect(expiresToday.daysRemaining).toBe(0);

    const expiresIn15 = calculateMedicalStatus('2026-06-16', '2026-06-01');
    expect(expiresIn15.status).toBe('por_vencer');
    expect(expiresIn15.trafficLight).toBe('amarillo');
    expect(expiresIn15.daysRemaining).toBe(15);

    const valid16 = calculateMedicalStatus('2026-06-17', '2026-06-01');
    expect(valid16.status).toBe('vigente');
    expect(valid16.trafficLight).toBe('verde');
    expect(valid16.daysRemaining).toBe(16);
  });
});

describe('saacRules - calculateGroupTrafficLight', () => {
  it('retorna verde con grupo vacio o completamente al dia', () => {
    const empty = calculateGroupTrafficLight([], [], [], '2026-06-01');
    expect(empty.status).toBe('verde');
    expect(empty.reasons).toEqual([]);
    expect(empty.counters.activeMembers).toBe(0);

    const healthy = calculateGroupTrafficLight(
      [
        {
          full_name: 'Juan Perez',
          is_active: true,
          member_type: 'educador',
          medical_form_expires_at: '2026-12-01',
          safe_from_harm_status: 'vigente',
          cruz_del_sur_status: 'afiliado'
        },
        {
          full_name: 'Maria Gomez',
          is_active: false, // inactivo se ignora aunque este vencido
          member_type: 'educador',
          medical_form_expires_at: '2020-01-01',
          safe_from_harm_status: 'vencido',
          cruz_del_sur_status: 'vencido'
        }
      ],
      [
        {
          approval_status: 'aprobada',
          ratio_compliant: false,
          start_date: '2020-01-01'
        }
      ],
      [
        {
          status: 'completada',
          due_date: '2020-01-01'
        }
      ],
      '2026-06-01'
    );

    expect(healthy.status).toBe('verde');
    expect(healthy.counters.activeMembers).toBe(1);
    expect(healthy.reasons).toEqual([]);
  });

  it('retorna amarillo ante alertas preventivas sin bloqueos rojos', () => {
    const yellow = calculateGroupTrafficLight(
      [
        {
          full_name: 'Laura Lopez',
          is_active: true,
          member_type: 'beneficiario',
          medical_form_expires_at: '2026-06-10', // por vencer en 9 dias
          cruz_del_sur_status: 'pendiente'
        },
        {
          full_name: 'Pedro Diaz',
          is_active: true,
          member_type: 'beneficiario',
          medical_form_expires_at: null, // sin_datos -> amarillo
          cruz_del_sur_status: 'afiliado'
        }
      ],
      [
        {
          approval_status: 'borrador',
          ratio_compliant: true,
          camp_type: 'salida_dia',
          start_date: '2026-06-12' // deadline 2026-06-05 -> 4 dias
        }
      ],
      [
        {
          status: 'pendiente',
          due_date: '2026-06-03' // 2 dias
        }
      ],
      '2026-06-01'
    );

    expect(yellow.status).toBe('amarillo');
    expect(yellow.counters.medicalExpiring).toBe(1);
    expect(yellow.counters.medicalMissing).toBe(1);
    expect(yellow.counters.cruzDelSurIssues).toBe(1);
    expect(yellow.counters.campsUrgent).toBe(1);
    expect(yellow.counters.tasksDueSoon).toBe(1);
    expect(yellow.reasons.join(' ')).not.toContain('Laura Lopez');
    expect(yellow.reasons.join(' ')).not.toContain('Pedro Diaz');
  });

  it('retorna rojo ante incumplimientos criticos y no expone PII en razones', () => {
    const red = calculateGroupTrafficLight(
      [
        {
          full_name: 'Carlos Fernandez',
          is_active: true,
          member_type: 'educador',
          medical_form_expires_at: '2026-05-01', // vencida
          safe_from_harm_status: 'pendiente', // sin SFH vigente
          cruz_del_sur_status: 'afiliado'
        }
      ],
      [
        {
          approval_status: 'en_revision_consejo',
          ratio_compliant: false,
          district_submission_deadline: '2026-05-25' // vencido
        }
      ],
      [
        {
          status: 'pendiente',
          due_date: '2026-05-30' // vencida
        }
      ],
      '2026-06-01'
    );

    expect(red.status).toBe('rojo');
    expect(red.counters.medicalExpired).toBe(1);
    expect(red.counters.safeFromHarmIssues).toBe(1);
    expect(red.counters.campsOverdue).toBe(1);
    expect(red.counters.campsNonCompliantRatio).toBe(1);
    expect(red.counters.tasksOverdue).toBe(1);
    expect(red.reasons.length).toBeGreaterThanOrEqual(5);
    expect(red.reasons.join(' ')).not.toContain('Carlos Fernandez');
  });
});
