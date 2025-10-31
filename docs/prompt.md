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

## Meta slash commands for Add new skills

- Add one script to plugin 'rd' named as 'addskill.sh'. This script will help us to add new skills to the any plugin(Both the name of the plugin and the name of the skill will be specified by the user via arguments).
- Refer to the following links to generate another skill at folder `plugins/rd/skills/cc-skills`. It's the domain knowledge and best practices for Claude Code Agent Skills. We will use this skill to generate a new skill or refine existing skills. Here comes the links:

  - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
  - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart
  - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices

  I need you distill the key information and the best practices as domain knowledge for Claude Code Agent Skills, we will create new skills or refine existing skills all based on these knowledge.

- Add a new slash command `addskill` to plugin 'rd'. This command will call the script 'addskill.sh' to add new skills to the any plugin by template and add some initial draft version for the skill based on the meta skills defined in @plugins/rd/skills/cc-skills.
- Add a new slash command `refineskill` to plugin 'rd'. This command will take the arguments as the folder of the skill to be refined. This command will refine the skill based on the meta skills defined in @plugins/rd/skills/cc-skills.

- Based on the same meta-skill and with the same approach, add a new slash command `evaluate-skill`. This command will take the arguments as the skill folder to be evaluated. This command will evaluate the skill based on the meta skills defined in @plugins/rd/skills/cc-skills, and it will work on the read-only mode, after the comprehensive evaluation, it will generate a well structured and well-written report, including which parts are good and which parts need improvement and suggestions for improvement and so on so forth.
- To help end users to use these commands, we rename them as follows:
  - `addskill` --> `add-skill`
  - `refineskill` --> `refine-skill`

### Rename commands

## To help the commands grouped together by default, we rename all `rd` commands(@plugins/rd/commands) as follows:

- add-skill.md --> skill-add.md
- evaluate-skill.md --> skill-evaluate.md
- refine-skill.md --> skill-refine.md
- apply-10-dev.md --> 10-dev-apply.md
- check-10-dev.md --> 10-dev-check.md
- init-10-dev.md --> 10-dev-init.md
- integrate-10-dev.md --> 10-dev-integrate.md

Rename these files and update relevant files.

### Optimize <claude_code_plugins_02.md>

#### Background and current issues

I am writing a series of articles to introduce how to leverage Claude Code Plugins mechanism to enhance your daily works. The target audience is developers, designers, and product managers who want to leverage Claude Code Plugins mechanism to enhance their daily works. I already prepared two pieces of articles:

- @docs/claude_code_plugins_01.md, majorly focusing on introducing core concepts of Claude Code Plugins mechanism. Already published.
- @docs/claude_code_plugins_02.md, majorly focusing on practice and experience to show how to develop a Claude Code Plugin. I already wrote a few days ago. but I am not very satisfied with the quality of the article. I need you leverage agent seo-content-planner and agent seo-content-writer's capacities to plan and re-write it.

## Current status majorly in the following:

- It looks more like a operation guide or tutorial, instead of a well-written article. A good article should be easy to understand and engaging. And not only how to do it, but also why and when to do it. (Actually, we encountered the same issue in the previous article @docs/claude_code_plugins_01.md. But it was published, we can not improve it now. The thing we can do is to improve the quality of the up-coming articles.)
- This article reeks of AI-generated content and stands out as distinctly different from authentic Chinese expressions used in real-world contexts, especially for an article.
- It took a inappropriately sample to demonstrate how to develop a Claude Code Plugin, as we already have so many mature solutions for 提交前检查插件.
- And more importantly, this article lacks best practices and tips for developing high-quality Claude Code Plugins. That's added-value as an article.

#### Revise requirements and guidelines

- We need to take two samples to demonstrate how to develop a Claude Code Plugin.
  - The first one is our `hello` plugin defined in @.claude-plugin/marketplace.json and folder plugins/hello. We will use it to show the simplest way to develop a Claude Code Plugin.
  - The second one is part of our `rd` plugin defined in @.claude-plugin/marketplace.json and folder plugins/rd. We will use it to show a full circle to develop a Claude Code Plugin, including the development process, challenges, the design decision making and the relevant reasons. The key points are:
    - How to extract or distill the knowledge from the best practices(https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) and build up meta-skill `cc-skills`;
    - how to add user defined script: `plugins/rd/scripts/addskill.sh`
    - How to implement user defined slash command: `/rd:skill-add`, `/rd:skill-evaluate` and `/rd:skill-refine`
    - how to add marketplace and install `rd` plugin
    - how to use slash command `/rd:skill-evaluate` to evaluate the meta-skill `cc-skills`, as the final demonstration of the `rd` plugin. And with these slash commands, we can build up a powerful agent that can help us to build up skill libraries based on the specified operation guide and best practices for any domain.
    - at the end of this part, we can post some of the results of slash commands `/rd:skill-evaluate plugins/rd/skills/cc-skills`;
    - To simplify the demo, do not mention plugins/rd/skills/10-stages-developing and relevant slash commands.
- Refer to the following resources, I need you distill all the key points and best practices for developing high-quality Claude Code Plugins first. And embed them into this article when we demo above the two samples. At the end of this article, we will summarize and highlight the key points and best practices again.
- You can split this job into 3 steps: Planning, generating content, and reviewing and polishing, so that we can have a well-written and solid article with authentic Chinese content.
- Create a new file @docs/claude_code_plugins_02_new.md, and output your final content into it.
- Do not worry the length of the article, focus on the quality and accuracy of the content. If it's too long, we will divide it into multiple articles.
- If necessary, appropriate text, graphics, tables, etc., can be configured. External image resources are acceptable. For diagrams, I am preferring in mermaid format.

#### References

- https://docs.claude.com/en/docs/claude-code/plugins
- https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- https://docs.claude.com/en/docs/claude-code/sub-agents#best-practices
- https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices
- https://www.anthropic.com/engineering/claude-code-best-practices
- https://www.shuttle.dev/blog/2025/10/16/claude-code-best-practices
- https://docs.claude.com/en/docs/claude-code/hooks#security-best-practices

## agent super-coder

Help to design a new plugin agents named as "super-coder" in file @plugins/rd/agnts/super-coder.md with best practices. He is a powerful and senior full stack developer with very disciplined and experienced skills to get the thing done with the 10-stage TDD workflow.

He is also a master of the 10-stage TDD workflow, which includes planning, designing, coding, testing, and deploying. He is the core of the team to ensure the quality and reliability of the system.

## agent cool-commander

with the same methodology, help to design a new plugin agents named as "cool-commander" in file @plugins/rd/agnts/cool-commander.md with best practices. He is designed as the partner of the super-coder, and act as a combination roles, including architect, tech leader and sort of a project manager.

He fully in charge of converting the business requirements into technical specifications and designs, ensuring that the technical solutions meet the business needs and are aligned with the overall project goals. He also ensures that the technical solutions are scalable, maintainable, and secure. He acts as the planning role and command super-coder as the implementation role.

He familiar with the best practices of the 10-stage TDD workflow and `openspec` workflow.
