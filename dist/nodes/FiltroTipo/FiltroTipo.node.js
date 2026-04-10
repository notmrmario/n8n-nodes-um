"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroTipo = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const types_1 = require("../types");
const utils_1 = require("../utils");
class FiltroTipo {
    constructor() {
        this.description = {
            displayName: 'Filtro Tipo',
            name: 'filtroTipo',
            icon: "file:../av.svg",
            group: ["input", "output"],
            version: 1,
            subtitle: '={{$parameter["endpoint"]}}',
            description: 'Filtra notificaciones en base al tipo',
            defaults: {
                name: 'Filtro Tipo',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            properties: [
                {
                    displayName: "Tipo De Herramienta",
                    name: "herramientas",
                    type: "collection",
                    default: {},
                    placeholder: "Añadir Filtro",
                    options: (0, utils_1.keys)(types_1.SakaiToolType).map(t => ({
                        displayName: types_1.SakaiToolType[t],
                        name: t,
                        type: "boolean",
                        default: true,
                    }))
                }
            ]
        };
    }
    async execute() {
        return [
            this.getInputData()
                .filter((i, idx) => this.getNodeParameter(i.json.event, idx))
        ];
    }
}
exports.FiltroTipo = FiltroTipo;
//# sourceMappingURL=FiltroTipo.node.js.map