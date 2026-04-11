"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.regex_adjuntos = exports.td = void 0;
exports.extraerCampo = extraerCampo;
exports.keys = keys;
exports.parseTarea = parseTarea;
exports.parseAnuncio = parseAnuncio;
const luxon_1 = require("luxon");
const types_1 = require("./types");
const turndown_1 = __importDefault(require("turndown"));
const node_html_parser_1 = __importDefault(require("node-html-parser"));
exports.td = new turndown_1.default({
    headingStyle: "atx",
    bulletListMarker: "-",
});
exports.regex_adjuntos = /!\[.*?\]\(.*?\) *\[(.*?)\]\((.*?)\)/gms;
function extraerCampo(html, nombreCampo) {
    const regex = new RegExp(`<th>\\s*${nombreCampo}\\s*<\\/th>\\s*<td[^>]*>(.*?)<\\/td>`, 'is');
    const match = html.match(regex);
    if (!match)
        return null;
    return match[1].replace(/<[^>]+>/g, '').trim();
}
function keys(o) {
    return Object.keys(o);
}
function parseTarea(html) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let result = {};
    if (node_html_parser_1.default.parse(html).querySelectorAll("div.container-fluid").length > 1) {
        const root = node_html_parser_1.default.parse(html).querySelectorAll("div.container-fluid").at(-1);
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
                adjuntos: [...desc.matchAll(exports.regex_adjuntos)].map(m => ({ nombre: m[1], url: m[2] })),
                informacion: desc.split(/\n+/)[0],
                tipo: "A2"
            };
        }
    }
    else {
        const root = node_html_parser_1.default.parse(html).querySelector("div#StudentAssignmentCurrent");
        const info = (_h = root === null || root === void 0 ? void 0 : root.querySelector("table")) === null || _h === void 0 ? void 0 : _h.querySelectorAll("tr").map(el => [el.querySelector("th").innerText.trim(), el.querySelector("td").innerText.trim()]).reduce((o, x) => { o[x[0]] = x[1]; return o; }, {});
        const desc = root === null || root === void 0 ? void 0 : root.querySelectorAll("h4").map(el => exports.td.turndown(el.nextElementSibling.innerHTML));
        const instrucciones = (_j = desc === null || desc === void 0 ? void 0 : desc[0]) !== null && _j !== void 0 ? _j : "";
        const adjuntos = desc ? desc[1] + desc[2] : "";
        result = {
            ...result,
            info,
            instrucciones,
            adjuntos: (_k = [...adjuntos.matchAll(exports.regex_adjuntos)]) === null || _k === void 0 ? void 0 : _k.map(m => ({ nombre: m[1], url: m[2] })),
            tipo: "B"
        };
    }
    return result;
}
function parseAnuncio(html) {
    var _a, _b, _c;
    const root = node_html_parser_1.default.parse(html).querySelector("div.portletBody");
    const result = {};
    if (root.querySelector("div>div.textPanel")) {
        result.contenido = exports.td.turndown((_a = root.querySelector("div>div.textPanel")) === null || _a === void 0 ? void 0 : _a.innerHTML).replace(/\n{2,}/g, "\n");
    }
    else if (root.querySelector("div.message-body")) {
        result.contenido = exports.td.turndown((_b = root.querySelector("div.message-body")) === null || _b === void 0 ? void 0 : _b.innerHTML).replace(/\n{2,}/g, "\n");
    }
    if (root.querySelector("ul.attachList")) {
        result.adjuntos = (_c = [...exports.td.turndown(root.querySelector("ul.attachList").innerHTML).matchAll(exports.regex_adjuntos)]) === null || _c === void 0 ? void 0 : _c.map(m => ({ nombre: m[1], url: m[2] }));
    }
    return result;
}
//# sourceMappingURL=utils.js.map