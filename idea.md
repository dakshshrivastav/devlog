# Devlog — idea

Status: idea. No code is written yet.
Date: 2026-10-10.
Author: Daksh Shrivastav.
Working name: Devlog (placeholder).

## 1. One-line pitch

Talk through your build. Devlog turns your voice, photos and git history into real documentation: written docs, flowcharts, and notes from the point of view of a third-person observer.

## 2. Definitions

- **Capture**: the raw material from a build session. A capture is a voice memo, a video, photos, or dictated notes.
- **Transcript**: speech converted to text, with a timestamp for each word.
- **Timeline**: transcript segments, photos, video frames and git commits, sorted by time.
- **Source**: one item in the timeline. Example: `[voice 02:14]`, `[photo 3]`, `[commit a1b2c3]`.
- **Claim**: a statement in the generated docs. Example: "The relay browns out under load."
- **Gap**: something the docs need but the timeline does not contain.
- **Observer notes**: notes about the project written in the third person, as if a neutral observer watched the build. Example: "The builder replaced the relay after the first one browned out." Observer notes say who did what, and whether it was said, shown, or committed.
- **Diagram**: a flowchart or other chart of the project, written as Mermaid text. Examples: a system flowchart, a build-steps flowchart, a wiring or data-flow chart.
- **Live mode**: the user speaks, and the notes and the flowchart update while the user speaks.
- **Live note**: a very short note made from one chunk of live speech. It is the shortest text that keeps the meaning. Example: raw speech "so um the ESP32 talks to the relay on pin 5, it does not talk to the sensor directly" becomes "ESP32 → relay (pin 5). Not directly to sensor."
- **Graph op**: one small change to the flowchart, such as add a box, add an arrow, rename a box, or remove an arrow. Gemma 4 proposes graph ops as JSON. Devlog checks them and applies them.
- **Cluster**: one topic inside the flowchart. Every box belongs to one cluster. In Mermaid, a cluster is a subgraph.
- **Sidetrack**: the speaker jumps to a different topic before the first one is done.
- **Unify step**: a pass that looks for shared things between clusters and links them.

## 3. Problem

- Many builders do the work well and document it badly.
- Writing docs from a blank page is hard. Most people skip it.
- The author is one of these people. He builds hardware, software and design projects, and he cannot document them naturally.
- Bad docs make good projects hard to share, reuse or judge.

## 4. Idea

People explain things well when they talk. Devlog uses that.

1. The user builds and talks. They record voice memos or a video walkthrough, and take photos.
2. Devlog transcribes the speech.
3. Devlog reads the git history of the project.
4. Devlog places everything on one timeline.
5. Gemma 4 reads the timeline and the images. It writes the docs.
6. Gemma 4 also writes observer notes. These describe the project and the build in the third person, from outside.
7. Gemma 4 also draws diagrams as Mermaid text: a system flowchart, a build-steps flowchart, and others the timeline supports.
8. Gemma 4 lists the gaps as questions. Devlog asks them. The user answers by voice.

The user never faces a blank page. The user also learns what good docs contain, because the gap questions show what is missing.

Why a third-person observer: the author finds it hard to write about his own work. Observer notes remove that problem. The user talks naturally in the first person ("I swapped the relay"). Devlog rewrites it as an outside record ("The builder swapped the relay"). The record is also easier for a reader or judge to trust, because it separates what was said, what was shown, and what was committed.

### Live mode

Live mode is the second way to use Devlog. The user does not record first. The user just talks, and the idea appears on screen.

1. The user speaks. A speech-to-text model writes the words down as they arrive.
2. Devlog saves the full raw transcript. It never changes it.
3. Gemma 4 reads each new chunk of speech. It writes a **live note**: the shortest text that still has the same meaning.
4. Gemma 4 also proposes **graph ops** from the same chunk: new boxes, new arrows, renamed boxes. Devlog applies them to the flowchart.
5. A live view shows the notes and the flowchart growing while the user talks.
6. When the user corrects something ("no wait, it is the relay, not the sensor"), Devlog applies the correction and keeps the history.
7. When the speaker jumps to a different topic (a sidetrack), Devlog does not attach the new boxes to the old topic. Gemma 4 starts a **new cluster** in the same graph and builds the new boxes there. If the speaker later returns to an earlier topic ("anyway, back to the relay"), Gemma 4 switches back to that cluster and does not start a new one.
8. When the speaker is done, the **unify step** runs. Gemma 4 looks for unifying points between the clusters: a part that both topics use, two boxes that name the same thing, or a stated dependency. It links the clusters at those points. If two clusters have no real connection, they stay separate and Devlog asks a gap question.
9. When the session ends, the live notes and the graph history join the timeline. The documents and the observer notes can then use them.

Why this helps: the user thinks out loud, and the structure forms by itself. The user sees the idea take shape and can fix a wrong box at once by saying so.

Live notes and observer notes are different. Live notes are short fragments, written during the session. Observer notes are third-person text, written after the session from the whole timeline.

## 5. Pipeline

```
video ─► ffmpeg ─┬─► audio ─► ElevenLabs Scribe v2 ─► transcript + timestamps
                 └─► sampled frames (with timestamps)
voice memo ───────────────► ElevenLabs Scribe v2 ─► transcript + timestamps
photos (with capture time)
git log and diffs
                          │
                          ▼
                   timeline (sorted by time)
                          │
                          ▼
                       Gemma 4
                          │
                          ▼
README, devlog, observer notes, diagrams (Mermaid),
BOM, troubleshooting log, gap questions
(each section, note and diagram element lists its sources)
```

Notes:

- Gemma 4 reads text and images. Video is therefore split into audio (for speech-to-text) and frames (for Gemma).
- Frames are sampled. Devlog does not send every frame. It caps the count.
- A keyterm file (`keyterms.txt`) lists project words, such as part names and tool names. Devlog sends it to the speech-to-text step, so technical words are transcribed correctly.

Live mode pipeline:

```
microphone ─► ElevenLabs Scribe v2 Realtime ─► raw transcript chunks (saved in full)
              (or local Whisper, in short chunks)          │
                                                           ▼
                                        Gemma 4: condense + propose graph ops
                                                           │
                              ┌────────────────────────────┴──────────────┐
                              ▼                                            ▼
                  live notes (shortest form,                 graph state (boxes, arrows)
                  each linked to its raw span)                             │
                                                                           ▼
                                                      Mermaid text ─► live view (local page)
```

- Each chunk goes to Gemma 4 with the current graph and the last few live notes. Gemma 4 can then reuse existing boxes and avoid duplicates.
- Gemma 4 returns JSON: one live note (or none) and a list of graph ops.
- Devlog validates the JSON. A bad op is dropped and logged.
- Gemma 4 also receives the list of clusters and the active cluster. New boxes go into the active cluster. A sidetrack starts a new cluster. A return to an old topic switches back to its cluster.
- The unify step runs when the speaker is done (end of session, or on request). It is a separate Gemma 4 call, with the full graph and the notes of every cluster.
- The Mermaid output draws each cluster as a subgraph. Links between clusters are drawn after the subgraphs.
- If Gemma 4 is slow or fails, the raw transcript is still saved. The notes and the graph catch up later.
- The live view is one small local page. It reads the graph file and draws it with Mermaid. It is not hosted.

## 6. Outputs

| File | Content |
|---|---|
| `README.md` | What the project is, how it works, setup, usage |
| `DEVLOG.md` | What happened, in time order, tied to commits |
| `OBSERVER_NOTES.md` | Third-person notes on the project and the build, in time order. Each note says if it came from speech, a photo, or a commit |
| `diagrams/*.mmd` | Flowcharts generated by Gemma 4 as Mermaid text: system overview, build steps, data flow. GitHub shows Mermaid inside Markdown, so the README can embed them |
| `diagrams/*.svg` | The same diagrams rendered to images by Mermaid's open-source command-line renderer (`mermaid-cli`). Optional step. If rendering is not available, the `.mmd` files still display on GitHub |
| `LIVE_NOTES.md` | Live mode only. The very short notes, in time order. Each note links to the raw transcript span it came from |
| `live/graph.json` and `live/graph.mmd` | Live mode only. The flowchart state, and the Mermaid text made from it |
| `live/graph_history.jsonl` | Live mode only. Every graph op that was applied, with its source and time. Corrections stay visible here |
| `BOM.md` | Parts and tools (hardware projects) |
| `TROUBLESHOOTING.md` | What broke and how it was fixed |
| `GAPS.md` | Questions the docs still need answered |

## 7. Rules for trustworthy output

- Gemma 4 may state a claim only if a source supports it.
- Every section lists its sources.
- A guess must be marked as a guess.
- A claim with no source goes into `GAPS.md` as a question. Devlog does not invent an answer.
- The audio, the transcript and the timeline stay on disk, next to the output. The generated docs are not the only record.

Rules for observer notes:

- Write in the third person and the past tense. Refer to "the builder". Do not use "I" or "we".
- Say how each fact is known: "The builder said...", "The photo shows...", "The commit changes...".
- Do not add motives or feelings that nobody stated.
- Keep what was said and what was shown separate. If they disagree, write both and mark the conflict.

Rules for live notes and graph ops:

- The raw transcript is saved in full and never changed. Live notes do not replace it.
- A live note is the shortest text that keeps the meaning. Keep names of things, actions, numbers and units, negations ("not", "never", "no longer"), and which thing connects to which. Drop filler, repeats, and words that add no fact.
- A live note may not add a fact that the raw chunk does not contain.
- A chunk with no fact in it gets no note.
- Every live note links to its raw span, for example `[live 14:02-14:09]`.
- A graph op may name only things that the speaker named, or that already exist in the graph.
- An op that creates a link which the speaker did not state is marked "inferred".
- A correction by the speaker becomes a rename or remove op. The old state stays in `graph_history.jsonl`.
- If a chunk changes nothing in the graph, no op is made.

Rules for sidetracks and the unify step:

- Every box belongs to one cluster. New boxes go into the active cluster.
- A sidetrack starts a new cluster. The new boxes are not attached to the old topic, and the two clusters are not linked yet.
- A return to an earlier topic switches to the existing cluster. It does not start a new one.
- Two clusters are linked during the session only if the speaker states the link.
- The unify step may add a link between clusters, merge two boxes that name the same thing, or add a shared box that the speaker named. Each change needs a source.
- A link that nobody stated is marked "inferred".
- If two clusters have no real connection, the unify step does not force one. It adds a gap question instead.
- The unify step never deletes a box or an arrow. A merge keeps both original names in `graph_history.jsonl`.

Rules for diagrams:

- Every box and every arrow must trace to a source. Example: a box "ESP32" needs a mention in speech, a photo, or a commit.
- If a link between two boxes is inferred and not stated, draw it as a dashed arrow and mark it "inferred".
- Devlog checks that the Mermaid text parses. If it does not parse, Devlog asks Gemma 4 to fix it. It never saves a broken diagram.
- A diagram that Devlog cannot support from the timeline is not drawn. The missing part goes into `GAPS.md`.

## 8. How the tools are used

- **Gemma 4**: reads the timeline and the images. Writes the docs, the observer notes, the Mermaid diagrams and the gap questions. Runs through the Gemini API for fast use, and locally for offline use.
- **Mermaid**: open-source text format for diagrams. Gemma 4 generates the diagram in this format, because Gemma 4 produces text and not images. A Mermaid parser checks that the text is valid. `mermaid-cli` renders it to an SVG image.
- **ElevenLabs Scribe v2**: speech-to-text for recorded audio. The event gives credits for it.
- **ElevenLabs Scribe v2 Realtime**: speech-to-text for live mode. Whisper in short chunks is the local fallback. Check the current docs for how the live connection works.
- **Local Whisper**: fallback speech-to-text. Set with `--stt whisper`. It works without credits or internet.
- **ElevenLabs text-to-speech** (optional): reads the gap questions aloud.
- **Wispr Flow** (if the event requires it): live dictation of notes into a notes file. The notes go into the same timeline.

ElevenLabs is a proprietary service. It is an optional adapter. The rest of the pipeline is open.

## 9. Scope for the first version

First milestone (recorded mode):

1. Photos + voice memo + git log → Gemma 4 → `README.md` with sources.
2. `OBSERVER_NOTES.md`: third-person notes with a source on each note.
3. One system flowchart (`diagrams/system.mmd`), embedded in the README, with a parse check.
4. `GAPS.md` as printed questions.
5. `--stt` switch: ElevenLabs and local Whisper.
6. One demo on one of the author's own builds.
7. A public GitHub repository with an open-source license (MIT or Apache-2.0).

Second milestone (live mode):

- Live transcript from a microphone.
- Live notes (shortest meaning-keeping form) with raw-span links.
- Graph ops from Gemma 4, applied to a flowchart, with history.
- A small local page that shows the notes and the flowchart updating.

Later:

- Build-steps flowchart and data-flow chart.
- Video input (ffmpeg audio and frame step).
- Spoken gap questions (ElevenLabs text-to-speech).
- `DEVLOG.md`, `BOM.md` and `TROUBLESHOOTING.md`.

Out of scope for the first version: a hosted service, accounts, a hosted dashboard, team features. (The live view is one local page. It is not a hosted dashboard.)

## 10. Checks

The main failure: docs that sound right but are wrong. These checks target it. They are deterministic where possible.

| # | Failure it catches | Why it matters | Evidence | If it fails |
|---|---|---|---|---|
| C1 | A claim with no source | Readers trust invented details | Every claim has at least one source tag | Fix the prompt or reject the output |
| C2 | A planted false detail is stated as fact | The model may fill gaps with guesses | Add a fake detail to a test timeline. The output must not state it as fact | Tighten the source rule |
| C3 | A missing fact is invented | Gaps must stay visible | Remove a known fact from a test timeline. It must appear in `GAPS.md` | Fix the gap step |
| C4 | Technical words are transcribed wrongly | Wrong terms spread into the docs | Compare transcripts with and without the keyterm file | Improve the keyterm file |
| C5 | A spoken note is attached to the wrong commit | The devlog becomes misleading | Test timestamps against known commit times | Fix the timeline merge |
| C6 | The tool breaks without ElevenLabs | The open-source claim would be false | Run the pipeline with `--stt whisper` and no key | Fix the fallback |
| C7 | A diagram shows a part that nobody mentioned | A reader would believe the part exists | Every box in the diagram must map to a source. Also remove one real part from a test timeline. The diagram must not show it | Tighten the diagram rule |
| C8 | A diagram does not parse | A broken chart shows nothing in the README | Run the Mermaid parser on every saved diagram | Retry with Gemma 4, then drop the diagram and add a gap |
| C9 | Observer notes slip into the first person | The notes stop being an outside record | Search the notes for "I", "we", "my", "our". Zero matches | Fix the prompt or rewrite the line |
| C10 | An observer note states a feeling or motive nobody stated | The record would contain invented facts | Each note must have a source tag. Spot-check against the transcript | Remove the note or add a gap |
| C11 | A live note drops part of the meaning | A shortened note that loses a number or a "not" is wrong | In test chunks, every name, number and negation of the raw chunk appears in the live note | Tighten the condense prompt |
| C12 | A graph op names something nobody said | The flowchart would show invented parts | Plant a chunk that does not mention a part. No box for that part appears. Every op id maps to the chunk or to the existing graph | Reject the op, fix the prompt |
| C13 | A live note cannot be traced to speech | The user cannot check it | Every live note has a raw span. The raw transcript file is unchanged after the session | Fix the span link |
| C14 | Gemma 4 is slow or fails during a live session | Speech would be lost | Make the Gemma 4 call fail on purpose. The raw transcript is still complete. Notes and graph catch up later | Fix the queue |
| C15 | A correction is not applied, or the old state is lost | The flowchart would keep a wrong box | Say a correction in a test chunk. The graph changes, and the old state is in `graph_history.jsonl` | Fix the correction handling |
| C16 | A sidetrack is attached to the wrong topic | The flowchart would mix two ideas | Test chunks: topic A, then topic B, then back to A. B gets its own cluster. The return to A uses the old cluster. No new cluster for the return | Fix the cluster rules in the prompt |
| C17 | The unify step forces a link between unrelated topics | The flowchart would claim a connection that nobody described | Give two unrelated topics. No link between the clusters appears, and a gap question appears | Tighten the unify prompt |
| C18 | The unify step links topics with no support | Invented links look like facts | Every cross-cluster link has a source. A link that nobody stated is marked inferred. Nothing is deleted | Reject the op |

## 11. Known gaps

- No code is written yet.
- Gemma 4 accepts text and images. Direct audio or video input is not assumed.
- Output quality is not yet measured on real captures. The demo uses the author's own build only.
- Diagram accuracy is checked for syntax and for sources. It is not checked for whether the layout is clear to a reader.
- Gemma 4 may write invalid Mermaid. Devlog retries once. If it still fails, the diagram is dropped.
- A photo may be hard to read (small labels, glare). Devlog then lists the part as a gap and does not guess.
- Observer notes depend on the quality of the transcript. A wrong word in the transcript can become a wrong note.
- "Shortest possible" cannot be measured exactly. The checks test only that names, numbers and negations survive. They do not test that the note is as short as it can be.
- Live mode depends on speed. Gemma 4 latency, and the speech-to-text delay, are not measured yet.
- A live flowchart can become messy if the speaker jumps between topics. Clusters and the unify step are meant to reduce this. Neither the layout quality nor the quality of the unifying links is measured yet.
- Gemma 4 may misjudge when a sidetrack starts or ends. A wrong cluster choice is possible. The speaker can fix it by saying so, and the history file keeps the old state.
- The exact live connection for Scribe v2 Realtime is not checked yet. Read the docs first.
- Image and request limits of the Gemini API are not yet checked.
- No user testing yet.

## 12. Challenges this targets

- Best Use of Gemma 4: a focused tool that uses Gemma 4's text and image understanding.
- Best Open-Source AI Project: an open-weight model is central. The repository is public with an open-source license.
- Hacker House Goa × Wispr Flow task, if the author's entry is accepted for it.
