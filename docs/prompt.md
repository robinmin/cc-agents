# Prompt

## Define workflow

### create 10-step-dev workflow

#### Background

How can I use Claude Code skills to define a development workflow to add new functions like this:

#### Workflow

Here

- 0, Told orchestra start on current task.
- 1, Define function name and input parameters and output parameters for function top class programming language. Or for class-based programming languages, define the class name and method name and input parameters and output parameters for the function. Prepare fixed dummy data for testing and write unit tests. Remember to add a docstring explaining the purpose of the function/class method.
- 2, Find the proper file name and test function name, and implement a smoking call to this new function/class method as a new added unit test case. Remember to add some assertions to ensure the function/class method works as expected.
- 3, Use syntax checking tools to ensure no syntax errors and maintain code consistency.
- 4, Use unit testing tools to ensure the function/class method works as expected, add assertions if necessary. Make sure all relevant tests pass.
- 5, Formally implement the function/class method.
- 6, At the unit tests side, add enough test data, test cases and assertions to ensure the function/class method works as expected.
- 7, Again, use syntax checking tools to ensure no syntax errors and maintain code consistency.
- 8, Ensure all relevant unit tests pass. In case of failure, investigate the cause and fix the issue, no matter on source code side or test code side.
- 9, Notify orchestra current task has been done.

### skills/10-stages-dev

I want to create a set of workflow to implement TDD for my daily development tasks with Claude Code skills. Under folder @skills/10-stages-dev is the files I Prepared. I want to name it as '10-stages-dev'. I need your help to:

- Refer to the following official documentations and best practices to refine this skills, make it as a clean and concise skills for the LLM and human:
  - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
  - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices
- Re-organize the workflow and file layout to make it more organized and maintainable.

## A few points to enhance the workflow and file layout:

### About toolings

At the tooling side, I am more prefering to apply soft contracts instead of hard constraints. Meanwhile, it's very hard to provide or maintain an universal scripts for all programming languages and environments. My solution allows for greater flexibility and adaptability in the development process for end users. For example, I am willing to use the following tools:

- Python/golang/Rust: working with make tool, end user need to wrap all commands as unified make tasks. for example:

  - make help
  - make install
  - make test
  - make test:unit
  - make test:integration
  - make test:e2e
  - make lint
  - make build

- JavaScript/TypeScript:working with npm scripts, end user need to wrap all commands as unified npm scripts. for example:

  - pnpm install
  - pnpm test
  - pnpm test:unit
  - pnpm test:integration
  - pnpm test:e2e
  - pnpm lint
  - pnpm build

- Java: working with Maven or Gradle, end user need to wrap all commands as unified Maven or Gradle tasks. for example:
  - mvn install
  - mvn test
  - mvn test:unit
  - mvn test:integration
  - mvn test:e2e
  - mvn lint
  - mvn build

Not only provide definition, but also we provided a set of templates for different programming languages and frameworks, such as:

- Makefile-python: we provide a Makefile template for Python projects that compossite tasks with uv, ruff, ty, pytest, and other modern tools.
- Makefile-golang: we provide a Makefile template for Go projects that compossite tasks with go, gofmt, govet, and other modern tools.
- Makefile-rust: we provide a Makefile template for Rust projects that compossite tasks with cargo, clippy, and other modern tools.
- package-javascript.json: we provide a package.json template for JavaScript/ projects that compossite tasks with pnpm, eslint, prettier, jest, and other modern tools.
- package-typescript.json: we provide a package.json template for TypeScript projects that compossite tasks with pnpm, eslint, prettier, jest, and other modern tools.
- Maven-java: we provide a Maven template for Java projects that compossite tasks with mvn, checkstyle, pmd, and other modern tools.
- and etc.

### Optimize current process

- According to the current process, we forgot to create integration tests, when we are creating a set of functions. For example, we can create a new function named as 'set_user_info' after that we already created a function named as 'get_user_info'. This is the right timing to create integration tests. Blend this new rule into the existing process. This will help us to ensure that our code is tested thoroughly and that we catch any issues early on.

- For a more convenient way to notify end user or any other party, we can use the same way (for example, make task or npm scripts and etc) to notify-task-start, notify-task-end. This will help the end user more awareness of the progress and status of the task, or it will reserve the flexibility for automation.

### Optimize the performance

- Except tell the process how to execute unit tests, we'd better to provide more detail commands to execute a single test case for a specified file even specified function. This will help us to optimize the performance of our code and make it more efficient.

### Add commands and register plugins

To complete this process, we need to add commands and register plugins into Claude Code. This will help us to use this skills more efficiently and conveniently. I need you:

- add command `check-10-dev`: this command will check the context whether all requested pre-condition for 10-stages-developing work flow is met or not.
- add command `apply-10-dev`: this command will apply 10-stages-developing work flow on the specified request or functionality or something like that.
- register a plugin named as 'rd' in @.claude-plugin/marketplace.json, which at least includes above commands `check-10-dev` and `apply-10-dev`.

Of course, if you have any other commands or other stuff need to be added, please let me know.
