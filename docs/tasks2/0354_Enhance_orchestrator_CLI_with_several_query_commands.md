---
name: Enhance orchestrator CLI with several query commands
description: Enhance orchestrator CLI with several query commands
status: Backlog
created_at: 2026-04-07T21:24:31.018Z
updated_at: 2026-04-07T21:24:31.018Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0354. Enhance orchestrator CLI with several query commands

### Background

There are several query commands should be enhanced based on my using expierence:

### command `status`
Current output like the following, we need to add a timestamp and a time cost to show when this pipeline started and how long it already spended. Here comes the current output:
```bash
orchestrator status
Run: 0352  Status: RUNNING
Pipeline: default  Preset: refine
Duration: 0ms

  intake           running    rd3:request-intake
```
You can see there is another question/issue that the duration is 0ms, we need to check it carefly to see it's real or just a fake value.

### command `history`
Currently, there are several issues for command `history`:
- All time cost(Duration) and Token cost(Tokens) are zero;
- The output format needs to be optimized for a cmore clear layout for understandung. Meanwhile, if we can see sequnce number, phase name, duration and tokens for each phase, that will be more helpful. At the task level, you'd better to show the task kick off timestamp if possible. Here comes current output:
```bash
orchestrator history
Run 0352: COMPLETED
  Pipeline: default  Preset: refine
  Duration: 0ms  Tokens: 0
  Phases: 1 (1 completed)
  intake: completed

Run 0352: COMPLETED
  Pipeline: default  Preset: refine
  Duration: 0ms  Tokens: 0
  Phases: 1 (1 completed)
  intake: completed

......

Pipeline Trends (last 30 days)
  Overall Statistics:
    22 runs | 18% success rate
  By Preset:
    complex (2 runs, 0% success, avg 33m 27s)
    default (1 runs, 0% success, avg 0ms)
    plan (3 runs, 0% success, avg 0ms)
    refine (9 runs, 22% success, avg 16.0s)
    standard (2 runs, 0% success, avg 6m 25s)
```

### command `events`
If possible, we can change the layout to see sequence number, event name, time cost and token cost. It's will be better. Here comes the current output:
```bash
orchestrator events 0352
Run: run_mnp3t1s6_y5l24h (0352)
Total events: 5

[ 118] 2026-04-08 04:00:52  run.created
[ 119] 2026-04-08 04:00:52  phase.started
[ 120] 2026-04-08 04:01:45  gate.evaluated
[ 121] 2026-04-08 04:01:45  phase.completed
[ 122] 2026-04-08 04:01:45  run.completed
```

### command `init`
We need to comfirm whether we already have the capacity to create the SQLite datanase if it's not exist. If no, we need to add this as one step of the project intialization.

By the way, is there any existing ways to see the execution results for each phase on a particular task, using command `history`? Or we need to add any new command to show the FSM and DAG flow with execution results?


### Requirements

- Answer the questions first, then start ti find out solutions for these requirements.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
