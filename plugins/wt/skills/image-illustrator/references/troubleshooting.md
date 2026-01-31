# Image Illustrator Troubleshooting Guide

Common issues and solutions for article illustration workflows.

## Position Detection Issues

### No Positions Detected

**Symptoms**: Skill reports "No positions found" or generates 0 images.

**Possible Causes**:
- Article too short (<200 words)
- No technical jargon or complex concepts
- All sections already have images
- Detection thresholds too high

**Solutions**:

1. **Check article length**:
   ```bash
   wc -w article.md
   ```
   Minimum ~500 words recommended for auto-detection.

2. **Lower position limits**:
   ```bash
   wt:image-illustrator --article article.md \
     --min-positions 1 \
     --max-positions 3
   ```

3. **Manually specify positions**:
   ```bash
   # Create positions file manually
   cat > materials/positions/manual-positions.md << EOF
   ---
   positions:
     - line: 45
       type: abstract_concept
       concept: "Main topic"
   ---
   EOF
   ```

### Too Many Positions Detected

**Symptoms**: Skill detects excessive positions (>20 for standard article).

**Possible Causes**:
- Article very long (>5000 words)
- Detection thresholds too low
- Too many minor section breaks

**Solutions**:

1. **Limit maximum positions**:
   ```bash
   wt:image-illustrator --article article.md \
     --max-positions 10
   ```

2. **Increase detection thresholds**:
   - Require more jargon density for abstract concepts
   - Require larger tables for information-dense detection
   - Ignore minor section breaks (### headers)

3. **Process article in sections**:
   ```bash
   # Split article and process each part
   split -l 500 article.md article-part-
   ```

### Wrong Position Type Detected

**Symptoms**: Position categorized incorrectly (e.g., concept marked as dense).

**Possible Causes**:
- Ambiguous content patterns
- Multiple detection patterns match
- Article has mixed content types

**Solutions**:

1. **Review detected positions**:
   ```bash
   cat materials/positions/positions-001.md
   ```

2. **Manually correct position types**:
   - Edit positions file in `materials/positions/`
   - Update `position_type` field
   - Re-run generation with corrected positions

3. **Provide explicit guidance**:
   ```bash
   wt:image-illustrator --article article.md \
     --prefer-types abstract_concept,information_dense
   ```

## Style Selection Issues

### Generated Images Don't Match Content

**Symptoms**: Images look too generic or don't reflect article content.

**Possible Causes**:
- Default style not appropriate for content
- Prompt doesn't capture article context
- Style modifiers not applied correctly

**Solutions**:

1. **Try different style**:
   ```bash
   wt:image-illustrator --article article.md \
     --style photorealistic
   ```

2. **Use content-aware prompts**:
   ```bash
   wt:image-illustrator --article article.md \
     --content-context full
   ```

3. **Review and enhance prompts**:
   ```bash
   cat materials/prompts/prompt-001.md
   # Manually edit prompt for better context
   ```

### Style Not Applied

**Symptoms**: Images don't reflect selected style.

**Possible Causes**:
- Style name misspelled
- Style modifiers not appended to prompt
- Backend doesn't support style

**Solutions**:

1. **Verify style name**:
   ```bash
   # List available styles
   wt:image-generate --list-styles
   ```

2. **Check prompt used**:
   ```bash
   jq '.images[].prompt' captions.json
   ```

3. **Use custom style**:
   ```bash
   wt:image-illustrator --article article.md \
     --style custom \
     --custom-style "clean minimalist, white background, blue accents"
   ```

## Caption and Metadata Issues

### captions.json Not Created

**Symptoms**: No `captions.json` file after generation.

**Possible Causes**:
- Generation failed before completion
- File path incorrect
- Permissions issue

**Solutions**:

1. **Check generation status**:
   ```bash
   # Verify images were actually created
   ls -la images/
   ```

2. **Check file permissions**:
   ```bash
   ls -la materials/
   ```

3. **Manually create captions file**:
   - Use `assets/captions-example.json` as template
   - Fill in image details manually

### Missing Alt Text

**Symptoms**: Images have empty or missing alt text.

**Possible Causes**:
- Alt text generation skipped
- Alt text field not populated
- Accessibility not prioritized

**Solutions**:

1. **Generate alt text manually**:
   ```bash
   # For each image, describe visual content
   alt_text="Diagram showing X with Y and Z"
   ```

2. **Update captions.json**:
   ```bash
   jq '.images[0].alt_text = "Detailed description"' captions.json
   ```

3. **Use accessibility tools**:
   - Run accessibility linter on article
   - Check for missing alt text: `grep -E '!\[.*\]\(' article.md`

## Article Update Issues

### Image References Not Inserted

**Symptoms**: Images generated but not referenced in article.

**Possible Causes**:
- Article update failed
- File permission issues
- Output path incorrect

**Solutions**:

1. **Check output file**:
   ```bash
   grep -c "!\[.*\]\(" article-illustrated.md
   ```

2. **Manually insert image references**:
   ```markdown
   <!-- At line 45 (or detected position) -->
   ![Microservices architecture diagram](images/microservices-architecture.png)
   ```

3. **Verify output path**:
   ```bash
   # Check if output file was created
   ls -la article-illustrated.md
   ```

### Article Corrupted After Update

**Symptoms**: Article has formatting issues or broken structure.

**Possible Causes**:
- Image insertion broke markdown structure
- Line numbers shifted after insertion
- Backup not created

**Solutions**:

1. **Restore from backup**:
   ```bash
   cp article.md.backup article.md
   ```

2. **Verify backup exists**:
   ```bash
   ls -la *.backup
   ```

3. **Manually insert images**:
   - Use `captions.json` to find correct positions
   - Insert image references manually
   - Validate markdown structure

## Image Generation Issues

### Some Images Failed to Generate

**Symptoms**: Partial success, some images missing.

**Possible Causes**:
- API rate limits
- Backend timeout
- Prompt too complex

**Solutions**:

1. **Check error logs**:
   ```bash
   cat materials/logs/errors.log
   ```

2. **Retry failed images**:
   ```bash
   # Use wt:image-generate directly for failed images
   wt:image-generate --template illustrator \
     --var concept="failed concept" \
     --output images/missing-image.png
   ```

3. **Use fallback backend**:
   ```bash
   wt:image-generate "prompt" \
     --backend gemini \
     --output image.png
   ```

### All Images Failed

**Symptoms**: Zero images generated, all attempts failed.

**Possible Causes**:
- No API tokens configured
- Network connectivity issues
- Backend completely unavailable

**Solutions**:

1. **Check API tokens**:
   ```bash
   env | grep API
   ```

2. **Test backend directly**:
   ```bash
   wt:image-generate "test" --output test.png
   ```

3. **Check network connectivity**:
   ```bash
   ping api.huggingface.co
   ```

## Performance Issues

### Generation Too Slow

**Symptoms**: Takes >5 minutes per image.

**Possible Causes**:
- High resolution requested
- Too many inference steps
- Backend overloaded

**Solutions**:

1. **Reduce resolution**:
   ```bash
   wt:image-illustrator --article article.md \
     --resolution 800x600
   ```

2. **Reduce inference steps**:
   ```bash
   wt:image-illustrator --article article.md \
     --steps 30
   ```

3. **Use faster backend**:
   ```bash
   wt:image-generate "prompt" \
     --backend nano_banana \
     --output image.png
   ```

### Memory Issues During Generation

**Symptoms**: Process crashes or hangs during generation.

**Possible Causes**:
- Too many images queued
- High resolution images
- System memory limited

**Solutions**:

1. **Reduce batch size**:
   ```bash
   wt:image-illustrator --article article.md \
     --max-positions 5
   ```

2. **Generate in smaller batches**:
   - Process article sections separately
   - Combine results manually

3. **Use lower resolution**:
   ```bash
   --resolution 800x600  # Instead of 1920x1080
   ```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `No positions found` | Article too short or simple | Lower `--min-positions` |
| `Article not found` | Incorrect file path | Verify path exists |
| `Cannot write to output` | Permission denied | Check directory permissions |
| `Style not recognized` | Invalid style name | Use `--list-styles` |
| `Backend unavailable` | API token missing | Set `HUGGINGFACE_API_TOKEN` |
| `caption.json error` | Invalid JSON | Validate JSON syntax |

## Getting Help

For issues not covered here:

1. Check `wt:image-generate` troubleshooting guide
2. Verify API tokens are set: `env | grep API`
3. Check materials directory for detailed logs
4. Test with simple article first
5. Enable debug mode: `--debug` flag

## Debug Mode

Enable verbose output for troubleshooting:

```bash
wt:image-illustrator --article article.md \
  --image-dir images/ \
  --debug
```

This provides detailed logs of:
- Position detection process
- Prompt generation
- Image generation attempts
- File operations
