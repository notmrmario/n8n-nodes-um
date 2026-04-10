import { INodeExecutionData, IPollFunctions, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
export declare class UmTokens implements INodeType {
    description: INodeTypeDescription;
    poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
}
