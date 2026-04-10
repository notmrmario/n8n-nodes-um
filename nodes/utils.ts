/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { DateTime } from "luxon";
import { dateFormat } from "./types";
import TurnDown from "turndown";
import nhp from "node-html-parser";

export const td = new TurnDown({
    headingStyle: "atx",
    bulletListMarker: "-",
});

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


export function parseTarea(html: string) {
    const regex_adjuntos = /!\[.*?\]\(.*?\) *\[(.*?)\]\((.*?)\)/gms;

    if (nhp.parse(html).querySelectorAll("div.container-fluid").length > 1) { // Tipo A
        const root = nhp.parse(html).querySelectorAll("div.container-fluid").at(-1);
        const conf = td.turndown(root?.querySelector("div>div>dl")?.innerHTML);
        const desc = td.turndown(root?.querySelector("div>:has(div>ul)")?.innerHTML);

        return {
            creado_por: /Creado por:\n+([^\n]*)/si.exec(conf)?.[1],
            inicio: DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)![1], dateFormat),
            fin: DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)![1], dateFormat),
            calificacion: /Calificación\n+([^\n]*)/siu.exec(conf)?.[1],
            adjuntos: [...desc.matchAll(regex_adjuntos)].map(m => ({ nombre: m[1], url: m[2] })),
            informacion: desc.split(/\n+/)[0],
            tipo: "A"
        };
    } else { // Tipo B
        const root = nhp.parse(html).querySelector("div#StudentAssignmentCurrent");

        const info = root
            ?.querySelector("table")
            ?.querySelectorAll("tr")
            .map(el => [el.querySelector("th")!.innerText.trim(), el.querySelector("td")!.innerText.trim()])
            // @ts-expect-error error de tipo que se puede ignorar
            .reduce((o, x) => {o[x[0]] = x[1]; return o}, {});

        const desc = root?.querySelectorAll("h4").map(el => td.turndown(el.nextElementSibling!.innerHTML));
        const instrucciones = desc?.[0] ?? "";
        const adjuntos = desc ? desc[1] + desc[2] : "";

        return {
            info,
            instrucciones,
            adjuntos: [...adjuntos.matchAll(regex_adjuntos)]?.map(m => ({ nombre: m[1], url: m[2] })),
        };
    }
}

export function keys<T extends object>(o: T): (keyof T)[] {
    return Object.keys(o) as unknown as (keyof T)[];
}