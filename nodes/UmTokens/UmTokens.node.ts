/* eslint-disable @n8n/community-nodes/no-http-request-with-manual-auth */

import { INodeExecutionData, IPollFunctions, NodeApiError, NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { UmCreds } from '../../credentials/UmApi.credentials';

export class UmTokens implements INodeType {
	description: INodeTypeDescription = {
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
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials: UmCreds = await this.getCredentials("umApi");

		const paso0 = await this.helpers.httpRequest({
			url: "https://aulavirtual.um.es/portal",
			returnFullResponse: true,
		});
		const [jsess_header, jroute_header]: (string | undefined)[] = [
			paso0.headers["set-cookie"].find((h: string) => h.startsWith("JSESSIONID=")),
			paso0.headers["set-cookie"].find((h: string) => h.startsWith("ORA_OTD_JROUTE=")),
		];

		if (!jsess_header || !jroute_header)
			throw new NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 0" });;

		const jsess = jsess_header.match(/JSESSIONID=(.*?);/iu)?.[1];
		const jroute = jroute_header.match(/ORA_OTD_JROUTE=(.*?);/iu)?.[1];

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
			paso1_content.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/iu)?.groups?.execution,
			paso1_content.match(/AlteonP=(?<AlteonP>.*?);/iu)?.groups?.AlteonP,
		];
		if (!execution1 || !AlteonP)
			throw new NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 1" });

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
		const execution2 = (paso2.body as string)
			?.match(/<input.*?name="execution".*?value="(?<execution>.*?)"/isu)
			?.groups?.execution;
		if (!execution2)
			throw new NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 2" });

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
		const location = paso3?.headers?.location;
		if (!location)
			throw new NodeApiError(this.getNode(), {}, { message: "No se han podido obtener los headers necesarios. paso 3" });

		// const paso4 = 
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