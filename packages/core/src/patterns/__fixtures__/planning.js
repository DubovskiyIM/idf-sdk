// Минимальная фикстура planning-домена для snapshot-теста
// subcollections.structure.apply. poll_overview имеет subCollections
// = [TimeOption, Participant], но convention-based discovery также найдёт
// Vote и Meeting (оба имеют pollId) — это expected gap.

export const ontology = {
  entities: {
    Poll: {
      fields: ["id", "organizerId", "title", "status"],
      ownerField: "organizerId",
      type: "internal",
    },
    TimeOption: {
      fields: ["id", "pollId", "date", "startTime", "endTime"],
      type: "internal",
    },
    Participant: {
      fields: ["id", "pollId", "userId", "name", "status"],
      type: "internal",
    },
    Vote: {
      fields: ["id", "participantId", "optionId", "pollId", "value"],
      type: "internal",
    },
    Meeting: {
      fields: ["id", "pollId", "title", "date", "status"],
      type: "internal",
    },
  },
};

export const intents = [
  {
    id: "add_time_option",
    creates: "TimeOption",
    particles: { effects: [{ α: "add", target: "timeoptions" }] },
  },
  {
    id: "invite_participant",
    creates: "Participant",
    particles: { effects: [{ α: "add", target: "participants" }] },
  },
  {
    id: "vote_yes",
    creates: "Vote",
    particles: { effects: [{ α: "add", target: "votes" }] },
  },
];

export const projections = {
  poll_overview: {
    name: "Опрос",
    kind: "detail",
    mainEntity: "Poll",
    idParam: "pollId",
    entities: ["Poll", "TimeOption", "Vote", "Participant"],
    witnesses: ["title", "status"],
    // Автор curated: только TimeOption + Participant. Vote и Meeting
    // также имеют pollId, но они — служебные (голоса — детали Participant,
    // Meeting — артефакт после подтверждения). Apply должен уважать этот выбор.
    subCollections: [
      { collection: "timeoptions", entity: "TimeOption", foreignKey: "pollId", title: "Варианты" },
      { collection: "participants", entity: "Participant", foreignKey: "pollId", title: "Участники" },
    ],
    __originalSectionIds: ["timeoptions", "participants"],
  },
};
