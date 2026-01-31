# Stitch Workflows Reference

Detailed workflow documentation for Google Stitch AI UI generation.

## Prompt-First Workflow

### Overview

Generate UI screens directly from natural language descriptions. Best for new screens, rapid prototyping, and exploring design ideas.

### Step-by-Step

```
1. DESCRIBE
   └─> Write clear, specific UI description
   └─> Include: screen type, main elements, layout, colors, device

2. GENERATE
   └─> mcp__stitch__generate_screen_from_text(projectId, prompt, deviceType, modelId)
   └─> Wait for generation (typically 5-15 seconds)

3. REVIEW
   └─> mcp__stitch__get_screen(projectId, screenId)
   └─> Inspect generated design visually
   └─> Check component completeness

4. EXTRACT
   └─> Get code from screen.code property
   └─> Parse HTML/CSS/JS sections

5. EXPORT
   └─> Write to project files
   └─> Apply post-processing (format, lint)
```

### Effective Prompts

**Structure:**
```
"A [screen type] for [purpose] with [main elements],
featuring [layout description], styled with [colors/theme],
optimized for [device type]. Include [specific features]."
```

**Good Examples:**

```
"A mobile login screen with email and password fields, social login buttons
for Google and Apple, forgot password link, and sign up call-to-action.
Use a clean white background with blue primary color accents."
```

```
"A desktop dashboard with sidebar navigation, header with search and user avatar,
main content area showing 4 stat cards and a line chart, and a recent activity
feed on the right. Use a professional dark theme with accent colors."
```

```
"A tablet product listing page with a 3-column grid of product cards,
each card showing product image, name, price, and add-to-cart button.
Include filter sidebar and sort dropdown. Use warm, inviting colors."
```

**Avoid:**

- Vague descriptions: "A nice looking page"
- Missing context: "Login form" (what device? what style?)
- Too many elements: Try to focus on key features first

### Generation Parameters

| Parameter | Options | Recommendation |
|-----------|---------|----------------|
| deviceType | MOBILE, DESKTOP, TABLET | Match target platform |
| modelId | GEMINI_3_FLASH, GEMINI_3_PRO | FLASH for iteration, PRO for final |

## Context-First Workflow

### Overview

Extract design DNA from existing screens to maintain visual consistency when adding new screens to an existing application.

### Step-by-Step

```
1. EXTRACT
   └─> Select representative screen from project
   └─> mcp__stitch__get_screen(projectId, screenId)
   └─> Analyze code for design patterns

2. ANALYZE
   └─> Extract colors from CSS
   └─> Extract typography (fonts, sizes, weights)
   └─> Extract spacing patterns
   └─> Extract component styles (borders, shadows, radii)

3. SAVE
   └─> Create design-context.json (see schema)
   └─> Store in project design/ directory

4. LOAD
   └─> Read design-context.json
   └─> Include in generation prompts

5. GENERATE
   └─> Include context in prompt:
       "Generate [new screen] matching this design context: [context summary]"

6. VALIDATE
   └─> Compare generated tokens with context
   └─> Flag any deviations
```

### Context Extraction Prompt

```
"Analyze this screen and extract the design DNA:

1. COLORS - List all colors used with their purposes:
   - Primary action color
   - Secondary/accent color
   - Background colors (page, card, input)
   - Text colors (heading, body, muted)
   - Border colors
   - Status colors (error, success, warning)

2. TYPOGRAPHY - Extract font information:
   - Font family/families
   - Heading sizes and weights
   - Body text size and weight
   - Line heights

3. SPACING - Identify spacing patterns:
   - Base spacing unit
   - Common gaps between elements
   - Padding inside components

4. COMPONENTS - Note component styles:
   - Border radius values
   - Shadow styles
   - Button appearance
   - Input field style
   - Card style

Output as JSON matching the design-context.json schema."
```

### Including Context in Prompts

**Method 1: Summary inclusion**
```
"Generate a settings page matching this design:
- Colors: primary=#3b82f6, secondary=#6366f1, bg=#ffffff
- Typography: Inter font, 16px base, 600 heading weight
- Components: 8px radius, subtle shadows, bordered inputs"
```

**Method 2: Full context reference**
```
"Generate a user profile page that matches the design context from
our dashboard screen (projectId: abc123, screenId: xyz789).
Maintain the same color palette, typography, and component styling."
```

## Iterative Refinement Workflow

### Overview

Start with a generated design and incrementally improve it through targeted refinements. Best for polishing designs and incorporating feedback.

### Step-by-Step

```
1. GENERATE (Initial)
   └─> Create first version with general prompt
   └─> Get baseline design

2. REVIEW
   └─> Identify specific improvements needed
   └─> Prioritize changes (visual, functional, accessibility)

3. REFINE
   └─> Generate with modification prompt
   └─> Be specific about what to change AND what to keep

4. COMPARE
   └─> Evaluate against previous version
   └─> Check if improvements were applied
   └─> Note any unintended changes

5. ITERATE
   └─> Repeat steps 2-4 until satisfied
   └─> Typically 2-4 iterations
```

### Refinement Prompt Patterns

**Add element:**
```
"Modify [screen name] to add [new element] [position].
Keep all existing elements and styling intact."
```

**Remove element:**
```
"Modify [screen name] to remove [element].
Adjust layout to fill the space naturally."
```

**Change styling:**
```
"Modify [screen name] styling:
- Change: [specific style changes]
- Keep: [styles to preserve]
Do not modify the layout or content."
```

**Layout adjustment:**
```
"Modify [screen name] layout:
- Current: [describe current layout]
- Target: [describe desired layout]
Keep all content and styling the same."
```

### Iteration Best Practices

1. **One change at a time** - Easier to evaluate and rollback
2. **Be specific** - "Make the button bigger" vs "Increase button padding to 16px"
3. **Preserve intent** - Explicitly state what should NOT change
4. **Version control** - Save intermediate versions for comparison
5. **Know when to stop** - Diminishing returns after 3-4 iterations

## Multi-Screen Project Workflow

### Overview

Managing multiple screens within a single Stitch project for a complete application.

### Project Organization

```
Stitch Project: "MyApp"
├── Screen: "Login" (MOBILE)
├── Screen: "Dashboard" (DESKTOP)
├── Screen: "Settings" (MOBILE)
├── Screen: "Profile" (MOBILE)
└── Screen: "Admin Panel" (DESKTOP)
```

### Workflow

```
1. CREATE PROJECT
   └─> mcp__stitch__create_project(name, description)
   └─> Store projectId for all subsequent operations

2. ESTABLISH DESIGN SYSTEM
   └─> Generate first screen (hero/main screen)
   └─> Extract design context
   └─> Save as project design-context.json

3. GENERATE SCREENS
   └─> For each screen:
       ├─> Include design context in prompt
       ├─> Generate screen
       └─> Validate consistency

4. EXPORT ALL
   └─> mcp__stitch__list_screens(projectId)
   └─> For each screen:
       ├─> mcp__stitch__get_screen(projectId, screenId)
       └─> Export code to project files

5. INTEGRATE
   └─> Add routing between screens
   └─> Connect shared components
   └─> Verify navigation flow
```

## Code Export Workflow

### Overview

Extracting generated code from Stitch and integrating it into your project.

### Export Process

```
1. GET SCREEN CODE
   └─> mcp__stitch__get_screen(projectId, screenId)
   └─> screen.code contains generated output

2. PARSE SECTIONS
   └─> HTML structure
   └─> CSS styles
   └─> JavaScript (if any)

3. TRANSFORM
   └─> Convert to target format (React, Vue, etc.)
   └─> Extract components
   └─> Separate concerns

4. WRITE FILES
   └─> Components: src/components/
   └─> Styles: src/styles/
   └─> Screens: src/screens/ or src/pages/

5. POST-PROCESS
   └─> Format with Prettier
   └─> Lint with ESLint
   └─> Check accessibility with axe
```

### React Transformation Example

**From Stitch HTML:**
```html
<div class="card">
  <img src="avatar.jpg" alt="User" class="avatar">
  <h2 class="name">John Doe</h2>
  <p class="bio">Software developer</p>
</div>
```

**To React Component:**
```tsx
interface UserCardProps {
  avatarUrl: string;
  name: string;
  bio: string;
}

export function UserCard({ avatarUrl, name, bio }: UserCardProps) {
  return (
    <div className="card">
      <img src={avatarUrl} alt={name} className="avatar" />
      <h2 className="name">{name}</h2>
      <p className="bio">{bio}</p>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Generation timeout | Complex prompt, slow network | Simplify prompt, retry |
| Inconsistent styling | No design context provided | Use context-first workflow |
| Missing accessibility | Not specified in prompt | Add a11y requirements to prompt |
| Wrong device layout | deviceType mismatch | Verify deviceType parameter |
| Low quality output | Using FLASH for complex design | Switch to GEMINI_3_PRO |

### Quality Checklist

Before accepting generated output:

- [ ] Visual hierarchy is clear
- [ ] Color contrast meets WCAG AA
- [ ] Interactive elements have states
- [ ] Layout is responsive
- [ ] Text is readable (size, contrast)
- [ ] Components are accessible
- [ ] Code is clean and maintainable
