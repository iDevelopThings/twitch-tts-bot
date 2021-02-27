import "reflect-metadata";
import {Container} from "inversify";
import {Types} from "./Types";
import {Client} from "tmi.js";
import {Bot} from "../Bot";
import {TtsService} from "../Tts/TtsService";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {SpeechConfig} from "microsoft-cognitiveservices-speech-sdk";
import {ContentModeratorClient} from "@azure/cognitiveservices-contentmoderator";
import {CognitiveServicesCredentials} from "@azure/ms-rest-azure-js";
import {MessageProcessor} from "../Tts/MessageProcessor";

const container = new Container();

container.bind<SpeechConfig>(Types.SpeechConfig).toConstantValue(
	sdk.SpeechConfig.fromSubscription(process.env.AZURE_KEY, process.env.AZURE_LOCATION)
);

container.bind<ContentModeratorClient>(Types.ContentModerator).toConstantValue(
	new ContentModeratorClient(
		new CognitiveServicesCredentials(process.env.AZURE_CM_KEY),
		process.env.AZURE_CM_ENDPOINT
	)
);

container.bind<Bot>(Types.Bot).to(Bot).inSingletonScope();
container.bind<Client>(Types.Client).toConstantValue(
	new Client({
		options    : {debug : true, messagesLogLevel : "info"},
		connection : {
			reconnect : true,
			secure    : true
		},
		identity   : {
			username : "idevelopthings",
			password : "oauth:" + Buffer.from(process.env.ACCESS_TOKEN, "base64").toString("utf-8")
		},
		channels   : ["idevelopthings"]
	})
);


container.bind<TtsService>(Types.TtsService).to(TtsService).inSingletonScope();
container.bind<MessageProcessor>(Types.MessageProcessor).to(MessageProcessor).inSingletonScope();

export default container;
