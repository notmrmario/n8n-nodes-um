/* eslint-disable @n8n/community-nodes/no-restricted-imports */

import { IDataObject, IExecuteFunctions, IPollFunctions, NodeApiError } from "n8n-workflow";
import { IStaticDataHeaders } from "./types";
import { UmCreds } from "../credentials/UmApi.credentials";
import { parseAnuncio, parseTarea2 } from "./utils";
import he from "he";
import * as nhp from "node-html-parser";

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
    | "examen";

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
        case "examen": {
            // TODO: hacer fetch de examen
            return {};
        }
    }
}
