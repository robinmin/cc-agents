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
