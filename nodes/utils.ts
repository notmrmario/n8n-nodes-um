/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { DateTime } from "luxon";
import { dateFormat } from "./types";
import TurnDown from "turndown";
import nhp from "node-html-parser";
import type { IDataObject } from "n8n-workflow";

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

    if (nhp.parse(html).querySelectorAll("div.container-fluid").length > 1) { // Tipo A
        const root = nhp.parse(html).querySelectorAll("div.container-fluid").at(-1);
        const conf = td.turndown(root?.querySelector("div>div>dl")?.innerHTML);

        if (root?.querySelector("p.instruction")) { // No hay adjuntos
            const desc = td.turndown(root?.querySelector("div>p")?.innerHTML);
            result =  {
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
            // @ts-expect-error error de tipo que se puede ignorar
            .reduce((o, x) => { o[x[0]] = x[1]; return o }, {});

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