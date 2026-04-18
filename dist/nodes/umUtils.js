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
exports.notiEventType = exports.inactiveStaticData = void 0;
exports.getUmTokens = getUmTokens;
exports.getAVEndpoint = getAVEndpoint;
exports.getAVInfo = getAVInfo;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
const he_1 = __importDefault(require("he"));
const nhp = __importStar(require("node-html-parser"));
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
            const clean_res = he_1.default.decode(tarea_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
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
                        "Content-Type": "aaplication/x-www-form-urlencoded"
                    },
                    body,
                });
                const tarea_res2 = await node.helpers.httpRequest({ url, headers });
                const clean_res2 = he_1.default.decode(tarea_res2.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
                const tarea_root2 = nhp.parse(clean_res2);
                const tarea = (0, utils_1.parseTarea2)(tarea_root2);
                return tarea;
            }
            else {
                const tarea = (0, utils_1.parseTarea2)(tarea_root);
                return tarea;
            }
        }
        case "anuncio": {
            const anuncio_res = await node.helpers.httpRequest({ url, headers });
            const clean_res = he_1.default.decode(anuncio_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
            return (0, utils_1.parseAnuncio)(clean_res);
        }
        case "examen": {
            return {};
        }
    }
}
//# sourceMappingURL=umUtils.js.map