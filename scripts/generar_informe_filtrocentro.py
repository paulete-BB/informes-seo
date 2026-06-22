#!/usr/bin/env python3
"""
Genera el informe Word de auditoría SEO/AEO/GEO para Filtrocentro.cl
"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

# ── Paleta de colores ──────────────────────────────────────────────────────────
NEGRO        = RGBColor(0x0B, 0x0B, 0x0E)
GRIS_TEXTO   = RGBColor(0x5B, 0x5B, 0x66)
GRIS_CLARO   = RGBColor(0xF0, 0xF0, 0xEE)
BLANCO       = RGBColor(0xFF, 0xFF, 0xFF)
VIOLETA      = RGBColor(0x5C, 0x35, 0xC8)
VIOLETA_SUAVE= RGBColor(0xB9, 0xA7, 0xFF)
VERDE        = RGBColor(0x0E, 0x9B, 0x68)
VERDE_FONDO  = RGBColor(0xE4, 0xF4, 0xEC)
AMBAR        = RGBColor(0xFC, 0xDF, 0xAF)
AMBAR_TEXTO  = RGBColor(0x3C, 0x2E, 0x12)
ROJO         = RGBColor(0xC2, 0x50, 0x3F)
ROJO_FONDO   = RGBColor(0xF9, 0xE7, 0xE3)
NARANJA      = RGBColor(0xE8, 0x7A, 0x1E)
GRIS_CABECERA= RGBColor(0x1E, 0x1E, 0x2E)
GRIS_FILA    = RGBColor(0xF8, 0xF8, 0xF7)


def set_cell_bg(cell, color: RGBColor):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    hex_color = f"{color[0]:02X}{color[1]:02X}{color[2]:02X}"
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if edge in kwargs:
            el = OxmlElement(f"w:{edge}")
            for k, v in kwargs[edge].items():
                el.set(qn(f"w:{k}"), v)
            tcBorders.append(el)
    tcPr.append(tcBorders)


def no_border_all(cell):
    for edge in ("top", "left", "bottom", "right"):
        set_cell_border(cell, **{edge: {"val": "nil"}})


def thin_border_bottom(cell):
    set_cell_border(cell,
        bottom={"val": "single", "sz": "4", "color": "E4E4E2"},
        top={"val": "nil"}, left={"val": "nil"}, right={"val": "nil"})


def cell_para(cell, text, bold=False, color=None, size=10, align=None, italic=False):
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.clear()
    if align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "right":
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(str(text))
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = color or NEGRO
    pPr = p._p.get_or_add_pPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:before"), "40")
    spacing.set(qn("w:after"), "40")
    pPr.append(spacing)
    return p


def add_heading(doc, text, level=1, color=None):
    p = doc.add_paragraph()
    p.clear()
    run = p.add_run(text)
    run.bold = True
    if level == 1:
        run.font.size = Pt(22)
        run.font.color.rgb = color or NEGRO
        p.paragraph_format.space_before = Pt(28)
        p.paragraph_format.space_after = Pt(8)
    elif level == 2:
        run.font.size = Pt(15)
        run.font.color.rgb = color or VIOLETA
        p.paragraph_format.space_before = Pt(22)
        p.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(12)
        run.font.color.rgb = color or NEGRO
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(3)
    return p


def add_body(doc, text, color=None, size=10, space_after=6):
    p = doc.add_paragraph()
    p.clear()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color or NEGRO
    p.paragraph_format.space_after = Pt(space_after)
    return p


def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    p.clear()
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = NEGRO
    r2 = p.add_run(text)
    r2.font.size = Pt(10)
    r2.font.color.rgb = NEGRO
    p.paragraph_format.space_after = Pt(3)
    return p


def add_divider(doc):
    p = doc.add_paragraph()
    p.clear()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "4")
    bottom.set(qn("w:color"), "E4E4E2")
    pBdr.append(bottom)
    pPr.append(pBdr)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)


def banner_table(doc, title, subtitle=None, bg=VIOLETA):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, bg)
    no_border_all(cell)
    cell.width = Inches(6.5)
    p = cell.paragraphs[0]
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(title)
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = BLANCO
    pPr = p._p.get_or_add_pPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:before"), "100")
    spacing.set(qn("w:after"), "60" if subtitle else "100")
    pPr.append(spacing)
    if subtitle:
        p2 = OxmlElement("w:p")
        r2 = OxmlElement("w:r")
        rPr2 = OxmlElement("w:rPr")
        sz2 = OxmlElement("w:sz")
        sz2.set(qn("w:val"), "18")
        col2 = OxmlElement("w:color")
        col2.set(qn("w:val"), "CCCCFF")
        rPr2.append(sz2)
        rPr2.append(col2)
        t2 = OxmlElement("w:t")
        t2.text = subtitle
        r2.append(rPr2)
        r2.append(t2)
        p2.append(r2)
        cell._tc.append(p2)
    doc.add_paragraph()


def kpi_row(doc, kpis):
    """kpis: list of (label, value, delta, delta_good) tuples, max 4"""
    tbl = doc.add_table(rows=1, cols=len(kpis))
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, (label, value, delta, good) in enumerate(kpis):
        cell = tbl.cell(0, i)
        set_cell_bg(cell, GRIS_FILA)
        no_border_all(cell)
        tc = cell._tc
        # label
        p1 = tc.paragraphs[0] if hasattr(tc, 'paragraphs') else cell.paragraphs[0]
        cell_para(cell, label, bold=False, color=GRIS_TEXTO, size=8)
        # value
        p2 = cell.add_paragraph()
        p2.clear()
        rv = p2.add_run(value)
        rv.bold = True
        rv.font.size = Pt(20)
        rv.font.color.rgb = VIOLETA
        # delta
        p3 = cell.add_paragraph()
        p3.clear()
        rd = p3.add_run(delta)
        rd.font.size = Pt(9)
        rd.font.color.rgb = VERDE if good else ROJO
    doc.add_paragraph()


def build_table(doc, headers, rows, col_widths=None, header_bg=GRIS_CABECERA,
                zebra=True, font_size=9):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl.style = "Table Grid"

    # encabezado
    for j, h in enumerate(headers):
        cell = tbl.cell(0, j)
        set_cell_bg(cell, header_bg)
        cell_para(cell, h, bold=True, color=BLANCO, size=font_size, align="center")
        if col_widths:
            cell.width = Inches(col_widths[j])

    # filas
    for i, row in enumerate(rows):
        bg = GRIS_FILA if (zebra and i % 2 == 0) else BLANCO
        for j, val in enumerate(row):
            cell = tbl.cell(i + 1, j)
            set_cell_bg(cell, bg)
            # colorear columnas de estado/urgencia
            txt = str(val)
            color = NEGRO
            if txt in ("CRÍTICA", "CRÍTICO", "CRÍTICO_NEGOCIO"):
                color = ROJO
            elif txt in ("ALTA", "ALTO"):
                color = NARANJA
            elif txt in ("MEDIA", "MEDIO"):
                color = RGBColor(0xB9, 0x7E, 0x1F)
            elif txt.startswith("+") and "%" in txt:
                color = VERDE
            elif txt.startswith("-") and "%" in txt:
                color = ROJO
            cell_para(cell, txt, color=color, size=font_size)
            if col_widths:
                cell.width = Inches(col_widths[j])

    doc.add_paragraph()
    return tbl


def add_callout(doc, emoji, title, body, bg=ROJO_FONDO, title_color=ROJO):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, bg)
    no_border_all(cell)
    p = cell.paragraphs[0]
    p.clear()
    r1 = p.add_run(f"{emoji}  {title}")
    r1.bold = True
    r1.font.size = Pt(10)
    r1.font.color.rgb = title_color
    pPr = p._p.get_or_add_pPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:before"), "80")
    sp.set(qn("w:after"), "40")
    pPr.append(sp)
    p2 = cell.add_paragraph()
    p2.clear()
    r2 = p2.add_run(body)
    r2.font.size = Pt(9)
    r2.font.color.rgb = NEGRO
    pPr2 = p2._p.get_or_add_pPr()
    sp2 = OxmlElement("w:spacing")
    sp2.set(qn("w:before"), "0")
    sp2.set(qn("w:after"), "80")
    pPr2.append(sp2)
    doc.add_paragraph()


# ══════════════════════════════════════════════════════════════════════════════
def build_document():
    doc = Document()

    # Márgenes
    for section in doc.sections:
        section.top_margin    = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin   = Cm(2.2)
        section.right_margin  = Cm(2.2)

    # Fuente base
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10)

    # ── PORTADA ──────────────────────────────────────────────────────────────
    tbl_cover = doc.add_table(rows=1, cols=1)
    cell_c = tbl_cover.cell(0, 0)
    set_cell_bg(cell_c, GRIS_CABECERA)
    no_border_all(cell_c)

    p = cell_c.paragraphs[0]
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run("INFORME DE POSICIONAMIENTO")
    r.bold = True; r.font.size = Pt(9); r.font.color.rgb = VIOLETA_SUAVE
    pPr = p._p.get_or_add_pPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:before"), "200"); sp.set(qn("w:after"), "60")
    pPr.append(sp)

    for line, sz, bold, col in [
        ("Filtrocentro.cl", 32, True, BLANCO),
        ("Auditoría SEO · AEO · GEO + Plan de Acción", 14, False, VIOLETA_SUAVE),
        ("", 10, False, BLANCO),
        ("Datos GSC  21/03 – 20/06/2026   ·   GA4  25/05 – 21/06/2026   ·   Surfer SEO Junio 2026", 9, False, RGBColor(0xAA, 0xAA, 0xCC)),
        ("Generado el 22 de Junio de 2026", 9, False, RGBColor(0xAA, 0xAA, 0xCC)),
    ]:
        px = cell_c.add_paragraph()
        px.clear()
        px.alignment = WD_ALIGN_PARAGRAPH.LEFT
        rx = px.add_run(line)
        rx.bold = bold; rx.font.size = Pt(sz); rx.font.color.rgb = col
        pPrx = px._p.get_or_add_pPr()
        spx = OxmlElement("w:spacing")
        spx.set(qn("w:before"), "0"); spx.set(qn("w:after"), "60")
        pPrx.append(spx)

    # espacio final en portada
    px = cell_c.add_paragraph()
    pPrx = px._p.get_or_add_pPr()
    spx = OxmlElement("w:spacing")
    spx.set(qn("w:before"), "0"); spx.set(qn("w:after"), "200")
    pPrx.append(spx)

    doc.add_paragraph()

    # ── RESUMEN EJECUTIVO ────────────────────────────────────────────────────
    add_heading(doc, "Resumen Ejecutivo", 1)
    add_body(doc,
        "Filtrocentro está en una posición privilegiada: 2° en AI Visibility a nivel industria, "
        "crecimiento del +93% en clics y +94% en impresiones en 90 días, y ya aparece en posición 1.1–1.3 "
        "en las respuestas de IA para sus queries más valiosas.")
    add_body(doc,
        "El problema no es el tráfico — es que no se está convirtiendo. Con 10.600 impresiones y solo "
        "218 clics (CTR 2,1%), el sitio está dejando escapar más del 70% del tráfico que ya tiene ganado en Google.")

    add_heading(doc, "Las tres causas raíz", 3)
    add_bullet(doc, "52% del catálogo bloqueado — robots.txt impide que Google indexe 11.464 páginas de productos.", "1.  ")
    add_bullet(doc, "Content Scores críticos — las páginas clave tienen puntuaciones de 2 a 16 sobre 100 en Surfer SEO.", "2.  ")
    add_bullet(doc, "0 conversiones medibles — sin eventos configurados en GA4 es imposible saber qué canal genera ventas.", "3.  ")
    doc.add_paragraph()

    # ── KPIs PRINCIPALES ─────────────────────────────────────────────────────
    add_heading(doc, "1.  KPIs Actuales — Últimos 90 días (GSC)", 2)

    build_table(doc,
        ["Métrica", "Valor actual", "Benchmark industria", "Brecha"],
        [
            ("Clics / mes",              "~73",       "300–500",     "−76%"),
            ("CTR promedio",             "2,1%",      "4–6%",        "−52%"),
            ("Posición promedio",        "6,6",       "3–4",         "−65%"),
            ("Content Score promedio",   "12 / 100",  "55–70",       "−78%"),
            ("AI Visibility Score",      "51 / 100",  "63 (líder)",  "−19%"),
            ("Eventos clave GA4",        "1",         "5–8 mínimo",  "−85%"),
            ("Topical Map coverage",     "0 / 24",    "—",           "0%"),
            ("TTFB (velocidad servidor)","2.140 ms",  "< 1.274 ms",  "+68% lento"),
            ("URLs bloqueadas robots.txt","11.464",   "0",           "Crítico"),
        ],
        col_widths=[2.0, 1.3, 1.5, 1.1],
    )

    # ── LO QUE FUNCIONA ──────────────────────────────────────────────────────
    add_heading(doc, "1.1  Lo que está funcionando", 2)

    build_table(doc,
        ["Señal positiva", "Dato"],
        [
            ("Marca fuerte en Google",             '"filtrocentro" CTR 10,9% · "filtro centro" CTR 9%'),
            ("Blog creciendo desde cero",           '+1.100% en /que-micraje-necesita-un-filtro-hidraulico/ (904 imp.)'),
            ("Dominio del nicho minero en IA",     '100% Mention Rate en queries de minería OEM (pos. 1.1 y 1.3)'),
            ("Producto HF1052MN025B-2",            'CTR 80% — el producto con mayor intención de compra del sitio'),
            ("Tráfico desde IAs confirmado",       'ChatGPT, Perplexity y Claude ya envían visitas al sitio'),
            ("Crecimiento sostenido",              '+93% clics · +94% impresiones en 90 días'),
        ],
        col_widths=[2.6, 4.2],
        header_bg=VERDE,
    )

    # ── PROBLEMAS TÉCNICOS ───────────────────────────────────────────────────
    add_heading(doc, "1.2  Errores técnicos priorizados", 2)

    build_table(doc,
        ["Problema", "Páginas afectadas", "Prioridad", "Acción correctiva"],
        [
            ("Bloqueadas por robots.txt",         "11.464", "CRÍTICA",  "Auditar y eliminar reglas Disallow en /producto/ y /categoria-producto/"),
            ("Rastreadas sin indexar (thin content)", "6.042", "CRÍTICA", "Auditar calidad; consolidar o noindex páginas sin valor"),
            ("Duplicadas sin canónica",           "2.588",  "ALTA",     "Implementar rel=canonical en productos y categorías"),
            ("TTFB 2.140ms (lento)",              "Todo el sitio", "ALTA", "Activar caché WP + Cloudflare CDN"),
            ("Rich Snippets inválidos",           "6 errores", "ALTA",  "Corregir JSON-LD: price, availability, priceCurrency, brand"),
            ("Títulos de página en inglés",       "2 páginas", "ALTA",  "Reescribir completamente en español"),
            ("Paginación de archivo indexada",    "5 páginas", "MEDIA", "Añadir noindex a páginas de archivo paginadas"),
            ("Soft 404",                          "19 URLs",   "MEDIA", "Corregir contenido o devolver 301/404 real"),
            ("Error de servidor 5xx",             "1 URL",     "ALTA",  "Identificar en GSC → Indexación → Error del servidor"),
            ("Google Ads no vinculado a GA4",     "Cuenta ads", "CRÍTICA", "GA4 → Administrar → Integraciones → Google Ads ID 150-129-9524"),
            ("0 eventos de conversión en GA4",    "6 de 7 canales", "CRÍTICA", "Configurar generate_lead, contact_form_submit, whatsapp_click"),
        ],
        col_widths=[2.2, 1.2, 0.9, 2.5],
        font_size=8,
    )

    # ── AI VISIBILITY ────────────────────────────────────────────────────────
    add_heading(doc, "2.  AI Visibility y Posición Competitiva (GEO)", 2)
    add_body(doc,
        "Surfer AI detectó que Filtrocentro es el 2° resultado más mencionado por ChatGPT, Perplexity, "
        "Gemini y Claude dentro de la industria de filtros industriales en Chile. La brecha con el líder "
        "es de solo 12 puntos — alcanzable en 6 meses con el plan de contenidos.")

    build_table(doc,
        ["Empresa", "AI Visibility Score", "Mention Rate", "Posición promedio", "Brecha vs. Filtrocentro"],
        [
            ("Donaldson Company",    "63 ★ Líder",  "~50%", "—",   "−12 pts (superar: meta 6 m)"),
            ("Filtrocentro",         "51",          "33%",  "2,7", "—"),
            ("Metso Outotec",        "45",          "—",    "—",   "+6 pts por debajo"),
            ("Mann+Hummel",          "44",          "—",    "—",   "+7 pts por debajo"),
            ("Camfil",               "43",          "—",    "—",   "+8 pts por debajo"),
        ],
        col_widths=[1.6, 1.4, 1.0, 1.3, 2.0],
    )

    add_heading(doc, "Prompts donde Filtrocentro ya domina", 3)
    build_table(doc,
        ["Prompt", "Score", "Posición", "Mention Rate"],
        [
            ("¿Dónde comprar filtros industriales para minería en Chile con compatibilidad OEM?", "100", "1,1", "100%"),
            ("¿Cuáles son los mejores filtros hidráulicos para minería en Chile?",               "95",  "3,5", "100%"),
        ],
        col_widths=[3.8, 0.7, 0.8, 0.9],
        header_bg=VERDE,
        font_size=8,
    )

    add_heading(doc, "Prompts con 0% de mención (brechas GEO urgentes)", 3)
    build_table(doc,
        ["Prompt sin mención", "Acción"],
        [
            ("¿Cuáles son las marcas más confiables de filtros de aire para camiones mineros?",        "Crear artículo especializado con schema FAQ"),
            ("¿Qué filtros industriales son más usados en plantas de procesamiento de minerales en Chile?", "Crear artículo especializado con schema FAQ"),
            ("¿Qué marcas de filtros recomiendan para ventilación en minería subterránea?",             "Crear artículo especializado con schema FAQ"),
        ],
        col_widths=[3.5, 3.2],
        header_bg=ROJO,
        font_size=8,
    )

    # ── QUERIES AIO 0% CTR ───────────────────────────────────────────────────
    add_heading(doc, "3.  Dinero en la Mesa — Queries AIO con 0% CTR", 2)
    add_body(doc,
        "Google muestra a Filtrocentro como fuente en AI Overviews para estas 3 preguntas, "
        "pero los snippets no generan ningún clic. Resolver esto es la acción de mayor retorno inmediato del sitio.")

    build_table(doc,
        ["Query", "Impresiones", "Posición", "CTR", "Acción prioritaria"],
        [
            ("¿Cuáles son los mejores filtros hidráulicos para minería en Chile?",                    "231", "1,3", "0%", "Artículo guía AEO — borrador listo"),
            ("¿Dónde comprar filtros industriales para minería en Chile con compatibilidad por código OEM?", "224", "1,1", "0%", "Optimizar /filtros-hidraulicos-mineria-oem/"),
            ("¿Cuáles son los mejores filtros industriales para faenas mineras de cobre en Chile?",   "155", "6,0", "0%", "Artículo AEO — borrador listo"),
        ],
        col_widths=[2.8, 0.9, 0.7, 0.5, 2.0],
        font_size=8,
    )

    add_callout(doc, "💡", "Regla AEO aplicada",
        "Las queries en formato pregunta que generan impresiones sin clics son exactamente las que usan como fuente "
        "ChatGPT, Perplexity y Google AI Overviews. Si el contenido responde de forma directa y estructurada en los "
        "primeros párrafos, el sitio pasa de ser 'mencionado' a ser 'citado'. Los borradores de los artículos 1 y 3 "
        "ya están escritos y listos para publicar en WordPress.",
        bg=VERDE_FONDO, title_color=VERDE)

    # ── KEYWORDS OPORTUNIDAD ─────────────────────────────────────────────────
    add_heading(doc, "4.  Keywords en Posición 4–10 — Listas para el Top 3", 2)
    add_body(doc,
        "118 keywords están a un empujón del top 3. Subir el Content Score de las páginas de categoría "
        "con Surfer SEO es suficiente para mover la mayoría de ellas. Las de mayor impacto:")

    build_table(doc,
        ["Query", "Posición", "Impresiones", "CTR actual", "CTR potencial", "Acción"],
        [
            ("filtros de alta presión",      "12,1", "213", "bajo",  "5–8%",  "Subir Content Score 16 → 65"),
            ("filtros hidraulicos",           "5,9",  "176", "3,4%",  "7–10%", "Optimizar landing con H1 exacto"),
            ("filtro de retorno",             "7,4",  "127", "7,1%",  "+volumen", "Subir Content Score 9 → 65"),
            ("filtros industriales",          "6,1",  "107", "1,9%",  "5–8%",  "Landing con clusters semánticos"),
            ("filtros para equipos mineros",  "4,3",  "78",  "0%",    "8–12%", "Crear landing page dedicada"),
            ("filtro de succion",             "6,1",  "70",  "0%",    "5–8%",  "Crear /categoria-producto/succion/"),
            ("filtros hidráulicos (con tilde)", "6,5", "69", "0%",    "5–8%",  "Unificar con 'filtros hidraulicos'"),
            ("eliminación partículas aceite hidráulico", "8,9", "58", "0%", "3–5%", "Expandir artículo de contaminación"),
        ],
        col_widths=[1.8, 0.7, 0.9, 0.8, 0.9, 1.8],
        font_size=8,
    )

    # ── TOPICAL MAP ──────────────────────────────────────────────────────────
    add_heading(doc, "5.  Topical Map — 153.000 Búsquedas/mes sin Cubrir", 2)
    add_body(doc,
        "Surfer identificó 24 clusters de contenido con 153.000 búsquedas mensuales potenciales. "
        "Filtrocentro no ha creado ningún artículo de esta lista — esto es lo que más limita la "
        "autoridad tópica del sitio. Los 10 clusters prioritarios:")

    build_table(doc,
        ["Keyword cluster", "Búsquedas/mes", "Dificultad (KD)", "Prioridad", "Tiempo estimado rankear"],
        [
            ("filtros de agua",         "42.900", "15,8",  "1 — URGENTE",  "2–3 meses"),
            ("filtro para piscina",     "39.900", "19,8",  "2",            "2–4 meses"),
            ("purificador de aire",     "15.700", "19,5",  "3",            "2–3 meses"),
            ("purificadores de agua",   "9.370",  "10,0",  "4",            "1–2 meses"),
            ("filtración",              "9.470",  "42,4",  "5",            "3–5 meses"),
            ("filtros de aire",         "6.310",  "11,6",  "6",            "1–2 meses"),
            ("filtrado de agua",        "5.030",  "8,7",   "7 — KD BAJO",  "1–2 meses"),
            ("filtro para calefont",    "3.280",  "19,5",  "8",            "2–3 meses"),
            ("ósmosis inversa filtros", "960",    "15,2",  "9",            "2–3 meses"),
            ("filtros hidráulicos",     "320",    "0",     "10 — MUY FÁCIL","1 mes"),
        ],
        col_widths=[1.8, 1.1, 1.1, 1.3, 1.4],
        font_size=8,
    )

    # ── REESCRITURA CTR ──────────────────────────────────────────────────────
    add_heading(doc, "6.  Reescritura de Títulos — Impacto CTR Proyectado", 2)
    add_body(doc,
        "Estos cambios solo requieren editar el SEO Title y Meta Description en Yoast/RankMath. "
        "Sin tocar el contenido, sin cambiar las URLs. Tiempo total: 45 minutos.")

    build_table(doc,
        ["URL", "Title actual (problema)", "Title propuesto", "CTR actual", "CTR objetivo", "Clics/mes proyectado"],
        [
            ("/filtros-hidraulicos-mineria-oem/", "Genérico, sin diferenciadores", "Filtros Hidráulicos OEM para Minería en Chile — Stock Inmediato | Filtrocentro", "0,2%", "4%", "49 (vs. 3)"),
            ("/categoria-producto/alta-presion/", "Alta Presión para 2025 – fecha caduca", "Filtros de Alta Presión Industrial Chile — Catálogo Técnico | Filtrocentro", "0,7%", "4%", "36 (vs. 6)"),
            ("/senales-de-filtro-saturado/",      "Genérico, sin número ni gancho", "Filtro Industrial Saturado: 7 Señales de Alerta | Filtrocentro", "0,77%", "6%", "23 (vs. 3)"),
            ("/filtros-hidraulicos-mineria-chile/","Genérico", "Filtros Hidráulicos Minería Chile — OEM y Compatible | Filtrocentro", "0,88%", "5%", "17 (vs. 3)"),
            ("/categoria-producto/succion/",      "EN INGLÉS: 'Discover Our Solutions'", "Filtros de Succión Hidráulica e Industrial Chile | Filtrocentro", "bajo", "5%", "—"),
            ("/categoria-producto/presion/",      "EN INGLÉS: 'Coming Soon!'", "Filtros de Presión Industrial en Chile — OEM y Compatible | Filtrocentro", "bajo", "4%", "—"),
        ],
        col_widths=[1.3, 1.4, 2.0, 0.7, 0.7, 1.1],
        font_size=7,
    )

    add_callout(doc, "📊", "Impacto proyectado total solo con reescritura de títulos",
        "De 24 clics/mes a 134 clics/mes en estas 6 URLs — sin producir contenido nuevo, "
        "sin cambiar las URLs y sin tocar el código. Solo editar el SEO Title y la Meta Description en WordPress.",
        bg=AMBAR, title_color=AMBAR_TEXTO)

    # ── PLAN DE ACCIÓN ───────────────────────────────────────────────────────
    doc.add_page_break()
    add_heading(doc, "7.  Plan de Acción Ejecutable", 1)

    # SEMANA 1
    banner_table(doc, "SEMANA 1 — Correcciones que desbloquean todo",
                 "Impacto esperado: +11.464 páginas elegibles para indexación · Pauta con medición real · 2 contenidos publicados",
                 bg=ROJO)

    build_table(doc,
        ["#", "Tarea", "Tiempo", "Responsable", "Cómo medir el resultado"],
        [
            ("S1-1", "Auditar y corregir robots.txt\n→ Eliminar Disallow en /producto/ y /categoria-producto/\n→ Reenviar sitemap en GSC", "1–2 h", "Dev / WP admin", "GSC → Indexación → Bloqueada por robots.txt: contador debe bajar semana a semana"),
            ("S1-2", "Vincular Google Ads con GA4\n→ GA4 → Administrar → Integraciones → Google Ads → ID 150-129-9524", "15 min", "Google Ads admin", "GA4 → Adquisición → Paid Search: debe mostrar conversiones en 24–48 h"),
            ("S1-3", "Publicar draft 'filtros hidraulicos' (Surfer Score 87)\n→ Añadir título SEO y publicar en WordPress", "1–2 h", "Contenido", "GSC → inspección de URL → indexado en 7–14 días"),
            ("S1-4", "Reescribir 7 títulos y meta descriptions\n→ Copiar/pegar los títulos de la tabla de la sección 6", "45 min", "WP admin", "GSC → Rendimiento → filtrar por URL → CTR semana a semana"),
            ("S1-5", "Configurar 3 eventos clave en GA4 vía GTM\n→ contact_form_submit · generate_lead · whatsapp_click", "1–2 días", "Dev / GTM", "GA4 → Configurar → Eventos: verificar en modo Debug View"),
        ],
        col_widths=[0.4, 2.5, 0.6, 1.0, 2.3],
        font_size=8,
        header_bg=RGBColor(0x8B, 0x2A, 0x1F),
    )

    # SEMANA 2
    banner_table(doc, "SEMANA 2 — Contenido AEO y Correcciones Técnicas",
                 "Impacto esperado: capturar 610 impresiones AIO con 0% CTR · Rich Snippets activos · 4 nuevas URLs",
                 bg=NARANJA)

    build_table(doc,
        ["#", "Tarea", "Tiempo", "Responsable", "Cómo medir el resultado"],
        [
            ("S2-1", "Publicar artículo AEO: Guía Filtros Hidráulicos Minería Chile\n→ Borrador listo en el repositorio\n→ URL: /guia-filtros-hidraulicos-mineria-chile-2026/\n→ Añadir schema Article + FAQPage", "1 día", "Contenido SEO", "GSC → query '¿cuáles son los mejores filtros hidráulicos para minería en Chile?' → CTR debe subir de 0% a 3%+"),
            ("S2-2", "Publicar artículo AEO: Filtros Minería del Cobre\n→ Borrador listo en el repositorio\n→ URL: /filtros-industriales-mineria-cobre-chile/", "1 día", "Contenido SEO", "Surfer AI Visibility → prompts de minería del cobre → Mention Rate debe aparecer"),
            ("S2-3", "Optimizar /filtros-hidraulicos-mineria-oem/\n→ Añadir respuesta directa al tope: 'En Filtrocentro puedes cotizar por código OEM...'\n→ Buscador por código OEM visible", "4–6 h", "Dev + Contenido", "GSC → /filtros-hidraulicos-mineria-oem/ → CTR de 0,2% a 3%+ en 28 días"),
            ("S2-4", "Corregir Schema JSON-LD de productos (Rich Snippets)\n→ Añadir: price, priceCurrency, availability, brand\n→ Validar con Rich Results Test", "4–8 h", "Dev", "GSC → Compras → Fragmentos de productos: '0 válidas' → debe subir"),
            ("S2-5", "Publicar drafts Surfer: 'fabricacion de filtros' (75) y 'mantenimiento de gruas' (79)\n→ Solo añadir título SEO y publicar", "2 h", "Contenido", "GSC → inspección URLs → indexados en 7–14 días"),
        ],
        col_widths=[0.4, 2.7, 0.6, 1.0, 2.1],
        font_size=8,
        header_bg=RGBColor(0x8B, 0x4A, 0x00),
    )

    # SEMANAS 3-4
    banner_table(doc, "SEMANAS 3–4 — Autoridad Tópica y Escala AEO/GEO",
                 "Impacto esperado: primeras mejoras de posición en 118 keywords · AI Visibility ≥ 54",
                 bg=VIOLETA)

    build_table(doc,
        ["#", "Tarea", "Tiempo", "Responsable", "Cómo medir"],
        [
            ("S3-1", "Subir Content Score en Surfer para páginas críticas\n→ Alta Presión: 16 → 65 | Succión: 8 → 65 | Retorno: 9 → 65 | Homepage: 51 → 65", "3–4 h/página", "Contenido + SEO", "Surfer → Content Audit → Scores actualizados"),
            ("S3-2", "Crear artículo 'Filtros de Agua' — Topical Map #1\n→ 42.900 búsquedas/mes · KD 15,8\n→ Score Surfer objetivo: 65+\n→ URL: /guia-filtros-de-agua-chile/", "1–2 días", "Contenido SEO", "GSC → query 'filtros de agua' → impresiones en 30 días"),
            ("S3-3", "Crear 3 artículos para prompts con 0% mención en IA\n→ Filtros aire camiones mineros\n→ Filtros plantas procesamiento minerales\n→ Filtros ventilación minería subterránea", "1 día c/u", "Contenido SEO", "Surfer AI Visibility → prompts específicos → Mention Rate > 0%"),
            ("S3-4", "Expandir página FAQ con 20+ preguntas nuevas + schema FAQPage\n→ La FAQ ya es citada 22 veces por las IAs — es el activo AEO más subutilizado", "1 día", "Contenido SEO + Dev", "Surfer AI → Direct Citations: debe subir desde 22"),
            ("S3-5", "Resolver TTFB: 2.140ms → < 1.274ms\n→ Activar plugin de caché (WP Rocket o LiteSpeed)\n→ Activar Cloudflare CDN\n→ Identificar plugins lentos con Query Monitor", "1 día", "Dev", "PageSpeed Insights → Time to First Byte < 1.274ms"),
            ("S3-6", "Añadir noindex a páginas de paginación de archivo\n→ Yoast → Apariencia en buscadores → Páginas de archivo\n→ Implementar rel=canonical en todo el catálogo", "1–2 h", "WP admin + Dev", "GSC → Indexación → Páginas paginadas: deben desaparecer"),
        ],
        col_widths=[0.4, 2.6, 0.8, 1.0, 2.0],
        font_size=8,
        header_bg=RGBColor(0x3B, 0x1A, 0x8B),
    )

    # MES 2
    banner_table(doc, "MES 2 — Dominio del Mercado Local",
                 "Impacto esperado: superar a Donaldson en AI Visibility · 350+ clics/mes orgánicos",
                 bg=GRIS_CABECERA)

    build_table(doc,
        ["#", "Tarea", "Tiempo", "Responsable", "Impacto"],
        [
            ("M2-1", "Completar Topical Map: clusters 2 al 5\n→ filtrado de agua (KD 8,7) · purificadores de agua (KD 10) · filtros de aire (KD 11,6) · filtro para piscina (KD 19,8)", "1–2 días c/u", "Contenido SEO", "5/24 clusters al final del mes 2"),
            ("M2-2", "Cerrar Mention Gap vs. Donaldson (86 fuentes de diferencia)\n→ Artículos invitado en Minería Chilena, Mundo Minero\n→ Directorios: ChileProveedores, Construye2025, SIC\n→ Menciones en fichas de proveedores (Metso, Sandvik)", "Ongoing", "Marketing", "Surfer AI → Direct Citations: de 298 → 500+"),
            ("M2-3", "Optimizar Google Business Profile\n→ Completar perfil · fotos · posts semanales\n→ Responder todas las reseñas", "2–3 h", "Marketing", "Aparición en Google Maps + Local Pack"),
            ("M2-4", "Schema Organization + LocalBusiness en homepage\n→ Nombre, URL, logo, descripción, área de servicio CL\n→ Teléfono, dirección, horario comercial", "2–3 h", "Dev", "Surfer AI Visibility Score: 51 → 58+"),
        ],
        col_widths=[0.4, 2.8, 0.8, 1.0, 1.8],
        font_size=8,
    )

    # ── KPIs Y METAS ─────────────────────────────────────────────────────────
    doc.add_page_break()
    add_heading(doc, "8.  Semáforo de KPIs — Metas por Período", 2)

    build_table(doc,
        ["KPI", "Hoy", "Meta 30 días", "Meta 90 días", "Meta 6 meses"],
        [
            ("Clics orgánicos / mes",         "~73",        "200",       "500",             "1.000+"),
            ("CTR promedio",                  "2,1%",       "3,5%",      "4,5%",            "5%+"),
            ("Posición promedio",             "6,6",        "5,5",       "4,5",             "3,5"),
            ("Content Score promedio",        "12 / 100",   "40",        "55",              "70+"),
            ("AI Visibility Score",           "51 / 100",   "54",        "58",              "65+ (líder)"),
            ("Mention Rate IA",               "33%",        "40%",       "50%",             "70%"),
            ("Topical Map cubierto",          "0 / 24",     "3 / 24",    "8 / 24",          "20 / 24"),
            ("Eventos clave GA4",             "1",          "4",         "6",               "8"),
            ("Rich Snippets válidos",         "0",          "6",         "20",              "50+"),
            ("TTFB",                          "2.140 ms",   "1.500 ms",  "1.274 ms",        "< 800 ms"),
            ("URLs bloqueadas robots.txt",    "11.464",     "0",         "0",               "0"),
            ("Keywords en top 3",             "39",         "55",        "80",              "150+"),
            ("Direct Citations por IAs",      "298",        "350",       "450",             "600+"),
        ],
        col_widths=[2.0, 1.0, 1.0, 1.1, 1.6],
        font_size=9,
    )

    # ── ARCHIVOS DE TRABAJO ──────────────────────────────────────────────────
    add_heading(doc, "9.  Archivos de Trabajo Listos para Usar", 2)
    add_body(doc, "Los siguientes documentos están disponibles en el repositorio del proyecto, listos para implementar:")

    build_table(doc,
        ["Archivo", "Contenido", "Cuándo usarlo"],
        [
            ("articulo-guia-filtros-hidraulicos-mineria-chile.md", "Artículo AEO completo (1.400+ palabras, tabla comparativa, schema FAQ)", "Semana 2 · Tarea S2-1"),
            ("articulo-filtros-mineria-cobre-chile.md",           "Artículo AEO completo sobre minería del cobre (tabla por equipo y proceso)", "Semana 2 · Tarea S2-2"),
            ("optimizacion-paginas-ctr.md",                       "7 titles y meta descriptions listos para copiar/pegar en Yoast o RankMath", "Semana 1 · Tarea S1-4"),
            ("checklist-tecnico-wordpress.md",                    "15 correcciones técnicas con instrucciones paso a paso para WordPress", "Semanas 1–4"),
            ("filtrocentro-plan-maestro.json",                    "Todos los datos estructurados (GSC + GA4 + Surfer) para el dashboard", "Automático"),
        ],
        col_widths=[2.2, 3.0, 1.5],
        font_size=8,
    )

    # ── PIE ──────────────────────────────────────────────────────────────────
    add_divider(doc)
    p = doc.add_paragraph()
    p.clear()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Informe generado con datos reales de Google Search Console, Google Analytics 4 y Surfer SEO  ·  Filtrocentro.cl  ·  Junio 2026")
    r.font.size = Pt(8)
    r.font.color.rgb = GRIS_TEXTO
    p2 = doc.add_paragraph()
    p2.clear()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("Próxima revisión de KPIs recomendada: 22 de Julio 2026")
    r2.font.size = Pt(8)
    r2.font.color.rgb = GRIS_TEXTO

    output = "/home/user/informes-seo/docs/data/filtrocentro/Informe-SEO-AEO-GEO-Filtrocentro-Junio2026.docx"
    doc.save(output)
    print(f"Documento guardado: {output}")


if __name__ == "__main__":
    build_document()
