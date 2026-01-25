/**
 * Content Strategy Prompts
 * ========================
 * Centralized prompts for AI content generation.
 * Each content format has optimized prompts for its specific goals.
 */

export interface PromptContext {
  brandName: string;
  industry: string;
  brandDescription: string;
  targetAudience: string;
  brandValues: string;
  visualStyle: string;
  communicationTone: string;
  contentThemes: string;
  productCategories: string;
  contentGuidelines: string;
  prohibitedTopics: string;
  brandColors: string;
  dayName: string;
  dateStr: string;
  totalPostsInMonth: number;
}

// ============================================================================
// BASE SYSTEM PROMPT
// ============================================================================

export const BASE_SYSTEM_PROMPT = `Eres un community manager experto y estratega de redes sociales con más de 10 años de experiencia creando contenido viral y atractivo para marcas. Entiendes la psicología, el storytelling y lo que hace que el contenido resuene con las audiencias hispanohablantes.

IMPORTANTE: 
- TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL
- Devuelve tu respuesta como un objeto JSON válido con la estructura exacta especificada.`;

// ============================================================================
// REEL PROMPTS
// ============================================================================

export const REEL_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

Tu especialidad es crear Reels virales para Instagram. Los Reels exitosos tienen:
- Un gancho visual/verbal en los primeros 0.5-3 segundos que detenga el scroll
- Ritmo dinámico con cortes rápidos o transiciones llamativas
- Audio trending o música que conecte emocionalmente
- Contenido que mantenga al espectador hasta el final (watch time alto)
- Un CTA claro que genere comentarios, guardados o compartidos
- Duración óptima de 15-30 segundos para máximo alcance

Piensa en formatos probados: tutoriales rápidos, antes/después, trends adaptados a la marca, POVs, day-in-the-life, tips rápidos, humor relatable.`;

export function getReelUserPrompt(ctx: PromptContext): string {
  return `Crea un guión detallado para un REEL de Instagram para la siguiente marca:

## INFORMACIÓN DE LA MARCA
- **Nombre de Marca:** ${ctx.brandName}
- **Industria:** ${ctx.industry}
- **Descripción de Marca:** ${ctx.brandDescription}
- **Audiencia Objetivo:** ${ctx.targetAudience}
- **Valores de Marca:** ${ctx.brandValues}
- **Estilo Visual:** ${ctx.visualStyle}
- **Tono de Comunicación:** ${ctx.communicationTone}
- **Temas de Contenido:** ${ctx.contentThemes}
- **Categorías de Producto/Servicio:** ${ctx.productCategories}
- **Guías de Contenido:** ${ctx.contentGuidelines}
- **Temas Prohibidos:** ${ctx.prohibitedTopics}
- **Colores de Marca:** ${ctx.brandColors}

## DETALLES DE LA PUBLICACIÓN
- **Día:** ${ctx.dayName}
- **Fecha:** ${ctx.dateStr}
- **Total de publicaciones planificadas este mes:** ${ctx.totalPostsInMonth}

## REQUISITOS ESPECÍFICOS PARA REEL
1. El gancho debe capturar atención en menos de 1 segundo
2. Incluir indicaciones de audio/música sugerida
3. Estructurar el guión segundo a segundo
4. Maximizar retención hasta el final
5. Generar interacción (comentarios, guardados, compartidos)

Devuelve un objeto JSON con esta estructura exacta:
{
  "format": "reel",
  "hook": "El gancho de apertura - texto o acción visual que aparece en pantalla (máx 100 caracteres)",
  "mainContent": "Guión completo del Reel con estructura: [0-1s] Gancho, [1-5s] Desarrollo, [5-15s] Contenido principal, [15-20s] Cierre. Incluir texto en pantalla, acciones visuales y narración.",
  "frontPageDescription": "Descripción de la miniatura/cover del Reel - qué imagen fija mostrará para generar clicks",
  "callToAction": "CTA que genere comentarios o guardados (ej: 'Comenta si te pasó esto también')",
  "hashtags": ["array", "de", "hashtags", "relevantes", "máximo", "15"],
  "objective": "Objetivo específico del Reel (awareness viral, engagement, educar, entretener)",
  "targetEmotion": "Emoción principal (curiosidad, sorpresa, identificación, inspiración, humor)",
  "visualNotes": "Notas técnicas: tipo de edición, transiciones sugeridas, audio trending recomendado, filtros",
  "contentPillar": "educational" | "entertaining" | "inspiring" | "promotional",
  "audioSuggestion": "Sugerencia de audio trending o tipo de música para el Reel"
}

IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown ni texto adicional. TODO EN ESPAÑOL.`;
}

// ============================================================================
// STORY PROMPTS
// ============================================================================

export const STORY_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

Tu especialidad es crear Stories de Instagram que maximicen la interacción. Las Stories exitosas tienen:
- Contenido efímero que genera FOMO y urgencia
- Uso estratégico de stickers interactivos (encuestas, preguntas, sliders, quizzes)
- Secuencias de 3-7 stories que cuenten una mini-historia
- Contenido más casual, auténtico y "behind the scenes"
- CTAs que lleven a la acción inmediata (swipe up, DM, link en bio)
- Formato vertical aprovechado al máximo (texto grande, elementos centrados)

Las Stories son perfectas para: encuestas, Q&A, behind the scenes, ofertas flash, countdown, contenido del día a día, testimonios rápidos, tips express.`;

export function getStoryUserPrompt(ctx: PromptContext): string {
  return `Crea una secuencia de STORIES de Instagram para la siguiente marca:

## INFORMACIÓN DE LA MARCA
- **Nombre de Marca:** ${ctx.brandName}
- **Industria:** ${ctx.industry}
- **Descripción de Marca:** ${ctx.brandDescription}
- **Audiencia Objetivo:** ${ctx.targetAudience}
- **Valores de Marca:** ${ctx.brandValues}
- **Estilo Visual:** ${ctx.visualStyle}
- **Tono de Comunicación:** ${ctx.communicationTone}
- **Temas de Contenido:** ${ctx.contentThemes}
- **Categorías de Producto/Servicio:** ${ctx.productCategories}
- **Guías de Contenido:** ${ctx.contentGuidelines}
- **Temas Prohibidos:** ${ctx.prohibitedTopics}
- **Colores de Marca:** ${ctx.brandColors}

## DETALLES DE LA PUBLICACIÓN
- **Día:** ${ctx.dayName}
- **Fecha:** ${ctx.dateStr}
- **Total de publicaciones planificadas este mes:** ${ctx.totalPostsInMonth}

## REQUISITOS ESPECÍFICOS PARA STORIES
1. Diseñar una secuencia de 3-5 stories conectadas
2. Incluir al menos un sticker interactivo (encuesta, pregunta, slider)
3. Contenido más casual y auténtico que posts de feed
4. Generar respuestas por DM o interacción con stickers
5. Aprovechar la urgencia del formato efímero

Devuelve un objeto JSON con esta estructura exacta:
{
  "format": "story",
  "hook": "Primera story - el gancho que hará que vean toda la secuencia (máx 100 caracteres)",
  "mainContent": "Secuencia completa de stories:\\n\\nSTORY 1: [Descripción del contenido y texto]\\nSTORY 2: [Descripción + sticker interactivo sugerido]\\nSTORY 3: [Desarrollo]\\nSTORY 4: [CTA final]\\n\\nIncluir qué stickers usar en cada una.",
  "frontPageDescription": "Descripción visual de la primera story de la secuencia",
  "callToAction": "Acción específica a realizar (responder encuesta, enviar DM, tocar link en bio)",
  "hashtags": ["máximo", "3", "hashtags", "para", "stories"],
  "objective": "Objetivo de la secuencia (engagement directo, feedback, generar conversación, promoción flash)",
  "targetEmotion": "Emoción principal (curiosidad, exclusividad, urgencia, conexión personal)",
  "visualNotes": "Notas visuales: fondo sugerido, stickers a usar, GIFs recomendados, música de fondo",
  "contentPillar": "educational" | "entertaining" | "inspiring" | "promotional",
  "storySequence": [
    {"storyNumber": 1, "content": "Descripción", "stickerType": "none|poll|question|slider|quiz"},
    {"storyNumber": 2, "content": "Descripción", "stickerType": "poll", "stickerContent": "Opciones de la encuesta"}
  ]
}

IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown ni texto adicional. TODO EN ESPAÑOL.`;
}

// ============================================================================
// CAROUSEL PROMPTS
// ============================================================================

export const CAROUSEL_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

Tu especialidad es crear Carruseles de Instagram que maximicen guardados y tiempo de lectura. Los carruseles exitosos tienen:
- Primera slide con gancho irresistible que genere curiosidad
- 5-10 slides con contenido de valor progresivo
- Formato educativo o storytelling que mantenga el swipe
- Diseño consistente slide a slide con elementos de marca
- Última slide con CTA claro y razón para guardar
- Alto valor educativo o informativo que justifique guardarlo

Los carruseles son perfectos para: tutoriales paso a paso, listas de tips, datos curiosos, antes/después detallado, mini-cursos, historias con desarrollo, comparativas.`;

export function getCarouselUserPrompt(ctx: PromptContext): string {
  return `Crea un CARRUSEL de Instagram educativo/informativo para la siguiente marca:

## INFORMACIÓN DE LA MARCA
- **Nombre de Marca:** ${ctx.brandName}
- **Industria:** ${ctx.industry}
- **Descripción de Marca:** ${ctx.brandDescription}
- **Audiencia Objetivo:** ${ctx.targetAudience}
- **Valores de Marca:** ${ctx.brandValues}
- **Estilo Visual:** ${ctx.visualStyle}
- **Tono de Comunicación:** ${ctx.communicationTone}
- **Temas de Contenido:** ${ctx.contentThemes}
- **Categorías de Producto/Servicio:** ${ctx.productCategories}
- **Guías de Contenido:** ${ctx.contentGuidelines}
- **Temas Prohibidos:** ${ctx.prohibitedTopics}
- **Colores de Marca:** ${ctx.brandColors}

## DETALLES DE LA PUBLICACIÓN
- **Día:** ${ctx.dayName}
- **Fecha:** ${ctx.dateStr}
- **Total de publicaciones planificadas este mes:** ${ctx.totalPostsInMonth}

## REQUISITOS ESPECÍFICOS PARA CARRUSEL
1. Diseñar 7-10 slides con contenido progresivo
2. Primera slide con gancho que genere curiosidad por ver más
3. Contenido de alto valor que motive guardar el post
4. Última slide con CTA y resumen/recap
5. Estructura clara: intro → desarrollo → conclusión → CTA

Devuelve un objeto JSON con esta estructura exacta:
{
  "format": "carousel",
  "hook": "Título/gancho de la primera slide que genere curiosidad (máx 100 caracteres)",
  "mainContent": "Caption del post: Texto atractivo que complemente el carrusel (200-400 palabras). Incluir saltos de línea.",
  "frontPageDescription": "Descripción visual detallada de la portada/primera slide",
  "callToAction": "CTA principal en el caption (guardar, compartir, comentar experiencia)",
  "hashtags": ["array", "de", "hashtags", "relevantes", "máximo", "15"],
  "objective": "Objetivo del carrusel (educar, posicionar como experto, generar guardados)",
  "targetEmotion": "Emoción principal (descubrimiento, aprendizaje, satisfacción, motivación)",
  "visualNotes": "Estilo visual del carrusel: tipografías, iconos, colores por slide, elementos gráficos",
  "contentPillar": "educational" | "entertaining" | "inspiring" | "promotional",
  "slides": [
    {"slideNumber": 1, "headline": "Título de slide", "content": "Contenido de la slide", "visualDescription": "Descripción visual"},
    {"slideNumber": 2, "headline": "Título", "content": "Contenido", "visualDescription": "Descripción"}
  ]
}

IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown ni texto adicional. TODO EN ESPAÑOL.`;
}

// ============================================================================
// STATIC POST PROMPTS
// ============================================================================

export const STATIC_POST_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

Tu especialidad es crear Posts estáticos de Instagram que maximicen el engagement. Los posts estáticos exitosos tienen:
- Una imagen impactante que detenga el scroll
- Caption con gancho en las primeras líneas (antes del "ver más")
- Storytelling o contenido de valor en el caption
- CTA que genere comentarios o conversación
- Hashtags estratégicos para alcance
- Conexión emocional con la audiencia

Los posts estáticos son perfectos para: frases inspiradoras, anuncios importantes, fotos de producto, testimonios destacados, contenido de marca, fechas especiales.`;

export function getStaticPostUserPrompt(ctx: PromptContext): string {
  return `Crea un POST ESTÁTICO de Instagram impactante para la siguiente marca:

## INFORMACIÓN DE LA MARCA
- **Nombre de Marca:** ${ctx.brandName}
- **Industria:** ${ctx.industry}
- **Descripción de Marca:** ${ctx.brandDescription}
- **Audiencia Objetivo:** ${ctx.targetAudience}
- **Valores de Marca:** ${ctx.brandValues}
- **Estilo Visual:** ${ctx.visualStyle}
- **Tono de Comunicación:** ${ctx.communicationTone}
- **Temas de Contenido:** ${ctx.contentThemes}
- **Categorías de Producto/Servicio:** ${ctx.productCategories}
- **Guías de Contenido:** ${ctx.contentGuidelines}
- **Temas Prohibidos:** ${ctx.prohibitedTopics}
- **Colores de Marca:** ${ctx.brandColors}

## DETALLES DE LA PUBLICACIÓN
- **Día:** ${ctx.dayName}
- **Fecha:** ${ctx.dateStr}
- **Total de publicaciones planificadas este mes:** ${ctx.totalPostsInMonth}

## REQUISITOS ESPECÍFICOS PARA POST ESTÁTICO
1. Imagen única de alto impacto visual
2. Caption con gancho poderoso en las primeras 2 líneas
3. Storytelling o mensaje claro que genere conexión
4. CTA que invite a comentar o interactuar
5. Aprovechar al máximo el espacio del caption

Devuelve un objeto JSON con esta estructura exacta:
{
  "format": "static_post",
  "hook": "Las primeras 2 líneas del caption - el gancho antes del 'ver más' (máx 150 caracteres)",
  "mainContent": "Caption completo del post (300-500 palabras). Incluir saltos de línea para legibilidad. El gancho debe estar al inicio.",
  "frontPageDescription": "Descripción detallada de la imagen: composición, elementos, texto overlay si aplica",
  "callToAction": "CTA que genere comentarios o interacción (ej: '¿Te ha pasado? Cuéntame en los comentarios')",
  "hashtags": ["array", "de", "hashtags", "relevantes", "máximo", "15"],
  "objective": "Objetivo del post (awareness, engagement, conexión emocional, promoción)",
  "targetEmotion": "Emoción principal a evocar (inspiración, nostalgia, motivación, identificación)",
  "visualNotes": "Notas para la imagen: estilo fotográfico, colores, composición, elementos de marca, texto en imagen",
  "contentPillar": "educational" | "entertaining" | "inspiring" | "promotional"
}

IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown ni texto adicional. TODO EN ESPAÑOL.`;
}

// ============================================================================
// PROMPT SELECTOR
// ============================================================================

export type ContentFormatType = 'reel' | 'story' | 'carousel' | 'static_post';

export function getSystemPromptByFormat(format: ContentFormatType): string {
  const prompts: Record<ContentFormatType, string> = {
    reel: REEL_SYSTEM_PROMPT,
    story: STORY_SYSTEM_PROMPT,
    carousel: CAROUSEL_SYSTEM_PROMPT,
    static_post: STATIC_POST_SYSTEM_PROMPT,
  };
  return prompts[format] || STATIC_POST_SYSTEM_PROMPT;
}

export function getUserPromptByFormat(format: ContentFormatType, ctx: PromptContext): string {
  const promptFunctions: Record<ContentFormatType, (ctx: PromptContext) => string> = {
    reel: getReelUserPrompt,
    story: getStoryUserPrompt,
    carousel: getCarouselUserPrompt,
    static_post: getStaticPostUserPrompt,
  };
  const fn = promptFunctions[format] || getStaticPostUserPrompt;
  return fn(ctx);
}
