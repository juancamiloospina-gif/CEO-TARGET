import type { ProfileContent, Industry } from './scoring';

export type DemoProfile = {
  id: string;
  label: string;
  description: string;
  content: ProfileContent;
  industry: Industry;
};

export const demoProfiles: DemoProfile[] = [
  {
    id: 'low',
    label: 'Perfil Bajo',
    description: 'Sin skills IA, headline generico, sin certificaciones, sin actividad IA.',
    industry: 'Retail',
    content: {
      name: 'Carlos Mendoza',
      headline: 'Gerente de Tienda | Retail | Atencion al Cliente',
      about: 'Mas de 15 anos gestionando tiendas en el sector retail. Especialista en operaciones y logistica de inventario. Apasionado por el servicio al cliente y el trabajo en equipo.',
      currentRole: 'Gerente de Tienda',
      experience: [
        'Gerente de Tienda - Modas Express (2020 - presente)',
        'Supervisor de Ventas - Grupo Retail (2015 - 2020)',
        'Vendedor - Almacenes Central (2010 - 2015)',
      ],
      education: ['Grado en Administracion de Empresas - Universidad Complutense'],
      skills: ['Gestion de equipos', 'Atencion al cliente', 'Inventario', 'Logistica', 'Ventas', 'Microsoft Office'],
      certifications: [],
      projects: [],
      recentPosts: [],
      aiRelatedTerms: [],
      quantifiableResults: [],
    },
  },
  {
    id: 'medium',
    label: 'Perfil Medio',
    description: 'Algunas skills, menciones conceptuales, certificacion basica.',
    industry: 'Consultoría',
    content: {
      name: 'Laura Fernandez',
      headline: 'Consultora de Transformacion Digital | Data-Driven Strategy',
      about: 'Consultora de transformacion digital con 8 anos de experiencia ayudando a empresas a adoptar tecnologias emergentes. He trabajado en proyectos de automatizacion de procesos y analitica predictiva para clientes en sector financiero y retail. Me interesa la inteligencia artificial y su aplicacion en la estrategia empresarial. He implementado soluciones basadas en datos que mejoraron la eficiencia operativa de mis clientes.',
      currentRole: 'Senior Consultant',
      experience: [
        'Senior Consultant - Deloitte Digital (2021 - presente)',
        'Consultant - Accenture Strategy (2018 - 2021)',
        'Analista de procesos - KPMG (2016 - 2018)',
      ],
      education: [
        'MBA - IE Business School',
        'Grado en Administracion y Direccion de Empresas - Universidad Carlos III',
      ],
      skills: ['Digital Transformation', 'Process Automation', 'Data Analytics', 'Strategy', 'Change Management', 'Artificial Intelligence', 'Power BI', 'SQL'],
      certifications: ['Google Analytics Certification', 'AI for Everyone (Coursera)'],
      projects: ['Automatizacion de reportes financieros para cliente bancario'],
      recentPosts: [
        'Comparti mi opinion sobre como la transformacion digital esta cambiando la consultoria',
        'Escribi un articulo sobre data-driven decision making en empresas tradicionales',
      ],
      aiRelatedTerms: ['inteligencia artificial', 'automatizacion', 'analitica predictiva', 'data-driven'],
      quantifiableResults: ['mejoro la eficiencia operativa'],
    },
  },
  {
    id: 'high',
    label: 'Perfil Alto',
    description: 'Headline especializado, About con casos medibles, certificaciones relevantes, actividad constante.',
    industry: 'Tecnología',
    content: {
      name: 'Andrea Ruiz',
      headline: 'Head of AI Strategy | Generative AI & LLMs | Building AI Systems for Enterprise',
      about: 'Lidero la estrategia de IA generativa en una empresa SaaS de 200 empleados. He implementado agentes de IA que automatizaron el 40% del soporte al cliente, reduciendo el tiempo de respuesta en un 65%. Desarrolle un pipeline RAG con GPT-4 que procesa 50.000 documentos internos y redujo el tiempo de onboarding de nuevos empleados en 3x. Mi equipo construyo un sistema de prediccion de churn con 92% de precision usando machine learning. Especializada en LLMs, prompt engineering, MLOps y gobernanza de IA. Hablo en conferencias sobre IA aplicada y escribo un newsletter semanal sobre implementacion practica de IA en empresas.',
      currentRole: 'Head of AI Strategy',
      experience: [
        'Head of AI Strategy - TechFlow SaaS (2022 - presente)',
        'Senior ML Engineer - DataRobot (2019 - 2022)',
        'AI Consultant - McKinsey QuantumBlack (2017 - 2019)',
      ],
      education: [
        'MsC in Artificial Intelligence - Stanford University',
        'BsC in Computer Science - MIT',
      ],
      skills: [
        'Generative AI', 'LLMs', 'Machine Learning', 'Deep Learning',
        'Prompt Engineering', 'AI Strategy', 'MLOps', 'RAG',
        'Natural Language Processing', 'Computer Vision', 'Python',
        'TensorFlow', 'PyTorch', 'AI Governance',
      ],
      certifications: [
        'Deep Learning Specialization - DeepLearning.AI (Coursera)',
        'TensorFlow Developer Certificate - Google',
        'AWS Machine Learning Specialty - Amazon',
        'AI for Business Strategy - MIT Sloan',
      ],
      projects: [
        'Sistema de agentes IA para soporte al cliente (reduccion 40% tickets)',
        'Pipeline RAG con GPT-4 para 50.000 documentos internos',
        'Modelo de prediccion de churn (92% precision)',
      ],
      recentPosts: [
        'Publico semanalmente en mi newsletter "AI in Practice" sobre implementaciones reales de IA en empresas',
        'Comparti un caso de estudio sobre como automatizamos el soporte con agentes IA y reducimos el tiempo de respuesta 65%',
        'Hable en la AI Conference 2024 sobre gobernanza de IA en entornos empresariales',
        'Escribi un analisis sobre RAG vs fine-tuning para casos de uso empresarial',
        'Comparti los resultados de nuestro modelo de prediccion de churn con 92% de precision',
      ],
      aiRelatedTerms: [
        'generative ai', 'llm', 'rag', 'ai agents', 'machine learning', 'deep learning',
        'prompt engineering', 'ai strategy', 'mlops', 'nlp', 'ai governance',
      ],
      quantifiableResults: [
        '40% automatizacion del soporte',
        '65% reduccion en tiempo de respuesta',
        '3x reduccion en onboarding',
        '92% precision en prediccion de churn',
      ],
    },
  },
];
