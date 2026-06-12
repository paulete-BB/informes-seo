#!/usr/bin/env python3
"""
Genera los datos de los informes de posicionamiento.

Consulta Google Analytics 4 (Data API), Google Search Console
(Search Analytics API) y PageSpeed Insights, compara el último mes
calendario completo contra el mes anterior, y escribe un JSON por
cliente en docs/data/. El dashboard (docs/index.html) lee esos JSON.

Requiere la variable de entorno GOOGLE_CREDENTIALS con el JSON de la
service account (en GitHub Actions se inyecta desde un secret).
"""

import calendar
import json
import os
import sys
import time
from datetime import date, datetime, timezone

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "docs", "data")


# ---------------------------------------------------------------- utilidades

def periodos():
    """Devuelve (actual, anterior): el último mes calendario completo y el previo."""
    hoy = date.today()
    fin_actual = date(hoy.year, hoy.month, 1)  # día 1 del mes en curso
    ini_actual = _restar_mes(fin_actual)
    fin_anterior = ini_actual
    ini_anterior = _restar_mes(fin_anterior)
    # rangos inclusivos: [inicio, fin - 1 día]
    return (
        {"inicio": ini_actual.isoformat(), "fin": _dia_antes(fin_actual)},
        {"inicio": ini_anterior.isoformat(), "fin": _dia_antes(fin_anterior)},
    )


def _restar_mes(d):
    y, m = (d.year - 1, 12) if d.month == 1 else (d.year, d.month - 1)
    return date(y, m, 1)


def _dia_antes(d):
    ult = d.toordinal() - 1
    return date.fromordinal(ult).isoformat()


def credenciales():
    raw = os.environ.get("GOOGLE_CREDENTIALS")
    if not raw:
        sys.exit("ERROR: falta la variable de entorno GOOGLE_CREDENTIALS")
    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    creds.refresh(Request())
    return creds


def _post(url, token, payload):
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------- GA4

def ga4_resumen(token, property_id, periodo):
    """Métricas globales del canal Organic Search para un período."""
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    base = {
        "dateRanges": [{"startDate": periodo["inicio"], "endDate": periodo["fin"]}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "sessionDefaultChannelGroup",
                "stringFilter": {"value": "Organic Search"},
            }
        },
    }
    metricas = ["sessions", "totalUsers", "newUsers", "engagementRate",
                "averageSessionDuration", "keyEvents"]
    payload = dict(base, metrics=[{"name": m} for m in metricas])
    try:
        data = _post(url, token, payload)
    except requests.HTTPError:
        # propiedades antiguas: keyEvents puede no existir todavía
        metricas[-1] = "conversions"
        payload = dict(base, metrics=[{"name": m} for m in metricas])
        data = _post(url, token, payload)

    fila = (data.get("rows") or [{}])[0].get("metricValues", [])
    val = lambda i: float(fila[i]["value"]) if i < len(fila) else 0.0
    sesiones = val(0)
    conversiones = val(5)
    return {
        "sesiones": int(sesiones),
        "usuarios": int(val(1)),
        "usuarios_nuevos": int(val(2)),
        "engagement_rate": round(val(3) * 100, 1),
        "duracion_media_seg": round(val(4)),
        "conversiones": int(conversiones),
        "tasa_conversion": round(conversiones / sesiones * 100, 2) if sesiones else 0.0,
    }


def ga4_landing_pages(token, property_id, periodo, limite=10):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = {
        "dateRanges": [{"startDate": periodo["inicio"], "endDate": periodo["fin"]}],
        "dimensions": [{"name": "landingPage"}],
        "metrics": [{"name": "sessions"}, {"name": "engagementRate"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "sessionDefaultChannelGroup",
                "stringFilter": {"value": "Organic Search"},
            }
        },
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": limite,
    }
    data = _post(url, token, payload)
    paginas = []
    for row in data.get("rows", []):
        paginas.append({
            "pagina": row["dimensionValues"][0]["value"] or "/",
            "sesiones": int(float(row["metricValues"][0]["value"])),
            "engagement_rate": round(float(row["metricValues"][1]["value"]) * 100, 1),
        })
    return paginas


def ga4_dispositivos(token, property_id, periodo):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = {
        "dateRanges": [{"startDate": periodo["inicio"], "endDate": periodo["fin"]}],
        "dimensions": [{"name": "deviceCategory"}],
        "metrics": [{"name": "sessions"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "sessionDefaultChannelGroup",
                "stringFilter": {"value": "Organic Search"},
            }
        },
    }
    data = _post(url, token, payload)
    out = {}
    for row in data.get("rows", []):
        out[row["dimensionValues"][0]["value"]] = int(float(row["metricValues"][0]["value"]))
    return out



FUENTES_IA = {
    "chatgpt.com": "ChatGPT", "chat.openai.com": "ChatGPT",
    "perplexity.ai": "Perplexity", "www.perplexity.ai": "Perplexity",
    "gemini.google.com": "Gemini", "bard.google.com": "Gemini",
    "copilot.microsoft.com": "Copilot", "claude.ai": "Claude",
}


def ga4_trafico_ia(token, property_id, periodo):
    """Sesiones y usuarios que llegan referidos desde asistentes de IA."""
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    payload = {
        "dateRanges": [{"startDate": periodo["inicio"], "endDate": periodo["fin"]}],
        "dimensions": [{"name": "sessionSource"}],
        "metrics": [{"name": "sessions"}, {"name": "totalUsers"}],
        "dimensionFilter": {
            "filter": {
                "fieldName": "sessionSource",
                "inListFilter": {"values": list(FUENTES_IA.keys()),
                                 "caseSensitive": False},
            }
        },
    }
    data = _post(url, token, payload)
    fuentes, tot_s, tot_u = {}, 0, 0
    for row in data.get("rows", []):
        origen = FUENTES_IA.get(row["dimensionValues"][0]["value"].lower(),
                                row["dimensionValues"][0]["value"])
        s = int(float(row["metricValues"][0]["value"]))
        u = int(float(row["metricValues"][1]["value"]))
        acc = fuentes.setdefault(origen, {"sesiones": 0, "usuarios": 0})
        acc["sesiones"] += s
        acc["usuarios"] += u
        tot_s += s
        tot_u += u
    return {"total_sesiones": tot_s, "total_usuarios": tot_u, "fuentes": fuentes}


# ---------------------------------------------------------------- Search Console

def gsc_query(token, site_url, periodo, dimensiones=None, limite=250):
    from urllib.parse import quote
    url = (f"https://searchconsole.googleapis.com/webmasters/v3/sites/"
           f"{quote(site_url, safe='')}/searchAnalytics/query")
    payload = {
        "startDate": periodo["inicio"],
        "endDate": periodo["fin"],
        "rowLimit": limite,
    }
    if dimensiones:
        payload["dimensions"] = dimensiones
    return _post(url, token, payload).get("rows", [])


def gsc_totales(token, site_url, periodo):
    filas = gsc_query(token, site_url, periodo)
    if not filas:
        return {"clics": 0, "impresiones": 0, "ctr": 0.0, "posicion": 0.0}
    f = filas[0]
    return {
        "clics": int(f.get("clicks", 0)),
        "impresiones": int(f.get("impressions", 0)),
        "ctr": round(f.get("ctr", 0) * 100, 2),
        "posicion": round(f.get("position", 0), 1),
    }


def gsc_analisis_queries(token, site_url, periodo, terminos_marca, keywords_objetivo):
    filas = gsc_query(token, site_url, periodo, ["query"], limite=1000)
    dist = {"top3": 0, "top10": 0, "top100": 0}
    clics_marca = clics_total = 0
    posiciones = {}
    top_queries = []

    marca = [t.lower() for t in terminos_marca]
    for f in filas:
        q = f["keys"][0].lower()
        pos = f.get("position", 0)
        clics = int(f.get("clicks", 0))
        if pos <= 3:
            dist["top3"] += 1
        if pos <= 10:
            dist["top10"] += 1
        if pos <= 100:
            dist["top100"] += 1
        clics_total += clics
        if any(t in q for t in marca):
            clics_marca += clics
        posiciones[q] = {
            "posicion": round(pos, 1),
            "clics": clics,
            "impresiones": int(f.get("impressions", 0)),
        }

    for f in filas[:15]:
        top_queries.append({
            "query": f["keys"][0],
            "clics": int(f.get("clicks", 0)),
            "impresiones": int(f.get("impressions", 0)),
            "posicion": round(f.get("position", 0), 1),
        })

    objetivo = []
    for kw in keywords_objetivo:
        d = posiciones.get(kw.lower())
        objetivo.append({
            "keyword": kw,
            "posicion": d["posicion"] if d else None,
            "clics": d["clics"] if d else 0,
            "impresiones": d["impresiones"] if d else 0,
        })

    pct_marca = round(clics_marca / clics_total * 100, 1) if clics_total else 0.0
    return dist, pct_marca, objetivo, top_queries


def gsc_top_paginas(token, site_url, periodo, limite=10):
    filas = gsc_query(token, site_url, periodo, ["page"], limite=limite)
    return [{
        "pagina": f["keys"][0],
        "clics": int(f.get("clicks", 0)),
        "impresiones": int(f.get("impressions", 0)),
        "posicion": round(f.get("position", 0), 1),
    } for f in filas]


# ---------------------------------------------------------------- PageSpeed

def pagespeed(url_sitio):
    """Core Web Vitals (móvil). API gratuita; tolera fallos sin abortar."""
    try:
        r = requests.get(
            "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
            params={"url": url_sitio, "strategy": "mobile",
                    "category": "performance"},
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
        lh = data.get("lighthouseResult", {})
        audits = lh.get("audits", {})
        cwv = data.get("loadingExperience", {}).get("metrics", {})

        def lab(k):
            return audits.get(k, {}).get("displayValue")

        def campo(k):
            m = cwv.get(k)
            return {"valor": m.get("percentile"), "categoria": m.get("category")} if m else None

        return {
            "performance": round(lh.get("categories", {}).get("performance", {}).get("score", 0) * 100),
            "lcp_lab": lab("largest-contentful-paint"),
            "cls_lab": lab("cumulative-layout-shift"),
            "lcp_campo": campo("LARGEST_CONTENTFUL_PAINT_MS"),
            "inp_campo": campo("INTERACTION_TO_NEXT_PAINT"),
            "cls_campo": campo("CUMULATIVE_LAYOUT_SHIFT_SCORE"),
        }
    except Exception as e:
        print(f"  PageSpeed no disponible: {e}")
        return None


# ---------------------------------------------------------------- principal

def procesar_cliente(cliente, token, p_actual, p_anterior):
    pid = cliente["ga4_property_id"]
    site = cliente["gsc_site_url"]

    dist_act, pct_marca, kw_obj_act, top_q = gsc_analisis_queries(
        token, site, p_actual, cliente.get("terminos_marca", []),
        cliente.get("keywords_objetivo", []))
    dist_ant, _, kw_obj_ant, _ = gsc_analisis_queries(
        token, site, p_anterior, cliente.get("terminos_marca", []),
        cliente.get("keywords_objetivo", []))

    pos_ant = {k["keyword"]: k["posicion"] for k in kw_obj_ant}
    for k in kw_obj_act:
        k["posicion_anterior"] = pos_ant.get(k["keyword"])

    return {
        "cliente": cliente["nombre"],
        "url": cliente.get("url_principal", ""),
        "generado": datetime.now(timezone.utc).isoformat(),
        "periodo": {"actual": p_actual, "anterior": p_anterior},
        "gsc": {
            "actual": gsc_totales(token, site, p_actual),
            "anterior": gsc_totales(token, site, p_anterior),
            "distribucion": {"actual": dist_act, "anterior": dist_ant},
            "pct_clics_marca": pct_marca,
            "keywords_objetivo": kw_obj_act,
            "top_queries": top_q,
            "top_paginas": gsc_top_paginas(token, site, p_actual),
        },
        "ga4": {
            "actual": ga4_resumen(token, pid, p_actual),
            "anterior": ga4_resumen(token, pid, p_anterior),
            "landing_pages": ga4_landing_pages(token, pid, p_actual),
            "dispositivos": ga4_dispositivos(token, pid, p_actual),
        },
        "ia": {
            "actual": ga4_trafico_ia(token, pid, p_actual),
            "anterior": ga4_trafico_ia(token, pid, p_anterior),
        },
        "psi": pagespeed(cliente.get("url_principal")) if cliente.get("url_principal") else None,
    }


def main():
    with open(os.path.join(ROOT, "clients.json"), encoding="utf-8") as f:
        config = json.load(f)

    creds = credenciales()
    token = creds.token
    p_actual, p_anterior = periodos()
    os.makedirs(DATA_DIR, exist_ok=True)

    indice = []
    errores = 0
    for cliente in config["clientes"]:
        print(f"Procesando {cliente['nombre']}…")
        try:
            datos = procesar_cliente(cliente, token, p_actual, p_anterior)
            ruta = os.path.join(DATA_DIR, f"{cliente['id']}.json")
            with open(ruta, "w", encoding="utf-8") as f:
                json.dump(datos, f, ensure_ascii=False, indent=2)
            indice.append({"id": cliente["id"], "nombre": cliente["nombre"]})
            print("  OK")
        except Exception as e:
            errores += 1
            print(f"  ERROR en {cliente['id']}: {e}")
        time.sleep(1)

    with open(os.path.join(DATA_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump({
            "actualizado": datetime.now(timezone.utc).isoformat(),
            "clientes": indice,
        }, f, ensure_ascii=False, indent=2)

    print(f"\nListo: {len(indice)} informe(s) generado(s), {errores} error(es).")
    if errores and not indice:
        sys.exit(1)


if __name__ == "__main__":
    main()
