/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { IDataObject, IExecuteFunctions, IPollFunctions, NodeApiError } from "n8n-workflow";
import { dateFormat, IStaticDataHeaders } from "./types";
import { UmCreds } from "../credentials/UmApi.credentials";
import { regex_adjuntos } from "./utils";
import he from "he";
import * as nhp from "node-html-parser";
import { DateTime } from "luxon";
import TurnDown from "turndown";

export const td = new TurnDown({
    headingStyle: "atx",
    bulletListMarker: "-",
});

export const inactiveStaticData: IDataObject = {};

export const notiEventType = {
    "nueva_tarea": ["asn.new.assignment", "asn.available.assignment"],
    "nota_tarea": ["asn.grade.submission"],
    "cambio_acceso_tarea": ["asn.revise.access"],
    "nuevo_examen": ["sam.assessment.available"],
    // "nota_examen": ["sam.assessment.available"],
    "examen_modificado": ["sam.assessment.update"],
    "nuevo_anuncio": ["annc.available.announcement", "annc.new"],
    "anuncio_modificado": ["annc.revise"]
};

export async function getUmTokens(node: IPollFunctions | IExecuteFunctions, credentials: UmCreds): Promise<IStaticDataHeaders> {
    const staticData = node.getWorkflow().active ? node.getWorkflowStaticData("global") : inactiveStaticData;

    let test_res = { statusCode: 0 };

    if (staticData.headers) test_res = await node.helpers.httpRequest({
        url: "https://aulavirtual.um.es/api/users/me/notifications",
        headers: {
            "Cookie": [
                "JSESSIONID=" + (staticData.headers as IStaticDataHeaders)?.JSESSIONID,
                "ORA_OTD_JROUTE=" + (staticData.headers as IStaticDataHeaders)?.ORA_OTD_JROUTE,
                "pasystem_timezone_ok=true",
            ].join("; ")
        },
        ignoreHttpStatusErrors: true,
        returnFullResponse: true,
    });

    if (test_res.statusCode != 200) {
        delete staticData.headers;
        const paso0 = await node.helpers.httpRequest({
            url: "https://aulavirtual.um.es/portal",
            returnFullResponse: true,
        });
        const [jsess_header, jroute_header]: (string | undefined)[] = [
            paso0.headers["set-cookie"].find((h: string) => h.startsWith("JSESSIONID=")),
            paso0.headers["set-cookie"].find((h: string) => h.startsWith("ORA_OTD_JROUTE=")),
        ];

        if (!jsess_header || !jroute_header)
            throw new NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 0" });;

        const jsess = jsess_header.match(/JSESSIONID=(.*?);/iu)?.[1];
        const jroute = jroute_header.match(/ORA_OTD_JROUTE=(.*?);/iu)?.[1];

        const paso1 = await node.helpers.httpRequest({
            url: "https://entrada.um.es/cas/login?service=https://aulavirtual.um.es/sakai-login-tool/container",
            headers: {
                "Cookie": [
                    "MFATRUSTED=" + credentials.mfatoken,
                    "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=es"
                ].join("; ")
            },
            returnFullResponse: true,
        });

        const paso1_content = paso1.body + "\n" + paso1.headers["set-cookie"].join("\n");
        const [execution1, AlteonP] = [
            paso1_content.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/iu)?.groups?.execution,
            paso1_content.match(/AlteonP=(?<AlteonP>.*?);/iu)?.groups?.AlteonP,
        ];
        if (!execution1 || !AlteonP)
            throw new NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 1" });

        const paso2 = await node.helpers.httpRequest({
            url: "https://entrada.um.es/cas/login?service=https://aulavirtual.um.es/sakai-login-tool/container",
            method: "POST",
            headers: {
                "Cookie": [
                    "MFATRUSTED=" + credentials.mfatoken,
                    "AlteonP=" + AlteonP,
                    "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=es"
                ].join("; ")
            },
            body: [
                "username=" + credentials.user,
                "password=" + credentials.password,
                "execution=" + execution1,
                "_eventId=submit",
                "geolocation="
            ].join("&"),
            returnFullResponse: true,
            ignoreHttpStatusErrors: true,
        });
        const execution2 = (paso2.body as string)
            ?.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/isu)
            ?.groups?.execution;
        if (!execution2)
            throw new NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 2" });

        const paso3 = await node.helpers.httpRequest({
            url: "https://entrada.um.es/cas/login?selectMfaProviders=true",
            method: "POST",
            headers: {
                "Cookie": [
                    "MFATRUSTED=" + credentials.mfatoken,
                    "AlteonP=" + AlteonP,
                    "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=es"
                ].join("; ")
            },
            body: [
                "execution=" + execution2,
                "mfaProvider=mfa-simple",
                "_eventId=submit"
            ].join("&"),
            returnFullResponse: true,
            disableFollowRedirect: true,
            ignoreHttpStatusErrors: true,
        });
        const location = paso3?.headers?.location;
        if (!location)
            throw new NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 3" });

        // const paso4 = 
        await node.helpers.httpRequest({
            url: location,
            headers: {
                "Cookie": [
                    "JSESSIONID=" + jsess,
                    "ORA_OTD_JROUTE=" + jroute,
                    "pasystem_timezone_ok=true",
                ].join("; ")
            }
        });

        staticData.headers = { JSESSIONID: jsess, ORA_OTD_JROUTE: jroute };
    }

    return staticData.headers as IStaticDataHeaders;
}

export async function getAVEndpoint(node: IPollFunctions, endpoint: string, credentials: UmCreds): Promise<IDataObject | IDataObject[]> {
    const tokens = await getUmTokens(node, credentials);

    return await node.helpers.httpRequest({
        url: "https://aulavirtual.um.es/api/" + endpoint.replace(/^\/+/, ""),
        headers: {
            "Cookie": [
                "JSESSIONID=" + tokens.JSESSIONID,
                "ORA_OTD_JROUTE=" + tokens.ORA_OTD_JROUTE,
                "pasystem_timezone_ok=true",
            ].join("; ")
        },
    });
}

type ItemTipo =
    | "tarea"
    | "anuncio"
    | "examen"
    | "llamamiento";

export async function getAVInfo(node: IPollFunctions | IExecuteFunctions, credentials: UmCreds, item: ItemTipo, url: string) {
    const tokens = await getUmTokens(node, credentials);

    const headers = { "Cookie": `JSESSIONID=${tokens.JSESSIONID}; ORA_OTD_JROUTE=${tokens.ORA_OTD_JROUTE}` };

    switch (item) {
        case "tarea": {
            const tarea_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he.decode(tarea_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();

            const tarea_root = nhp.parse(clean_res);

            if (tarea_root.querySelector("div#honor-pledge-agreement")) { // Cláusula de veracidad
                const sakai_csrf = tarea_root.querySelector("[name='sakai_csrf_token']")?.getAttribute("value");
                const assignmentRef = url.match(/assignmentReference=(.*?)($|&)/)?.[1];
                const baseUrl = url.split("?")[0];
                const body = `eventSubmit_doAccept_assignment_honor_pledge=De+acuerdo&assignmentReference=${assignmentRef}&sakai_csrf_token=${sakai_csrf}`
                await node.helpers.httpRequest({
                    url: `${baseUrl}?panel=Main`,
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Type": "aaplication/x-www-form-urlencoded"
                    },
                    body,
                });
                const tarea_res2 = await node.helpers.httpRequest({ url, headers });
                const clean_res2 = he.decode(tarea_res2.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();

                const tarea_root2 = nhp.parse(clean_res2);

                const tarea = parseTarea2(tarea_root2);
                return tarea;
            } else {
                const tarea = parseTarea2(tarea_root);
                return tarea;
            }
        }
        case "anuncio": {
            const anuncio_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he.decode(anuncio_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
            return parseAnuncio(clean_res);
        }
        case "llamamiento": {
            const llamamiento_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he.decode(llamamiento_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
            const root = nhp.parse(clean_res).querySelector("div.portletBody")!;
            return parseLlamamiento(root);

        }
        case "examen": {
            // TODO: hacer fetch de examen
            return {};
        }
    }
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

export function parseTarea2(document: nhp.HTMLElement) {
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

export function parseLlamamiento(document: nhp.HTMLElement): IDataObject {
    const titulo = document.querySelector("div.page-header")?.innerText.trim();
    const mensaje = document.querySelector("div.message-body")?.innerText.trim();

    /* eslint-disable no-useless-escape */
    const fechaStr = mensaje!.match(/- Fecha: ([0-9\/]+)$/m)?.[1].trim();
    const horaStr = mensaje!.match(/- Hora: (.*?)$/m)?.[1].trim();
    const inicio = DateTime.fromFormat(`${fechaStr} ${horaStr}`, "d/M/yyyy H:mm");
    const duracion = mensaje!.match(/- Duración: (?<horas>\d+) horas( (?<minutos>\d+) minutos)? ?$/mu)?.groups as {
        horas?: string | undefined,
        minutos?: string | undefined,
    };

    let fin = DateTime.fromISO(inicio.toISO()!);
    if (duracion?.horas) fin = fin.plus({ hours: parseInt(duracion.horas) });
    if (duracion?.minutos) fin = fin.plus({ minutes: parseInt(duracion.minutos) });

    const adjuntos = document.querySelectorAll("ul.attachList li")
        .map(el => {
            const a = el.querySelector("a");
            return {
                nombre: el.innerText,
                url: a?.getAttribute("href"),
            };
        });

    return {
        titulo,
        mensaje,
        inicio,
        fin,
        duracion,
        adjuntos,
    }
}