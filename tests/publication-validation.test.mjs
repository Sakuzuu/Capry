import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Compile the shared validator with the project's TypeScript version so these
// regressions run on every supported Node version without another test runner.
const source = readFileSync(new URL("../src/lib/events/publication-validation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { validateLocation, validateSchedule, quitoTimestamp, publicationSchedule, shiftDate, displayTime } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
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
test("active publications use the server clock, ignoring a draft date and start", () => {
  const schedule = publicationSchedule({...active,eventDate:"2035-01-01",startTime:"23:59"},now);
  assert.deepEqual(schedule,{...active,eventDate:"2026-11-18",startTime:"00:30"});
  assert.equal(validateSchedule(schedule,now),null);
  const beforeMidnight=new Date("2026-11-18T04:59:00Z");
  assert.equal(publicationSchedule(active,beforeMidnight).eventDate,"2026-11-17");
  assert.equal(publicationSchedule(active,beforeMidnight).startTime,"23:59");
  assert.deepEqual(publicationSchedule(planned,now),planned);
});
test("next-day preference can be chosen before an end, without inventing an end", () => {
  const draft={...active,endDayOffset:1};
  const indefinite=publicationSchedule(draft,now);
  assert.equal(indefinite.endTime,null);
  assert.equal(indefinite.endDayOffset,0);
  assert.equal(validateSchedule(indefinite,now),null);
  const timed=publicationSchedule({...draft,endTime:"02:00"},now);
  assert.equal(timed.endDayOffset,1);
  assert.equal(validateSchedule(timed,now),null);
  assert.equal(publicationSchedule({...timed,endTime:""},now).endDayOffset,0);
});
test("active end-day selection remains explicit before and after midnight", () => {
  const late=new Date("2026-11-18T04:30:00Z"); // Nov 17, 23:30 Quito.
  const sameDay=publicationSchedule({...active,endTime:"02:00"},late);
  assert.equal(validateSchedule(sameDay,late)?.field,"endDayOffset");
  assert.equal(validateSchedule({...sameDay,endDayOffset:1},late),null);
  const afterMidnight=publicationSchedule({...active,endTime:"02:00"},now);
  assert.equal(validateSchedule(afterMidnight,now),null);
  for(const endTime of ["23:",":30","24:00","25:80"]){
    assert.equal(validateSchedule(publicationSchedule({...active,endTime},now),now)?.field,"endTime");
  }
});
test("date and 24-hour display handle midnight, noon and year changes",()=>{
  assert.equal(shiftDate("2026-12-31",1),"2027-01-01");
  assert.equal(shiftDate("2028-02-28",1),"2028-02-29");
  assert.equal(displayTime("00:00"),"12:00 a. m.");
  assert.equal(displayTime("12:00"),"12:00 p. m.");
  assert.equal(displayTime("23:07"),"11:07 p. m.");
  assert.equal(displayTime("23:"),"");
});
