import { DataSource } from 'typeorm';
import { BusinessProfile } from '../business-profile/entities/business-profile.entity';
import { InstagramAccount } from '../instagram/entities/instagram-account.entity';
import { User } from '../users/entities/user.entity';
import dataSource from '../config/typeorm.config';
import { v4 as uuidv4 } from 'uuid';

const businessProfilesData = [
  {
    brandName: 'Café La Bohemia',
    brandDescription: 'Cafetería artesanal con granos selectos de origen latinoamericano. Ofrecemos una experiencia única de café en un ambiente acogedor y cultural.',
    industry: 'Gastronomía y Café',
    targetAudience: 'Amantes del café, estudiantes universitarios, trabajadores remotos, creativos de 22-45 años',
    brandValues: 'Calidad, Autenticidad, Cultura, Sostenibilidad',
    brandColors: ['#8B4513', '#D2691E', '#F5DEB3', '#2F4F4F', '#FFFAF0'],
    logoUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&h=200',
    visualStyle: 'bohemio',
    communicationTone: 'cercano',
    contentThemes: ['cultura del café', 'recetas de café', 'eventos culturales', 'arte latte', 'historias de origen'],
    productCategories: ['café de especialidad', 'postres', 'desayunos', 'eventos privados'],
    postingSchedule: {
      monday: ['07:30', '17:00'],
      tuesday: ['07:30', '17:00'],
      wednesday: ['07:30', '17:00'],
      thursday: ['07:30', '17:00'],
      friday: ['07:30', '17:00'],
      saturday: ['09:00', '16:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Usar imágenes cálidas con iluminación natural, mostrar el proceso artesanal, compartir historias de los productores de café, crear conexión emocional con la audiencia',
    prohibitedTopics: ['café instantáneo', 'cadenas comerciales', 'contenido político']
  },
  {
    brandName: 'FitZona Gym',
    brandDescription: 'Centro de fitness integral con entrenadores certificados y equipamiento de última generación. Transformamos vidas a través del ejercicio y la nutrición.',
    industry: 'Salud y Fitness',
    targetAudience: 'Personas activas, profesionales ocupados, deportistas amateur de 20-55 años',
    brandValues: 'Disciplina, Transformación, Comunidad, Bienestar',
    brandColors: ['#FF4500', '#FFD700', '#1C1C1C', '#FFFFFF', '#32CD32'],
    logoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200',
    visualStyle: 'energético',
    communicationTone: 'motivacional',
    contentThemes: ['rutinas de ejercicio', 'tips de nutrición', 'historias de éxito', 'retos fitness', 'vida saludable'],
    productCategories: ['entrenamiento personal', 'clases grupales', 'planes nutricionales', 'membresías'],
    postingSchedule: {
      monday: ['06:00', '12:00', '18:00'],
      tuesday: ['06:00', '18:00'],
      wednesday: ['06:00', '12:00', '18:00'],
      thursday: ['06:00', '18:00'],
      friday: ['06:00', '12:00', '17:00'],
      saturday: ['08:00', '14:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Mostrar diversidad corporal, enfocarse en salud más que apariencia, incluir demostraciones de técnica correcta, celebrar logros de miembros',
    prohibitedTopics: ['dietas extremas', 'body shaming', 'promesas milagrosas', 'sustancias prohibidas']
  },
  {
    brandName: 'Moda Latina',
    brandDescription: 'Boutique de moda con diseños exclusivos que celebran la cultura y elegancia latinoamericana. Vestimos mujeres con estilo y personalidad.',
    industry: 'Moda y Ropa',
    targetAudience: 'Mujeres fashion-forward, profesionales, amantes de la moda de 25-50 años',
    brandValues: 'Elegancia, Originalidad, Empoderamiento, Cultura',
    brandColors: ['#C41E3A', '#FFD700', '#000000', '#FFFFFF', '#F5F5DC'],
    logoUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200',
    visualStyle: 'elegante',
    communicationTone: 'sofisticado',
    contentThemes: ['tendencias de moda', 'tips de estilo', 'nuevas colecciones', 'looks del día', 'moda sostenible'],
    productCategories: ['vestidos', 'blusas', 'pantalones', 'accesorios', 'colecciones especiales'],
    postingSchedule: {
      monday: ['10:00', '19:00'],
      wednesday: ['10:00', '19:00'],
      friday: ['10:00', '19:00'],
      saturday: ['11:00', '17:00'],
      sunday: ['15:00'],
      frequency: 'four_times_weekly'
    },
    contentGuidelines: 'Fotografía profesional de producto, diversidad de modelos, combinar looks con accesorios, crear contenido aspiracional pero accesible',
    prohibitedTopics: ['críticas a otras marcas', 'contenido sexualizado', 'tallas limitadas']
  },
  {
    brandName: 'TechPro Soluciones',
    brandDescription: 'Consultora tecnológica especializada en transformación digital para PYMES. Ayudamos a negocios a crecer con tecnología inteligente.',
    industry: 'Tecnología y Software',
    targetAudience: 'Dueños de PYMES, gerentes de TI, emprendedores de 30-55 años',
    brandValues: 'Innovación, Confianza, Resultados, Servicio',
    brandColors: ['#0066CC', '#00A86B', '#F0F8FF', '#333333', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200',
    visualStyle: 'moderno',
    communicationTone: 'profesional',
    contentThemes: ['transformación digital', 'automatización', 'casos de éxito', 'tendencias tech', 'productividad'],
    productCategories: ['consultoría IT', 'desarrollo software', 'servicios cloud', 'ciberseguridad'],
    postingSchedule: {
      monday: ['09:00', '15:00'],
      tuesday: ['09:00', '15:00'],
      wednesday: ['09:00', '15:00'],
      thursday: ['09:00', '15:00'],
      friday: ['09:00', '14:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Contenido educativo y de valor, usar infografías explicativas, compartir estadísticas relevantes, mostrar casos de éxito reales',
    prohibitedTopics: ['política', 'religión', 'promesas de resultados garantizados']
  },
  {
    brandName: 'Jardines del Sol',
    brandDescription: 'Vivero y servicios de paisajismo que crean espacios verdes hermosos y sostenibles. Transformamos jardines en oasis de tranquilidad.',
    industry: 'Jardinería y Paisajismo',
    targetAudience: 'Propietarios de viviendas, arquitectos, amantes de las plantas de 30-65 años',
    brandValues: 'Naturaleza, Sostenibilidad, Belleza, Artesanía',
    brandColors: ['#228B22', '#90EE90', '#F5FFFA', '#8B4513', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200',
    visualStyle: 'natural',
    communicationTone: 'educativo',
    contentThemes: ['cuidado de plantas', 'diseño de jardines', 'plantas de temporada', 'huertos urbanos', 'decoración verde'],
    productCategories: ['plantas ornamentales', 'árboles frutales', 'diseño paisajístico', 'mantenimiento'],
    postingSchedule: {
      tuesday: ['10:00', '17:00'],
      thursday: ['10:00', '17:00'],
      saturday: ['09:00', '15:00'],
      frequency: 'three_times_weekly'
    },
    contentGuidelines: 'Mostrar belleza natural, educar sobre cuidado de plantas, usar fotografía con luz natural, compartir transformaciones de jardines',
    prohibitedTopics: ['pesticidas químicos', 'plantas invasoras', 'deforestación']
  },
  {
    brandName: 'Dulce Tentación',
    brandDescription: 'Pastelería artesanal especializada en postres únicos y pasteles personalizados. Cada creación es una obra de arte comestible.',
    industry: 'Repostería y Pastelería',
    targetAudience: 'Amantes de los postres, organizadores de eventos, familias de 25-55 años',
    brandValues: 'Creatividad, Calidad Premium, Pasión, Celebración',
    brandColors: ['#FFB6C1', '#DDA0DD', '#FFFACD', '#8B4513', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=200&h=200',
    visualStyle: 'dulce',
    communicationTone: 'alegre',
    contentThemes: ['proceso creativo', 'pasteles personalizados', 'recetas sencillas', 'celebraciones', 'nuevos sabores'],
    productCategories: ['pasteles de cumpleaños', 'postres gourmet', 'cupcakes', 'dulces para eventos'],
    postingSchedule: {
      monday: ['11:00', '18:00'],
      wednesday: ['11:00', '18:00'],
      friday: ['11:00', '18:00'],
      saturday: ['10:00', '16:00'],
      sunday: ['14:00'],
      frequency: 'four_times_weekly'
    },
    contentGuidelines: 'Fotografía food styling profesional, mostrar proceso de decoración, usar colores vibrantes, crear contenido que genere antojo',
    prohibitedTopics: ['información nutricional negativa', 'dietas restrictivas', 'contenido que no sea apto para todo público']
  },
  {
    brandName: 'Pet Paradise',
    brandDescription: 'Tienda de mascotas con productos premium y servicios de cuidado integral. Todo lo que tu mejor amigo necesita para ser feliz.',
    industry: 'Mascotas y Animales',
    targetAudience: 'Dueños de mascotas, amantes de los animales, familias de 20-60 años',
    brandValues: 'Amor por los animales, Bienestar, Diversión, Responsabilidad',
    brandColors: ['#FF6347', '#4169E1', '#FFD700', '#98FB98', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200',
    visualStyle: 'divertido',
    communicationTone: 'cariñoso',
    contentThemes: ['consejos de cuidado', 'productos nuevos', 'mascotas adorables', 'entrenamiento', 'salud animal'],
    productCategories: ['alimentos premium', 'juguetes', 'accesorios', 'grooming', 'salud'],
    postingSchedule: {
      monday: ['10:00', '17:00'],
      tuesday: ['10:00', '17:00'],
      wednesday: ['10:00', '17:00'],
      thursday: ['10:00', '17:00'],
      friday: ['10:00', '17:00'],
      saturday: ['10:00', '15:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Mostrar mascotas felices, contenido educativo sobre cuidado responsable, usar humor apropiado, involucrar a la comunidad pet',
    prohibitedTopics: ['maltrato animal', 'venta de animales exóticos ilegales', 'productos no seguros']
  },
  {
    brandName: 'Estudio Zen Yoga',
    brandDescription: 'Centro de yoga y meditación para el equilibrio cuerpo-mente. Ofrecemos clases para todos los niveles en un espacio de paz y armonía.',
    industry: 'Bienestar y Yoga',
    targetAudience: 'Profesionales estresados, buscadores de bienestar, personas de todas las edades interesadas en yoga',
    brandValues: 'Paz interior, Equilibrio, Comunidad, Crecimiento personal',
    brandColors: ['#9370DB', '#87CEEB', '#F0FFF0', '#DAA520', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=200&h=200',
    visualStyle: 'zen',
    communicationTone: 'sereno',
    contentThemes: ['posturas de yoga', 'meditación guiada', 'bienestar mental', 'respiración', 'estilo de vida consciente'],
    productCategories: ['clases presenciales', 'clases online', 'retiros', 'formación de instructores'],
    postingSchedule: {
      monday: ['06:30', '19:00'],
      wednesday: ['06:30', '19:00'],
      friday: ['06:30', '19:00'],
      saturday: ['09:00', '17:00'],
      sunday: ['10:00'],
      frequency: 'four_times_weekly'
    },
    contentGuidelines: 'Usar imágenes serenas y naturales, demostrar posturas con técnica correcta, promover inclusividad, compartir reflexiones inspiradoras',
    prohibitedTopics: ['competitividad física', 'presión estética', 'espiritualidad dogmática']
  }
];

const instagramAccountsData = [
  { username: 'cafe_labohemia', instagramUserId: '99001001', name: 'Café La Bohemia' },
  { username: 'fitzona_gym', instagramUserId: '99001002', name: 'FitZona Gym' },
  { username: 'moda_latina_oficial', instagramUserId: '99001003', name: 'Moda Latina' },
  { username: 'techpro_soluciones', instagramUserId: '99001004', name: 'TechPro Soluciones' },
  { username: 'jardines_delsol', instagramUserId: '99001005', name: 'Jardines del Sol' },
  { username: 'dulce_tentacion_mx', instagramUserId: '99001006', name: 'Dulce Tentación' },
  { username: 'pet_paradise_tienda', instagramUserId: '99001007', name: 'Pet Paradise' },
  { username: 'estudio_zen_yoga', instagramUserId: '99001008', name: 'Estudio Zen Yoga' },
];

async function seedSpanishBusinessProfiles() {
  try {
    // Initialize the data source
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log('Data source initialized successfully');

    const userRepository = dataSource.getRepository(User);
    const instagramAccountRepository = dataSource.getRepository(InstagramAccount);
    const businessProfileRepository = dataSource.getRepository(BusinessProfile);

    // Get or create a test user
    let users = await userRepository.find();
    if (users.length === 0) {
      console.log('Creating test user...');
      const testUser = userRepository.create({
        email: 'usuario_demo@postia.io',
        password: '$2b$10$hashedpassword123',
        fullName: 'Usuario Demo',
      });
      const savedUser = await userRepository.save(testUser);
      users = [savedUser];
    }

    console.log(`Found ${users.length} users`);

    // Get existing Instagram accounts that already have business profiles
    const existingProfiles = await businessProfileRepository.find({
      relations: ['instagramAccount']
    });
    const usedInstagramAccountIds = new Set(existingProfiles.map(p => p.instagramAccount?.id).filter(Boolean));

    // Create Instagram accounts for new Spanish business profiles
    console.log('Creating Spanish Instagram accounts...');
    const instagramAccounts: InstagramAccount[] = [];

    for (let i = 0; i < instagramAccountsData.length; i++) {
      const account = instagramAccountsData[i];
      const user = users[i % users.length];
      
      const existingAccount = await instagramAccountRepository.findOne({
        where: { instagramUserId: account.instagramUserId }
      });

      if (!existingAccount) {
        const newAccount = instagramAccountRepository.create({
          ...account,
          userId: user.id,
          profilePictureUrl: `https://images.unsplash.com/photo-${1600000000 + i}?w=150&h=150`,
          accessToken: `spanish_token_${i}`,
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true
        });
        
        const savedAccount = await instagramAccountRepository.save(newAccount);
        instagramAccounts.push(savedAccount);
      } else {
        instagramAccounts.push(existingAccount);
      }
    }

    console.log('Creating Spanish business profiles...');

    const businessProfiles = [];
    for (let i = 0; i < businessProfilesData.length; i++) {
      const profileData = businessProfilesData[i];
      const instagramAccount = instagramAccounts[i];

      // Skip if this instagram account already has a business profile
      if (usedInstagramAccountIds.has(instagramAccount.id)) {
        console.log(`Skipping ${profileData.brandName} - Instagram account already has a business profile`);
        continue;
      }

      // Check if business profile already exists
      const existingProfile = await businessProfileRepository.findOne({
        where: { brandName: profileData.brandName }
      });

      if (existingProfile) {
        console.log(`Skipping ${profileData.brandName} - already exists`);
        continue;
      }

      const businessProfile = businessProfileRepository.create({
        ...profileData,
        instagramAccount: instagramAccount,
      });

      const savedProfile = await businessProfileRepository.save(businessProfile);
      businessProfiles.push(savedProfile);
      console.log(`Created Spanish business profile: ${savedProfile.brandName}`);
    }

    console.log(`\\n✅ Successfully created ${businessProfiles.length} Spanish business profiles!`);

    // Display summary
    console.log('\\n📊 Summary:');
    for (const profile of businessProfiles) {
      console.log(`- ${profile.brandName} (${profile.industry})`);
    }

    await dataSource.destroy();
    console.log('\\nData source closed');
    
  } catch (error) {
    console.error('Error seeding Spanish business profiles:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed
seedSpanishBusinessProfiles();
