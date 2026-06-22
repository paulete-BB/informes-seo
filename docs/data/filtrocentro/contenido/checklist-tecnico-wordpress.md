# Checklist Técnico SEO — Filtrocentro WordPress
## Priorizado por impacto · Junio 2026

---

## 🔴 CRÍTICO — Hacer esta semana

### [ ] 1. Auditar y corregir robots.txt
**Problema:** 11.464 páginas bloqueadas por robots.txt (52% del catálogo invisible)
**Cómo verificar:** Ir a https://filtrocentro.cl/robots.txt
**Acción:**
```
# Antes (probable configuración actual):
Disallow: /producto/
Disallow: /categoria-producto/
Disallow: /wp-admin/

# Después (configuración correcta):
Disallow: /wp-admin/
# Eliminar las reglas que bloqueen productos y categorías
```
**Verificar con:** GSC → Herramientas → Prueba de robots.txt → probar URL de un producto
**Post-corrección:** GSC → Sitemaps → Reenviar sitemap para forzar re-rastreo

---

### [ ] 2. Vincular Google Ads con GA4
**Problema:** Cuenta Google Ads ID 150-129-9524 activa pero no vinculada a GA4
**Ruta exacta:** GA4 → ⚙️ Administrar → Integraciones de productos → Google Ads → Vincular
**Tiempo:** 15 minutos
**Impacto:** Activa Smart Bidding, reportes de atribución y datos de conversión en pauta

---

### [ ] 3. Configurar eventos clave en GA4 (vía GTM)
**Eventos a crear y marcar como clave:**

| Evento | Trigger | Dónde se dispara |
|--------|---------|-----------------|
| `contact_form_submit` | Form submission exitoso | /contacto/ |
| `generate_lead` | Clic en CTA de cotización | /, fichas de producto, artículos |
| `whatsapp_click` | Clic en link/botón WhatsApp | Todas las páginas |
| `view_item` | Vista de ficha de producto | /producto/[slug]/ |
| `search` + `search_term` | Búsqueda en buscador interno | /buscador/ |

**En GA4:** Eventos → marcar cada uno como "Evento clave" después de crearlo

---

## 🔴 ALTO — Esta semana o la siguiente

### [ ] 4. Corregir Schema JSON-LD de productos (Rich Snippets)
**Problema:** 0 fragmentos válidos / 6 con errores en GSC
**Herramienta de diagnóstico:** https://search.google.com/test/rich-results

**Campos obligatorios faltantes en Product schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nombre del producto",
  "brand": {
    "@type": "Brand",
    "name": "Filtrocentro"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "CLP",
    "price": "0",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Filtrocentro"
    }
  }
}
```
**En WordPress:** Plugin WooCommerce genera schema automáticamente si está bien configurado.
**Verificar:** GSC → Compras → Fragmentos de productos → errores específicos

---

### [ ] 5. Implementar rel=canonical en todo el catálogo
**Problema:** 2.588 URLs con duplicados sin canónica
**En WordPress con Yoast/RankMath:** Se configura automáticamente si:
- Los permalinks no tienen parámetros duplicados
- Yoast → SEO → Búsqueda → Avanzado → Canónicos → está activado
**Acción manual:** Revisar páginas de categoría con paginación → configurar canonical en página 2+ apuntando a página 1

---

### [ ] 6. Añadir keyword exacta en title y H1 de homepage
**Problema:** "filtros industriales" no aparece en el `<title>` ni `<h1>` exactamente
**Acción en WordPress:**
- SEO Title: `Filtros Industriales y Hidráulicos en Chile — Catálogo Técnico | Filtrocentro`
- H1 de la página: `Filtros Industriales y Hidráulicos en Chile`
**Verificar con:** Surfer SEO → Content Editor → página principal → Content Score debe subir +10 puntos mínimo

---

### [ ] 7. Añadir elementos `<strong>` y estructura H2-H6
**Problema:** 0 elementos `<strong>` (mínimo sugerido: 14) · 11 H2-H6 (mínimo: 14)
**En WordPress:** Editar página principal → añadir negritas en términos clave + añadir 3 H2 nuevos con términos semánticamente relevantes según Surfer
**Términos para incluir en negrita:** filtros hidráulicos, filtros industriales, alta presión, retorno, succión, Chile, OEM, despacho

---

### [ ] 8. Eliminar "Coming Soon" y "Próximamente" de títulos de páginas
**URLs afectadas:**
- `Filtrocentro: Presión Filters – Coming Soon!` → reescribir completamente
- `Filtrocentro Ecológico: Filtración Sostenible (Próximamente)` → reescribir o poner en draft hasta tener contenido real
- `Filtrocentro Succión Filters: Discover Our Solutions (2025)` → reescribir en español

---

## 🟠 MEDIO — Semana 3-4

### [ ] 9. Añadir noindex a páginas de paginación de archivo
**Problema:** Páginas de archivo indexadas "Alta presión archivos – página 13, 17, 20, 29, 30 de 37"
**En Yoast SEO:**
Yoast → Apariencia en buscadores → Tipos de contenido → Páginas de archivo → `noindex`
O manualmente en cada página paginada:

```html
<meta name="robots" content="noindex, follow">
```

**Alternativa con RankMath:**
RankMath → Titulos y Metas → Categorías → Paginación → No Indexar

---

### [ ] 10. Resolver TTFB (2.140ms → objetivo: <1.274ms)
**Diagnóstico:** PageSpeed Insights → Mobile → Time to First Byte
**Pasos por orden de impacto:**

1. **Instalar plugin de caché WordPress** (si no está activo):
   - WP Rocket (mejor opción, de pago)
   - W3 Total Cache + Cloudflare (opción gratuita)
   - LiteSpeed Cache (si el hosting usa LiteSpeed)

2. **Activar Cloudflare CDN** (gratuito):
   - Registrar dominio en Cloudflare
   - Cambiar nameservers en el registrador de dominio
   - Activar modo "Orange Cloud" para filtrocentro.cl
   - Configurar reglas de caché para páginas estáticas

3. **Identificar plugins lentos:**
   - Instalar Query Monitor → revisar tiempo de carga por plugin
   - Desactivar plugins innecesarios o reemplazar por alternativas más livianas

4. **Evaluar cambio de hosting** si TTFB persiste sobre 1.500ms con caché activo:
   - Objetivo: hosting con PHP 8.2+, SSD NVMe, servidor en Latinoamérica (o CDN activo)

---

### [ ] 11. Implementar schema Organization y LocalBusiness en homepage
```json
{
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "name": "Filtrocentro",
  "url": "https://filtrocentro.cl",
  "logo": "https://filtrocentro.cl/[ruta-logo]",
  "description": "Distribuidor de filtros industriales e hidráulicos en Chile. Filtros OEM y compatibles para minería, industria y equipos pesados.",
  "areaServed": "CL",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "CL",
    "addressLocality": "[Ciudad]",
    "addressRegion": "[Región]"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "sales",
    "areaServed": "CL",
    "availableLanguage": "Spanish"
  }
}
```

---

### [ ] 12. Implementar FAQPage schema en /preguntas-frecuentes/
**Contexto:** La FAQ ya es citada 22 veces por las IAs. Schema FAQPage aumenta las citas.
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Cuáles son los mejores filtros hidráulicos para minería en Chile?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Los mejores filtros hidráulicos para minería en Chile son los que combinan compatibilidad OEM con el equipo específico, el micronaje correcto para el nivel ISO de limpieza requerido, y disponibilidad en stock en Chile."
      }
    }
    // ... repetir para cada pregunta de la FAQ
  ]
}
```

---

## 🟡 BAJO — Mes 2

### [ ] 13. Identificar y corregir las 19 URLs soft 404
**Ruta en GSC:** Indexación → Páginas → "Página detectada, actualmente no indexada" + revisar con Inspección de URL
**Acción por tipo:**
- Página sin contenido real → añadir contenido o redirigir 301 a página relevante
- Producto discontinuado → 301 al sucesor o a la categoría
- Variante de producto → 301 a la página del producto principal

### [ ] 14. Identificar el error 5xx
**Ruta en GSC:** Indexación → Páginas → "Error del servidor (5xx)"
**Acción:** Copiar la URL exacta → revisar en staging o logs del servidor → corregir el error PHP/base de datos que la causa

### [ ] 15. Verificar que las 95 URLs con noindex sean intencionales
**Ruta en GSC:** Indexación → Páginas → "Excluidas por etiqueta 'noindex'"
**Acción:** Revisar cada una — si hay páginas de producto o categoría importantes con noindex accidental, eliminar la etiqueta

---

## Herramientas de seguimiento

| Herramienta | Uso | Frecuencia de revisión |
|-------------|-----|------------------------|
| GSC → Indexación | Verificar corrección robots.txt | Semanal |
| GSC → Rendimiento | CTR y posición por URL | Quincenal |
| GSC → Compras | Validación de Rich Snippets | Quincenal |
| GA4 → Eventos | Verificar conversiones activas | Semanal |
| PageSpeed Insights | TTFB y Core Web Vitals | Mensual |
| Rich Results Test | Validación schema | Tras cada cambio |
| Surfer SEO → Content Audit | Content Score | Mensual |
