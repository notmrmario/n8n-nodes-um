"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regex_adjuntos = void 0;
exports.extraerCampo = extraerCampo;
exports.keys = keys;
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
//# sourceMappingURL=utils.js.map