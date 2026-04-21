import { createVoiceHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createVoiceHandler({ ontology });
