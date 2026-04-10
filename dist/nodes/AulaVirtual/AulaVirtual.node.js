"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AulaVirtual = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const types_1 = require("../types");
const luxon_1 = require("luxon");
const he_1 = __importDefault(require("he"));
const utils_1 = require("../utils");
class AulaVirtual {
    constructor() {
        this.description = {
            displayName: 'AulaVirtual API',
            name: 'aulaVirtual',
            icon: "file:../av.svg",
            group: ["input", "output"],
            version: 1,
            subtitle: '={{$parameter["endpoint"]}}',
            description: 'Interact with the Um API',
            defaults: {
                name: 'AulaVirtual API',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            properties: [
                {
                    displayName: "Token JSESSIONID",
                    name: "JSESSIONID",
                    type: "string",
                    default: "",
                    required: true,
                    hint: "Token JSESSIONID activo",
                },
                {
                    displayName: "Token ORA_OTD_JROUTE",
                    name: "ORA_OTD_JROUTE",
                    type: "string",
                    default: "",
                    required: true,
                    hint: "Token ORA_OTD_JROUTE activo",
                },
                {
                    displayName: "Endpoint",
                    name: "endpoint",
                    type: "options",
                    default: undefined,
                    options: [
                        { name: "Herramientas Del Sitio", value: "herramientas" },
                        { name: "Notificaciones", value: "notificaciones" },
                        { name: "Sitios", value: "sitios" },
                        { name: "Tarea Por URL", value: "tarea_url" },
                        { name: "Tareas Del Sitio", value: "tareas" },
                    ]
                },
                {
                    displayName: "ID Del Sitio",
                    name: "site_id",
                    type: "string",
                    default: "",
                    displayOptions: { show: { endpoint: ["herramientas"] } },
                    required: true,
                },
                {
                    displayName: "URL Herramienta Tareas",
                    name: "tareas_url",
                    type: "string",
                    default: "",
                    displayOptions: { show: { endpoint: ["tareas"] } },
                    required: true,
                },
                {
                    displayName: "URL De La Tarea",
                    name: "url_tarea",
                    type: "string",
                    default: "",
                    displayOptions: { show: { endpoint: ["tarea_url"] } },
                    required: true,
                },
                {
                    displayName: "URL Herramienta Exámenes",
                    name: "examenes_url",
                    type: "string",
                    default: "",
                    displayOptions: { show: { endpoint: ["examenes"] } },
                    required: true,
                },
                {
                    displayName: "Opciones",
                    type: "collection",
                    default: {},
                    name: "opciones_extra_sitio",
                    placeholder: "Añadir Opción",
                    displayOptions: { show: { endpoint: ["sitios"] } },
                    options: [
                        {
                            displayName: "Filtrar Por Nombre",
                            name: "filter_site",
                            type: "string",
                            default: "",
                            hint: "Devolver solo los sitios que contengan esto en el nombre",
                        }
                    ]
                },
            ],
        };
    }
    async execute() {
        var _a, _b, _c, _d;
        const result = [];
        for (let i = 0; i < this.getInputData().length; i++) {
            const jsess = this.getNodeParameter("JSESSIONID", i);
            const jroute = this.getNodeParameter("ORA_OTD_JROUTE", i);
            const endpoint = this.getNodeParameter("endpoint", i);
            const headers = {
                "Cookie": `JSESSIONID=${jsess}; ORA_OTD_JROUTE=${jroute}`
            };
            if (endpoint == "ninguno")
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), {}, { message: "Selecciona un endpoint." });
            switch (endpoint) {
                case 'herramientas': {
                    const sitio_id = this.getNodeParameter("site_id", i);
                    const sitios = await this.helpers.httpRequest({
                        url: "https://aulavirtual.um.es/api/users/me/sites",
                        headers,
                    });
                    const herramientas = (_a = sitios.sites.find(s => s.siteId === sitio_id)) === null || _a === void 0 ? void 0 : _a.tools.map(t => {
                        var _a, _b;
                        return ({
                            titulo: t.title,
                            url: t.url,
                            id: (_b = (_a = /tool\/(?<tool>.*?)$/gm.exec(t.url)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.tool,
                        });
                    });
                    result.push((_b = herramientas === null || herramientas === void 0 ? void 0 : herramientas.map(h => ({ json: h }))) !== null && _b !== void 0 ? _b : []);
                    break;
                }
                case 'notificaciones': {
                    const notificaciones = await this.helpers.httpRequest({
                        url: "https://aulavirtual.um.es/api/users/me/notifications",
                        headers,
                    });
                    result.push(notificaciones.map((n) => ({ json: n })));
                    break;
                }
                case 'sitios': {
                    const sitios = await this.helpers.httpRequest({
                        url: "https://aulavirtual.um.es/api/users/me/sites",
                        headers,
                    });
                    result.push(sitios.sites.map(s => ({ json: s })));
                    break;
                }
                case 'tareas': {
                    const tareas_url = this.getNodeParameter("tareas_url", i);
                    await this.helpers.httpRequest({
                        url: tareas_url.replace("tool", "tool-reset"),
                        headers,
                    });
                    const tareas_res = await this.helpers.httpRequest({
                        url: tareas_url,
                        headers,
                    });
                    const tabla_tareas = (_d = (_c = /(?<tabla_tareas><table.*?summary=".*?tareas\.">.*?<\/table>)/si.exec(tareas_res)) === null || _c === void 0 ? void 0 : _c.groups) === null || _d === void 0 ? void 0 : _d.tabla_tareas.replace(/\n|\t/g, "");
                    if (!tabla_tareas)
                        throw new n8n_workflow_1.NodeApiError(this.getNode(), {}, { message: "No se ha podido obtener la lista de tareas." });
                    const tabla_tareas_decoded = he_1.default.decode(tabla_tareas).replace(/\t|\n/g, "").replace(/"/g, "\"");
                    const titulos = [...tabla_tareas_decoded.matchAll(/<td headers=.*?"title.*?".*?>.*?<strong>.*?<a.*?href=.*?"(?<url_tarea>.*?)\\?".*?title=.*?"(?<titulo_tarea>.*?)\\?"/gs)]
                        .map(m => m.groups);
                    const estados = [...tabla_tareas_decoded.matchAll(/<td headers="status">(?<estado>.*?)<\/td>/gs)].map(m => { var _a; return (_a = m.groups) === null || _a === void 0 ? void 0 : _a.estado; });
                    const notas = [...tabla_tareas_decoded.matchAll(/<td headers="grade"><span>(?<nota>.*?)<\/span><\/td>/gs)].map(m => { var _a; return (_a = m.groups) === null || _a === void 0 ? void 0 : _a.nota; });
                    const inicios = [...tabla_tareas_decoded.matchAll(/<td headers="openDate".*?>(?<fecha_inicio>.*?)<\/td>/gs)].map(m => { var _a; return (_a = m.groups) === null || _a === void 0 ? void 0 : _a.fecha_inicio; });
                    const fines = [...tabla_tareas_decoded.matchAll(/<td headers="dueDate".*?>.*?>(?<fecha_fin>.*?)<\/span><\/td>/gs)].map(m => { var _a; return (_a = m.groups) === null || _a === void 0 ? void 0 : _a.fecha_fin; });
                    const tareas = titulos.map((t, i) => ({
                        titulo: t.titulo_tarea,
                        url: t.url_tarea,
                        estado: estados[i],
                        nota: notas[i],
                        inicio: luxon_1.DateTime.fromFormat(inicios[i], types_1.dateFormat, { locale: "es" }),
                        fin: luxon_1.DateTime.fromFormat(fines[i], types_1.dateFormat, { locale: "es" }),
                    }));
                    result.push(tareas.map(t => ({ json: t })));
                    break;
                }
                case 'tarea_url': {
                    const url_tarea = this.getNodeParameter("url_tarea", i);
                    const tarea_res = await this.helpers.httpRequest({
                        url: url_tarea,
                        headers,
                    });
                    const clean_res = he_1.default.decode(tarea_res.replace(/<script.*?<\/script>/gsi, "").replace(/\n|\t/g, "")).trim();
                    const tarea = (0, utils_1.parseTarea)(clean_res);
                    result.push([{ json: tarea }]);
                    break;
                }
            }
        }
        return result;
    }
}
exports.AulaVirtual = AulaVirtual;
//# sourceMappingURL=AulaVirtual.node.js.map