import {inject, injectable} from "inversify";
import {ChatUserstate, Client} from "tmi.js";
import {Types} from "./Container/Types";
import container from "./Container/Inversify.config";
import {TtsService} from "./Tts/TtsService";
import {MessageProcessor} from "./Tts/MessageProcessor";

@injectable()
export class Bot {

	@inject(Types.Client)
	private _client: Client;

	@inject(Types.MessageProcessor)
	public messageProcessor: MessageProcessor;

	async initiate() {
		this._client.connect().catch(error => console.error(error));

		this._client.on("message",
			(channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
				if (self) return;

				if (userstate["message-type"] !== "chat") {
					console.log(userstate, message);
					return;
				}

				const tts = container.get<TtsService>(Types.TtsService);
				tts.handle(userstate, message)
					.then(() => {
						console.log("Incoming tts message from " + userstate.username);
					})
					.catch(error => console.error(error));
			}
		);
	}

}
