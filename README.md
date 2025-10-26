# cc-agents
A collections of my agents and other stuff for Claude Code

## Usage
Use the following commands to enable the tools in your Claude Code:

```bash
## add into marketplace list
/plugin marketplace add robinmin/cc-agents

# verify the marketplace list
/plugin marketplace list

# install the plugin
/plugin install my-first-plugin@cc-agents/

# trigger the plugin's hello command
/my-first-plugin:hello

# then you will see the output like this:
```
> ⏺ Hello! 👋
>
>   Great to meet you! I'm Claude Code, ready to help you with your software engineering needs.
>
>   What can I help you build, debug, or improve today? Whether it's:
>   - Writing new features
>   - Debugging tricky issues
>   - Refactoring code
>   - Setting up projects
>   - Reviewing architecture
>   - Or anything else development-related
>
>   I'm here to assist! What would you like to work on?
>

```bash
# if you do not want to use the plugin any more, you can uninstall it
/plugin uninstall my-first-plugin@cc-agents/

```

## Reference
- [Plugin marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)
- [wshobson/agents](https://github.com/wshobson/agents)
- [不仅仅是代码助手：用 Plugins 将 Claude Code 打造成你的专属研发终端(1/4)](https://surfing.salty.vip/articles/cn/claude_code_plugins_01/)
- [不仅仅是代码助手：用 Plugins 将 Claude Code 打造成你的专属研发终端(2/4)](https://surfing.salty.vip/articles/cn/claude_code_plugins_02/)
