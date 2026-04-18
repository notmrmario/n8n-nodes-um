/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { DateTime } from "luxon";
import { dateFormat } from "./types";
import TurnDown from "turndown";
import nhp, { HTMLElement } from "node-html-parser";
import { type IDataObject } from "n8n-workflow";

export const td = new TurnDown({
    headingStyle: "atx",
    bulletListMarker: "-",
});

export const regex_adjuntos = /!\[.*?\]\(.*?\) *\[(.*?)\]\((.*?)\)/gms;

export function extraerCampo(html: string, nombreCampo: string) {
    // Paso 1: capturar contenido del <td>
    const regex = new RegExp(
        `<th>\\s*${nombreCampo}\\s*<\\/th>\\s*<td[^>]*>(.*?)<\\/td>`,
        'is'  // i = case insensitive, s = dotAll (el . incluye saltos de línea)
    );

    const match = html.match(regex);
    if (!match) return null;

    // Paso 2: limpiar etiquetas HTML y espacios
    return match[1].replace(/<[^>]+>/g, '').trim();
}

export function keys<T extends object>(o: T): (keyof T)[] {
    return Object.keys(o) as unknown as (keyof T)[];
}

export function parseTarea(html: string) {
    let result: IDataObject = {};

    if (!nhp.parse(html).querySelector("div.portletBody.container-fluid")) { // Tipo A
        const root = nhp.parse(html).querySelector("div.portletBody.container-fluid")!;
        const conf = td.turndown(root?.querySelector("div>div>dl")?.innerHTML);

        if (root?.querySelector("p.instruction")) { // No hay adjuntos
            const desc = td.turndown(root?.querySelector("div>p")?.innerHTML);
            result = {
                ...result,
                creado_por: /Creado por:\n+([^\n]*)/si.exec(conf)?.[1],
                inicio: DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)![1], dateFormat, { locale: "es" }),
                fin: DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)![1], dateFormat, { locale: "es" }),
                // inicio: /Abierta\n+([^\n]*)/si.exec(conf)![1],
                // fin: /Entregar\n+([^\n]*)/si.exec(conf)![1],
                calificacion: /Calificación\n+([^\n]*)/siu.exec(conf)?.[1],
                informacion: desc.split(/\n+/)[0],
                tipo: "A1"
            };
        } else { // Hay adjuntos
            const desc = td.turndown(root?.querySelector("div>:has(div>ul)")?.innerHTML);
            result = {
                ...result,
                creado_por: /Creado por:\n+([^\n]*)/si.exec(conf)?.[1],
                inicio: DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)![1], dateFormat, { locale: "es" }),
                fin: DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)![1], dateFormat, { locale: "es" }),
                calificacion: /Calificación\n+([^\n]*)/siu.exec(conf)?.[1],
                adjuntos: [...desc.matchAll(regex_adjuntos)].map(m => ({ nombre: m[1], url: m[2] })),
                informacion: desc.split(/\n+/)[0],
                tipo: "A2"
            };
        }
    } else { // Tipo B (entregable)
        const root = nhp.parse(html).querySelector("div#StudentAssignmentCurrent");

        const info = root
            ?.querySelector("table")
            ?.querySelectorAll("tr")
            .map(el => [el.querySelector("th")!.innerText.trim(), el.querySelector("td")!.innerText.trim()])
            .reduce((o, x) => { o[x[0]] = x[1]; return o }, {} as { [key: string]: string });

        const desc = root?.querySelectorAll("h4").map(el => td.turndown(el.nextElementSibling!.innerHTML));
        const instrucciones = desc?.[0] ?? "";
        const adjuntos = desc ? desc[1] + desc[2] : "";

        result = {
            ...result,
            info,
            instrucciones,
            adjuntos: [...adjuntos.matchAll(regex_adjuntos)]?.map(m => ({ nombre: m[1], url: m[2] })),
            tipo: "B"
        };
    }
    return result;
}

export function parseTarea2(document: HTMLElement) {
    if (document.querySelector("div:has(>div#StudentAssignmentCurrent>table)")) { // tarea entregada
        const root = document.querySelector("div:has(>div#StudentAssignmentCurrent>table)")!;

        const titulo = root.querySelector("h3")?.innerText.trim();
        const cabecera = root.querySelectorAll("div#StudentAssignmentCurrent>table tr")
            .reduce((o, el) => {
                if (el.querySelector("th")) {
                    const tryDate = DateTime.fromFormat(el.querySelector("td")!.innerText.trim(), dateFormat, { locale: "es" });
                    if (tryDate.isValid) o[el.querySelector("th")!.innerText.trim()] = tryDate.toString();
                    else o[el.querySelector("th")!.innerText.trim()] = el.querySelector("td")!.innerText.trim();
                }
                return o;
            }, {} as { [key: string]: string });
        const [instruccionesEl, adjuntosEnviadosEl] = root.querySelectorAll("div.textPanel.borderPanel");
        const instrucciones = td.turndown(instruccionesEl?.innerHTML);
        const adjuntosEnviados = adjuntosEnviadosEl?.querySelectorAll("li")
            .map(el => [el.innerText.trim().replace(/ {2,}/g, " "), el.querySelector("a")?.getAttribute("href")]);
        const recursosTarea =
            root.querySelector(":has(>h4) > p")?.innerText.trim() == "No hay adjuntos todavía" ?
                null :
                root.querySelectorAll("ul:has(~ hr.itemSeparator) li")
                    .map(el => [el.innerText.trim().replace(/ {2,}/g, " "), el.querySelector("a")?.getAttribute("href")]);

        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            adjuntosEnviados,
            estado: "entregada",
        };
    } else if (document.querySelector("div:has(>div#StudentAssignmentCurrent>div)")) { // tarea sin entregar
        const root = document.querySelector("div:has(>div#StudentAssignmentCurrent>div)")!;

        const titulo = root.querySelector("h3")?.innerText.trim();
        const cabecera = root.querySelectorAll("div#StudentAssignmentCurrent div.row")
            .reduce((o, el) => {
                if (el.querySelector("div.itemSummaryHeader")) {
                    const tryDate = DateTime.fromFormat(el.querySelector("div.itemSummaryValue")!.innerText.trim(), dateFormat, { locale: "es" });
                    if (tryDate.isValid) o[el.querySelector("div.itemSummaryHeader")!.innerText.trim()] = tryDate.toString();
                    else o[el.querySelector("div.itemSummaryHeader")!.innerText.trim()] = el.querySelector("div.itemSummaryValue")!.innerText.trim();
                }
                return o;
            }, {} as { [key: string]: string });
        const instruccionesEl = root.querySelectorAll("div.textPanel")?.[0];
        const instrucciones = instruccionesEl ? td.turndown(instruccionesEl.innerHTML) : null;
        const recursosTarea =
            root.querySelector(":has(>h4) > p")?.innerText.trim() == "No hay adjuntos todavía" ?
                null :
                root.querySelectorAll("ul li")
                    .map(el => [el.innerText.trim().replace(/ {2,}/g, " "), el.querySelector("a")?.getAttribute("href")]);

        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            estado: "no entregada",
        };
    } else if (document.querySelectorAll("div.container-fluid")?.length > 1) { // tarea no entregable
        const root = document.querySelectorAll("div.container-fluid").at(-1)!;

        const titulo = root.querySelector("p")?.innerText.replace(/.*?"(.*?)".*/g, "$1");
        const tablaCabecera = [root.querySelectorAll("dl.row dt"), root.querySelectorAll("dl.row dd")];
        const cabecera: { [key: string]: string } = {};
        for (let i = 0; i < tablaCabecera[0].length; i++) {
            const tryDate = DateTime.fromFormat(tablaCabecera[1][i].innerText.trim(), dateFormat, { locale: "es" });
            if (tryDate.isValid) cabecera[tablaCabecera[0][i].innerText.trim()] = tryDate.toString();
            else cabecera[tablaCabecera[0][i].innerText.trim()] = tablaCabecera[1][i].innerText.trim();
        }

        const instruccionesRecursosEl = root.querySelector("div:has(+ hr)");
        const instrucciones = instruccionesRecursosEl ? td.turndown(instruccionesRecursosEl.innerText) : null;

        const recursosTarea =
            instruccionesRecursosEl?.querySelector(":has(>h4) > p")?.innerText.trim() == "No hay adjuntos todavía" ?
                [] :
                root.querySelector("ul")?.children
                    .map(el => [el.innerText.trim().replace(/ {2,}/g, " "), el.querySelector("a")?.getAttribute("href")]);

        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            estado: "no entregable",
        };
    } else return {
        error: "tipo (formato) de tarea desconocido"
    }
}

export function parseAnuncio(html: string) {
    const root = nhp.parse(html).querySelector("div.portletBody")!;

    const result: IDataObject = {};

    if (root.querySelector("div>div.textPanel")) {
        result.contenido = td.turndown(root.querySelector("div>div.textPanel")?.innerHTML).replace(/\n{2,}/g, "\n");
    } else if (root.querySelector("div.message-body")) {
        result.contenido = td.turndown(root.querySelector("div.message-body")?.innerHTML).replace(/\n{2,}/g, "\n")
    }

    if (root.querySelector("ul.attachList")) {
        result.adjuntos = [...td.turndown(root.querySelector("ul.attachList")!.innerHTML).matchAll(regex_adjuntos)]?.map(m => ({ nombre: m[1], url: m[2] }))
    }

    return result;
}