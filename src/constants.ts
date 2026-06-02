import { Student, Module, Rotation, Activity, FacultyMember, ClinicalField, AcademicEvent, AcademicMinute, ManualTask, AcademicSection, DidacticPlanning, PlanningUnit } from './types';

export const MOCK_PLANNING_ANATOMY: DidacticPlanning = {
  id: 'plan-paus-006',
  learningOutcome: 'Al finalizar la asignatura, el estudiante será capaz de identificar y nombrar con terminología TA2019/FIPAT las estructuras de los sistemas de abdomen y extremidades, correlacionándolas con situaciones de urgencia médica prehospitalaria.',
  competencies: {
    generic: ['Competencia Conceptual conforme a NOM-034-SSA3-2013', 'Competencia Metodológica NOM-034-SSA3-2013'],
    specific: ['Capacidad de sustentar decisiones médicas acerca de la estructura y función de los sistemas de abdomen y extremidades', 'Competente para aplicar el método clínico prehospitalario fundamentado en el conocimiento anatómico.']
  },
  units: [
    {
      id: 'u1',
      unitNumber: 'U1',
      title: 'Sistema Osteomuscular de Abdomen y Extremidades',
      content: 'Anatomía de pared abdominal y extremidades.',
      activity: 'Disección de pared abdominal y extremidades en cadáver. Acceso intraóseo tibial proximal; inmovilización con férula de tracción.',
      strategies: ['Aprendizaje Basado en Problemas (ABP)', 'Aprendizaje Basado en Simulación (ABS)', 'Prácticas de taller'],
      resources: ['Cadáver humano (Lab. Anatomía BUAP)', 'Maniquí de trauma', 'Férula de tracción', 'Kit intraóseo'],
      evidence: 'Reporte ABP-U1, Lista de cotejo ABS U1, Reporte de disección',
      instrument: 'Rúbrica ABP, Lista de cotejo ABS (umbral 16/20)',
      weight: 20,
      sessions: 18,
      completedSessions: 18,
      sessionLog: [
        '2026-02-03', '2026-02-04', '2026-02-05', '2026-02-06',
        '2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13',
        '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
        '2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26'
      ],
      status: 'completado'
    },
    {
      id: 'u2',
      unitNumber: 'U2',
      title: 'Sistema Digestivo',
      content: 'Anatomía y disección de cavidad abdominal.',
      activity: 'Disección de cavidad abdominal en cadáver. Evaluación abdominal sistemática en maniquí por cuadrantes; interpretación básica de FAST.',
      strategies: ['ABP', 'ABS', 'Prácticas de taller'],
      resources: ['Cadáver humano', 'Maniquí de trauma', 'Imágenes FAST'],
      evidence: 'Reporte ABP-U2, Lista de cotejo ABS U2, Reporte de disección',
      instrument: 'Rúbrica ABP, Lista de cotejo ABS',
      weight: 20,
      sessions: 18,
      completedSessions: 8,
      sessionLog: [
        '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09',
        '2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16'
      ],
      status: 'en_progreso'
    }
  ]
};

export const MOCK_FACULTY: FacultyMember[] = [
  {
    id: '100534457',
    name: 'Dr. Autor Nombre Apellido',
    category: 'Profesor de Asignatura',
    level: 'Asociado C',
    dedication: 'Hora Clase',
    seniority: 15,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 98
    },
    adscription: 'Facultad de Medicina',
    email: 'docente.autor@portal.educativo.mx',
    phone: '5551234567',
    weeklySchedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    permissions: [
      { type: 'Administrativo', startDate: '2026-04-25', endDate: '2026-04-26', description: 'Congreso Internacional de Educación Médica', approved: true }
    ]
  },
  {
    id: '100407855',
    name: 'Aguilar Rivera Flavia Marisol',
    category: 'Profesor-Investigador',
    level: 'Asociado A',
    dedication: 'Tiempo Completo',
    seniority: 8,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 95
    },
    adscription: 'Facultad de Medicina',
    email: 'docente.flavia@portal.educativo.mx',
    weeklySchedule: ['Lunes', 'Miércoles', 'Viernes'],
    permissions: []
  },
  {
    id: '100528981',
    name: 'May Compan Gabriela Fernanda',
    category: 'Profesor de Asignatura',
    level: 'Asociado B',
    dedication: 'Hora Clase',
    seniority: 5,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 90
    },
    adscription: 'Facultad de Medicina',
    email: 'docente.gabriela@portal.educativo.mx',
    weeklySchedule: ['Martes', 'Jueves'],
    permissions: [
      { type: 'Médico', startDate: '2026-04-18', endDate: '2026-04-18', description: 'Cita Médica Institucional', approved: true }
    ]
  },
  {
    id: '100410577',
    name: 'Bringas Tobon Maria Elena',
    category: 'Profesor de Asignatura',
    level: 'Asociado B',
    dedication: 'Hora Clase',
    seniority: 12,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 92
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: '100534462',
    name: 'Martinez Valdes Armando',
    category: 'Profesor de Asignatura',
    level: 'Asociado C',
    dedication: 'Hora Clase',
    seniority: 2,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 88
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: '100529140',
    name: 'Garcia Rojas Aldo',
    category: 'Profesor de Asignatura',
    level: 'Asociado B',
    dedication: 'Hora Clase',
    seniority: 4,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 85
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: '100063122',
    name: 'Loyola Gutierrez Mariana Paula',
    category: 'Técnico Académico',
    level: 'Asociado B',
    dedication: 'Tiempo Completo',
    seniority: 10,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 94
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: '100518724',
    name: 'Muñoz Guarneros Carlos Omar',
    category: 'Profesor-Investigador',
    level: 'Asociado A',
    dedication: 'Medio Tiempo',
    seniority: 3,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 91
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: 'Hon - ROBLES',
    name: 'ROBLES - GUILLEN GUADALUPE DEL CARMEN',
    category: 'Profesor de Asignatura',
    level: 'Asociado B',
    dedication: 'Hora Clase',
    seniority: 5,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 90
    },
    adscription: 'Facultad de Medicina'
  },
  {
    id: '100517784',
    name: 'CHAVEZ - LEYVA JORGE',
    category: 'Profesor-Investigador',
    level: 'Asociado A',
    dedication: 'Tiempo Completo',
    seniority: 10,
    compliance: {
      cedula: true,
      medicalExam: true,
      inductionCourse: true,
      annualEvaluation: 95
    },
    adscription: 'Facultad de Medicina'
  }
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: '202327203',
    name: 'Estudiante Alfa',
    enrollmentId: '202327203',
    semester: 6,
    status: 'activo',
    gpa: 9.29,
    attendance: 100,
    email: 'estudiante.alfa@portal.educativo.mx',
    cohort: '2023-Otoño',
    tutor: 'Dr. Autor Nombre Apellido',
    alert: false
  },
  {
    id: '202220442',
    name: 'Estudiante Beta',
    enrollmentId: '202220442',
    semester: 8,
    status: 'práctica_profesional',
    gpa: 9.1,
    attendance: 98,
    email: 'estudiante.beta@portal.educativo.mx',
    cohort: '2022-Primavera',
    tutor: 'Mario Garcia Carrasco',
    alert: false
  },
  {
    id: '202410384',
    name: 'Estudiante Gamma',
    enrollmentId: '202410384',
    semester: 4,
    status: 'activo',
    gpa: 8.8,
    attendance: 90,
    email: 'estudiante.gamma@portal.educativo.mx',
    cohort: '2024-Primavera',
    tutor: 'Aldo Garcia Rojas',
    alert: false
  },
  {
    id: '202316492',
    name: 'Estudiante Delta',
    enrollmentId: '202316492',
    semester: 6,
    status: 'activo',
    gpa: 9.7,
    attendance: 100,
    email: 'estudiante.delta@portal.educativo.mx',
    cohort: '2023-Otoño',
    tutor: 'Guadalupe del Carmen Robles',
    alert: false
  },
  {
    id: '202004861',
    name: 'Estudiante Epsilon',
    enrollmentId: '202004861',
    semester: 8,
    status: 'servicio_social',
    gpa: 7.8,
    attendance: 85,
    email: 'estudiante.epsilon@portal.educativo.mx',
    cohort: '2020-Primavera',
    tutor: 'Juan de Jesus Hernandez Gomez',
    alert: true
  }
];

export const MOCK_MODULES: Module[] = [
  // SEMESTRE 1
  { id: 'PAUS 001', title: 'Fun. Anat. Cab, Cuello y Torax', code: 'PAUS 001', credits: 6, instructor: 'Ariel Farit Gutierrez Alexander', description: 'Estudio anatómico regional del sistema cráneo-cervical y torácico.', competencies: ['Identificación Anatómica'], status: 'completado', semester: 1, level: 'Básico' },
  { id: 'FGUS 002', title: 'DHPC (Desarrollo Habilidades Pensamiento)', code: 'FGUS 002', credits: 4, instructor: 'Miryam Nava Cervantes', description: 'Identificación y desarrollo de pensamiento complejo.', competencies: ['Pensamiento Crítico'], status: 'completado', semester: 1, level: 'Minerva' },
  { id: 'PAUS 003', title: 'Habilidades Clinicas I', code: 'PAUS 003', credits: 3, instructor: 'Guadalupe del Carmen Robles', description: 'Práctica clínica inicial supervisada y anamnesis médica.', competencies: ['Anamnesis'], status: 'en_curso', semester: 1, level: 'Formativo' },
  { id: 'PAUS 004', title: 'Primeros Auxilios', code: 'PAUS 004', credits: 3, instructor: 'Guadalupe del Carmen Robles', description: 'Protocolos prehospitalarios e intervención básica asistencial.', competencies: ['Intervención Básica'], status: 'en_curso', semester: 1, level: 'Formativo' },
  { id: 'PAUS 005', title: 'Manejo Emoc. Ante Sit. Estres', code: 'PAUS 005', credits: 4, instructor: 'Jorge Chavez Leyva', description: 'Manejo emocional del personal ante emergencias.', competencies: ['Control Emocional'], status: 'en_curso', semester: 1, level: 'Básico' },
  { id: 'PAUS 002', title: 'Bioquimica', code: 'PAUS 002', credits: 7, instructor: 'Gabriela Fernanda May Compan', description: 'Metabolitos, perfiles bioquímicos del paciente crítico.', competencies: ['Bioquímica'], status: 'en_curso', semester: 1, level: 'Básico' },

  // SEMESTRE 2
  { id: 'PAUS 006', title: 'Fund. Anat. Abdomen y Extremid', code: 'PAUS 006', credits: 6, instructor: 'Ariel Farit Gutierrez Alexander', description: 'Estudio anatómico del sistema abdominal y músculo-esquelético.', competencies: ['Identificación Anatómica'], status: 'pendiente', semester: 2, level: 'Básico', planning: MOCK_PLANNING_ANATOMY },
  { id: 'PAUS 007', title: 'Principios de Fisiologia', code: 'PAUS 007', credits: 7, instructor: 'Max Alejandro Maximino Rojas', description: 'Funcionamiento normal de los sistemas corporales.', competencies: ['Fisiología'], status: 'pendiente', semester: 2, level: 'Básico' },
  { id: 'PAUS 009', title: 'Atn.Des.Nat. y Antropogenicos', code: 'PAUS 009', credits: 6, instructor: 'Oswaldo Saldaña Gutierrez', description: 'Desastres naturales y riesgos antropogénicos.', competencies: ['Gestión de Riesgos'], status: 'pendiente', semester: 2, level: 'Formativo' },
  { id: 'FGUS 001', title: 'Formacion Humana y Social', code: 'FGUS 001', credits: 4, instructor: 'Flavia Marisol Aguilar Rivera', description: 'Aspectos axiológicos y sociales en la práctica médica.', competencies: ['Ética'], status: 'pendiente', semester: 2, level: 'Minerva' },
  { id: 'PAUS 258', title: 'Der. en Urgencias y Desastres', code: 'PAUS 258', credits: 4, instructor: 'Armando Martinez Valdes', description: 'Legislación médica durante contingencias.', competencies: ['Marco Legal'], status: 'pendiente', semester: 2, level: 'Formativo' },
  { id: 'PAUS 011', title: 'Equipam.Med.Tecnol. Ambulancia', code: 'PAUS 011', credits: 4, instructor: 'Armando Martinez Valdes', description: 'Operación, calibración y seguridad en equipamiento ALS.', competencies: ['Gestión de Equipos'], status: 'pendiente', semester: 2, level: 'Formativo' },

  // SEMESTRE 3
  { id: 'PAUS 008', title: 'Clinica Propedeutica', code: 'PAUS 008', credits: 6, instructor: 'Aldo Garcia Rojas', description: 'Interpretación de signos, síntomas y construcción de historial.', competencies: ['Propedéutica'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 253', title: 'Urgencias Pediatricas', code: 'PAUS 253', credits: 6, instructor: 'Patricia Beltran Martinez', description: 'Enfoque y abordaje prehospitalario del paciente pediátrico.', competencies: ['Pediatría'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 250', title: 'Farmacologia de las Urg. Med.', code: 'PAUS 250', credits: 7, instructor: 'Francisco Javier Anton Garcia', description: 'Manejo de fármacos en situaciones críticas.', competencies: ['Farmacodinámica'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 256', title: 'Fundamentos de Resc: Acuatico', code: 'PAUS 256', credits: 4, instructor: 'Armando Martinez Valdes', description: 'Normativas de rescate hídrico y contención en masas de agua.', competencies: ['Rescate Acuático'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 252', title: 'Urgencias en Adultos', code: 'PAUS 252', credits: 6, instructor: 'Jose Alberto Castillo Salas', description: 'Protocolos de atención prehospitalaria para el paciente adulto.', competencies: ['Manejo de Shock'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 251', title: 'Urgencias Obstetricas', code: 'PAUS 251', credits: 6, instructor: 'Antonio Collantes Gutierrez', description: 'Atención prehospitalaria del parto y urgencias ginecobstétricas.', competencies: ['Obstetricia'], status: 'pendiente', semester: 3, level: 'Formativo' },
  { id: 'PAUS 255', title: 'Fundamentos de Rescate: Aereo', code: 'PAUS 255', credits: 4, instructor: 'Armando Martinez Valdes', description: 'Aproximación aeronaves y aeromedicina.', competencies: ['Aeromedicina'], status: 'pendiente', semester: 3, level: 'Formativo' },

  // SEMESTRE 4
  { id: 'PPUM 101', title: 'Practica Profesional', code: 'PPUM 101', credits: 5, instructor: 'Ariel Farit Gutierrez Alexander', description: 'Práctica técnica aplicada en campo clínico y ambulancias.', competencies: ['Práctica de Campo'], status: 'pendiente', semester: 4, level: 'Práctica/Servicio' },
  { id: 'PAUS 259', title: 'Seguridad Industrial', code: 'PAUS 259', credits: 4, instructor: 'Aldo Garcia Rojas', description: 'Análisis NOMs y contingencias industriales.', competencies: ['NOMs'], status: 'pendiente', semester: 4, level: 'Formativo' },
  { id: 'PAUS 261', title: 'Salud Ambiental y Bioseguridad', code: 'PAUS 261', credits: 4, instructor: 'Aldo Garcia Rojas', description: 'Descontaminación NBQR y triage infectocontagioso.', competencies: ['Bioseguridad'], status: 'pendiente', semester: 4, level: 'Formativo' },
  { id: 'PAUS 260', title: 'Metodologia de la Investig.', code: 'PAUS 260', credits: 4, instructor: 'Carlos Omar Muñoz Guarneros', description: 'Desarrollo del protocolo de investigación en salud.', competencies: ['Investigación'], status: 'pendiente', semester: 4, level: 'Básico' },
  { id: 'PAUS 010', title: 'Bioetica', code: 'PAUS 010', credits: 3, instructor: 'Mariana Paula Loyola Gutierrez', description: 'Análisis de dilemas éticos en la medicina de urgencias.', competencies: ['Ética Médica'], status: 'pendiente', semester: 4, level: 'Básico' },
  { id: 'PAUS 254', title: 'Fun. de Res: Terrestre y Mont.', code: 'PAUS 254', credits: 4, instructor: 'Manuel Alejandro Alcazar Riva', description: 'Protocolos de rescate agreste y sistemas de cuerdas.', competencies: ['Rescate Vertical'], status: 'pendiente', semester: 4, level: 'Formativo' },
  { id: 'PAUS 262', title: 'Hab. Clin. II: Casos Clinicos', code: 'PAUS 262', credits: 4, instructor: 'Guadalupe del Carmen Robles', description: 'Discusión colegiada de diagnósticos diferenciales.', competencies: ['Juicio Médico'], status: 'pendiente', semester: 4, level: 'Formativo' },
  { id: 'PAUS 257', title: 'Urgencias en Trauma', code: 'PAUS 257', credits: 6, instructor: 'Guadalupe del Carmen Robles', description: 'Soporte vital de trauma prehospitalario (PHTLS).', competencies: ['Trauma Crítico'], status: 'pendiente', semester: 4, level: 'Formativo' },

  // SERVICIO SOCIAL
  { id: 'SSUM 100', title: 'Servicio Social', code: 'SSUM 100', credits: 26, instructor: 'Coordinación PAUM', description: '1300 horas de servicio social obligatorio pre-titulación.', competencies: ['Servicio a la Comunidad'], status: 'pendiente', semester: 'Servicio', level: 'Práctica/Servicio' }
];

export const MOCK_CLINICAL_FIELDS: ClinicalField[] = [];

export const MOCK_ACADEMIC_CALENDAR: AcademicEvent[] = [
  { id: 'mock-cal-01', date: '2026-01-05', title: 'Inicio de cursos Primavera 2026', type: 'clase' },
  { id: 'mock-cal-02', date: '2026-01-05', title: 'Periodo de Inscripción', type: 'ins' },
  { id: 'mock-cal-03', date: '2026-02-02', title: 'Suspensión de labores (Aniv. Const.)', type: 'susp' },
  { id: 'mock-cal-04', date: '2026-03-16', title: 'Suspensión de labores (Natalicio Juárez)', type: 'susp' },
  { id: 'mock-cal-05', date: '2026-03-30', title: 'Periodo Vacacional Semana Santa', type: 'vac' },
  { id: 'mock-cal-06', date: '2026-03-31', title: 'Periodo Vacacional Semana Santa', type: 'vac' },
  { id: 'mock-cal-07', date: '2026-04-01', title: 'Periodo Vacacional Semana Santa', type: 'vac' },
  { id: 'mock-cal-08', date: '2026-04-02', title: 'Periodo Vacacional Semana Santa', type: 'vac' },
  { id: 'mock-cal-09', date: '2026-04-03', title: 'Periodo Vacacional Semana Santa', type: 'vac' },
  { id: 'mock-cal-10', date: '2026-05-01', title: 'Día del Trabajo', type: 'susp' },
  { id: 'mock-cal-11', date: '2026-05-05', title: 'Batalla de Puebla', type: 'susp' },
  { id: 'mock-cal-12', date: '2026-05-15', title: 'Día del Maestro', type: 'susp' },
  { id: 'mock-cal-13', date: '2026-06-01', title: 'Fin de cursos Primavera', type: 'fin' },
  { id: 'mock-cal-14', date: '2026-08-10', title: 'Inicio de cursos Otoño 2026', type: 'clase' },
  { id: 'mock-cal-15', date: '2026-11-23', title: 'Día de la Benemérita BUAP', type: 'buap' },
];

export const MOCK_MINUTES: AcademicMinute[] = [
  {
    id: 'min-1',
    date: '2026-02-10',
    subject: 'Plenaria de Academia PAUM — Validación de evidencias OTA CIFRHS 2026 (Criterio 1)',
    fullData: {
      number: '01-2026',
      time: '10:00 a 12:00 horas',
      modality: 'Híbrida (sesión en línea y presencial en la Oficina de Coordinación del PAUM)',
      evidenceValidity: '5 años a partir de la fecha de emisión (10 de febrero de 2026)',
      revisedVersion: '2.0 — Actualización para proceso OTA CIFRHS 2026 (uso institucional)',
      agenda: [
        'Lista de asistencia y verificación de quórum.',
        'Presentación del paquete de evidencias del Criterio 1 (CIFRHS) para el proceso OTA 2026.',
        'Revisión y discusión colegiada de documentos (alcance, congruencia, criterios de vigencia y uso institucional).',
        'Acuerdos de aprobación, resguardo y carga a plataforma/expediente institucional.',
        'Asuntos generales y cierre.'
      ],
      documents: [
        { code: '1.1', title: 'Marco teórico-científico de la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.2', title: 'Objeto de estudio de la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.3', title: 'Antecedentes históricos de la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.4', title: 'Marco bioético de la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.5', title: 'Normatividad nacional vigente aplicable a la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.6', title: 'Referentes nacionales e internacionales en Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.7', title: 'Diagnóstico de necesidades y prioridades en Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' },
        { code: '1.8', title: 'Análisis del mercado laboral para el profesional en urgencias médicas prehospitalarias', version: '2.0', date: '10-feb-2026' },
        { code: '1.9', title: 'Estudio de factibilidad: suficiencia de campos clínicos y prehospitalarios', version: '2.0', date: '10-feb-2026' },
        { code: '1.10', title: 'Método científico, clínico y epidemiológico con enfoque humanístico en la AMP', version: '2.0', date: '10-feb-2026' },
        { code: '1.11', title: 'Técnicas de entrevista, valoración e intervención en la Atención Médica Prehospitalaria', version: '2.0', date: '10-feb-2026' }
      ],
      development: 'En sesión plenaria de la Academia del PAUM se presentó el paquete de evidencias correspondiente al Criterio 1 para el proceso OTA CIFRHS 2026 (documentos 1.1 a 1.15). La Academia revisó y discutió los documentos, verificando su congruencia interna, vigencia de fuentes, alineación con la normatividad aplicable y su pertinencia para sustentar el perfil formativo y el alcance profesional del TUMP egresado del PAUM.',
      agreements: [
        'Se aprueban los documentos de evidencia del Criterio 1 (CIFRHS) correspondientes a los apartados 1.1 a 1.15 para el proceso OTA 2026.',
        'Se valida su emisión con fecha 10 de febrero de 2026 y su vigencia de 5 años a partir de la fecha de emisión.',
        'Se autoriza su integración, resguardo y uso institucional dentro del expediente académico del PAUM.',
        'La Coordinación del PAUM concentrará las versiones finales (2.0) y gestionará su carga en la plataforma/expediente institucional correspondiente.'
      ],
      attendance: [
        { name: 'Dr. Ariel Farit Gutiérrez Alexander', role: 'Coordinador PAUM / Presidente de Academia' },
        { name: 'Lic. Miryam Nava Cervantes', role: 'Docente área de urgencias médicas' },
        { name: 'Lic. Jorge Chávez Leyva', role: 'Docente área de urgencias' },
        { name: 'Lic. Gabriela Fernanda May Compañ', role: 'Docente área de urgencias médicas' },
        { name: 'Lic. Alejandro González Vázquez', role: 'Docente área clínica' },
        { name: 'Dra. María Elena Bringas Tobón', role: 'Docente área médica' },
        { name: 'Lic. Flavia Marisol Aguilar Rivera', role: 'Docente área de urgencias' },
        { name: 'Lic. Armando Martínez Valdés', role: 'Docente TSU Urgencias / Paramédico / Lic. Derecho' },
        { name: 'Dr. Aldo García-Rojas', role: 'Docente Médico Cirujano / Mtra. Administración en Salud' }
      ]
    },
    tasks: []
  },
  {
    id: 'min-2',
    date: '2026-04-06',
    subject: 'Evaluación del Cuerpo Docente PAUM',
    tasks: [
      {
        id: 't3',
        description: 'Revisar folios de cédula del Dr. Casanova',
        dueDate: '2026-04-15',
        status: 'realizada',
        estimatedHours: 2,
        actualHours: 1.5,
        reminderSent: true
      }
    ]
  },
  {
    id: 'min-3',
    date: '2026-04-18',
    subject: 'Seguimiento de Práctica Profesional y Servicio Social',
    tasks: [
      {
        id: 't4',
        description: 'Validación de bitácoras de Práctica Profesional (Cruz Roja)',
        dueDate: '2026-04-22',
        status: 'pendiente',
        estimatedHours: 6,
        reminderSent: false
      },
      {
        id: 't5',
        description: 'Integración de expedientes para inicio de Servicio Social',
        dueDate: '2026-05-05',
        status: 'pendiente',
        estimatedHours: 10,
        reminderSent: false
      }
    ]
  }
];

export const MOCK_SECTIONS: AcademicSection[] = [
  // 1° SEMESTRE (Emerald)
  {
    id: 'sec-51740', moduleId: 'PAUS 001', moduleName: 'Fun. Anat. Cab, Cuello y Torax',
    facultyId: '100534457', groupCode: '51740', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '08:00', end: '09:00' }))
  },
  {
    id: 'sec-51749', moduleId: 'FGUS 004', moduleName: 'Lengua Extranjera I',
    facultyId: 'LEN', groupCode: '51749', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '11:00', end: '12:00' }))
  },
  {
    id: 'sec-53023', moduleId: 'FGUS 002', moduleName: 'DHPC',
    facultyId: 'NSS524158', groupCode: '53023', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '09:00', end: '10:00' }))
  },
  {
    id: 'sec-53026', moduleId: 'PAUS 003', moduleName: 'Habilidades Clinicas I',
    facultyId: 'Hon - ROBLES', groupCode: '53026', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Miércoles', 'Viernes'].map(d => ({ day: d as any, start: '10:00', end: '11:00' }))
  },
  {
    id: 'sec-53028', moduleId: 'PAUS 004', moduleName: 'Primeros Auxilios',
    facultyId: 'Hon - ROBLES', groupCode: '53028', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: [
      { day: 'Martes', start: '10:00', end: '11:00' },
      { day: 'Jueves', start: '10:00', end: '11:00' },
      { day: 'Viernes', start: '11:00', end: '12:00' }
    ]
  },
  {
    id: 'sec-53033', moduleId: 'PAUS 005', moduleName: 'Manejo Emoc. Ante Sit. Estres',
    facultyId: '100517784', groupCode: '53033', room: '3MED2/223', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '12:00', end: '13:00' }))
  },
  {
    id: 'sec-53035', moduleId: 'PAUS 002', moduleName: 'Bioquimica',
    facultyId: '100528981', groupCode: '53035', room: '3MED6/201', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '13:00', end: '14:00' }))
  },
  {
    id: 'sec-53039', moduleId: 'PAUS 002', moduleName: 'Bioquimica Lab',
    facultyId: '100528981', groupCode: '53039', room: '3MED2/420', roomType: 'Laboratorio', capacity: 15, enrolled: 15,
    schedule: [{ day: 'Martes', start: '14:00', end: '16:00' }]
  },
  {
    id: 'sec-53041', moduleId: 'PAUS 002', moduleName: 'Bioquimica Lab',
    facultyId: '100528981', groupCode: '53041', room: '3MED2/420', roomType: 'Laboratorio', capacity: 15, enrolled: 15,
    schedule: [{ day: 'Jueves', start: '14:00', end: '16:00' }]
  },

  // 2° SEMESTRE (Blue)
  {
    id: 'sec-53051', moduleId: 'PAUS 006', moduleName: 'Fund. Anat. Abdomen y Extremid',
    facultyId: '100534457', groupCode: '53051', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '09:00', end: '10:00' }))
  },
  {
    id: 'sec-53058', moduleId: 'PAUS 007', moduleName: 'Principios de Fisiologia',
    facultyId: '100540297', groupCode: '53058', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '10:00', end: '11:00' }))
  },
  {
    id: 'sec-53061', moduleId: 'PAUS 007', moduleName: 'Principios de Fisiologia Lab',
    facultyId: '100410577', groupCode: '53061', room: '3MED6/202', roomType: 'Laboratorio', capacity: 30, enrolled: 30,
    schedule: [{ day: 'Viernes', start: '08:00', end: '10:00' }]
  },
  {
    id: 'sec-53066', moduleId: 'PAUS 007', moduleName: 'Principios de Fisiologia Lab',
    facultyId: '100410577', groupCode: '53066', room: '3MED6/202', roomType: 'Laboratorio', capacity: 30, enrolled: 30,
    schedule: [{ day: 'Viernes', start: '10:00', end: '12:00' }]
  },
  {
    id: 'sec-53068', moduleId: 'PAUS 009', moduleName: 'Atn.Des.Nat. y Antropogenicos',
    facultyId: 'Hon - SALDAÑA', groupCode: '53068', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '07:00', end: '08:00' }))
  },
  {
    id: 'sec-53072', moduleId: 'FGUS 001', moduleName: 'Formacion Humana y Social',
    facultyId: '100407855', groupCode: '53072', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '11:00', end: '12:00' }))
  },
  {
    id: 'sec-53075', moduleId: 'PAUS 258', moduleName: 'Der. en Urgencias y Desastres',
    facultyId: '100534462', groupCode: '53075', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '12:00', end: '13:00' }))
  },
  {
    id: 'sec-53077', moduleId: 'PAUS 011', moduleName: 'Equipam.Med.Tecnol. Ambulancia',
    facultyId: '100534462', groupCode: '53077', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '13:00', end: '14:00' }))
  },
  {
    id: 'sec-53081', moduleId: 'FGUS 005', moduleName: 'Lengua Extranjera II',
    facultyId: 'LEN', groupCode: '53081', room: '3MED6/202', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '08:00', end: '09:00' }))
  },

  // 3° SEMESTRE (Amber)
  {
    id: 'sec-53084', moduleId: 'PAUS 008', moduleName: 'Clinica Propedeutica',
    facultyId: '100529140', groupCode: '53084', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '07:00', end: '08:00' }))
  },
  {
    id: 'sec-53089', moduleId: 'PAUS 253', moduleName: 'Urgencias Pediatricas',
    facultyId: '100525504', groupCode: '53089', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '08:00', end: '09:00' }))
  },
  {
    id: 'sec-53097', moduleId: 'PAUS 250', moduleName: 'Farmacologia de las Urg. Med.',
    facultyId: '100430200', groupCode: '53097', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '09:00', end: '10:00' }))
  },
  {
    id: 'sec-53101', moduleId: 'PAUS 250', moduleName: 'Farmacologia de Urg. Med. LAB',
    facultyId: '100522791', groupCode: '53101', room: '3MED9/201', roomType: 'Laboratorio', capacity: 15, enrolled: 15,
    schedule: [{ day: 'Viernes', start: '10:00', end: '12:00' }]
  },
  {
    id: 'sec-53105', moduleId: 'PAUS 250', moduleName: 'Farmacologia de Urg. Med. LAB',
    facultyId: '100522791', groupCode: '53105', room: '3MED9/201', roomType: 'Laboratorio', capacity: 15, enrolled: 15,
    schedule: [{ day: 'Viernes', start: '09:00', end: '11:00' }]
  },
  {
    id: 'sec-53110', moduleId: 'PAUS 256', moduleName: 'Fundamentos de Resc: Acuatico',
    facultyId: '100534462', groupCode: '53110', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '11:00', end: '12:00' }))
  },
  {
    id: 'sec-53128', moduleId: 'PAUS 252', moduleName: 'Urgencias en Adultos',
    facultyId: '100535464', groupCode: '53128', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '13:00', end: '14:00' }))
  },
  {
    id: 'sec-53131', moduleId: 'PAUS 251', moduleName: 'Urgencias Obstetricas',
    facultyId: '100345699', groupCode: '53131', room: '3HUP3/112', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(d => ({ day: d as any, start: '12:00', end: '13:00' }))
  },
  {
    id: 'sec-53137', moduleId: 'PAUS 255', moduleName: 'Fundamentos de Rescante: Aereo',
    facultyId: '100534462', groupCode: '53137', room: '3MED6/203', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '14:00', end: '15:00' }))
  },

  // 4° SEMESTRE (Purple)
  {
    id: 'sec-53140', moduleId: 'PPUM 101', moduleName: 'Practica Profesional',
    facultyId: '100534457', groupCode: '53140', room: '3MED6/204', roomType: 'Práctica', capacity: 30, enrolled: 30,
    schedule: []
  },
  {
    id: 'sec-53144', moduleId: 'PAUS 259', moduleName: 'Seguridad Industrial',
    facultyId: '100529140', groupCode: '53144', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '08:00', end: '09:00' }))
  },
  {
    id: 'sec-53152', moduleId: 'PAUS 261', moduleName: 'Salud Ambiental y Bioseguridad',
    facultyId: '100529140', groupCode: '53152', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '09:00', end: '10:00' }))
  },
  {
    id: 'sec-53155', moduleId: 'PAUS 260', moduleName: 'Metodologia de la Investig.',
    facultyId: '100518724', groupCode: '53155', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '10:00', end: '11:00' }))
  },
  {
    id: 'sec-53160', moduleId: 'PAUS 010', moduleName: 'Bioetica',
    facultyId: '100063122', groupCode: '53160', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles'].map(d => ({ day: d as any, start: '11:00', end: '12:00' }))
  },
  {
    id: 'sec-53163', moduleId: 'PAUS 254', moduleName: 'Fun. de Res: Terrestre y Mont.',
    facultyId: 'Hon - ALCAZAR', groupCode: '53163', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves'].map(d => ({ day: d as any, start: '07:00', end: '08:00' }))
  },
  {
    id: 'sec-53166', moduleId: 'PAUS 262', moduleName: 'Hab. Clin. II: Casos Clinicos',
    facultyId: 'Hon - ROBLES', groupCode: '53166', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: [
      { day: 'Jueves', start: '11:00', end: '13:00' },
      { day: 'Viernes', start: '12:00', end: '14:00' }
    ]
  },
  {
    id: 'sec-53171', moduleId: 'PAUS 257', moduleName: 'Urgencias en Trauma',
    facultyId: 'Hon - ROBLES', groupCode: '53171', room: '3MED6/204', roomType: 'Teórico', capacity: 30, enrolled: 30,
    schedule: [
      { day: 'Lunes', start: '12:00', end: '13:00' },
      { day: 'Martes', start: '12:00', end: '13:00' },
      { day: 'Miércoles', start: '12:00', end: '13:00' },
      { day: 'Viernes', start: '08:00', end: '10:00' }
    ]
  },
  {
    id: 'sec-social', moduleId: 'SS', moduleName: 'Servicio Social',
    facultyId: '', groupCode: 'x.', room: '', roomType: 'Otros', capacity: 0, enrolled: 0,
    schedule: []
  }
];

export const MOCK_ROTATIONS: Rotation[] = [
  {
    id: 'r1',
    studentId: 's1',
    studentName: 'Ana García López',
    facility: 'Hospital Central de Emergencias',
    department: 'Urgencias Adultos',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    supervisor: 'Dr. Alberto Ruiz',
    status: 'en_progreso'
  },
  {
    id: 'r2',
    studentId: 's4',
    studentName: 'Miguel Ángel Torres',
    facility: 'Cruz Roja Mexicana',
    department: 'Unidades de Rescate',
    startDate: '2026-04-10',
    endDate: '2026-05-10',
    supervisor: 'TUM-P Mario Sánchez',
    status: 'en_progreso'
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    type: 'evaluation',
    title: 'Examen Parcial: Abdomen',
    timestamp: '2026-04-15T09:00:00Z',
    status: 'completado'
  },
  {
    id: 'a2',
    type: 'lecture',
    title: 'Taller de Disección Digestiva',
    timestamp: '2026-04-20T10:00:00Z',
    status: 'pendiente'
  },
  {
    id: 'a3',
    type: 'rotation',
    title: 'Evaluación Interna de Campos Clínicos',
    timestamp: '2026-04-24T07:00:00Z',
    status: 'programado'
  }
];
