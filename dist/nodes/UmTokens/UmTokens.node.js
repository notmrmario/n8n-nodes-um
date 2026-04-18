"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UmTokens = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const umUtils_1 = require("../umUtils");
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
            builderHint: {
                relatedNodes: [
                    { nodeType: "n8n-nodes-um.avTrigger", relationHint: "Usa este nodo para recibir actualizaciones de eventos." },
                ],
            }
        };
    }
    async execute() {
        try {
            const creds = await this.getCredentials("umApi");
            const tokens = await (0, umUtils_1.getUmTokens)(this, creds);
            return [[{ json: { tokens }, pairedItem: { item: 0 } }]];
        }
        catch (e) {
            if (!this.continueOnFail())
                throw e;
            return [];
        }
    }
}
exports.UmTokens = UmTokens;
//# sourceMappingURL=UmTokens.node.js.map