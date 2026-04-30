from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "docs" / "Informe_Spevgo_Inversionistas.pdf"
LOGO_FILE = ROOT / "public" / "spevgo-logo.png"
DIAGRAM_DIR = ROOT / "docs" / "_diagrams"


def _load_font(size: int):
    for path in (
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_vertical_flow(
    *,
    title: str,
    steps: list[tuple[str, str]],
    filename: str,
    width: int = 1100,
    box_h: int = 88,
    gap: int = 36,
) -> Path:
    """Genera PNG con flujo vertical: caja por paso + flecha."""
    DIAGRAM_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DIAGRAM_DIR / filename

    title_font = _load_font(26)
    step_font = _load_font(20)
    sub_font = _load_font(16)

    margin_top = 70
    margin_x = 48
    height = margin_top + len(steps) * (box_h + gap) + 40

    img = Image.new("RGB", (width, height), "#f8fafc")
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, width, 56), fill="#065f46")
    draw.text((margin_x, 14), title, fill="white", font=title_font)

    y = margin_top
    box_w = width - 2 * margin_x
    emerald = "#059669"
    border = "#065f46"
    text_dark = "#0f172a"
    sub = "#475569"

    for i, (head, detail) in enumerate(steps):
        draw.rounded_rectangle(
            (margin_x, y, margin_x + box_w, y + box_h),
            radius=14,
            fill="#ecfdf5",
            outline=border,
            width=2,
        )
        draw.text((margin_x + 20, y + 14), f"{i + 1}. {head}", fill=text_dark, font=step_font)
        draw.text((margin_x + 20, y + 50), detail, fill=sub, font=sub_font)

        y += box_h
        if i < len(steps) - 1:
            ax = width // 2
            draw.line([(ax, y + 4), (ax, y + gap - 8)], fill=emerald, width=3)
            # punta flecha
            draw.polygon(
                [(ax - 10, y + gap - 14), (ax + 10, y + gap - 14), (ax, y + gap - 2)],
                fill=emerald,
            )
            y += gap

    img.save(out_path, "PNG", optimize=True)
    return out_path


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(2 * cm, 1.2 * cm, "Spevgo - Informe Ejecutivo para Inversionistas")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleBig",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#065F46"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=6,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            leftIndent=14,
            bulletIndent=2,
            textColor=colors.HexColor("#1E293B"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallMuted",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#64748B"),
        )
    )
    return styles


def add_logo(story):
    if LOGO_FILE.exists():
        story.append(RLImage(str(LOGO_FILE), width=4.2 * cm, height=4.2 * cm))
        story.append(Spacer(1, 0.2 * cm))


def add_bullets(story, styles, bullets):
    for item in bullets:
        story.append(Paragraph(item, styles["BulletCustom"], bulletText="•"))
    story.append(Spacer(1, 0.2 * cm))


def add_flow_diagram(story, path: Path, caption: str, styles, width_cm: float = 16.2):
    if path.exists():
        with Image.open(path) as im:
            pw, ph = im.size
        aspect = ph / pw if pw else 0.45
        story.append(Paragraph(f"<i>{caption}</i>", styles["SmallMuted"]))
        story.append(Spacer(1, 0.15 * cm))
        w_pdf = width_cm * cm
        story.append(RLImage(str(path), width=w_pdf, height=w_pdf * aspect))
        story.append(Spacer(1, 0.35 * cm))


def build_pdf():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=1.6 * cm,
        bottomMargin=2.0 * cm,
        title="Informe Spevgo para Inversionistas",
        author="Equipo Spevgo",
    )

    today = datetime.now().strftime("%d/%m/%Y")
    story = []

    # Diagramas generados (intuitivos, sin capturas de pantalla reales)
    path_org = draw_vertical_flow(
        title="Flujo: Organizador crea torneo de futbol",
        steps=[
            ("Completa el formulario de evento", "Titulo, fecha, ciudad, imagen, precio inscripcion por equipo, etc."),
            ("Define futbol: modalidad y categoria", "Futbol 11 / 7 / salon. Categoria por edad. Cupos maximo de equipos."),
            ("Envia creacion", "El evento queda en BORRADOR y se crea orden de pago de PUBLICACION."),
            ("Va a Mis eventos", "Ve codigo SPV-PAY, cuenta bancaria y monto de tarifa de publicacion."),
            ("Reporta el pago", "Referencia, fecha, URL del comprobante. Se abre borrador de correo al admin."),
            ("Admin valida el pago", "Si aprueba: evento pasa a PENDIENTE DE REVISION de contenido."),
            ("Admin aprueba el evento", "El torneo queda PUBLICADO y visible para capitanes."),
        ],
        filename="flujo_organizador_torneo.png",
    )
    path_cap = draw_vertical_flow(
        title="Flujo: Capitan o DT inscribe su equipo",
        steps=[
            ("Busca el evento publicado", "Home o detalle: ve modalidad, categoria y cupos de equipos."),
            ("Pulsa Inscribir equipo", "Introduce nombre del equipo y plantilla (lineas o Excel pegado)."),
            ("Validacion automatica", "Min/max jugadores segun modalidad, edades vs categoria, identidades unicas."),
            ("Sistema genera orden de pago", "Codigo unico por inscripcion; muestra datos para transferencia."),
            ("Reporta pago en Mis eventos", "Mismo flujo que publicacion: referencia + soporte + correo admin."),
            ("Admin valida pago de equipo", "Equipo pasa a CONFIRMADO; cupo de equipos se actualiza."),
        ],
        filename="flujo_capitan_equipo.png",
    )
    path_adm = draw_vertical_flow(
        title="Flujo: Admin recibe y decide",
        steps=[
            ("Correo preparado al reportar pago", "Resumen: codigo, evento, equipo, monto, checklist de revision."),
            ("Panel: Revision de pagos reportados", "Ve referencia, comprobante, aprueba o rechaza con motivo."),
            ("Panel: Revision de eventos pendientes", "Ficha completa: modalidad, categoria, mapa, cupos equipos."),
            ("Dos decisiones encadenadas", "Primero pago publicacion, luego calidad del evento; luego pagos de equipos."),
            ("Estados visibles para todos", "Organizador y capitan ven semaforo en Mis eventos / inscripciones."),
        ],
        filename="flujo_admin_revision.png",
    )

    add_logo(story)
    story.append(Paragraph("Informe Ejecutivo Integral - Spevgo", styles["TitleBig"]))
    story.append(Paragraph("Plataforma deportiva en Colombia: producto, flujos y estado operativo completo", styles["Body"]))
    story.append(Paragraph(f"Version para inversionistas | Fecha: {today}", styles["SmallMuted"]))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("1. Resumen ejecutivo", styles["H2"]))
    story.append(
        Paragraph(
            "Spevgo es una plataforma web progresiva para descubrir eventos deportivos, crear torneos, inscribir equipos "
            "y administrar pagos/revisiones en Colombia. La estrategia actual prioriza futbol para acelerar adopcion y "
            "validar modelo comercial con organizadores, capitanes y comunidades deportivas.",
            styles["Body"],
        )
    )
    add_bullets(
        story,
        styles,
        [
            "Propuesta de valor: concentrar en un solo producto el ciclo completo (descubrimiento, creacion, inscripcion, pago, validacion y seguimiento).",
            "Cobertura actual: operacion nacional en Colombia con experiencia mobile-first y panel administrativo.",
            "Estado: MVP robusto y demostrable, listo para etapa controlada de pruebas con usuarios reales.",
        ],
    )

    story.append(Paragraph("2. Guia visual de flujos (futbol y operacion)", styles["H2"]))
    story.append(
        Paragraph(
            "Las siguientes figuras resumen de forma intuitiva quien hace que en cada etapa. "
            "Son diagramas generados para el informe (no requieren capturas de pantalla del producto).",
            styles["Body"],
        )
    )
    add_flow_diagram(
        story,
        path_org,
        "Figura A: del formulario de torneo hasta que el evento queda publico para inscripciones de equipos.",
        styles,
    )
    add_flow_diagram(
        story,
        path_cap,
        "Figura B: del capitan que encuentra el torneo hasta que su equipo queda confirmado tras validar pago.",
        styles,
    )
    add_flow_diagram(
        story,
        path_adm,
        "Figura C: como el administrador recibe informacion y toma decisiones sobre pagos y calidad del evento.",
        styles,
    )

    story.append(PageBreak())
    add_logo(story)
    story.append(Paragraph("3. Flujo narrativo paso a paso (futbol)", styles["H2"]))

    story.append(Paragraph("3.1. Organizador del torneo", styles["H3"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Paso 1</b> Inicia sesion como usuario con permiso de crear evento.",
            "<b>Paso 2</b> Entra a Crear evento, elige deporte Futbol.",
            "<b>Paso 3</b> Completa datos generales (titulo, descripcion, fecha, ciudad, imagen).",
            "<b>Paso 4</b> Selecciona modalidad: Futbol 11, Futbol 7 o Futbol de salon; elige categoria por edad.",
            "<b>Paso 5</b> Indica cuantos equipos maximo aceptara el torneo (cupos de equipos).",
            "<b>Paso 6</b> Al guardar: el sistema crea el evento en BORRADOR y una orden de pago de publicacion.",
            "<b>Paso 7</b> En Mis eventos reporta la transferencia con referencia y comprobante; se notifica al admin por correo.",
            "<b>Paso 8</b> Cuando el admin aprueba el pago, el evento entra en revision de contenido; al aprobarlo, queda PUBLICADO.",
        ],
    )

    story.append(Paragraph("3.2. Capitan o director tecnico", styles["H3"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Paso 1</b> Ve el torneo ya publicado en la home o en el detalle del evento.",
            "<b>Paso 2</b> Pulsa Inscribir equipo (solo futbol publicado).",
            "<b>Paso 3</b> Escribe nombre del equipo y pega o escribe la plantilla de jugadores.",
            "<b>Paso 4</b> El sistema valida cantidad de jugadores (11: 14-20; 7 y salon: 10-15), edades y documentos unicos.",
            "<b>Paso 5</b> Se genera orden de pago por la tarifa de inscripcion del evento; el capitan transfiere y reporta.",
            "<b>Paso 6</b> Tras validacion admin, el equipo queda confirmado y cuenta para el cupo de equipos del torneo.",
        ],
    )

    story.append(Paragraph("3.3. Administrador Spevgo", styles["H3"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Entrada A - Pagos</b> Lista de ordenes reportadas: publicacion de evento e inscripcion de equipos.",
            "<b>Accion</b> Abre evidencia, compara monto y referencia, aprueba o rechaza con motivo claro.",
            "<b>Entrada B - Eventos</b> Cola de eventos pendientes de revision cuando el pago de publicacion ya fue validado.",
            "<b>Accion</b> Revisa ficha completa (modalidad, categoria, mapa, cupos) y publica o rechaza el torneo.",
            "<b>Resultado</b> Los estados se reflejan en Mis eventos para organizador y capitan sin ambiguedad.",
        ],
    )

    story.append(Paragraph("4. Estado actual del producto (resumen completo)", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Arquitectura:</b> estructura modular por capas (tipos de dominio, repositorio, hooks, paginas/feature modules).",
            "<b>UX/UI:</b> interfaz moderna, responsive, modo oscuro, tarjetas mejoradas, hero optimizado y estados vacios/skeletons.",
            "<b>Cobertura nacional:</b> textos, ciudades y experiencia ajustada para Colombia.",
            "<b>Mapa:</b> validacion de coordenadas + geocodificacion por Nominatim/OpenStreetMap para mejorar precision de pines.",
            "<b>Admin:</b> revision detallada de eventos y pagos con aprobacion/rechazo y notas obligatorias.",
            "<b>Pagos manuales:</b> orden de pago con codigo unico, reporte de soporte, flujo de validacion y notificacion por correo al admin.",
        ],
    )

    story.append(Paragraph("5. Credenciales demo y acceso", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "<b>Admin demo:</b> admin@spevgo.co",
            "<b>Password demo:</b> Admin123*",
            "<b>Usuario demo:</b> user@spevgo.co",
            "<b>Password demo:</b> User123*",
            "Nota: credenciales de demostracion para pruebas de producto.",
        ],
    )

    story.append(Paragraph("6. Funcionalidades principales del MVP", styles["H2"]))
    table_data = [
        ["Bloque", "Estado", "Valor para negocio"],
        ["Home + buscador + filtros", "Activo", "Captacion y descubrimiento rapido de oferta deportiva"],
        ["Detalle evento + mapa + CTA", "Activo", "Mejor contexto para decision de inscripcion"],
        ["Creacion de evento", "Activo", "Permite a organizadores publicar torneos de forma guiada"],
        ["Inscripcion de equipo (futbol)", "Activo", "Control de plantilla, categoria y reglas por modalidad"],
        ["Pagos manuales con evidencia", "Activo", "Trazabilidad financiera sin pasarela inicial"],
        ["Mis eventos / Mis inscripciones", "Activo", "Seguimiento operativo para usuarios y organizadores"],
        ["Panel admin integral", "Activo", "Revision de eventos, pagos y gobierno de calidad"],
        ["PWA + responsive + dark mode", "Activo", "Experiencia moderna y accesible en moviles"],
    ]
    table = Table(table_data, colWidths=[5.1 * cm, 2.3 * cm, 8.6 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#065F46")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        Paragraph(
            "Resultado: Spevgo ya soporta demostraciones comerciales de punta a punta para organizadores, equipos y administracion.",
            styles["Body"],
        )
    )

    story.append(PageBreak())
    add_logo(story)
    story.append(Paragraph("7. Flujo de pagos manuales (estado actual)", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Cada pago genera un codigo unico de orden.",
            "El sistema muestra cuenta destino para transferencia.",
            "El usuario reporta referencia, fecha y URL de comprobante.",
            "Admin valida/rechaza y deja nota.",
            "Si se rechaza, el usuario corrige y reenvia.",
            "Al reportar pago se prepara correo con resumen completo al admin.",
        ],
    )

    story.append(Paragraph("8. Robustez del modulo futbol", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Categorias activas: 6-8, 9-11, 12-14, 15-17, Mayores, Sub 35.",
            "Validacion de edad por fecha de nacimiento vs fecha del evento.",
            "Prevencion de duplicidad de identidad en plantilla.",
            "Soporte de carga masiva de jugadores (coma, punto y coma, tab, pipe).",
            "Deteccion automatica de encabezados al pegar desde Excel.",
            "Control de cupos por equipos para eventos de futbol.",
        ],
    )

    story.append(PageBreak())
    add_logo(story)
    story.append(Paragraph("9. Plan de proximos pasos (pruebas con usuarios reales)", styles["H2"]))
    story.append(
        Paragraph(
            "El siguiente objetivo es abrir una etapa de validacion con usuarios reales (organizadores, capitanes y jugadores) "
            "para capturar feedback de producto y priorizar mejoras de negocio.",
            styles["Body"],
        )
    )

    story.append(Paragraph("9.1. Fase de piloto controlado (2 a 4 semanas)", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Seleccionar 3-5 torneos de futbol reales con organizadores aliados.",
            "Invitar grupos de capitanes para probar inscripcion de equipo completa.",
            "Medir tasa de finalizacion de flujos (creacion, inscripcion, reporte de pago).",
            "Recolectar feedback de UX por formulario, claridad y tiempos de revision admin.",
            "Registrar incidencias para backlog de mejora priorizado por impacto.",
        ],
    )

    story.append(Paragraph("9.2. Mejoras de producto sugeridas (corto plazo)", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Envio de correo automatico real (sin depender de cliente local mailto).",
            "Historial de estados tipo timeline para cada pago y cada equipo.",
            "Exportable de equipos inscritos por evento (CSV/PDF operativo).",
            "Recordatorios automaticos para pagos pendientes y revisiones vencidas.",
            "Mayor detalle de metricas de conversion y embudo por rol.",
            "Opcional: incluir capturas reales de la app en futuras versiones del informe.",
        ],
    )

    story.append(Paragraph("9.3. Evolucion de pagos (mediano plazo)", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Fase A: mantener pago manual con evidencia y control admin (actual).",
            "Fase B: conciliacion semiautomatica de referencias y validaciones.",
            "Fase C: integrar pasarela (PSE/tarjeta) al alcanzar volumen de transacciones objetivo.",
            "Fase D: scoring antifraude y cierre automatico de cupos por pago confirmado.",
        ],
    )

    story.append(Paragraph("10. Indicadores clave para etapa de pruebas y negocio", styles["H2"]))
    add_bullets(
        story,
        styles,
        [
            "Tasa de eventos creados que llegan a publicacion final.",
            "Tasa de equipos que completan inscripcion + pago reportado.",
            "Tiempo promedio de revision admin por pago/evento.",
            "Porcentaje de rechazos y causas mas frecuentes.",
            "Retencion de organizadores y capitanes entre torneos.",
            "Ingresos por evento, por ciudad y por modalidad de futbol.",
        ],
    )

    story.append(Paragraph("11. Conclusiones para inversionistas", styles["H2"]))
    story.append(
        Paragraph(
            "Spevgo ya opera con un flujo completo y coherente para torneo amateur: creacion por organizador, inscripcion por equipo, "
            "pago controlado, revision administrativa y seguimiento en plataforma. Esta base permite iniciar pruebas reales de mercado "
            "con bajo riesgo tecnico y alta capacidad de aprendizaje comercial.",
            styles["Body"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Documento actualizado para pruebas de mercado, conversaciones comerciales e inversion.", styles["SmallMuted"]))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_pdf()
    print(f"PDF generado: {OUT_FILE}")
