// Минимальная фикстура reflect: entry_detail (MoodEntry) + hypothesis_detail.
// EntryActivity/EntryTag — m2m-assignment; HypothesisEvidence — child.

export const ontology = {
  entities: {
    User: {
      ownerField: "id",
      fields: { id: { type: "text" } },
    },
    MoodEntry: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        pleasantness: { type: "number" },
        energy: { type: "number" },
        note: { type: "textarea" },
      },
    },
    Activity: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        name: { type: "text" },
      },
    },
    EntryActivity: {
      kind: "assignment",
      fields: {
        id: { type: "text" },
        entryId: { type: "text" },
        activityId: { type: "text" },
      },
    },
    Tag: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        name: { type: "text" },
      },
    },
    EntryTag: {
      kind: "assignment",
      fields: {
        id: { type: "text" },
        entryId: { type: "text" },
        tagId: { type: "text" },
      },
    },
    Hypothesis: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        title: { type: "text" },
        status: { type: "select" },
      },
    },
    HypothesisEvidence: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        hypothesisId: { type: "text" },
        userId: { type: "text" },
        direction: { type: "select" },
      },
    },
  },
};

export const intents = [
  {
    id: "attach_activity",
    creates: "EntryActivity",
    particles: { effects: [{ α: "add", target: "entryactivities" }] },
  },
  {
    id: "attach_tag",
    creates: "EntryTag",
    particles: { effects: [{ α: "add", target: "entrytags" }] },
  },
  {
    id: "add_evidence",
    creates: "HypothesisEvidence",
    particles: { effects: [{ α: "add", target: "hypothesisevidences" }] },
  },
];

export const projections = {
  entry_detail: {
    name: "Запись",
    kind: "detail",
    mainEntity: "MoodEntry",
    idParam: "entryId",
    entities: ["MoodEntry", "Activity", "EntryActivity", "Tag", "EntryTag"],
    witnesses: ["pleasantness", "energy", "note"],
    // Оригинальные subCollections использовали entryId как foreignKey.
    // mainEntity=MoodEntry → convention fkField = "moodentryId" (!) — mismatch.
    __originalSectionIds: ["entryactivities", "entrytags"],
  },
  hypothesis_detail: {
    name: "Гипотеза",
    kind: "detail",
    mainEntity: "Hypothesis",
    idParam: "hypothesisId",
    entities: ["Hypothesis", "HypothesisEvidence", "Activity"],
    witnesses: ["title", "status"],
    __originalSectionIds: ["hypothesisevidences"],
  },
};
