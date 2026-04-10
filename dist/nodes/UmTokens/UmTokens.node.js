"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UmTokens = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class UmTokens {
    constructor() {
        this.description = {
            displayName: 'Tokens AV',
            name: 'umTokens',
            icon: "file:../av.svg",
            group: ["trigger", "schedule"],
            credentials: [{ name: "umApi", required: true }],
            version: 1,
            description: 'Interactuar con la API del AulaVirtual',
            defaults: {
                name: 'Tokens AV',
            },
            usableAsTool: true,
            polling: true,
            inputs: [],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            properties: [],
        };
    }
    async poll() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const credentials = await this.getCredentials("umApi");
        const paso0 = await this.helpers.httpRequest({
            url: "https://aulavirtual.um.es/portal",
            returnFullResponse: true,
        });
        const [jsess_header, jroute_header] = [
            paso0.headers["set-cookie"].find((h) => h.startsWith("JSESSIONID=")),
            paso0.headers["set-cookie"].find((h) => h.startsWith("ORA_OTD_JROUTE=")),
        ];
        if (!jsess_header || !jroute_header)
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 0" });
        ;
        const jsess = (_a = jsess_header.match(/JSESSIONID=(.*?);/iu)) === null || _a === void 0 ? void 0 : _a[1];
        const jroute = (_b = jroute_header.match(/ORA_OTD_JROUTE=(.*?);/iu)) === null || _b === void 0 ? void 0 : _b[1];
        const paso1 = await this.helpers.httpRequest({
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
            (_d = (_c = paso1_content.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/iu)) === null || _c === void 0 ? void 0 : _c.groups) === null || _d === void 0 ? void 0 : _d.execution,
            (_f = (_e = paso1_content.match(/AlteonP=(?<AlteonP>.*?);/iu)) === null || _e === void 0 ? void 0 : _e.groups) === null || _f === void 0 ? void 0 : _f.AlteonP,
        ];
        if (!execution1 || !AlteonP)
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 1" });
        const paso2 = await this.helpers.httpRequest({
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
        const execution2 = (_j = (_h = (_g = paso2.body) === null || _g === void 0 ? void 0 : _g.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/isu)) === null || _h === void 0 ? void 0 : _h.groups) === null || _j === void 0 ? void 0 : _j.execution;
        if (!execution2)
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 2" });
        const paso3 = await this.helpers.httpRequest({
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
        const location = (_k = paso3 === null || paso3 === void 0 ? void 0 : paso3.headers) === null || _k === void 0 ? void 0 : _k.location;
        if (!location)
            throw new n8n_workflow_1.NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 3" });
        await this.helpers.httpRequest({
            url: location,
            headers: {
                "Cookie": [
                    "JSESSIONID=" + jsess,
                    "ORA_OTD_JROUTE=" + jroute,
                    "pasystem_timezone_ok=true",
                ].join("; ")
            }
        });
        return [[{ json: { JSESSIONID: jsess, ORA_OTD_JROUTE: jroute } }]];
    }
}
exports.UmTokens = UmTokens;
//# sourceMappingURL=UmTokens.node.js.map