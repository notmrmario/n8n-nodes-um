"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroNovedades = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class FiltroNovedades {
    constructor() {
        this.description = {
            displayName: 'Filtro Novedades',
            name: 'filtroNovedades',
            icon: "file:../av.svg",
            group: ["input", "output"],
            version: 1,
            subtitle: '={{$parameter["endpoint"]}}',
            description: 'Interact with the Um API',
            defaults: {
                name: 'Filtro Novedades',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            properties: [
                {
                    displayName: "Tipo De Evento",
                    name: "tipo_evento",
                    default: undefined,
                    type: "options",
                    required: true,
                    hint: "Un campo que sea único para cada objeto",
                    options: [
                        { name: "Notificaciones", value: "notificaciones" },
                        { name: "Tareas", value: "tareas" },
                    ]
                }
            ],
        };
    }
    async execute() {
        var _a, _b;
        const evento = this.getNodeParameter("tipo_evento", 0);
        const staticData = this.getWorkflowStaticData("node");
        switch (evento) {
            case 'notificaciones': {
                const items = this.getInputData();
                const lastSeenId = (_a = staticData.lastSeenId) !== null && _a !== void 0 ? _a : null;
                const notisNuevas = lastSeenId === null
                    ? []
                    : items.filter(i => i.json.id > lastSeenId);
                if (notisNuevas.length > 0)
                    staticData.lastSeenId = Math.max(...items.map(i => i.json.id));
                return [notisNuevas.map(n => ({ json: n }))];
            }
            case 'tareas': {
                const items = this.getInputData();
                const seenIds = new Set((_b = staticData.seenIds) !== null && _b !== void 0 ? _b : []);
                if (seenIds.size == 0) {
                    staticData.seenIds = new Set([...items.map(i => i.json.url)]);
                    return [[]];
                }
                else {
                    const tareasNuevas = [];
                    for (const item of items) {
                        if (!seenIds.has(item.json.url)) {
                            seenIds.add(item.json.url);
                            tareasNuevas.push(item);
                        }
                    }
                    return [tareasNuevas];
                }
            }
        }
    }
}
exports.FiltroNovedades = FiltroNovedades;
//# sourceMappingURL=FiltroNovedades.node.js.map