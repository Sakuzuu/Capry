import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Compile the shared validator with the project's TypeScript version so these
// regressions run on every supported Node version without another test runner.
const source = readFileSync(new URL("../src/lib/events/publication-validation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { validateLocation, validateSchedule, quitoTimestamp } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const now = new Date("2026-11-18T05:30:00Z"); // 00:30 in Quito.
const active = { status: "active", eventDate: null, startTime: "00:00", endTime: null, endDayOffset: 0 };
const planned = { ...active, status: "planned", eventDate: "2026-11-18", startTime: "22:00" };
const issue = (schedule) => validateSchedule(schedule, now)?.field;

test("publication needs a complete, finite location inside Quito", () => {
  assert.equal(validateLocation(null)?.field, "location");
  for (const point of [{latitude:NaN,longitude:-78.48},{latitude:-0.2,longitude:Infinity},{latitude:1,longitude:-78.48},{latitude:-0.2,longitude:0}]) assert.equal(validateLocation(point)?.field,"location");
  assert.equal(validateLocation({latitude:-0.2,longitude:-78.48}),null);
});
test("start time is required and both times must exist on a 24-hour clock", () => {
  for (const startTime of ["", "24:00", "12:60", "2:00", "not a time"]) assert.equal(issue({...active,startTime}),"startTime");
  assert.equal(issue({...active,endTime:"25:00"}),"endTime");
});
test("future parties require a real date and a start after the current Quito time", () => {
  assert.equal(issue({...planned,eventDate:null}),"eventDate");
  for (const eventDate of ["2026-02-30","2026-13-01","0000-01-01","invalid"]) assert.equal(issue({...planned,eventDate}),"eventDate");
  assert.equal(issue({...planned,eventDate:"2026-11-17"}),"startTime");
  assert.equal(issue({...planned,startTime:"00:30"}),"startTime");
  assert.equal(validateSchedule({...planned,startTime:"00:31"},now),null);
  assert.equal(validateSchedule({...planned,eventDate:"2028-02-29"},now),null);
});
test("an active party cannot start later or already have ended", () => {
  assert.equal(issue({...active,startTime:"01:00"}),"startTime");
  assert.equal(issue({...active,eventDate:"2026-11-19"}),"startTime");
  assert.equal(issue({...active,endTime:"00:29"}),"endTime");
  assert.equal(issue({...active,endTime:"00:30"}),"endTime");
  assert.equal(validateSchedule({...active,endTime:"01:00"},now),null);
});
test("cross-midnight schedules need the explicit next-day choice", () => {
  const overnight={...active,eventDate:"2026-11-17",startTime:"23:00",endTime:"03:00"};
  assert.equal(issue(overnight),"endDayOffset");
  assert.equal(validateSchedule({...overnight,endDayOffset:1},now),null);
  assert.equal(issue({...overnight,eventDate:"2026-11-16",endDayOffset:1}),"endTime");
  assert.equal(issue({...active,endDayOffset:1}),"endDayOffset");
  assert.equal(issue({...active,endDayOffset:2}),"endDayOffset");
});
test("server timezone does not change Quito's date or schedule interpretation", () => {
  const previous=process.env.TZ;
  try {
    for(const zone of ["UTC","Asia/Tokyo","America/Los_Angeles"]){
      process.env.TZ=zone;
      assert.equal(quitoTimestamp(now),"2026-11-18T00:30:00");
      assert.equal(validateSchedule(active,now),null);
      assert.equal(validateSchedule(planned,now),null);
    }
  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
