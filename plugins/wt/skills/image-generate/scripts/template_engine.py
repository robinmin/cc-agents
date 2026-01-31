#!/usr/bin/env python3
"""
Template Engine for Image Generation

This module provides a declarative template system for image generation.
Templates are markdown files with YAML frontmatter that specify image
generation parameters and support variable substitution.

Features:
- Parse .tpl.md files with YAML frontmatter
- Variable substitution: {{variable}} and {{variable | default}}
- Template resolution: project directory -> skill assets
- Style and keywords intelligent merging
- Comprehensive error handling with fail-fast behavior

Usage:
    from template_engine import TemplateEngine, Template

    engine = TemplateEngine()
    template = engine.load_template("cover")
    prompt = template.render_prompt({"title": "My Article", "subtitle": "Tech"})
    config = template.get_config({"title": "My Article"})
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, List
from dataclasses import dataclass, field
import yaml


# =============================================================================
# Exceptions
# =============================================================================

class TemplateError(Exception):
    """Base exception for template errors."""
    pass


class TemplateNotFoundError(TemplateError):
    """Raised when a template file cannot be found."""
    pass


class TemplateParseError(TemplateError):
    """Raised when template parsing fails."""
    pass


class TemplateValidationError(TemplateError):
    """Raised when template validation fails."""
    pass


class CircularReferenceError(TemplateError):
    """Raised when circular template references are detected."""
    pass


# =============================================================================
# Template Data Classes
# =============================================================================

@dataclass
class TemplateConfig:
    """Configuration extracted from template frontmatter."""
    name: str
    description: str
    width: int
    height: int
    style: str
    backend: Optional[str] = None
    model: Optional[str] = None
    steps: int = 50
    output_filename: Optional[str] = None
    variables: Dict[str, Dict[str, str]] = field(default_factory=dict)
    keywords: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TemplateConfig":
        """Create TemplateConfig from dictionary."""
        # Validate required fields
        required_fields = ["name", "description", "width", "height", "style"]
        missing_fields = [f for f in required_fields if f not in data or data[f] is None]
        if missing_fields:
            raise TemplateValidationError(
                f"Missing required frontmatter fields: {', '.join(missing_fields)}"
            )

        # Validate types
        if not isinstance(data["width"], int) or not isinstance(data["height"], int):
            raise TemplateValidationError(
                f"width and height must be integers, got: "
                f"{type(data['width']).__name__}, {type(data['height']).__name__}"
            )

        if data["width"] <= 0 or data["height"] <= 0:
            raise TemplateValidationError(
                f"width and height must be positive, got: {data['width']}x{data['height']}"
            )

        return cls(
            name=str(data["name"]),
            description=str(data["description"]),
            width=int(data["width"]),
            height=int(data["height"]),
            style=str(data["style"]),
            backend=data.get("backend"),
            model=data.get("model"),
            steps=int(data.get("steps", 50)),
            output_filename=data.get("output_filename"),
            variables=data.get("variables", {}),
            keywords=data.get("keywords", [])
        )

    @property
    def resolution(self) -> Tuple[int, int]:
        """Return resolution as (width, height) tuple."""
        return (self.width, self.height)

    def merge_variables(self, user_vars: Dict[str, str]) -> Dict[str, str]:
        """Merge user variables with template defaults.

        User variables take precedence over template defaults.

        Args:
            user_vars: Dictionary of user-provided variables

        Returns:
            Merged dictionary with all variables resolved
        """
        merged = {}

        # Add template defaults
        for var_name, var_info in self.variables.items():
            if isinstance(var_info, dict) and "default" in var_info:
                merged[var_name] = var_info["default"]
            elif isinstance(var_info, str):
                merged[var_name] = var_info

        # Override with user variables
        merged.update(user_vars)
        return merged


@dataclass
class Template:
    """Represents a parsed image generation template."""

    config: TemplateConfig
    body: str
    source_path: Path

    def render_prompt(
        self,
        variables: Optional[Dict[str, str]] = None,
        style_modifiers: Optional[str] = None
    ) -> str:
        """
        Render the prompt template with variable substitution.

        Args:
            variables: Dictionary of variable values
            style_modifiers: Additional style modifiers to append

        Returns:
            Rendered prompt string
        """
        # Merge with template defaults
        merged_vars = self.config.merge_variables(variables or {})

        # Render body with variables
        rendered = self._substitute_variables(self.body, merged_vars)

        # Append keywords if present
        if self.config.keywords:
            keyword_str = ", ".join(self.config.keywords)
            rendered = f"{rendered}, {keyword_str}"

        # Append style modifiers if provided
        if style_modifiers:
            rendered = f"{rendered}, {style_modifiers}"

        return rendered.strip()

    def render_output_filename(self, variables: Optional[Dict[str, str]] = None) -> str:
        """
        Render the output filename with variable substitution.

        Args:
            variables: Dictionary of variable values

        Returns:
            Rendered filename
        """
        if not self.config.output_filename:
            return "image.png"

        merged_vars = self.config.merge_variables(variables or {})
        return self._substitute_variables(self.config.output_filename, merged_vars)

    def _substitute_variables(self, text: str, variables: Dict[str, str]) -> str:
        """
        Substitute variables in text.

        Supports:
        - {{variable}} - Required variable
        - {{variable | default}} - Variable with default value

        Missing required variables are left as-is (literal {{missing_var}}).

        Args:
            text: Text with variable placeholders
            variables: Dictionary of variable values

        Returns:
            Text with variables substituted
        """
        # Pattern to match {{variable}} or {{variable | default}}
        pattern = r'\{\{([^}]+)\}\}'

        def replacer(match):
            expr = match.group(1).strip()

            # Check for default value syntax
            if '|' in expr:
                var_name, default = map(str.strip, expr.split('|', 1))
                result = variables.get(var_name, default)
                return result if result is not None else ""

            # Simple variable
            result = variables.get(expr)
            if result is not None:
                return result
            return match.group(0)  # Leave as-is if not found

        return re.sub(pattern, replacer, text)

    def get_style_prompt(self) -> str:
        """Get the style modifier string for this template.

        Styles are loaded from materials/styles.yaml if available,
        otherwise falls back to built-in defaults.
        """
        # Try to load styles from YAML file
        style_modifiers = self._load_styles()

        return style_modifiers.get(self.config.style, "")

    def _load_styles(self) -> Dict[str, str]:
        """Load style modifiers from YAML configuration file.

        Returns:
            Dictionary mapping style names to prompt modifiers.
            Falls back to built-in defaults if YAML file is not found.
        """
        # Built-in defaults for backward compatibility
        default_styles = {
            "technical-diagram": "clean technical illustration, precise lines, professional diagram style",
            "minimalist": "minimalist design, clean lines, simple aesthetic, plenty of whitespace",
            "vibrant": "bold colors, high contrast, vibrant and energetic, eye-catching",
            "sketch": "hand-drawn sketch style, artistic, pencil drawing feel, organic lines",
            "photorealistic": "photorealistic, highly detailed, realistic lighting, professional photography"
        }

        # Try to find and load styles.yaml
        # Search locations:
        # 1. Next to this script (scripts/styles.yaml)
        # 2. materials/styles.yaml (skill materials directory)
        script_dir = Path(__file__).parent

        search_paths = [
            script_dir / "styles.yaml",
            script_dir.parent / "materials" / "styles.yaml",
        ]

        for style_path in search_paths:
            if style_path.exists():
                try:
                    with open(style_path, 'r') as f:
                        style_data = yaml.safe_load(f)
                        if style_data and 'styles' in style_data:
                            # Merge with defaults (custom styles override defaults)
                            merged_styles = {**default_styles, **style_data['styles']}
                            return merged_styles
                except (yaml.YAMLError, IOError) as e:
                    # If loading fails, use defaults
                    pass

        # Return built-in defaults if YAML file not found or loading failed
        return default_styles


# =============================================================================
# Template Engine
# =============================================================================

class TemplateEngine:
    """Engine for loading and rendering image generation templates."""

    def __init__(
        self,
        project_templates_dir: Optional[Path] = None,
        skill_templates_dir: Optional[Path] = None
    ):
        """
        Initialize the template engine.

        Args:
            project_templates_dir: Project-level template directory (.image-templates/)
            skill_templates_dir: Skill-level template directory (assets/templates/)
        """
        # Auto-detect directories if not provided
        if project_templates_dir is None:
            # Start from current working directory and find git root
            cwd = Path.cwd()
            self.project_templates_dir = self._find_git_root(cwd) / ".image-templates"
        else:
            self.project_templates_dir = Path(project_templates_dir)

        if skill_templates_dir is None:
            # Default to assets/templates/ relative to this script
            script_dir = Path(__file__).parent
            self.skill_templates_dir = script_dir.parent / "assets" / "templates"
        else:
            self.skill_templates_dir = Path(skill_templates_dir)

        # Track loaded templates for circular reference detection
        self._loaded_templates: set = set()

    def _find_git_root(self, start_dir: Path) -> Path:
        """Find the git repository root directory."""
        current = start_dir.resolve()
        while current != current.parent:
            if (current / ".git").exists():
                return current
            current = current.parent
        # Fallback to starting directory if not in a git repo
        return start_dir

    def list_templates(self) -> List[str]:
        """
        List all available template names.

        Returns:
            List of template names (without .tpl.md extension)
        """
        templates = set()

        # Check project templates
        if self.project_templates_dir.exists():
            for file in self.project_templates_dir.glob("*.tpl.md"):
                templates.add(file.stem.replace(".tpl", ""))

        # Check skill templates
        if self.skill_templates_dir.exists():
            for file in self.skill_templates_dir.glob("*.tpl.md"):
                templates.add(file.stem.replace(".tpl", ""))

        return sorted(list(templates))

    def _resolve_template_path(self, template_name_or_path: str) -> Path:
        """
        Resolve a template name or path to an actual file path.

        Resolution order:
        1. If path is absolute and exists, use it directly
        2. Check project .image-templates/ directory
        3. Check skill assets/templates/ directory
        4. Raise error if not found

        Args:
            template_name_or_path: Template name (e.g., "cover") or file path

        Returns:
            Path to the template file

        Raises:
            TemplateNotFoundError: If template cannot be found
        """
        # Check if it's an absolute path that exists
        input_path = Path(template_name_or_path)
        if input_path.is_absolute() and input_path.exists():
            return input_path

        # Check project templates directory
        project_path = self.project_templates_dir / f"{template_name_or_path}.tpl.md"
        if project_path.exists():
            return project_path

        # Check skill templates directory
        skill_path = self.skill_templates_dir / f"{template_name_or_path}.tpl.md"
        if skill_path.exists():
            return skill_path

        # Template not found
        available = self.list_templates()
        raise TemplateNotFoundError(
            f"Template '{template_name_or_path}' not found. "
            f"Searched in:\n"
            f"  1. {self.project_templates_dir}\n"
            f"  2. {self.skill_templates_dir}\n"
            f"\n"
            f"Available templates: {', '.join(available) if available else 'None'}"
        )

    def _check_circular_reference(self, template_name: str, path: Path) -> None:
        """Check for circular template references."""
        template_key = f"{template_name}:{path}"
        if template_key in self._loaded_templates:
            raise CircularReferenceError(
                f"Circular reference detected: {' -> '.join(list(self._loaded_templates) + [template_key])}"
            )
        self._loaded_templates.add(template_key)

    def load_template(self, template_name_or_path: str) -> Template:
        """
        Load a template from file.

        Args:
            template_name_or_path: Template name (e.g., "cover") or file path

        Returns:
            Parsed Template object

        Raises:
            TemplateNotFoundError: If template cannot be found
            TemplateParseError: If template parsing fails
            TemplateValidationError: If template validation fails
            CircularReferenceError: If circular references are detected
        """
        # Resolve template path
        path = self._resolve_template_path(template_name_or_path)

        # Check for circular references
        template_name = Path(template_name_or_path).stem.replace(".tpl", "")
        self._check_circular_reference(template_name, path)

        try:
            # Read template file
            content = path.read_text(encoding="utf-8")

            # Parse YAML frontmatter
            frontmatter, body = self._parse_frontmatter(content)

            # Validate and create config
            config = TemplateConfig.from_dict(frontmatter)

            return Template(
                config=config,
                body=body.strip(),
                source_path=path
            )

        except yaml.YAMLError as e:
            raise TemplateParseError(
                f"Failed to parse YAML frontmatter in {path}:\n{e}"
            )
        except Exception as e:
            if isinstance(e, TemplateError):
                raise
            raise TemplateParseError(
                f"Failed to load template from {path}:\n{e}"
            )
        finally:
            # Remove from loaded set (allow reloading)
            template_key = f"{template_name}:{path}"
            self._loaded_templates.discard(template_key)

    def _parse_frontmatter(self, content: str) -> Tuple[Dict[str, Any], str]:
        """
        Parse YAML frontmatter from markdown content.

        Args:
            content: Full file content with frontmatter

        Returns:
            Tuple of (frontmatter_dict, body_content)

        Raises:
            TemplateParseError: If frontmatter parsing fails
        """
        content = content.strip()

        # Check for frontmatter delimiters
        if not content.startswith("---"):
            raise TemplateParseError(
                "Template must start with YAML frontmatter delimited by '---'"
            )

        # Find the end of frontmatter
        parts = content.split("---", 2)
        if len(parts) < 3:
            raise TemplateParseError(
                "YAML frontmatter must be closed with '---'"
            )

        frontmatter_str = parts[1]
        body = parts[2]

        # Parse YAML
        try:
            frontmatter = yaml.safe_load(frontmatter_str)
            if not isinstance(frontmatter, dict):
                raise TemplateParseError(
                    f"Frontmatter must be a dictionary, got {type(frontmatter).__name__}"
                )
            return frontmatter, body
        except yaml.YAMLError as e:
            raise TemplateParseError(f"Invalid YAML in frontmatter:\n{e}")

    def render_template(
        self,
        template_name_or_path: str,
        variables: Optional[Dict[str, str]] = None
    ) -> Tuple[str, TemplateConfig]:
        """
        Load and render a template.

        Convenience method that combines loading and rendering.

        Args:
            template_name_or_path: Template name or path
            variables: Dictionary of variable values

        Returns:
            Tuple of (rendered_prompt, template_config)
        """
        template = self.load_template(template_name_or_path)
        prompt = template.render_prompt(variables, template.get_style_prompt())
        return prompt, template.config


# =============================================================================
# Utility Functions
# =============================================================================

def create_template(
    name: str,
    description: str,
    width: int,
    height: int,
    style: str,
    body: str,
    output_path: Path,
    **kwargs
) -> None:
    """
    Create a new template file.

    Args:
        name: Template name
        description: Template description
        width: Image width
        height: Image height
        style: Style preset
        body: Prompt template body
        output_path: Where to save the template file
        **kwargs: Additional frontmatter fields (backend, model, steps, etc.)
    """
    frontmatter = {
        "name": name,
        "description": description,
        "width": width,
        "height": height,
        "style": style,
        **kwargs
    }

    # Convert to YAML
    frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)

    # Write template file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    content = f"---\n{frontmatter_yaml}---\n\n{body}\n"
    output_path.write_text(content, encoding="utf-8")
