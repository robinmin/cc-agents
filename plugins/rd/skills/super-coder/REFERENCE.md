# Reference

## Classic Books

Foundational texts that inform the super-coder methodology:

### **Code Complete** (Steve McConnell)

- **Manage Complexity:** The primary technical imperative is managing complexity; if a system exceeds your mental capacity, defects are inevitable.
- **Construction Focus:** Coding and debugging are the only activities guaranteed in every project, making them the highest leverage point for improvement.
- **Defensive Programming:** Use assertions and handle "impossible" error conditions gracefully to protect code from invalid data.
- **Pseudocode Programming Process (PPP):** Write logic in plain English comments first, review them, then translate to code, keeping the comments as documentation.

### **Refactoring** (Martin Fowler)

- **The "Two Hats" Metaphor:** distinctively separate adding function (changing behavior) from refactoring (changing structure); never do both simultaneously.
- **Code Smells:** Learn to identify indicators of poor design (e.g., Long Method, Feature Envy) to know _when_ to refactor.
- **The Rule of Three:** Do it once; duplicate it once (wince); refactor it the third time.
- **Preserving Behavior:** Refactoring must not alter external behavior, a guarantee provided by a comprehensive suite of automated tests.

### **Working Effectively with Legacy Code** (Michael Feathers)

- **Legacy Definition:** Legacy code is defined simply as "code without tests."
- **The Seam Model:** Identify "seams" where behavior can be altered without editing source code (e.g., via subclassing) to break dependencies for testing.
- **Sprout and Wrap:** Insert new functionality by creating fresh code ("sprouting") or wrapping existing methods ("wrapping") rather than editing the messy core.
- **Characterization Tests:** Write tests to document the _current_ behavior (bugs and all) to ensure refactoring doesn't accidentally change established system behavior.

### **A Philosophy of Software Design** (John Ousterhout)

- **Deep vs. Shallow Modules:** Prefer "deep" modules (simple interface, powerful functionality) over "shallow" ones (complex interface, little benefit).
- **Strategic vs. Tactical:** Avoid "tactical" programming (rushing features, creating debt); invest in "strategic" programming (great design) even if it's slower initially.
- **Information Hiding:** Modules should hide their internal complexity and data structures completely from other modules.
- **Complexity Definition:** Complexity is measured by the cognitive load required to make a change; if a simple change is hard to deduce, complexity is too high.

### **Design Patterns** (Gamma, Helm, Johnson, Vlissides)

- **Interface over Implementation:** Decouple code by depending on abstract behaviors rather than concrete classes.
- **Composition over Inheritance:** Favor assembling objects to gain functionality rather than inheriting, which creates tight coupling.
- **Shared Vocabulary:** The primary value is communication; terms like "Singleton" or "Strategy" instantly convey complex ideas to other developers.
- **Three Categories:** Patterns are strictly divided into Creational (construction), Structural (organization), and Behavioral (communication).

### **PoEAA (Patterns of Enterprise Application Architecture)** (Martin Fowler)

- **Domain Logic Patterns:** Select logic structure based on complexity: Transaction Script (simple), Table Module (data-centric), or Domain Model (complex/OO).
- **Data Source Patterns:** Use "Active Record" for simple row-based logic, or "Data Mapper" to keep complex objects independent of the database schema.
- **Distribution Costs:** Avoid remote calls; they are expensive. Use coarse-grained interfaces (DTOs) to minimize network traffic.
- **Offline Concurrency:** Use Optimistic or Pessimistic Offline Locks to manage data consistency across long-running business transactions.

### **Domain-Driven Design** (Eric Evans)

- **Ubiquitous Language:** Developers and domain experts must use a rigorous, shared language in both speech and code to prevent ambiguity.
- **Bounded Contexts:** distinct subsystems must have strict boundaries; a term like "Customer" can mean different things in different contexts (Sales vs. Shipping).
- **Entities vs. Value Objects:** "Entities" are defined by identity; "Value Objects" are defined by attributes and are immutable.
- **Aggregates:** Clusters of objects treated as a single unit for data changes, accessed only through an "Aggregate Root" to ensure integrity.

### **Computer Systems: A Programmer's Perspective** (Bryant & O'Hallaron)

- **Memory Hierarchy:** Understanding the speed gap between registers, cache, RAM, and disk is vital for writing performant, cache-friendly code.
- **Data Representation:** Awareness of how integers/floats are stored (bits, two's complement) helps prevent overflow and precision bugs.
- **Linking and Loading:** Knowledge of the compilation process helps resolve "undefined reference" errors and optimize library usage.
- **Exceptional Control Flow:** Understanding how the OS uses interrupts and context switches explains the illusion of concurrency.

### **The Pragmatic Programmer** (Hunt & Thomas)

- **ETC (Easier To Change):** The guiding value of software design; good design is simply that which is easier to change later.
- **DRY (Don't Repeat Yourself):** Every piece of knowledge must have a single, unambiguous representation within the system.
- **Tracer Bullets:** verify architectural feasibility with end-to-end bare-bones code, unlike prototypes which are discarded.
- **Broken Windows Theory:** Fix bad code and poor decisions immediately; visible disorder encourages further neglect and rot.

### **Clean Code** (Robert C. Martin)

- **Meaningful Names:** Names must reveal intent without encoding or ambiguity; avoid generic names like `data`.
- **Small Functions:** Functions should do one thing only; if they contain sections (setup, process, teardown), they are too large.
- **Comments as Failures:** A comment often indicates the code failed to be expressive enough; prefer renaming over commenting.
- **Boy Scout Rule:** Always leave the codebase cleaner than you found it.

### **Clean Architecture** (Robert C. Martin)

- **Dependency Rule:** Source code dependencies must point inward toward high-level policies; inner layers know nothing of outer layers.
- **Independence:** The core business rules should be independent of the UI, database, frameworks, and external agencies.
- **Screaming Architecture:** A project structure should scream its intent (e.g., "Healthcare System") rather than its framework (e.g., "Django App").
- **Entities:** The innermost circle encapsulates enterprise-wide business rules that are least likely to change.

### **Designing Data-Intensive Applications** (Martin Kleppmann)

- **Three Pillars:** Focus on Reliability (fault tolerance), Scalability (load handling), and Maintainability (operability).
- **CAP Theorem:** In distributed systems, Partition Tolerance is mandatory, forcing a trade-off between Consistency and Availability.
- **Replication vs. Partitioning:** Replication provides redundancy and lower latency; Partitioning (Sharding) provides storage and compute scale.
- **Logical Clocks:** Distributed systems cannot rely on physical time-of-day clocks due to skew; logical clocks are needed to order events.
