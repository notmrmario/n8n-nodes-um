import { IExecuteFunctions, NodeOutput, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
export declare class AulaVirtual implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<NodeOutput>;
}
