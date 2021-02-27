import {config} from 'dotenv';
config();

import container from "./Container/Inversify.config";
import {Bot} from "./Bot";
import {Types} from "./Container/Types";

container.get<Bot>(Types.Bot)
	.initiate()
	.then(() => console.log("Bot is running!"))
	.catch(error => console.error(error));
