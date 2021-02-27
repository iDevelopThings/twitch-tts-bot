import {inject, injectable} from "inversify";
import {Types} from "../Container/Types";
import {Bot} from "../Bot";
import {ChatUserstate} from "tmi.js";
import {AudioConfig, SpeechConfig, SpeechSynthesizer} from "microsoft-cognitiveservices-speech-sdk";
import {SpeechSynthesisOutputFormat, SpeechSynthesisResult} from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports";
import * as fs from "fs";
import {ContentModeratorClient} from "@azure/cognitiveservices-contentmoderator";
import {TextModerationScreenTextResponse} from "@azure/cognitiveservices-contentmoderator/esm/models";
import * as crypto from "crypto";
import * as path from "path";
import {MessageToProcess} from "./MessageProcessor";

@injectable()
export class TtsService {

	@inject(Types.Bot)
	private _bot: Bot;

	@inject(Types.SpeechConfig)
	private _speechConfig: SpeechConfig;

	@inject(Types.ContentModerator)
	private _contentModerator: ContentModeratorClient;

	public async handle(userstate: ChatUserstate, message: string) {

		this._speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;
		this._speechConfig.speechSynthesisVoiceName    = this.getRandomVoice();

		console.log("voice: " + this.getRandomVoice());

		const fileName = crypto.randomBytes(16).toString("hex") + ".mp3";
		const filePath = path.join("files", fileName);

		const audioConfig = AudioConfig.fromAudioFileOutput(filePath);
		const synthesizer = new SpeechSynthesizer(this._speechConfig, audioConfig);

		const moderationResult: TextModerationScreenTextResponse = await this.getModerationResult(message);

		if (!this.canBePlayed(moderationResult))
			return;

		try {
			await this.generateVoiceFile(synthesizer, filePath, message);

			this._bot.messageProcessor.addMessage({
				content          : message,
				filePath         : filePath,
				userstate        : userstate,
				moderationResult : moderationResult
			} as MessageToProcess);

			this._bot.messageProcessor.process();

		} catch (error) {
			console.error("Uhoh!", error);
		}
	}

	private async getModerationResult(content: string): Promise<TextModerationScreenTextResponse> {
		try {
			return await this._contentModerator
				.textModeration
				.screenText("text/plain", content, {
					classify : true
				});
		} catch (error) {
			if (error.response?.status === 429) {
				console.log("We hit rate limit... sleeping for 1s.");

				await (new Promise(resolve => setTimeout(resolve, 1000)));

				console.log("We got past the limit... trying again");
				return await this.getModerationResult(content);
			}
			throw error;
		}
	}

	private generateVoiceFile(synthesizer: SpeechSynthesizer, filePath: string, message: string) {
		return new Promise((resolve, reject) => {
			synthesizer.speakTextAsync(message,
				(response: SpeechSynthesisResult) => {
					synthesizer.close();

					if (response) {
						resolve(fs.createReadStream(filePath));
					}
					resolve(null);
				},
				(error: string) => {
					synthesizer.close();
					reject(error);
				}
			);
		});


	}

	public canBePlayed(moderationResult: TextModerationScreenTextResponse): Boolean {

		console.log(moderationResult);

		if (moderationResult.terms?.length)
			return false;

		if (moderationResult.classification?.reviewRecommended)
			return false;

		return true;
	}

	public getRandomVoice(): string {
		const voices = [
			"en-GB-LibbyNeural",
			"en-GB-MiaNeural",
			"en-GB-RyanNeural",
			"en-US-AriaNeural",
			"en-US-JennyNeural",
			"en-US-GuyNeural",
		];

		return voices[Math.floor(Math.random() * voices.length)];
	}
}
