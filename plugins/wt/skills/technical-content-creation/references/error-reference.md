# Error Handling Reference

## Common Errors by Stage

| Stage | Error                     | Solution                                    |
|-------|---------------------------|---------------------------------------------|
| 0     | File not found            | Verify path exists, check working directory |
| 0     | URL inaccessible          | Check URL validity, try alternative source  |
| 1     | No sources found          | Broaden search terms, try different keywords |
| 1     | Topic folder not found    | Run command from topic root directory       |
| 2     | Invalid outline format    | Use research-brief.md format                |
| 3     | Profile not found         | List available profiles: ls ~/.claude/wt/styles/ |
| 4     | Invalid resolution        | Use valid option from resolution table      |
| 5     | Invalid platform          | Use: twitter, linkedin, devto, medium       |
| 6     | Not in git repo           | Initialize git or use --platform social     |

## Fallback Strategies

1. **Tool unavailable**: Use alternative tool or manual process
2. **Content insufficient**: Request additional input from user
3. **Quality below threshold**: Flag for human review
4. **Platform error**: Use alternative platform or manual post
