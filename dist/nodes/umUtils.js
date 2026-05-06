"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notiEventType = exports.inactiveStaticData = exports.td = void 0;
exports.getUmTokens = getUmTokens;
exports.getAVEndpoint = getAVEndpoint;
exports.getAVInfo = getAVInfo;
exports.parseTarea = parseTarea;
exports.parseTarea2 = parseTarea2;
exports.parseAnuncio = parseAnuncio;
exports.parseLlamamiento = parseLlamamiento;
const n8n_workflow_1 = require("n8n-workflow");
const types_1 = require("./types");
const utils_1 = require("./utils");
const he_1 = __importDefault(require("he"));
const nhp = __importStar(require("node-html-parser"));
const luxon_1 = require("luxon");
const turndown_1 = __importDefault(require("turndown"));
exports.td = new turndown_1.default({
    headingStyle: "atx",
    bulletListMarker: "-",
});
exports.inactiveStaticData = {};
exports.notiEventType = {
    "nueva_tarea": ["asn.new.assignment", "asn.available.assignment"],
    "nota_tarea": ["asn.grade.submission"],
    "cambio_acceso_tarea": ["asn.revise.access"],
    "nuevo_examen": ["sam.assessment.available"],
    "examen_modificado": ["sam.assessment.update"],
    "nuevo_anuncio": ["annc.available.announcement", "annc.new"],
    "anuncio_modificado": ["annc.revise"]
};
async function getUmTokens(node, credentials) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const staticData = node.getWorkflow().active ? node.getWorkflowStaticData("global") : exports.inactiveStaticData;
    let test_res = { statusCode: 0 };
    if (staticData.headers)
        test_res = await node.helpers.httpRequest({
            url: "https://aulavirtual.um.es/api/users/me/notifications",
            headers: {
                "Cookie": [
                    "JSESSIONID=" + ((_a = staticData.headers) === null || _a === void 0 ? void 0 : _a.JSESSIONID),
                    "ORA_OTD_JROUTE=" + ((_b = staticData.headers) === null || _b === void 0 ? void 0 : _b.ORA_OTD_JROUTE),
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
        const [jsess_header, jroute_header] = [
            paso0.headers["set-cookie"].find((h) => h.startsWith("JSESSIONID=")),
            paso0.headers["set-cookie"].find((h) => h.startsWith("ORA_OTD_JROUTE=")),
        ];
        if (!jsess_header || !jroute_header)
            throw new n8n_workflow_1.NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 0" });
        ;
        const jsess = (_c = jsess_header.match(/JSESSIONID=(.*?);/iu)) === null || _c === void 0 ? void 0 : _c[1];
        const jroute = (_d = jroute_header.match(/ORA_OTD_JROUTE=(.*?);/iu)) === null || _d === void 0 ? void 0 : _d[1];
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
            (_f = (_e = paso1_content.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/iu)) === null || _e === void 0 ? void 0 : _e.groups) === null || _f === void 0 ? void 0 : _f.execution,
            (_h = (_g = paso1_content.match(/AlteonP=(?<AlteonP>.*?);/iu)) === null || _g === void 0 ? void 0 : _g.groups) === null || _h === void 0 ? void 0 : _h.AlteonP,
        ];
        if (!execution1 || !AlteonP)
            throw new n8n_workflow_1.NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 1" });
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
        const execution2 = (_l = (_k = (_j = paso2.body) === null || _j === void 0 ? void 0 : _j.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/isu)) === null || _k === void 0 ? void 0 : _k.groups) === null || _l === void 0 ? void 0 : _l.execution;
        if (!execution2)
            throw new n8n_workflow_1.NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 2" });
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
        const location = (_m = paso3 === null || paso3 === void 0 ? void 0 : paso3.headers) === null || _m === void 0 ? void 0 : _m.location;
        if (!location)
            throw new n8n_workflow_1.NodeApiError(node.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 3" });
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
    return staticData.headers;
}
async function getAVEndpoint(node, endpoint, credentials) {
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
async function getAVInfo(node, credentials, item, url) {
    var _a, _b;
    const tokens = await getUmTokens(node, credentials);
    const headers = { "Cookie": `JSESSIONID=${tokens.JSESSIONID}; ORA_OTD_JROUTE=${tokens.ORA_OTD_JROUTE}` };
    switch (item) {
        case "tarea": {
            const tarea_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he_1.default.decode(tarea_res.replace(/<script.*?<\/script>/gsi, "").replace(/\r|\n|\t/g, "")).trim();
            const tarea_root = nhp.parse(clean_res);
            if (tarea_root.querySelector("div#honor-pledge-agreement")) {
                const sakai_csrf = (_a = tarea_root.querySelector("[name='sakai_csrf_token']")) === null || _a === void 0 ? void 0 : _a.getAttribute("value");
                const assignmentRef = (_b = url.match(/assignmentReference=(.*?)($|&)/)) === null || _b === void 0 ? void 0 : _b[1];
                const baseUrl = url.split("?")[0];
                const body = `eventSubmit_doAccept_assignment_honor_pledge=De+acuerdo&assignmentReference=${assignmentRef}&sakai_csrf_token=${sakai_csrf}`;
                await node.helpers.httpRequest({
                    url: `${baseUrl}?panel=Main`,
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body,
                    returnFullResponse: true,
                });
                const tarea_res2 = await node.helpers.httpRequest({ url, headers });
                const clean_res2 = he_1.default.decode(tarea_res2.replace(/<script.*?<\/script>/gsi, "").replace(/\r|\n|\t/g, "")).trim();
                const tarea_root2 = nhp.parse(clean_res2);
                const tarea = { ...parseTarea2(tarea_root2) };
                return tarea;
            }
            else {
                const tarea = { ...parseTarea2(tarea_root) };
                return tarea;
            }
        }
        case "anuncio": {
            const anuncio_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he_1.default.decode(anuncio_res.replace(/<script.*?<\/script>/gsi, "").replace(/\r|\n|\t/g, "")).trim();
            return parseAnuncio(clean_res);
        }
        case "llamamiento": {
            const llamamiento_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he_1.default.decode(llamamiento_res.replace(/<script.*?<\/script>/gsi, "").replace(/\r|\n|\t/g, "")).trim();
            const root = nhp.parse(clean_res).querySelector("div.portletBody");
            return parseLlamamiento(root);
        }
        case "examen": {
            return {};
        }
    }
}
function parseTarea(html) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let result = {};
    if (!nhp.parse(html).querySelector("div.portletBody.container-fluid")) {
        const root = nhp.parse(html).querySelector("div.portletBody.container-fluid");
        const conf = exports.td.turndown((_a = root === null || root === void 0 ? void 0 : root.querySelector("div>div>dl")) === null || _a === void 0 ? void 0 : _a.innerHTML);
        if (root === null || root === void 0 ? void 0 : root.querySelector("p.instruction")) {
            const desc = exports.td.turndown((_b = root === null || root === void 0 ? void 0 : root.querySelector("div>p")) === null || _b === void 0 ? void 0 : _b.innerHTML);
            result = {
                ...result,
                creado_por: (_c = /Creado por:\n+([^\n]*)/si.exec(conf)) === null || _c === void 0 ? void 0 : _c[1],
                inicio: luxon_1.DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat, { locale: "es" }),
                fin: luxon_1.DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat, { locale: "es" }),
                calificacion: (_d = /Calificación\n+([^\n]*)/siu.exec(conf)) === null || _d === void 0 ? void 0 : _d[1],
                informacion: desc.split(/\n+/)[0],
                tipo: "A1"
            };
        }
        else {
            const desc = exports.td.turndown((_e = root === null || root === void 0 ? void 0 : root.querySelector("div>:has(div>ul)")) === null || _e === void 0 ? void 0 : _e.innerHTML);
            result = {
                ...result,
                creado_por: (_f = /Creado por:\n+([^\n]*)/si.exec(conf)) === null || _f === void 0 ? void 0 : _f[1],
                inicio: luxon_1.DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat, { locale: "es" }),
                fin: luxon_1.DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat, { locale: "es" }),
                calificacion: (_g = /Calificación\n+([^\n]*)/siu.exec(conf)) === null || _g === void 0 ? void 0 : _g[1],
                adjuntos: [...desc.matchAll(utils_1.regex_adjuntos)].map(m => ({ nombre: m[1], url: m[2] })),
                informacion: desc.split(/\n+/)[0],
                tipo: "A2"
            };
        }
    }
    else {
        const root = nhp.parse(html).querySelector("div#StudentAssignmentCurrent");
        const info = (_h = root === null || root === void 0 ? void 0 : root.querySelector("table")) === null || _h === void 0 ? void 0 : _h.querySelectorAll("tr").map(el => [el.querySelector("th").innerText.trim(), el.querySelector("td").innerText.trim()]).reduce((o, x) => { o[x[0]] = x[1]; return o; }, {});
        const desc = root === null || root === void 0 ? void 0 : root.querySelectorAll("h4").map(el => exports.td.turndown(el.nextElementSibling.innerHTML));
        const instrucciones = (_j = desc === null || desc === void 0 ? void 0 : desc[0]) !== null && _j !== void 0 ? _j : "";
        const adjuntos = desc ? desc[1] + desc[2] : "";
        result = {
            ...result,
            info,
            instrucciones,
            adjuntos: (_k = [...adjuntos.matchAll(utils_1.regex_adjuntos)]) === null || _k === void 0 ? void 0 : _k.map(m => ({ nombre: m[1], url: m[2] })),
            tipo: "B"
        };
    }
    return result;
}
function parseTarea2(document) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (document.querySelector("div:has(>div#StudentAssignmentCurrent>table)")) {
        const root = document.querySelector("div:has(>div#StudentAssignmentCurrent>table)");
        const titulo = (_a = root.querySelector("h3")) === null || _a === void 0 ? void 0 : _a.innerText.trim();
        const cabecera = root.querySelectorAll("div#StudentAssignmentCurrent>table tr")
            .reduce((o, el) => {
            if (el.querySelector("th")) {
                const tryDate = luxon_1.DateTime.fromFormat(el.querySelector("td").innerText.trim(), types_1.dateFormat, { locale: "es" });
                if (tryDate.isValid)
                    o[el.querySelector("th").innerText.trim()] = tryDate.toString();
                else
                    o[el.querySelector("th").innerText.trim()] = el.querySelector("td").innerText.trim();
            }
            return o;
        }, {});
        const [instruccionesEl, adjuntosEnviadosEl] = root.querySelectorAll("div.textPanel.borderPanel");
        const instrucciones = exports.td.turndown(instruccionesEl === null || instruccionesEl === void 0 ? void 0 : instruccionesEl.innerHTML);
        const adjuntosEnviados = adjuntosEnviadosEl === null || adjuntosEnviadosEl === void 0 ? void 0 : adjuntosEnviadosEl.querySelectorAll("li").map(el => { var _a; return [el.innerText.trim().replace(/ {2,}/g, " "), (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href")]; });
        const recursosTarea = ((_b = root.querySelector(":has(>h4) > p")) === null || _b === void 0 ? void 0 : _b.innerText.trim()) == "No hay adjuntos todavía" ?
            null :
            root.querySelectorAll("ul:has(~ hr.itemSeparator) li")
                .map(el => { var _a; return [el.innerText.trim().replace(/ {2,}/g, " "), (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href")]; });
        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            adjuntosEnviados,
            estado: "entregada",
        };
    }
    else if (document.querySelector("div:has(>div#StudentAssignmentCurrent>div)")) {
        const root = document.querySelector("div:has(>div#StudentAssignmentCurrent>div)");
        const titulo = (_c = root.querySelector("h3")) === null || _c === void 0 ? void 0 : _c.innerText.trim();
        const cabecera = root.querySelectorAll("div#StudentAssignmentCurrent div.row")
            .reduce((o, el) => {
            if (el.querySelector("div.itemSummaryHeader")) {
                const tryDate = luxon_1.DateTime.fromFormat(el.querySelector("div.itemSummaryValue").innerText.trim(), types_1.dateFormat, { locale: "es" });
                if (tryDate.isValid)
                    o[el.querySelector("div.itemSummaryHeader").innerText.trim()] = tryDate.toString();
                else
                    o[el.querySelector("div.itemSummaryHeader").innerText.trim()] = el.querySelector("div.itemSummaryValue").innerText.trim();
            }
            return o;
        }, {});
        const instruccionesEl = (_d = root.querySelectorAll("div.textPanel")) === null || _d === void 0 ? void 0 : _d[0];
        const instrucciones = instruccionesEl ? exports.td.turndown(instruccionesEl.innerHTML) : null;
        const recursosTarea = ((_e = root.querySelector(":has(>h4) > p")) === null || _e === void 0 ? void 0 : _e.innerText.trim()) == "No hay adjuntos todavía" ?
            null :
            root.querySelectorAll("ul li")
                .map(el => { var _a; return [el.innerText.trim().replace(/ {2,}/g, " "), (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href")]; });
        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            estado: "no entregada",
        };
    }
    else if (((_f = document.querySelectorAll("div.container-fluid")) === null || _f === void 0 ? void 0 : _f.length) > 1) {
        const root = document.querySelectorAll("div.container-fluid").at(-1);
        const titulo = (_g = root.querySelector("p")) === null || _g === void 0 ? void 0 : _g.innerText.replace(/.*?"(.*?)".*/g, "$1");
        const tablaCabecera = [root.querySelectorAll("dl.row dt"), root.querySelectorAll("dl.row dd")];
        const cabecera = {};
        for (let i = 0; i < tablaCabecera[0].length; i++) {
            const tryDate = luxon_1.DateTime.fromFormat(tablaCabecera[1][i].innerText.trim(), types_1.dateFormat, { locale: "es" });
            if (tryDate.isValid)
                cabecera[tablaCabecera[0][i].innerText.trim()] = tryDate.toString();
            else
                cabecera[tablaCabecera[0][i].innerText.trim()] = tablaCabecera[1][i].innerText.trim();
        }
        const instruccionesRecursosEl = root.querySelector("div:has(+ hr)");
        const instrucciones = instruccionesRecursosEl ? exports.td.turndown(instruccionesRecursosEl.innerText) : null;
        const recursosTarea = ((_h = instruccionesRecursosEl === null || instruccionesRecursosEl === void 0 ? void 0 : instruccionesRecursosEl.querySelector(":has(>h4) > p")) === null || _h === void 0 ? void 0 : _h.innerText.trim()) == "No hay adjuntos todavía" ?
            [] :
            (_j = root.querySelector("ul")) === null || _j === void 0 ? void 0 : _j.children.map(el => { var _a; return [el.innerText.trim().replace(/ {2,}/g, " "), (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.getAttribute("href")]; });
        return {
            titulo,
            cabecera,
            instrucciones,
            recursosTarea,
            estado: "no entregable",
        };
    }
    else
        return {
            error: "tipo (formato) de tarea desconocido"
        };
}
function parseAnuncio(html) {
    var _a, _b, _c;
    const root = nhp.parse(html).querySelector("div.portletBody");
    const result = {};
    if (root.querySelector("div>div.textPanel")) {
        result.contenido = exports.td.turndown((_a = root.querySelector("div>div.textPanel")) === null || _a === void 0 ? void 0 : _a.innerHTML).replace(/\n{2,}/g, "\n");
    }
    else if (root.querySelector("div.message-body")) {
        result.contenido = exports.td.turndown((_b = root.querySelector("div.message-body")) === null || _b === void 0 ? void 0 : _b.innerHTML).replace(/\n{2,}/g, "\n");
    }
    if (root.querySelector("ul.attachList")) {
        result.adjuntos = (_c = [...exports.td.turndown(root.querySelector("ul.attachList").innerHTML).matchAll(utils_1.regex_adjuntos)]) === null || _c === void 0 ? void 0 : _c.map(m => ({ nombre: m[1], url: m[2] }));
    }
    return result;
}
function parseLlamamiento(document) {
    var _a, _b, _c, _d, _e;
    const titulo = (_a = document.querySelector("div.page-header")) === null || _a === void 0 ? void 0 : _a.innerText.trim();
    const mensaje = (_b = document.querySelector("div.message-body")) === null || _b === void 0 ? void 0 : _b.innerText.trim();
    const fechaStr = (_c = mensaje === null || mensaje === void 0 ? void 0 : mensaje.match(/- Fecha: ([0-9\/]+)$/m)) === null || _c === void 0 ? void 0 : _c[1].trim();
    const horaStr = (_d = mensaje === null || mensaje === void 0 ? void 0 : mensaje.match(/- Hora: (.*?)$/m)) === null || _d === void 0 ? void 0 : _d[1].trim();
    const inicio = luxon_1.DateTime.fromFormat(`${fechaStr} ${horaStr}`, "d/M/yyyy H:mm");
    const duracion = (_e = mensaje === null || mensaje === void 0 ? void 0 : mensaje.match(/- Duración: (?<horas>\d+) horas( (?<minutos>\d+) minutos)? ?$/mu)) === null || _e === void 0 ? void 0 : _e.groups;
    let fin = luxon_1.DateTime.fromISO(inicio.toISO());
    if (duracion === null || duracion === void 0 ? void 0 : duracion.horas)
        fin = fin.plus({ hours: parseInt(duracion.horas) });
    if (duracion === null || duracion === void 0 ? void 0 : duracion.minutos)
        fin = fin.plus({ minutes: parseInt(duracion.minutos) });
    const adjuntos = document.querySelectorAll("ul.attachList li")
        .map(el => {
        const a = el.querySelector("a");
        return {
            nombre: el.innerText,
            url: a === null || a === void 0 ? void 0 : a.getAttribute("href"),
        };
    });
    return {
        titulo,
        mensaje,
        inicio,
        fin,
        duracion,
        adjuntos,
    };
}
//# sourceMappingURL=umUtils.js.map