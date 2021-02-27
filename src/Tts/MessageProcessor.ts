import {ChatUserstate} from "tmi.js";
import {TextModerationScreenTextResponse} from "@azure/cognitiveservices-contentmoderator/esm/models";
import {exec} from "child_process";
import {injectable} from "inversify";

export interface MessageToProcess {
	content: string;
	filePath: string;
	userstate: ChatUserstate;
	moderationResult: TextModerationScreenTextResponse;
}

@injectable()
export class MessageProcessor {

	public queuedMessages: Array<MessageToProcess> = [];

	public currentMessage: MessageToProcess | null = null;

	public addMessage(message: MessageToProcess) {
		this.queuedMessages.push(message);
	}

	public process() {
		if (this.currentMessage) {
			return;
		}

		if (!this.queuedMessages.length) {
			console.log("The queue is empty");
			return;
		}

		this.currentMessage = this.queuedMessages.shift();

		exec(`afplay ${this.currentMessage.filePath} -t 8 -v 0.5`, (error, stdout, stderror) => {
			if (error) {
				console.error(error);
			}
			console.log("out: ", stdout);
			console.log(stderror);

			this.currentMessage = null;

			this.process();
		});
	}

}
