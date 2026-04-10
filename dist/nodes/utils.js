"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.td = void 0;
exports.extraerCampo = extraerCampo;
exports.parseTarea = parseTarea;
exports.keys = keys;
const luxon_1 = require("luxon");
const types_1 = require("./types");
const turndown_1 = __importDefault(require("turndown"));
const node_html_parser_1 = __importDefault(require("node-html-parser"));
exports.td = new turndown_1.default({
    headingStyle: "atx",
    bulletListMarker: "-",
});
function extraerCampo(html, nombreCampo) {
    const regex = new RegExp(`<th>\\s*${nombreCampo}\\s*<\\/th>\\s*<td[^>]*>(.*?)<\\/td>`, 'is');
    const match = html.match(regex);
    if (!match)
        return null;
    return match[1].replace(/<[^>]+>/g, '').trim();
}
function parseTarea(html) {
    var _a, _b, _c, _d, _e, _f, _g;
    const regex_adjuntos = /!\[.*?\]\(.*?\) *\[(.*?)\]\((.*?)\)/gms;
    if (node_html_parser_1.default.parse(html).querySelectorAll("div.container-fluid").length > 1) {
        const root = node_html_parser_1.default.parse(html).querySelectorAll("div.container-fluid").at(-1);
        const conf = exports.td.turndown((_a = root === null || root === void 0 ? void 0 : root.querySelector("div>div>dl")) === null || _a === void 0 ? void 0 : _a.innerHTML);
        const desc = exports.td.turndown((_b = root === null || root === void 0 ? void 0 : root.querySelector("div>:has(div>ul)")) === null || _b === void 0 ? void 0 : _b.innerHTML);
        return {
            creado_por: (_c = /Creado por:\n+([^\n]*)/si.exec(conf)) === null || _c === void 0 ? void 0 : _c[1],
            inicio: luxon_1.DateTime.fromFormat(/Abierta\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat),
            fin: luxon_1.DateTime.fromFormat(/Entregar\n+([^\n]*)/si.exec(conf)[1], types_1.dateFormat),
            calificacion: (_d = /Calificación\n+([^\n]*)/siu.exec(conf)) === null || _d === void 0 ? void 0 : _d[1],
            adjuntos: [...desc.matchAll(regex_adjuntos)].map(m => ({ nombre: m[1], url: m[2] })),
            informacion: desc.split(/\n+/)[0],
            tipo: "A"
        };
    }
    else {
        const root = node_html_parser_1.default.parse(html).querySelector("div#StudentAssignmentCurrent");
        const info = (_e = root === null || root === void 0 ? void 0 : root.querySelector("table")) === null || _e === void 0 ? void 0 : _e.querySelectorAll("tr").map(el => [el.querySelector("th").innerText.trim(), el.querySelector("td").innerText.trim()]).reduce((o, x) => { o[x[0]] = x[1]; return o; }, {});
        const desc = root === null || root === void 0 ? void 0 : root.querySelectorAll("h4").map(el => exports.td.turndown(el.nextElementSibling.innerHTML));
        const instrucciones = (_f = desc === null || desc === void 0 ? void 0 : desc[0]) !== null && _f !== void 0 ? _f : "";
        const adjuntos = desc ? desc[1] + desc[2] : "";
        return {
            info,
            instrucciones,
            adjuntos: (_g = [...adjuntos.matchAll(regex_adjuntos)]) === null || _g === void 0 ? void 0 : _g.map(m => ({ nombre: m[1], url: m[2] })),
        };
    }
}
function keys(o) {
    return Object.keys(o);
}
//# sourceMappingURL=utils.js.map